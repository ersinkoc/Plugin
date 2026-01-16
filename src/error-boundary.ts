/**
 * Error Boundary - Error isolation and strategy execution.
 *
 * Provides configurable error handling strategies for plugin
 * lifecycle: isolate, fail-fast, and collect.
 *
 * @module error-boundary
 */

import type { Plugin } from '@oxog/types';
import type { ErrorStrategy } from './types.js';

/**
 * Error handler function type.
 *
 * @internal
 */
type ErrorHandler = (error: Error, pluginName: string) => void;

/**
 * Error boundary for plugin error handling.
 *
 * Implements three strategies:
 * - `'isolate'`: Plugin errors don't affect others (default)
 * - `'fail-fast'`: First error stops everything
 * - `'collect'`: Collect all errors, throw AggregateError at end
 *
 * @example
 * ```typescript
 * const boundary = new ErrorBoundary('isolate', (error, name) => {
 *   console.error(`[${name}]`, error);
 * });
 *
 * await boundary.withBoundary('my-plugin', plugin, async () => {
 *   await plugin.onInit();
 * });
 * ```
 */
export class ErrorBoundary {
  private strategy: ErrorStrategy;
  private globalHandler?: ErrorHandler;
  private errors: Error[] = [];

  /**
   * Create a new error boundary.
   *
   * @param strategy - Error handling strategy
   * @param globalHandler - Optional global error handler
   *
   * @example
   * ```typescript
   * const boundary = new ErrorBoundary('isolate', (err, name) => {
   *   reportToMonitoring(err, name);
   * });
   * ```
   */
  constructor(strategy: ErrorStrategy, globalHandler?: ErrorHandler) {
    this.strategy = strategy;
    this.globalHandler = globalHandler;
  }

  /**
   * Get the current error strategy.
   *
   * @returns The error strategy
   *
   * @internal
   */
  getStrategy(): ErrorStrategy {
    return this.strategy;
  }

  /**
   * Execute a function within the error boundary.
   *
   * Based on the strategy:
   * - `'isolate'`: Errors are caught and handled, returns result or null
   * - `'fail-fast'`: Errors are re-thrown immediately
   * - `'collect'`: Errors are collected, returns result or null
   *
   * @param pluginName - Name of the plugin (for error reporting)
   * @param plugin - The plugin instance (for calling onError)
   * @param fn - Async function to execute
   * @returns Result of the function, or null if it failed
   * @throws Error if strategy is 'fail-fast'
   *
   * @example
   * ```typescript
   * const result = await boundary.withBoundary('logger', plugin, async () => {
   *   return await plugin.onInit(context);
   * });
   * ```
   */
  async withBoundary<T, TContext = unknown>(
    pluginName: string,
    plugin: Plugin<TContext>,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.handleError(pluginName, plugin as Plugin<unknown>, err);

      // Always re-throw so caller knows initialization failed
      // Caller decides whether to continue based on strategy
      throw err;
    }
  }

  /**
   * Handle an error by calling plugin and global handlers.
   *
   * @param pluginName - Name of the failing plugin
   * @param plugin - The plugin instance
   * @param error - The error that occurred
   *
   * @internal
   */
  private async handleError(
    pluginName: string,
    plugin: Plugin<unknown>,
    error: Error
  ): Promise<void> {
    // Call plugin's error handler
    if (plugin.onError) {
      try {
        plugin.onError(error);
      } catch {
        // Ignore errors in error handlers
      }
    }

    // Call global error handler
    if (this.globalHandler) {
      try {
        this.globalHandler(error, pluginName);
      } catch {
        // Ignore errors in error handlers
      }
    }

    // Store error if collecting
    if (this.strategy === 'collect') {
      this.errors.push(error);
    }
  }

  /**
   * Throw AggregateError if in 'collect' strategy and errors exist.
   *
   * @throws {AggregateError} If errors were collected
   *
   * @example
   * ```typescript
   * await boundary.withBoundary('plugin', plugin, initFn);
   * await boundary.withBoundary('plugin2', plugin2, initFn2);
   * boundary.throwIfErrors(); // Throws AggregateError if any failed
   * ```
   */
  throwIfErrors(): void {
    if (this.strategy === 'collect' && this.errors.length > 0) {
      const aggregate = new AggregateError(
        this.errors,
        `${this.errors.length} plugin error(s) occurred`
      );
      this.clearErrors();
      throw aggregate;
    }
  }

  /**
   * Clear all collected errors.
   *
   * @example
   * ```typescript
   * boundary.clearErrors();
   * ```
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Get all collected errors (readonly).
   *
   * @returns Array of collected errors
   *
   * @example
   * ```typescript
   * const errors = boundary.getErrors();
   * console.log(`Collected ${errors.length} errors`);
   * ```
   */
  getErrors(): ReadonlyArray<Error> {
    return Object.freeze([...this.errors]);
  }
}
