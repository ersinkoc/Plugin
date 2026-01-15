# @oxog/plugin - Implementation Architecture v1.0.0

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Public API Layer                       │
│  createKernel() · definePlugin() · Type Exports             │
├─────────────────────────────────────────────────────────────┤
│                   KernelInstance Facade                     │
│  use() · init() · destroy() · on() · emit() · getPlugin()  │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   Event Bus  │  Dependency  │   Lifecycle  │    Error      │
│              │   Resolver   │   Manager    │   Boundary    │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                     Context Manager                         │
├─────────────────────────────────────────────────────────────┤
│                   Plugin Registry                           │
│  Map<name, Plugin> · Dependency Graph                       │
└─────────────────────────────────────────────────────────────┘
```

## 2. Module Design

### 2.1 index.ts

**Purpose:** Public API exports

**Exports:**
- `createKernel` - Main factory function
- `definePlugin` - Plugin factory helper
- Type re-exports from `@oxog/types`

**Responsibilities:**
- Factory function implementation
- Type forwarding for convenience

### 2.2 kernel.ts

**Purpose:** KernelInstance class implementation

**Key Features:**
- Fluent API (returns `this` for chaining)
- State management (Created → Initializing → Ready → Destroying → Destroyed)
- Public method delegation to internal modules

**Class Structure:**
```typescript
class KernelInstance<TContext, TEvents extends EventMap>
  implements KernelInstance<TContext, TEvents>
{
  // State
  private state: KernelState = KernelState.Created;
  private plugins: Map<string, InternalPlugin<TContext>>;
  private context: ContextManager<TContext>;
  private events: EventBus<TEvents>;
  private resolver: DependencyResolver;
  private lifecycle: LifecycleManager<TContext>;
  private errorBoundary: ErrorBoundary;

  // Configuration
  private config: KernelConfig<TContext>;

  // Public API
  use(plugin): this
  useAll(plugins): this
  init(): Promise<void>
  destroy(): Promise<void>
  // ... all other public methods
}
```

### 2.3 event-bus.ts

**Purpose:** Type-safe event emission and subscription

**Features:**
- Typed events via generics
- Wildcard subscription (`'*'`)
- Pattern subscription (`'prefix:*'`)
- `once()` subscriptions
- Auto-cleanup on kernel destroy

**Class Structure:**
```typescript
class EventBus<TEvents extends EventMap> {
  private handlers: Map<string, Set<EventHandler>>;
  private wildcardHandlers: Set<WildcardHandler>;
  private patternHandlers: Map<string, Set<PatternHandler>>;

  on<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe

  once<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe

  off<K extends keyof TEvents>(
    event: K,
    handler: (payload: TEvents[K]) => void
  ): void

  emit<K extends keyof TEvents>(
    event: K,
    payload: TEvents[K]
  ): void

  clear(): void
  private matchPattern(pattern: string, event: string): boolean
}
```

**Implementation Notes:**
- Handlers stored in `Map<string, Set<Function>>`
- Wildcard handlers stored separately for efficiency
- Pattern matching on `'*'` in event name
- Unsubscribe function removes handler from set

### 2.4 dependency-resolver.ts

**Purpose:** Topological sort for plugin initialization order

**Algorithm:** Kahn's Algorithm

**Class Structure:**
```typescript
class DependencyResolver {
  private graph: Map<string, string[]> = new Map();

  addPlugin(name: string, dependencies: string[]): void
  resolve(): string[]
  detectCycle(): string[] | null
  getGraph(): Record<string, string[]>
  private buildInDegreeMap(): Map<string, number>
  private dfsDetectCycle(): string[] | null
}
```

**Implementation Notes:**
- Build adjacency list from plugin dependencies
- Compute in-degree for each node
- Process nodes with in-degree 0
- Detect cycles using DFS coloring
- Return ordered array of plugin names

### 2.5 lifecycle-manager.ts

**Purpose:** Orchestrate plugin lifecycle hooks

**Class Structure:**
```typescript
class LifecycleManager<TContext> {
  async initialize(
    plugins: InternalPlugin<TContext>[],
    order: string[],
    context: TContext,
    errorBoundary: ErrorBoundary
  ): Promise<void>

  async destroy(
    plugins: InternalPlugin<TContext>[],
    order: string[],
    errorBoundary: ErrorBoundary
  ): Promise<void>

  private async runInit(
    plugin: InternalPlugin<TContext>,
    context: TContext,
    errorBoundary: ErrorBoundary
  ): Promise<void>

  private async runDestroy(
    plugin: InternalPlugin<TContext>,
    errorBoundary: ErrorBoundary
  ): Promise<void>
}
```

**Implementation Notes:**
- Initialize in dependency order
- Destroy in reverse dependency order
- Delegate error handling to ErrorBoundary
- Call plugin's `onInit(context)` and `onDestroy()`

### 2.6 error-boundary.ts

**Purpose:** Error isolation and strategy execution

**Class Structure:**
```typescript
class ErrorBoundary {
  private strategy: ErrorStrategy;
  private globalHandler?: ErrorHandler;
  private errors: Error[] = [];

  constructor(
    strategy: ErrorStrategy,
    globalHandler?: ErrorHandler
  )

  async withBoundary<T>(
    pluginName: string,
    fn: () => Promise<T>
  ): Promise<T>

  private async handleIsolate(
    pluginName: string,
    error: Error,
    pluginHandler?: ErrorHandler
  ): Promise<void>

  private async handleFailFast(
    pluginName: string,
    error: Error
  ): Promise<never>

  private async handleCollect(error: Error): Promise<void>

  throwIfErrors(): void
  clearErrors(): void
}
```

**Strategies:**

1. **isolate** (default):
   - Catch errors
   - Call plugin handler
   - Call global handler
   - Continue execution

2. **fail-fast**:
   - Throw immediately
   - Stop execution

3. **collect**:
   - Catch all errors
   - Store in array
   - Throw `AggregateError` at end

### 2.7 context-manager.ts

**Purpose:** Shared context state management

**Class Structure:**
```typescript
class ContextManager<TContext> {
  private context: TContext;

  constructor(initial: TContext)

  get(): TContext
  update(partial: Partial<TContext>): void
  private merge(source: TContext, partial: Partial<TContext>): TContext
}
```

**Implementation Notes:**
- Shallow merge for `update()`
- Deep merge not required (user can implement)
- Context is mutable by design

### 2.8 helpers.ts

**Purpose:** Utility functions and type helpers

**Exports:**
```typescript
// Type-safe plugin factory
export function definePlugin<TContext>(
  factory: PluginFactory<TContext>
): PluginFactory<TContext>

// Internal plugin wrapper
interface InternalPlugin<TContext> {
  plugin: Plugin<TContext>;
  state: PluginState;
  initializedAt?: number;
}

// Plugin state enum
enum PluginState {
  Registered = 'registered',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed',
  Failed = 'failed'
}

// Kernel state enum
export enum KernelState {
  Created = 'created',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed'
}
```

### 2.9 types.ts

**Purpose:** Internal type definitions

**Exports:**
```typescript
import type { EventMap, MaybePromise } from '@oxog/types';

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

export type EventHandler<TPayload = unknown> = (payload: TPayload) => void;
export type WildcardHandler = (event: string, payload: unknown) => void;
export type PatternHandler = WildcardHandler;

export interface PluginFactory<TContext, TOptions = unknown> {
  (options: TOptions): Plugin<TContext>;
}
```

## 3. Data Flow

### 3.1 Plugin Registration Flow

```
user code
  │
  ├─> kernel.use(plugin)
  │       │
  │       ├─> Check state (not Destroyed)
  │       ├─> Check duplicate name
  │       ├─> Create InternalPlugin wrapper
  │       ├─> plugin.install(kernel)  [synchronous]
  │       ├─> resolver.addPlugin(name, deps)
  │       └─> Return this
  │
  └─> kernel.init()  [later]
          │
          ├─> onBeforeInit()
          ├─> resolver.resolve()  [topological sort]
          ├─> lifecycle.initialize(plugins, order, context)
          │       │
          │       └─> For each plugin in order:
          │               ├─> errorBoundary.withBoundary()
          │               ├─> plugin.onInit(context)  [async]
          │               └─> Set plugin state to Ready
          │
          ├─> onAfterInit()
          └─> Set kernel state to Ready
```

### 3.2 Event Emission Flow

```
kernel.emit('event', payload)
  │
  ├─> Get handlers for 'event'
  ├─> Get wildcard handlers
  ├─> Get pattern handlers matching 'event:*'
  │
  └─> For each handler:
          ├─> try { handler(payload) }
          └─> catch { /* ignore or log */ }
```

### 3.3 Error Handling Flow

```
plugin.onInit() throws
  │
  ├─> errorBoundary.withBoundary()
  │       │
  │       └─> switch (strategy)
  │               │
  │               ├─> 'isolate':
  │               │       ├─> plugin.onError(error)
  │               │       ├─> globalOnError(error, name)
  │               │       └─> Return (continue)
  │               │
  │               ├─> 'fail-fast':
  │               │       └─> throw error
  │               │
  │               └─> 'collect':
  │                       ├─> errors.push(error)
  │                       └─> Return (continue)
```

## 4. Key Implementation Details

### 4.1 Topological Sort (Kahn's Algorithm)

```typescript
function resolve(): string[] {
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];

  // Initialize in-degrees
  for (const [name, deps] of this.graph) {
    inDegree.set(name, deps.filter(d => this.graph.has(d)).length);
    if (inDegree.get(name) === 0) queue.push(name);
  }

  // Process queue
  while (queue.length > 0) {
    const name = queue.shift()!;
    result.push(name);

    for (const [depName, deps] of this.graph) {
      if (deps.includes(name)) {
        inDegree.set(depName, inDegree.get(depName)! - 1);
        if (inDegree.get(depName) === 0) queue.push(depName);
      }
    }
  }

  // Check for cycles
  if (result.length !== this.graph.size) {
    const cycle = this.detectCycle();
    throw new PluginError(`Circular dependency: ${cycle.join(' -> ')}`);
  }

  return result;
}
```

### 4.2 Pattern Matching

```typescript
private matchPattern(pattern: string, event: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -2);
    return event.startsWith(prefix + ':');
  }
  return pattern === event;
}
```

### 4.3 Unsubscribe Function

```typescript
on<K extends keyof TEvents>(
  event: K,
  handler: (payload: TEvents[K]) => void
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
```

### 4.4 Context Merge

```typescript
update(partial: Partial<TContext>): void {
  this.context = { ...this.context, ...partial };
}
```

## 5. Bundle Size Considerations

### 5.1 Tree-Shaking

- Export named functions, not objects
- Avoid default exports
- Use `/* @__PURE__ */` comments on pure functions

### 5.2 Code Splitting

No code splitting needed - core is small enough.

### 5.3 Minification

- Use `tsup` with `treeshake: true`
- Enable `minify: true`
- Use `dts: true` for `.d.ts` files

## 6. Test Strategy

### 6.1 Unit Tests

Each module tested in isolation:

- **event-bus.test.ts**: All event scenarios
- **dependency-resolver.test.ts**: Sort orders, cycles
- **lifecycle-manager.test.ts**: Init/destroy flows
- **error-boundary.test.ts**: All strategies
- **context-manager.test.ts**: Get/update
- **kernel.test.ts**: Full API

### 6.2 Integration Tests

End-to-end scenarios:

- **full-lifecycle.test.ts**: Complete kernel lifecycle
- **plugin-communication.test.ts**: Event bus usage
- **error-scenarios.test.ts**: All error paths

### 6.3 Coverage Targets

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
```

## 7. Build Configuration

### 7.1 tsup.config.ts

```typescript
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  minify: true,
  clean: true,
  target: 'es2022'
});
```

### 7.2 tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 8. File Structure

```
src/
├── index.ts              # Public exports
├── kernel.ts             # KernelInstance class
├── event-bus.ts          # EventBus class
├── dependency-resolver.ts # DependencyResolver class
├── lifecycle-manager.ts  # LifecycleManager class
├── error-boundary.ts     # ErrorBoundary class
├── context-manager.ts    # ContextManager class
├── helpers.ts            # Utilities, definePlugin
└── types.ts              # Internal types
```

## 9. Dependency Graph

```
@oxog/plugin
  │
  └── @oxog/types (peer dependency)
        ├── Plugin<TContext>
        ├── Kernel<TContext>
        ├── PluginError
        ├── EventMap
        ├── MaybePromise
        └── Unsubscribe
```

## 10. Performance Optimizations

### 10.1 Event Bus

- Use `Set` for O(1) handler add/remove
- Avoid array iteration for wildcard/pattern matching
- Lazy handler set creation

### 10.2 Dependency Resolution

- Cache sorted order until plugins change
- Use Map for O(1) lookups

### 10.3 Plugin Registry

- Use Map for O(1) plugin lookup
- Store InternalPlugin wrapper separately
