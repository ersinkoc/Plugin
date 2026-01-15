/**
 * Kernel Instance - Main micro-kernel implementation.
 *
 * Provides plugin registration, lifecycle management, event bus,
 * and plugin queries. This is the core of the @oxog/plugin system.
 *
 * @module kernel
 */

import type {
  Plugin,
  Kernel,
  EventMap,
  Unsubscribe
} from '@oxog/types';
import { PluginError as OPluginError } from '@oxog/types';
import type {
  KernelConfig,
  InternalPlugin,
  KernelState,
  ErrorStrategy
} from './types.js';
import { PluginState } from './types.js';
import { KernelState as KS } from './types.js';
import { ContextManager } from './context-manager.js';
import { EventBus } from './event-bus.js';
import { DependencyResolver } from './dependency-resolver.js';
import { ErrorBoundary } from './error-boundary.js';
import { LifecycleManager } from './lifecycle-manager.js';

/**
 * Micro-kernel instance for plugin management.
 *
 * The kernel is the central component that manages plugins throughout
 * their lifecycle: registration → initialization → operation → destruction.
 *
 * Features:
 * - Fluent chainable API
 * - Automatic dependency resolution
 * - Type-safe event bus
 * - Configurable error handling
 * - Shared context management
 * - Dynamic plugin management
 *
 * @template TContext - Type of shared context between plugins
 * @template TEvents - Event map for typed events
 *
 * @example
 * ```typescript
 * const kernel = createKernel();
 * kernel.use(loggerPlugin).use(dbPlugin);
 * await kernel.init();
 * // ... use kernel ...
 * await kernel.destroy();
 * ```
 */
export class KernelInstance<TContext, TEvents extends EventMap> {
  private state: KernelState = KS.Created;
  private plugins = new Map<string, InternalPlugin<TContext>>();
  private context: ContextManager<TContext>;
  private events: EventBus<TEvents>;
  private resolver: DependencyResolver;
  private errorBoundary: ErrorBoundary;
  private lifecycle: LifecycleManager<TContext>;
  private config: KernelConfig<TContext, TEvents>;

  /**
   * Extended kernel namespace for plugins.
   *
   * Plugins can add properties to this object during their
   * `install()` hook to expose functionality to other plugins.
   *
   * @example
   * ```typescript
   * const plugin: Plugin = {
   *   name: 'logger',
   *   install(kernel) {
   *     kernel.log = (...args) => console.log(...args);
   *   }
   * };
   * ```
   */
  [key: string]: any;

  /**
   * Create a new kernel instance.
   *
   * @param config - Optional kernel configuration
   *
   * @example
   * ```typescript
   * const kernel = new KernelInstance({
   *   context: { env: 'production' },
   *   errorStrategy: 'isolate',
   *   onError: (err, name) => console.error(`[${name}]`, err)
   * });
   * ```
   */
  constructor(config?: KernelConfig<TContext, TEvents>) {
    this.config = config || {};
    this.context = new ContextManager(
      (this.config.context as TContext) ?? ({} as TContext)
    );
    this.events = new EventBus<TEvents>();
    this.resolver = new DependencyResolver();
    this.errorBoundary = new ErrorBoundary(
      this.config.errorStrategy || 'isolate',
      this.config.onError
    );
    this.lifecycle = new LifecycleManager<TContext>();
  }

  // ========================
  // Plugin Management
  // ========================

  /**
   * Register a plugin with the kernel.
   *
   * The plugin's `install()` hook is called immediately and
   * synchronously. The plugin will be initialized when `init()` is
   * called, in dependency order.
   *
   * @param plugin - The plugin to register
   * @returns This kernel instance for chaining
   * @throws {PluginError} If kernel is destroyed or plugin name is duplicate
   *
   * @example
   * ```typescript
   * kernel
   *   .use(loggerPlugin)
   *   .use(databasePlugin)
   *   .use(apiPlugin);
   * ```
   */
  use(plugin: Plugin<TContext>): this {
    if (this.state === KS.Destroyed) {
      throw new OPluginError('Cannot add plugins to destroyed kernel', 'kernel');
    }

    if (this.plugins.has(plugin.name)) {
      throw new OPluginError(
        `Plugin '${plugin.name}' is already registered`,
        'kernel'
      );
    }

    const internal: InternalPlugin<TContext> = {
      plugin,
      state: PluginState.Registered
    };

    this.plugins.set(plugin.name, internal);
    this.resolver.addPlugin(plugin.name, [...(plugin.dependencies || [])]);

    // Call install synchronously
    plugin.install(this);

    // Emit kernel event
    this.events.emit('plugin:install' as any, {
      name: plugin.name,
      version: plugin.version
    } as any);

    // Auto-initialize if kernel is already ready
    // Store the promise for pending initialization
    if (this.state === KS.Ready) {
      // Initialize the plugin asynchronously
      // Note: This happens in background, callers should use await kernel.use()
      // followed by a small delay if they need to ensure initialization completes
      void this.initializePlugin(plugin.name);
    }

    return this;
  }

  /**
   * Initialize a single plugin by name.
   *
   * @internal
   */
  private async initializePlugin(name: string): Promise<void> {
    const internal = this.plugins.get(name);
    if (!internal || internal.state !== PluginState.Registered) return;

    try {
      internal.state = PluginState.Initializing;

      await this.errorBoundary.withBoundary(name, internal.plugin, async () => {
        if (internal.plugin.onInit) {
          await internal.plugin.onInit(this.context.get());
        }
      });

      internal.state = PluginState.Ready;
      internal.initializedAt = Date.now();

      this.events.emit('plugin:init' as any, { name } as any);
    } catch (error) {
      internal.state = PluginState.Failed;
    }
  }

  /**
   * Register multiple plugins at once.
   *
   * @param plugins - Array of plugins to register
   * @returns This kernel instance for chaining
   *
   * @example
   * ```typescript
   * kernel.useAll([loggerPlugin, dbPlugin, apiPlugin]);
   * ```
   */
  useAll(plugins: Plugin<TContext>[]): this {
    for (const plugin of plugins) {
      this.use(plugin);
    }
    return this;
  }

  /**
   * Unregister a plugin from the kernel.
   *
   * If the kernel is initialized and the plugin has an `onDestroy`
   * hook, it will be called before removal. Note: this is the synchronous
   * version from the Kernel interface - for proper async cleanup, use
   * `unregisterAsync()` instead.
   *
   * @param name - Name of the plugin to unregister
   * @returns true if removed, false if not found
   *
   * @example
   * ```typescript
   * kernel.unregister('old-plugin');
   * ```
   */
  unregister(name: string): boolean {
    const internal = this.plugins.get(name);
    if (!internal) return false;

    // Call onDestroy if initialized (fire-and-forget for async)
    if (internal.state === PluginState.Ready && internal.plugin.onDestroy) {
      // Don't await - fire and forget for sync version
      void Promise.resolve().then(() => internal.plugin.onDestroy!());
    }

    this.plugins.delete(name);
    this.resolver.removePlugin(name);

    return true;
  }

  /**
   * Unregister a plugin from the kernel (async version).
   *
   * This is the async version that properly awaits onDestroy.
   *
   * @param name - Name of the plugin to unregister
   * @returns Promise resolving to true if removed, false if not found
   *
   * @example
   * ```typescript
   * await kernel.unregisterAsync('old-plugin');
   * ```
   */
  async unregisterAsync(name: string): Promise<boolean> {
    const internal = this.plugins.get(name);
    if (!internal) return false;

    // Call onDestroy if initialized
    if (internal.state === PluginState.Ready && internal.plugin.onDestroy) {
      try {
        await internal.plugin.onDestroy();
      } catch {
        // Ignore errors during unregister
      }
    }

    this.plugins.delete(name);
    this.resolver.removePlugin(name);

    return true;
  }

  /**
   * Replace an existing plugin with a new version.
   *
   * Unregisters the existing plugin and registers the new one.
   * If the kernel is initialized, the new plugin will be initialized.
   *
   * @param plugin - The new plugin to register
   *
   * @example
   * ```typescript
   * await kernel.replace(updatedPlugin);
   * ```
   */
  async replace(plugin: Plugin<TContext>): Promise<void> {
    await this.unregisterAsync(plugin.name);
    this.use(plugin);

    if (this.state === KS.Ready) {
      await this.lifecycle.initialize(
        this.plugins,
        [plugin.name],
        this.context.get(),
        this.errorBoundary
      );
    }
  }

  /**
   * Reload a plugin (destroy then re-initialize).
   *
   * Calls the plugin's `onDestroy` and `onInit` hooks in sequence.
   * Only works if the kernel is initialized.
   *
   * @param name - Name of the plugin to reload
   *
   * @example
   * ```typescript
   * await kernel.reload('config-plugin');
   * ```
   */
  async reload(name: string): Promise<void> {
    const internal = this.plugins.get(name);
    if (!internal) return;

    const strategy = this.errorBoundary.getStrategy();

    if (internal.state === PluginState.Ready) {
      try {
        if (internal.plugin.onDestroy) {
          await this.errorBoundary.withBoundary(
            name,
            internal.plugin,
            async () => internal.plugin.onDestroy!()
          );
        }
      } catch (error) {
        if (strategy === 'fail-fast') {
          throw error;
        }
        // For isolate and collect, continue despite error
      }

      internal.state = PluginState.Registered;

      try {
        if (internal.plugin.onInit) {
          await this.errorBoundary.withBoundary(
            name,
            internal.plugin,
            async () => internal.plugin.onInit!(this.context.get())
          );
        }

        internal.state = PluginState.Ready;
      } catch (error) {
        if (strategy === 'fail-fast') {
          throw error;
        }
        // For isolate and collect, mark as failed
        internal.state = PluginState.Failed;
      }
    }
  }

  // ========================
  // Lifecycle
  // ========================

  /**
   * Initialize all plugins.
   *
   * Resolves dependencies, calls `onBeforeInit`, initializes all
   * plugins in dependency order, calls `onAfterInit`.
   *
   * @throws {PluginError} If circular dependencies detected
   * @throws {PluginError} If missing dependencies detected
   * @throws {AggregateError} If errors occurred and strategy is 'collect'
   *
   * @example
   * ```typescript
   * await kernel.init();
   * console.log('Kernel is ready!');
   * ```
   */
  async init(): Promise<void> {
    if (this.state !== KS.Created) {
      throw new OPluginError('Kernel already initialized', 'kernel');
    }

    this.state = KS.Initializing;

    try {
      if (this.config.onBeforeInit) {
        await this.config.onBeforeInit();
      }

      const order = this.resolver.resolve();

      this.events.emit('kernel:init' as any, { timestamp: Date.now() } as any);

      await this.lifecycle.initialize(
        this.plugins,
        order,
        this.context.get(),
        this.errorBoundary
      );

      this.state = KS.Ready;

      this.events.emit('kernel:ready' as any, {
        timestamp: Date.now(),
        plugins: Array.from(this.plugins.keys())
      } as any);

      if (this.config.onAfterInit) {
        await this.config.onAfterInit();
      }

      this.errorBoundary.throwIfErrors();
    } catch (error) {
      // Reset state on failure to allow retry
      this.state = KS.Created;
      throw error;
    }
  }

  /**
   * Destroy all plugins.
   *
   * Calls `onBeforeDestroy`, destroys all plugins in reverse
   * dependency order, calls `onAfterDestroy`, clears all event
   * subscriptions.
   *
   * @example
   * ```typescript
   * await kernel.destroy();
   * console.log('Kernel destroyed');
   * ```
   */
  async destroy(): Promise<void> {
    if (this.state === KS.Destroyed) return;

    this.state = KS.Destroying;

    if (this.config.onBeforeDestroy) {
      await this.config.onBeforeDestroy();
    }

    this.events.emit('kernel:destroy' as any, { timestamp: Date.now() } as any);

    const order = Array.from(this.plugins.keys());
    await this.lifecycle.destroy(
      this.plugins,
      order,
      this.errorBoundary
    );

    this.state = KS.Destroyed;

    this.events.emit('kernel:destroyed' as any, { timestamp: Date.now() } as any);

    this.events.clear();

    if (this.config.onAfterDestroy) {
      await this.config.onAfterDestroy();
    }
  }

  /**
   * Check if the kernel is initialized.
   *
   * @returns true if kernel is in Ready state
   *
   * @example
   * ```typescript
   * if (kernel.isInitialized()) {
   *   // Safe to use plugins
   * }
   * ```
   */
  isInitialized(): boolean {
    return this.state === KS.Ready;
  }

  /**
   * Check if the kernel is destroyed.
   *
   * @returns true if kernel is in Destroyed state
   *
   * @example
   * ```typescript
   * if (kernel.isDestroyed()) {
   *   console.log('Kernel no longer usable');
   * }
   * ```
   */
  isDestroyed(): boolean {
    return this.state === KS.Destroyed;
  }

  // ========================
  // Plugin Queries
  // ========================

  /**
   * Get a plugin by name.
   *
   * @param name - Plugin name
   * @returns The plugin or undefined if not found
   *
   * @example
   * ```typescript
   * const logger = kernel.getPlugin('logger');
   * if (logger) {
   *   console.log(`Logger v${logger.version}`);
   * }
   * ```
   */
  getPlugin<T extends Plugin<TContext> = Plugin<TContext>>(
    name: string
  ): T | undefined {
    return this.plugins.get(name)?.plugin as T | undefined;
  }

  /**
   * Check if a plugin is registered.
   *
   * @param name - Plugin name
   * @returns true if plugin is registered
   *
   * @example
   * ```typescript
   * if (kernel.hasPlugin('logger')) {
   *   // Logger is available
   * }
   * ```
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * List all registered plugins.
   *
   * @returns Readonly array of plugins
   *
   * @example
   * ```typescript
   * const plugins = kernel.listPlugins();
   * console.log(`Installed ${plugins.length} plugins`);
   * ```
   */
  listPlugins(): ReadonlyArray<Plugin<TContext>> {
    return Array.from(this.plugins.values()).map((p) => p.plugin);
  }

  /**
   * Get all plugin names.
   *
   * @returns Array of plugin names
   *
   * @example
   * ```typescript
   * const names = kernel.getPluginNames();
   * // ['logger', 'database', 'api']
   * ```
   */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get the dependency graph.
   *
   * @returns Object mapping plugin names to their dependencies
   *
   * @example
   * ```typescript
   * const graph = kernel.getDependencyGraph();
   * // { api: ['database', 'cache'], database: [], cache: ['database'] }
   * ```
   */
  getDependencyGraph(): Record<string, string[]> {
    return this.resolver.getGraph();
  }

  // ========================
  // Events
  // ========================

  /**
   * Subscribe to an event.
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = kernel.on('user:login', (payload) => {
   *   console.log('User logged in:', payload.userId);
   * });
   * // Call unsub() to unsubscribe
   * ```
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe {
    return this.events.on(event, handler);
  }

  /**
   * Subscribe to an event for a single emission.
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function (usually not needed)
   *
   * @example
   * ```typescript
   * kernel.once('kernel:ready', () => {
   *   console.log('Kernel is ready!');
   * });
   * ```
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe {
    return this.events.once(event, handler);
  }

  /**
   * Unsubscribe from an event.
   *
   * @param event - Event name
   * @param handler - Handler to remove
   *
   * @example
   * ```typescript
   * const handler = (payload) => console.log(payload);
   * kernel.on('event', handler);
   * kernel.off('event', handler);
   * ```
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): void {
    this.events.off(event, handler);
  }

  /**
   * Emit an event to all subscribers.
   *
   * @param event - Event name
   * @param payload - Event payload
   *
   * @example
   * ```typescript
   * kernel.emit('user:login', { userId: '123', timestamp: Date.now() });
   * ```
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.events.emit(event, payload);
  }

  /**
   * Subscribe to all events (wildcard).
   *
   * @param handler - Handler receiving (event, payload)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * kernel.onWildcard((event, payload) => {
   *   console.log(`[${event}]`, payload);
   * });
   * ```
   */
  onWildcard(handler: (event: string, payload: unknown) => void): Unsubscribe {
    return this.events.onWildcard(handler);
  }

  /**
   * Subscribe to events matching a pattern.
   *
   * @param pattern - Pattern like `'user:*'`
   * @param handler - Handler receiving (event, payload)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * kernel.onPattern('user:*', (event, payload) => {
   *   console.log('User event:', event);
   * });
   * ```
   */
  onPattern(
    pattern: string,
    handler: (event: string, payload: unknown) => void
  ): Unsubscribe {
    return this.events.onPattern(pattern, handler);
  }

  // ========================
  // Context
  // ========================

  /**
   * Get the current context.
   *
   * @returns The shared context object
   *
   * @example
   * ```typescript
   * const ctx = kernel.getContext();
   * console.log(ctx.env);
   * ```
   */
  getContext(): TContext {
    return this.context.get();
  }

  /**
   * Update the context with a partial merge.
   *
   * @param partial - Partial context to merge
   *
   * @example
   * ```typescript
   * kernel.updateContext({ env: 'production' });
   * ```
   */
  updateContext(partial: Partial<TContext>): void {
    this.context.update(partial);
  }
}

/**
 * Export KernelState enum for public use.
 */
export { KernelState } from './types.js';
