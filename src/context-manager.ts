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
   * are merged. For deep merging of nested objects, use `deepUpdate()`.
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

  /**
   * Update the context with a deep merge.
   *
   * This performs a deep merge - nested objects are recursively merged
   * instead of being replaced. Arrays are replaced, not merged.
   *
   * Use this when you have nested configuration and want to update
   * only specific nested properties without losing other nested values.
   *
   * @param partial - Partial context to deep merge
   *
   * @example
   * ```typescript
   * interface Context { config: { db: string; api: string } };
   * const manager = new ContextManager<Context>({
   *   config: { db: 'postgres://localhost', api: 'http://localhost' }
   * });
   *
   * // Deep merge - only updates db, keeps api
   * manager.deepUpdate({ config: { db: 'postgres://prod' } });
   * manager.get(); // { config: { db: 'postgres://prod', api: 'http://localhost' } }
   *
   * // Compare with shallow update - would lose api
   * manager.update({ config: { db: 'postgres://prod' } });
   * manager.get(); // { config: { db: 'postgres://prod' } } - api is lost!
   * ```
   */
  deepUpdate(partial: Partial<TContext>): void {
    this.context = this.deepMerge(this.context, partial) as TContext;
  }

  /**
   * Recursively merge source into target.
   *
   * - Plain objects are merged recursively
   * - Arrays are replaced (not merged)
   * - Primitives and null values are replaced
   *
   * @param target - Target object
   * @param source - Source object to merge
   * @returns Merged object
   *
   * @internal
   */
  private deepMerge(target: unknown, source: unknown): unknown {
    // If source is not an object or is null, return source
    if (source === null || typeof source !== 'object') {
      return source;
    }

    // If source is an array, return a copy of the array (replace, don't merge)
    if (Array.isArray(source)) {
      return [...source];
    }

    // If target is not an object or is null or is an array, return a shallow copy of source
    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      return { ...source };
    }

    // Both are plain objects - merge recursively
    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };

    for (const key of Object.keys(source as Record<string, unknown>)) {
      const sourceValue = (source as Record<string, unknown>)[key];
      const targetValue = result[key];

      result[key] = this.deepMerge(targetValue, sourceValue);
    }

    return result;
  }
}
