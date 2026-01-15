# @oxog/plugin - Implementation Tasks v1.0.0

## Phase 1: Project Setup

### Task 1.1: Initialize Project Structure
- [ ] Create `src/` directory
- [ ] Create `tests/unit/` directory
- [ ] Create `tests/integration/` directory
- [ ] Create `tests/fixtures/` directory
- [ ] Create `examples/` directory

### Task 1.2: Create Configuration Files
- [ ] Create `package.json` with correct dependencies
- [ ] Create `tsconfig.json` (strict mode)
- [ ] Create `tsup.config.ts` (build config)
- [ ] Create `vitest.config.ts` (test config)
- [ ] Create `.prettierrc`
- [ ] Create `eslint.config.js`
- [ ] Create `.gitignore`

### Task 1.3: Verify @oxog/types Availability
- [ ] Ensure `@oxog/types` is accessible
- [ ] Verify type imports work
- [ ] Create `src/types.ts` with internal types

## Phase 2: Core Infrastructure

### Task 2.1: Create types.ts
**File:** `src/types.ts`

Create internal type definitions:
```typescript
import type { EventMap, MaybePromise, Plugin } from '@oxog/types';

export type ErrorStrategy = 'isolate' | 'fail-fast' | 'collect';

export interface KernelConfig<TContext, TEvents extends EventMap> {
  context?: TContext;
  errorStrategy?: ErrorStrategy;
  onError?: (error: Error, pluginName: string) => void;
  onBeforeInit?: () => MaybePromise<void>;
  onAfterInit?: () => MaybePromise<void>;
  onBeforeDestroy?: () => MaybePromise<void>;
  onAfterDestroy?: () => MaybePromise<void>;
}

export interface InternalPlugin<TContext> {
  plugin: Plugin<TContext>;
  state: PluginState;
  initializedAt?: number;
}

export enum PluginState {
  Registered = 'registered',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed',
  Failed = 'failed'
}

export enum KernelState {
  Created = 'created',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed'
}

export type EventHandler<TPayload = unknown> = (payload: TPayload) => void;
export type WildcardHandler = (event: string, payload: unknown) => void;
export type PatternHandler = WildcardHandler;

export type PluginFactory<TContext, TOptions = unknown> =
  (options: TOptions) => Plugin<TContext>;
```

### Task 2.2: Create context-manager.ts
**File:** `src/context-manager.ts`

Implement context state management:
```typescript
import type { EventMap } from '@oxog/types';

export class ContextManager<TContext> {
  private context: TContext;

  constructor(initial: TContext) {
    this.context = initial;
  }

  get(): TContext {
    return this.context;
  }

  update(partial: Partial<TContext>): void {
    this.context = { ...this.context, ...partial };
  }
}
```

**Tests:** `tests/unit/context-manager.test.ts`
- [ ] Test `get()` returns context
- [ ] Test `update()` merges partial
- [ ] Test multiple updates

### Task 2.3: Create event-bus.ts
**File:** `src/event-bus.ts`

Implement type-safe event bus:
```typescript
import type { EventMap, Unsubscribe } from '@oxog/types';
import type { EventHandler, WildcardHandler, PatternHandler } from './types.js';

export class EventBus<TEvents extends EventMap> {
  private handlers = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<WildcardHandler>();
  private patternHandlers = new Map<string, Set<PatternHandler>>();

  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const eventKey = String(event);
    if (!this.handlers.has(eventKey)) {
      this.handlers.set(eventKey, new Set());
    }
    this.handlers.get(eventKey)!.add(handler);

    return () => {
      this.handlers.get(eventKey)?.delete(handler);
    };
  }

  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const wrapped: EventHandler<TEvents[K]> = (payload) => {
      handler(payload);
      this.off(event, wrapped);
    };
    return this.on(event, wrapped);
  }

  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    this.handlers.get(String(event))?.delete(handler);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const eventKey = String(event);

    // Direct handlers
    this.handlers.get(eventKey)?.forEach((h) => {
      try { h(payload); } catch {}
    });

    // Wildcard handlers
    this.wildcardHandlers.forEach((h) => {
      try { h(eventKey, payload); } catch {}
    });

    // Pattern handlers
    for (const [pattern, handlers] of this.patternHandlers) {
      if (this.matchPattern(pattern, eventKey)) {
        handlers.forEach((h) => {
          try { h(eventKey, payload); } catch {}
        });
      }
    }
  }

  onWildcard(handler: WildcardHandler): Unsubscribe {
    this.wildcardHandlers.add(handler);
    return () => { this.wildcardHandlers.delete(handler); };
  }

  onPattern(
    pattern: string,
    handler: PatternHandler
  ): Unsubscribe {
    if (!this.patternHandlers.has(pattern)) {
      this.patternHandlers.set(pattern, new Set());
    }
    this.patternHandlers.get(pattern)!.add(handler);
    return () => { this.patternHandlers.get(pattern)?.delete(handler); };
  }

  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.patternHandlers.clear();
  }

  private matchPattern(pattern: string, event: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return event.startsWith(prefix + ':');
    }
    return pattern === event;
  }
}
```

**Tests:** `tests/unit/event-bus.test.ts`
- [ ] Test `on()` and `emit()`
- [ ] Test `off()` removes handler
- [ ] Test `once()` auto-unsubscribes
- [ ] Test wildcard `*` subscription
- [ ] Test pattern `prefix:*` subscription
- [ ] Test `clear()` removes all handlers
- [ ] Test multiple handlers for same event
- [ ] Test handler errors don't affect other handlers

### Task 2.4: Create dependency-resolver.ts
**File:** `src/dependency-resolver.ts`

Implement topological sort:
```typescript
import { PluginError } from '@oxog/types';

export class DependencyResolver {
  private graph = new Map<string, string[]>();

  addPlugin(name: string, dependencies: string[] = []): void {
    this.graph.set(name, dependencies);
  }

  removePlugin(name: string): void {
    this.graph.delete(name);
    // Remove from other plugins' dependencies
    for (const deps of this.graph.values()) {
      const idx = deps.indexOf(name);
      if (idx !== -1) deps.splice(idx, 1);
    }
  }

  resolve(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Build full graph with missing deps
    const fullGraph = new Map<string, string[]>();
    for (const [name, deps] of this.graph) {
      const validDeps = deps.filter(d => this.graph.has(d));
      fullGraph.set(name, validDeps);
    }

    // Initialize in-degrees
    for (const [name, deps] of fullGraph) {
      inDegree.set(name, deps.length);
      if (deps.length === 0) queue.push(name);
    }

    // Process queue
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
      const cycle = this.detectCycle();
      throw new PluginError(
        `Circular dependency detected: ${cycle.join(' -> ')}`
      );
    }

    // Check for missing dependencies
    for (const [name, deps] of this.graph) {
      for (const dep of deps) {
        if (!this.graph.has(dep)) {
          throw new PluginError(
            `Missing dependency: '${dep}' required by '${name}'`
          );
        }
      }
    }

    return result;
  }

  detectCycle(): string[] | null {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const name of this.graph.keys()) color.set(name, WHITE);

    const cycle: string[] | null = null;

    const dfs = (name: string, path: string[]): string[] | null => {
      color.set(name, GRAY);
      path.push(name);

      for (const dep of this.graph.get(name) || []) {
        if (!this.graph.has(dep)) continue;
        if (color.get(dep) === GRAY) {
          // Found cycle
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

  getGraph(): Record<string, string[]> {
    return Object.fromEntries(this.graph);
  }

  clear(): void {
    this.graph.clear();
  }
}
```

**Tests:** `tests/unit/dependency-resolver.test.ts`
- [ ] Test simple ordering (A before B)
- [ ] Test complex ordering (A -> B -> C)
- [ ] Test independent plugins
- [ ] Test circular dependency throws
- [ ] Test missing dependency throws
- [ ] Test `getGraph()` returns correct structure
- [ ] Test `removePlugin()` updates graph
- [ ] Test `clear()` empties graph

### Task 2.5: Create error-boundary.ts
**File:** `src/error-boundary.ts`

Implement error handling strategies:
```typescript
import type { Plugin } from '@oxog/types';
import type { ErrorStrategy } from './types.js';
import { PluginError } from '@oxog/types';

type ErrorHandler = (error: Error, pluginName: string) => void;

export class ErrorBoundary {
  private strategy: ErrorStrategy;
  private globalHandler?: ErrorHandler;
  private errors: Error[] = [];

  constructor(
    strategy: ErrorStrategy,
    globalHandler?: ErrorHandler
  ) {
    this.strategy = strategy;
    this.globalHandler = globalHandler;
  }

  async withBoundary<T>(
    pluginName: string,
    plugin: Plugin<unknown>,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      await this.handleError(pluginName, plugin, err);
      throw err; // Re-throw for strategy handling
    }
  }

  private async handleError(
    pluginName: string,
    plugin: Plugin<unknown>,
    error: Error
  ): Promise<void> {
    // Call plugin's error handler
    if (plugin.onError) {
      try {
        plugin.onError(error);
      } catch {}
    }

    // Call global error handler
    if (this.globalHandler) {
      try {
        this.globalHandler(error, pluginName);
      } catch {}
    }

    // Store error if collecting
    if (this.strategy === 'collect') {
      this.errors.push(error);
    }
  }

  async wrapIsolate<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch {
      return null;
    }
  }

  async wrapFailFast<T>(fn: () => Promise<T>): Promise<T> {
    return await fn();
  }

  async wrapCollect<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error) {
        this.errors.push(error);
      }
      return null;
    }
  }

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

  clearErrors(): void {
    this.errors = [];
  }

  getErrors(): ReadonlyArray<Error> {
    return this.errors;
  }
}
```

**Tests:** `tests/unit/error-boundary.test.ts`
- [ ] Test `isolate` strategy continues on error
- [ ] Test `fail-fast` strategy throws immediately
- [ ] Test `collect` strategy collects all errors
- [ ] Test plugin `onError` is called
- [ ] Test global `onError` is called
- [ ] Test `throwIfErrors()` throws AggregateError
- [ ] Test `clearErrors()` clears stored errors

### Task 2.6: Create lifecycle-manager.ts
**File:** `src/lifecycle-manager.ts`

Implement lifecycle orchestration:
```typescript
import type { InternalPlugin } from './types.js';
import { ErrorBoundary } from './error-boundary.js';

export class LifecycleManager<TContext> {
  async initialize(
    plugins: Map<string, InternalPlugin<TContext>>,
    order: string[],
    context: TContext,
    errorBoundary: ErrorBoundary
  ): Promise<void> {
    for (const name of order) {
      const internal = plugins.get(name);
      if (!internal) continue;

      internal.state = 'initializing';

      await errorBoundary.withBoundary(name, internal.plugin, async () => {
        if (internal.plugin.onInit) {
          await internal.plugin.onInit!(context);
        }
      });

      internal.state = 'ready';
      internal.initializedAt = Date.now();
    }
  }

  async destroy(
    plugins: Map<string, InternalPlugin<TContext>>,
    order: string[],
    errorBoundary: ErrorBoundary
  ): Promise<void> {
    // Reverse order for shutdown
    const reverseOrder = [...order].reverse();

    for (const name of reverseOrder) {
      const internal = plugins.get(name);
      if (!internal) continue;

      internal.state = 'destroying';

      await errorBoundary.withBoundary(name, internal.plugin, async () => {
        if (internal.plugin.onDestroy) {
          await internal.plugin.onDestroy!();
        }
      });

      internal.state = 'destroyed';
    }
  }
}
```

**Tests:** `tests/unit/lifecycle-manager.test.ts`
- [ ] Test `initialize()` calls in order
- [ ] Test `destroy()` calls in reverse order
- [ ] Test context passed to `onInit`
- [ ] Test `onInit` and `onDestroy` optional
- [ ] Test state transitions

## Phase 3: Kernel Implementation

### Task 3.1: Create kernel.ts
**File:** `src/kernel.ts`

Implement KernelInstance class (the main class):
```typescript
import type {
  Plugin,
  Kernel,
  EventMap,
  Unsubscribe,
  PluginError
} from '@oxog/types';
import type {
  KernelConfig,
  InternalPlugin,
  KernelState,
  ErrorStrategy
} from './types.js';
import { PluginError as OPluginError } from '@oxog/types';
import { ContextManager } from './context-manager.js';
import { EventBus } from './event-bus.js';
import { DependencyResolver } from './dependency-resolver.js';
import { ErrorBoundary } from './error-boundary.js';
import { LifecycleManager } from './lifecycle-manager.js';

// Import KernelState enum for export
import { KernelState as KS } from './types.js';
export { KernelState as KS };

export class KernelInstance<TContext, TEvents extends EventMap>
  implements Kernel<TContext>
{
  private state: KernelState = KS.Created;
  private plugins = new Map<string, InternalPlugin<TContext>>();
  private context: ContextManager<TContext>;
  private events: EventBus<TEvents>;
  private resolver: DependencyResolver;
  private errorBoundary: ErrorBoundary;
  private lifecycle: LifecycleManager<TContext>;
  private config: KernelConfig<TContext, TEvents>;

  // Extended kernel for plugin extensions
  [key: string]: any;

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

  // Plugin Management
  use(plugin: Plugin<TContext>): this {
    if (this.state === KS.Destroyed) {
      throw new OPluginError('Cannot add plugins to destroyed kernel');
    }

    if (this.plugins.has(plugin.name)) {
      throw new OPluginError(`Plugin '${plugin.name}' is already registered`);
    }

    const internal: InternalPlugin<TContext> = {
      plugin,
      state: 'registered'
    };

    this.plugins.set(plugin.name, internal);
    this.resolver.addPlugin(plugin.name, plugin.dependencies || []);

    // Call install synchronously
    plugin.install(this);

    // Emit kernel event
    this.events.emit('plugin:install' as any, {
      name: plugin.name,
      version: plugin.version
    } as any);

    return this;
  }

  useAll(plugins: Plugin<TContext>[]): this {
    for (const plugin of plugins) {
      this.use(plugin);
    }
    return this;
  }

  async unregister(name: string): Promise<boolean> {
    const internal = this.plugins.get(name);
    if (!internal) return false;

    // Call onDestroy if initialized
    if (internal.state === 'ready' && internal.plugin.onDestroy) {
      try {
        await internal.plugin.onDestroy();
      } catch {}
    }

    this.plugins.delete(name);
    this.resolver.removePlugin(name);

    return true;
  }

  async replace(plugin: Plugin<TContext>): Promise<void> {
    await this.unregister(plugin.name);
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

  async reload(name: string): Promise<void> {
    const internal = this.plugins.get(name);
    if (!internal) return;

    if (internal.state === 'ready') {
      if (internal.plugin.onDestroy) {
        await this.errorBoundary.withBoundary(
          name,
          internal.plugin,
          async () => internal.plugin.onDestroy!()
        );
      }

      internal.state = 'registered';

      if (internal.plugin.onInit) {
        await this.errorBoundary.withBoundary(
          name,
          internal.plugin,
          async () => internal.plugin.onInit!(this.context.get())
        );
      }

      internal.state = 'ready';
    }
  }

  // Lifecycle
  async init(): Promise<void> {
    if (this.state !== KS.Created) {
      throw new OPluginError('Kernel already initialized');
    }

    this.state = KS.Initializing;

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
  }

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

    this.events.clear();
    this.state = KS.Destroyed;

    this.events.emit('kernel:destroyed' as any, { timestamp: Date.now() } as any);

    if (this.config.onAfterDestroy) {
      await this.config.onAfterDestroy();
    }
  }

  isInitialized(): boolean {
    return this.state === KS.Ready;
  }

  isDestroyed(): boolean {
    return this.state === KS.Destroyed;
  }

  // Plugin Queries
  getPlugin<T extends Plugin<TContext> = Plugin<TContext>>(
    name: string
  ): T | undefined {
    return this.plugins.get(name)?.plugin as T | undefined;
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  listPlugins(): ReadonlyArray<Plugin<TContext>> {
    return Array.from(this.plugins.values()).map((p) => p.plugin);
  }

  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  getDependencyGraph(): Record<string, string[]> {
    return this.resolver.getGraph();
  }

  // Events
  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe {
    return this.events.on(event, handler);
  }

  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe {
    return this.events.once(event, handler);
  }

  off<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): void {
    this.events.off(event, handler);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.events.emit(event, payload);
  }

  // Wildcard and pattern subscriptions (internal API)
  onWildcard(handler: (event: string, payload: unknown) => void): Unsubscribe {
    return this.events.onWildcard(handler);
  }

  onPattern(
    pattern: string,
    handler: (event: string, payload: unknown) => void
  ): Unsubscribe {
    return this.events.onPattern(pattern, handler);
  }

  // Context
  getContext(): TContext {
    return this.context.get();
  }

  updateContext(partial: Partial<TContext>): void {
    this.context.update(partial);
  }

  // Kernel interface compliance
  unregister(name: string): boolean {
    // This is sync in Kernel interface but we need async
    // We'll throw in real implementation
    throw new Error('Use await kernel.unregister()');
  }
}
```

**Tests:** `tests/unit/kernel.test.ts`
- [ ] Test `use()` registers plugin and calls `install()`
- [ ] Test `useAll()` registers multiple plugins
- [ ] Test duplicate plugin name throws
- [ ] Test `init()` calls `onInit` in dependency order
- [ ] Test `destroy()` calls `onDestroy` in reverse order
- [ ] Test `getPlugin()` returns plugin
- [ ] Test `hasPlugin()` returns boolean
- [ ] Test `listPlugins()` returns all plugins
- [ ] Test `getPluginNames()` returns names
- [ ] Test `getDependencyGraph()` returns graph
- [ ] Test `getContext()` returns context
- [ ] Test `updateContext()` updates context
- [ ] Test `isInitialized()` returns correct state
- [ ] Test `isDestroyed()` returns correct state
- [ ] Test `unregister()` removes plugin
- [ ] Test `replace()` replaces plugin
- [ ] Test `reload()` re-inits plugin

### Task 3.2: Create helpers.ts
**File:** `src/helpers.ts`

Implement utility functions:
```typescript
import type { PluginFactory } from './types.js';

export function definePlugin<TContext>(
  factory: PluginFactory<TContext>
): PluginFactory<TContext> {
  return factory;
}

export { KernelState as KS } from './types.js';
export type { ErrorStrategy, PluginFactory } from './types.js';
```

### Task 3.3: Create index.ts
**File:** `src/index.ts`

Public API exports:
```typescript
export { KernelInstance, KS as KernelState } from './kernel.js';
export { definePlugin } from './helpers.js';
export type { ErrorStrategy, PluginFactory } from './types.js';

// Type re-exports from @oxog/types
export type {
  Plugin,
  Kernel,
  PluginError,
  MaybePromise,
  Unsubscribe,
  EventMap
} from '@oxog/types';

import { KernelInstance } from './kernel.js';

/**
 * Create a new micro-kernel instance.
 *
 * @example
 * ```typescript
 * const kernel = createKernel();
 * ```
 *
 * @example
 * ```typescript
 * interface MyContext { env: string };
 * const kernel = createKernel<MyContext>({
 *   context: { env: 'dev' },
 *   errorStrategy: 'isolate'
 * });
 * ```
 */
export function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: {
  context?: TContext;
  errorStrategy?: 'isolate' | 'fail-fast' | 'collect';
  onError?: (error: Error, pluginName: string) => void;
  onBeforeInit?: () => void | Promise<void>;
  onAfterInit?: () => void | Promise<void>;
  onBeforeDestroy?: () => void | Promise<void>;
  onAfterDestroy?: () => void | Promise<void>;
}): KernelInstance<TContext, TEvents> {
  return new KernelInstance<TContext, TEvents>(options);
}
```

## Phase 4: Tests

### Task 4.1: Create Fixtures
**File:** `tests/fixtures/test-plugins.ts`

```typescript
import type { Plugin } from '@oxog/types';

export const createTestPlugin = (
  name: string,
  dependencies?: string[]
): Plugin<Record<string, unknown>> => ({
  name,
  version: '1.0.0',
  dependencies,
  install() {},
  async onInit() {},
  async onDestroy() {}
});

export const createFailingPlugin = (name: string): Plugin => ({
  name,
  version: '1.0.0',
  install() {},
  async onInit() {
    throw new Error(`Plugin ${name} failed`);
  }
});
```

### Task 4.2: Write Unit Tests
- [ ] `tests/unit/context-manager.test.ts`
- [ ] `tests/unit/event-bus.test.ts`
- [ ] `tests/unit/dependency-resolver.test.ts`
- [ ] `tests/unit/error-boundary.test.ts`
- [ ] `tests/unit/lifecycle-manager.test.ts`
- [ ] `tests/unit/kernel.test.ts`

### Task 4.3: Write Integration Tests
- [ ] `tests/integration/full-lifecycle.test.ts`
- [ ] `tests/integration/plugin-communication.test.ts`
- [ ] `tests/integration/error-scenarios.test.ts`

### Task 4.4: Achieve 100% Coverage
- [ ] Run tests with coverage
- [ ] Add missing tests
- [ ] Verify all branches covered

## Phase 5: Examples

### Task 5.1: Create 15 Examples

1. **examples/01-basic-kernel/index.ts**
2. **examples/02-plugin-registration/index.ts**
3. **examples/03-lifecycle-hooks/index.ts**
4. **examples/04-typed-events/index.ts**
5. **examples/05-wildcard-events/index.ts**
6. **examples/06-dependencies/index.ts**
7. **examples/07-error-handling/index.ts**
8. **examples/08-context-sharing/index.ts**
9. **examples/09-plugin-factories/index.ts**
10. **examples/10-dynamic-plugins/index.ts**
11. **examples/11-plugin-queries/index.ts**
12. **examples/12-kernel-events/index.ts**
13. **examples/13-error-strategies/index.ts**
14. **examples/14-replace-reload/index.ts**
15. **examples/15-real-world-app/index.ts**

## Phase 6: Documentation

### Task 6.1: Create llms.txt
**File:** `llms.txt`

LLM-optimized documentation (< 2000 tokens).

### Task 6.2: Create README.md
**File:** `README.md`

Main package documentation.

### Task 6.3: Add JSDoc
- [ ] Add JSDoc to all public APIs
- [ ] Include `@example` tags

## Phase 7: Website

### Task 7.1: Initialize Website
- [ ] Create `website/` directory
- [ ] Setup Vite + React + Tailwind

### Task 7.2: Create Pages
- [ ] Home page
- [ ] Getting Started
- [ ] Kernel documentation
- [ ] Plugins documentation
- [ ] Events documentation
- [ ] Dependencies documentation
- [ ] Error Handling documentation
- [ ] Context documentation
- [ ] Advanced patterns
- [ ] API Reference
- [ ] Examples

### Task 7.3: Deploy Config
- [ ] Create CNAME file
- [ ] Configure GitHub Pages

## Phase 8: Final Checks

### Task 8.1: Quality Checks
- [ ] All tests passing
- [ ] 100% coverage achieved
- [ ] No TypeScript errors
- [ ] Prettier check passes
- [ ] ESLint check passes
- [ ] Bundle size under limits

### Task 8.2: Build Verification
- [ ] `npm run build` succeeds
- [ ] ESM build works
- [ ] CJS build works
- [ ] TypeScript types generated correctly

---

## Execution Order

Follow tasks sequentially:
1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
2. Each phase's tasks in order
3. Verify each task before moving to next

## Success Criteria

- [ ] All tasks complete
- [ ] 100% test coverage
- [ ] All examples working
- [ ] Documentation complete
- [ ] Website functional
