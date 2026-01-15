/**
 * Lifecycle Manager - Orchestrate plugin lifecycle hooks.
 *
 * Manages the initialization and destruction of plugins in the
 * correct order based on their dependencies.
 *
 * @module lifecycle-manager
 */

import type { InternalPlugin, ErrorStrategy } from './types.js';
import { PluginState } from './types.js';
import { ErrorBoundary } from './error-boundary.js';

/**
 * Orchestrates plugin lifecycle operations.
 *
 * Handles initialization in dependency order and destruction in
 * reverse dependency order.
 *
 * @template TContext - The context type
 *
 * @example
 * ```typescript
 * const manager = new LifecycleManager<Context>();
 *
 * // Initialize all plugins
 * await manager.initialize(plugins, order, context, errorBoundary);
 *
 * // Destroy all plugins
 * await manager.destroy(plugins, order, errorBoundary);
 * ```
 */
export class LifecycleManager<TContext> {
  /**
   * Initialize plugins in dependency order.
   *
   * Calls each plugin's `onInit` hook with the shared context.
   * Plugins are initialized in the order specified by the
   * dependency resolver.
   *
   * @param plugins - Map of plugin name to InternalPlugin
   * @param order - Array of plugin names in initialization order
   * @param context - Shared context to pass to each plugin
   * @param errorBoundary - Error boundary for error handling
   * @throws AggregateError If in 'collect' strategy and errors occurred
   *
   * @example
   * ```typescript
   * const order = ['database', 'cache', 'api'];
   * await manager.initialize(plugins, order, context, boundary);
   * ```
   */
  async initialize(
    plugins: Map<string, InternalPlugin<TContext>>,
    order: string[],
    context: TContext,
    errorBoundary: ErrorBoundary
  ): Promise<void> {
    const strategy = errorBoundary.getStrategy();

    for (const name of order) {
      const internal = plugins.get(name);
      if (!internal) continue;

      internal.state = PluginState.Initializing;

      try {
        await errorBoundary.withBoundary(name, internal.plugin, async () => {
          if (internal.plugin.onInit) {
            await internal.plugin.onInit!(context);
          }
        });

        internal.state = PluginState.Ready;
        internal.initializedAt = Date.now();
      } catch (error) {
        // For 'fail-fast', re-throw immediately
        if (strategy === 'fail-fast') {
          throw error;
        }
        // For 'isolate' and 'collect', continue with other plugins
        // Errors are collected by the error boundary
        // Mark plugin as failed
        internal.state = PluginState.Failed;
      }
    }
  }

  /**
   * Destroy plugins in reverse dependency order.
   *
   * Calls each plugin's `onDestroy` hook. Plugins are destroyed
   * in reverse order to ensure dependents are destroyed before
   * their dependencies.
   *
   * @param plugins - Map of plugin name to InternalPlugin
   * @param order - Array of plugin names in initialization order
   * @param errorBoundary - Error boundary for error handling
   * @throws AggregateError If in 'collect' strategy and errors occurred
   *
   * @example
   * ```typescript
   * const order = ['database', 'cache', 'api'];
   * // Will destroy in order: api -> cache -> database
   * await manager.destroy(plugins, order, boundary);
   * ```
   */
  async destroy(
    plugins: Map<string, InternalPlugin<TContext>>,
    order: string[],
    errorBoundary: ErrorBoundary
  ): Promise<void> {
    const strategy = errorBoundary.getStrategy();

    // Reverse order for shutdown
    const reverseOrder = [...order].reverse();

    for (const name of reverseOrder) {
      const internal = plugins.get(name);
      if (!internal) continue;

      internal.state = PluginState.Destroying;

      try {
        await errorBoundary.withBoundary(name, internal.plugin, async () => {
          if (internal.plugin.onDestroy) {
            await internal.plugin.onDestroy!();
          }
        });

        internal.state = PluginState.Destroyed;
      } catch (error) {
        // For 'fail-fast', re-throw immediately
        if (strategy === 'fail-fast') {
          throw error;
        }
        // For 'isolate' and 'collect', continue with other plugins
        // Still mark as destroyed
        internal.state = PluginState.Destroyed;
      }
    }
  }
}
