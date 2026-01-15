/**
 * Context Manager - Shared state management for plugins.
 *
 * Provides a simple mutable context store that plugins can use
 * to share state. Context is passed to each plugin's `onInit` hook.
 *
 * @module context-manager
 */

/**
 * Manages shared context state between plugins.
 *
 * Context is a simple mutable store that plugins can use to share
 * configuration, services, or other state. Updates use shallow merge.
 *
 * @template TContext - The type of the context object
 *
 * @example
 * ```typescript
 * const manager = new ContextManager({ env: 'dev', debug: true });
 * manager.get(); // { env: 'dev', debug: true }
 * manager.update({ debug: false });
 * manager.get(); // { env: 'dev', debug: false }
 * ```
 */
export class ContextManager<TContext> {
  private context: TContext;

  /**
   * Create a new context manager.
   *
   * @param initial - The initial context value
   */
  constructor(initial: TContext) {
    this.context = initial;
  }

  /**
   * Get the current context value.
   *
   * @returns The current context
   */
  get(): TContext {
    return this.context;
  }

  /**
   * Update the context with a partial merge.
   *
   * This performs a shallow merge - only top-level properties
   * are merged. For deep merging, use a library like lodash.merge
   * or implement your own merge logic.
   *
   * @param partial - Partial context to merge
   *
   * @example
   * ```typescript
   * interface Context { config: { api: string; timeout: number } };
   * const manager = new ContextManager<Context>({
   *   config: { api: 'http://localhost', timeout: 5000 }
   * });
   * // This replaces config entirely, not a deep merge
   * manager.update({ config: { api: 'http://api.example.com', timeout: 10000 } });
   * ```
   */
  update(partial: Partial<TContext>): void {
    this.context = { ...this.context, ...partial };
  }
}
