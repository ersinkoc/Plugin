import type { EventMap, MaybePromise, Plugin } from '@oxog/types';

/**
 * Error handling strategy for plugin lifecycle.
 *
 * - `'isolate'`: Plugin errors don't affect other plugins (default)
 * - `'fail-fast'`: First error stops the entire kernel
 * - `'collect'`: Collect all errors and throw AggregateError at the end
 *
 * @example
 * ```typescript
 * const kernel = createKernel({ errorStrategy: 'isolate' });
 * ```
 */
export type ErrorStrategy = 'isolate' | 'fail-fast' | 'collect';

/**
 * Kernel configuration options.
 *
 * @template TContext - The type of shared context between plugins
 * @template TEvents - The event map for typed events
 *
 * @example
 * ```typescript
 * const kernel = createKernel<AppContext, AppEvents>({
 *   context: { env: 'production' },
 *   errorStrategy: 'fail-fast',
 *   onError: (error, name) => console.error(`[${name}]`, error)
 * });
 * ```
 */
export interface KernelConfig<TContext, TEvents extends EventMap> {
  /** Initial shared context value */
  context?: TContext;

  /** Error handling strategy */
  errorStrategy?: ErrorStrategy;

  /** Global error handler called when any plugin errors */
  onError?: (error: Error, pluginName: string) => void;

  /** Hook called before kernel initialization starts */
  onBeforeInit?: () => MaybePromise<void>;

  /** Hook called after kernel initialization completes */
  onAfterInit?: () => MaybePromise<void>;

  /** Hook called before kernel destruction starts */
  onBeforeDestroy?: () => MaybePromise<void>;

  /** Hook called after kernel destruction completes */
  onAfterDestroy?: () => MaybePromise<void>;
}

/**
 * Internal plugin wrapper with state tracking.
 *
 * @internal
 */
export interface InternalPlugin<TContext> {
  /** The plugin instance */
  plugin: Plugin<TContext>;

  /** Current plugin state */
  state: PluginState;

  /** Timestamp when plugin was initialized */
  initializedAt?: number;
}

/**
 * Plugin lifecycle states.
 *
 * @internal
 */
export enum PluginState {
  /** Plugin is registered but not initialized */
  Registered = 'registered',

  /** Plugin is currently initializing */
  Initializing = 'initializing',

  /** Plugin is ready and operational */
  Ready = 'ready',

  /** Plugin is currently destroying */
  Destroying = 'destroying',

  /** Plugin has been destroyed */
  Destroyed = 'destroyed',

  /** Plugin failed during initialization */
  Failed = 'failed'
}

/**
 * Kernel lifecycle states.
 *
 * @example
 * ```typescript
 * if (kernel.state === KernelState.Ready) {
 *   // Safe to use plugins
 * }
 * ```
 */
export enum KernelState {
  /** Kernel is created but not initialized */
  Created = 'created',

  /** Kernel is currently initializing */
  Initializing = 'initializing',

  /** Kernel is ready and all plugins are initialized */
  Ready = 'ready',

  /** Kernel is currently destroying */
  Destroying = 'destroying',

  /** Kernel has been destroyed */
  Destroyed = 'destroyed'
}

/**
 * Event handler function type.
 *
 * @internal
 */
export type EventHandler<TPayload = unknown> = (payload: TPayload) => void;

/**
 * Wildcard event handler for all events.
 *
 * @internal
 */
export type WildcardHandler = (event: string, payload: unknown) => void;

/**
 * Pattern event handler for wildcard patterns like `'user:*'`.
 *
 * @internal
 */
export type PatternHandler = WildcardHandler;

/**
 * Plugin factory function type.
 *
 * Use this to create configurable plugins.
 *
 * @example
 * ```typescript
 * const createLogger = (level: string): Plugin<{}> => ({
 *   name: 'logger',
 *   version: '1.0.0',
 *   install(kernel) {
 *     kernel.logLevel = level;
 *   }
 * });
 * ```
 *
 * @template TContext - The context type
 * @template TOptions - The factory options type
 */
export type PluginFactory<TContext, TOptions = unknown> = (
  options: TOptions
) => Plugin<TContext>;

/**
 * Internal kernel events emitted during lifecycle.
 *
 * These events are always available regardless of user-defined events.
 *
 * @internal
 */
export interface InternalKernelEvents extends EventMap {
  'plugin:install': { name: string; version: string };
  'plugin:init': { name: string };
  'plugin:destroy': { name: string };
  'plugin:error': { name: string; error: Error };
  'kernel:init': { timestamp: number };
  'kernel:ready': { timestamp: number; plugins: string[] };
  'kernel:destroy': { timestamp: number };
  'kernel:destroyed': { timestamp: number };
}
