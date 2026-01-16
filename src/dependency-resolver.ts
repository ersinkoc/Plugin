/**
 * Dependency Resolver - Topological sort for plugin initialization order.
 *
 * Uses Kahn's algorithm to sort plugins by dependencies, ensuring
 * plugins are initialized after their dependencies. Detects and
 * reports circular dependencies.
 *
 * @module dependency-resolver
 */

import { PluginError } from '@oxog/types';

/**
 * Resolves plugin initialization order using topological sort.
 *
 * Uses Kahn's algorithm for dependency resolution and DFS for
 * circular dependency detection.
 *
 * @example
 * ```typescript
 * const resolver = new DependencyResolver();
 * resolver.addPlugin('database', []);
 * resolver.addPlugin('cache', ['database']);
 * resolver.addPlugin('api', ['cache', 'database']);
 *
 * const order = resolver.resolve(); // ['database', 'cache', 'api']
 * ```
 */
export class DependencyResolver {
  private graph = new Map<string, string[]>();

  /**
   * Add a plugin to the dependency graph.
   *
   * @param name - Plugin name
   * @param dependencies - Array of plugin names this plugin depends on
   *
   * @example
   * ```typescript
   * resolver.addPlugin('api', ['database', 'cache']);
   * ```
   */
  addPlugin(name: string, dependencies: string[] = []): void {
    this.graph.set(name, dependencies);
  }

  /**
   * Remove a plugin from the dependency graph.
   *
   * Also removes this plugin from other plugins' dependency lists.
   *
   * @param name - Plugin name to remove
   *
   * @example
   * ```typescript
   * resolver.removePlugin('old-plugin');
   * ```
   */
  removePlugin(name: string): void {
    this.graph.delete(name);
    // Remove from other plugins' dependencies
    for (const deps of this.graph.values()) {
      const idx = deps.indexOf(name);
      if (idx !== -1) deps.splice(idx, 1);
    }
  }

  /**
   * Resolve the plugin initialization order.
   *
   * Uses Kahn's algorithm for topological sorting. Throws if
   * circular dependencies or missing dependencies are detected.
   *
   * @returns Array of plugin names in initialization order
   * @throws {PluginError} If circular dependencies detected
   * @throws {PluginError} If missing dependencies detected
   *
   * @example
   * ```typescript
   * const order = resolver.resolve();
   * console.log('Initialize in order:', order);
   * ```
   */
  resolve(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Build full graph with only valid dependencies
    const fullGraph = new Map<string, string[]>();
    for (const [name, deps] of this.graph) {
      const validDeps = deps.filter((d) => this.graph.has(d));
      fullGraph.set(name, validDeps);
    }

    // Check for missing dependencies
    for (const [name, deps] of this.graph) {
      for (const dep of deps) {
        if (!this.graph.has(dep)) {
          throw new PluginError(
            `Missing dependency: '${dep}' required by '${name}'`,
            name
          );
        }
      }
    }

    // Initialize in-degrees
    for (const [name, deps] of fullGraph) {
      inDegree.set(name, deps.length);
      if (deps.length === 0) queue.push(name);
    }

    // Process queue (Kahn's algorithm)
    while (queue.length > 0) {
      const name = queue.shift()!;
      result.push(name);

      for (const [depName, deps] of fullGraph) {
        if (deps.includes(name)) {
          inDegree.set(depName, inDegree.get(depName)! - 1);
          if (inDegree.get(depName) === 0) queue.push(depName);
        }
      }
    }

    // Check for cycles
    if (result.length !== fullGraph.size) {
      const cycle = this.detectCycle()!;
      throw new PluginError(
        `Circular dependency detected: ${cycle.join(' -> ')}`,
        'dependency-resolver'
      );
    }

    return result;
  }

  /**
   * Detect circular dependencies using DFS.
   *
   * @returns Array of plugin names forming a cycle, or null if no cycle
   *
   * @example
   * ```typescript
   * const cycle = resolver.detectCycle();
   * if (cycle) {
   *   console.log('Cycle:', cycle.join(' -> '));
   * }
   * ```
   */
  detectCycle(): string[] | null {
    const WHITE = 0,
      GRAY = 1,
      BLACK = 2;
    const color = new Map<string, number>();
    for (const name of this.graph.keys()) color.set(name, WHITE);

    /**
     * Depth-first search for cycle detection.
     *
     * Uses graph coloring:
     * - WHITE: Unvisited
     * - GRAY: Currently visiting (in recursion stack)
     * - BLACK: Fully visited
     */
    const dfs = (name: string, path: string[]): string[] | null => {
      color.set(name, GRAY);
      path.push(name);

      // Safe: dfs is only called with nodes that exist in graph
      for (const dep of this.graph.get(name)!) {
        if (!this.graph.has(dep)) continue;
        if (color.get(dep) === GRAY) {
          // Found cycle - extract cycle path
          const idx = path.indexOf(dep);
          return [...path.slice(idx), dep];
        }
        if (color.get(dep) === WHITE) {
          const result = dfs(dep, path);
          if (result) return result;
        }
      }

      path.pop();
      color.set(name, BLACK);
      return null;
    };

    for (const name of this.graph.keys()) {
      if (color.get(name) === WHITE) {
        const result = dfs(name, []);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Get the current dependency graph.
   *
   * @returns Object mapping plugin names to their dependencies
   *
   * @example
   * ```typescript
   * const graph = resolver.getGraph();
   * // { api: ['database'], database: [] }
   * ```
   */
  getGraph(): Record<string, string[]> {
    return Object.fromEntries(this.graph);
  }

  /**
   * Clear all plugins from the resolver.
   *
   * @example
   * ```typescript
   * resolver.clear();
   * ```
   */
  clear(): void {
    this.graph.clear();
  }
}
