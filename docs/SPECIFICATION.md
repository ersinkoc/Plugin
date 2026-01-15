# @oxog/plugin - Specification v1.0.0

## 1. Overview

**Package Identity:** `@oxog/plugin`

**Purpose:** Micro-kernel plugin system for the @oxog ecosystem with typed events, lifecycle hooks, and dependency resolution.

**Type:** Core Infrastructure Package

## 2. Scope

### 2.1 In Scope

- Plugin lifecycle management (install → init → destroy)
- Typed event bus for inter-plugin communication
- Automatic dependency resolution via topological sort
- Configurable error boundaries (isolate, fail-fast, collect)
- Context management for shared state
- Dynamic plugin registration/unregistration
- Plugin query APIs
- Chainable fluent API

### 2.2 Out of Scope

- Plugin hot-reloading (file watching)
- Remote plugin loading
- Plugin sandboxing/security isolation
- Version conflict resolution
- Plugin marketplace/distribution

## 3. Functional Requirements

### 3.1 Kernel Creation

**FR-1.1:** The package MUST export a `createKernel` factory function.

**FR-1.2:** `createKernel` MUST accept optional configuration:
- `context`: Initial shared context
- `errorStrategy`: 'isolate' | 'fail-fast' | 'collect'
- `onError`: Global error handler
- Lifecycle hooks: `onBeforeInit`, `onAfterInit`, `onBeforeDestroy`, `onAfterDestroy`

**FR-1.3:** `createKernel` MUST support generic type parameters for context and events.

### 3.2 Plugin Registration

**FR-2.1:** The kernel MUST provide a `use(plugin)` method that returns `this` for chaining.

**FR-2.2:** The kernel MUST provide a `useAll(plugins[])` method for batch registration.

**FR-2.3:** Plugin registration MUST immediately call the plugin's `install(kernel)` hook.

**FR-2.4:** Plugins with duplicate names MUST throw a `PluginError`.

### 3.3 Plugin Lifecycle

**FR-3.1:** `kernel.init()` MUST:
- Call `onBeforeInit` hook
- Sort plugins by dependencies (topological)
- Call each plugin's `onInit(context)` in dependency order
- Call `onAfterInit` hook
- Set kernel state to Ready

**FR-3.2:** `kernel.destroy()` MUST:
- Call `onBeforeDestroy` hook
- Call each plugin's `onDestroy()` in reverse dependency order
- Call `onAfterDestroy` hook
- Set kernel state to Destroyed
- Clear all event subscriptions

**FR-3.3:** `install(kernel)` MUST be called synchronously during `use()`.

**FR-3.4:** `onInit(context)` and `onDestroy()` MAY be async.

### 3.4 Dependency Resolution

**FR-4.1:** The kernel MUST resolve plugin dependencies using topological sort.

**FR-4.2:** Dependencies MUST be satisfied before dependent plugin's `onInit` is called.

**FR-4.3:** Circular dependencies MUST throw a `PluginError` with cycle path.

**FR-4.4:** Missing dependencies MUST throw a `PluginError`.

### 3.5 Event Bus

**FR-5.1:** The kernel MUST emit typed events via `emit<K>(event, payload)`.

**FR-5.2:** The kernel MUST support event subscription via `on<K>(event, handler)`.

**FR-5.3:** `on()` MUST return an unsubscribe function.

**FR-5.4:** The kernel MUST support wildcard subscription with `'*'`.

**FR-5.5:** The kernel MUST support pattern subscription with `'prefix:*'`.

**FR-5.6:** The kernel MUST support `once(event, handler)` for single-fire subscriptions.

**FR-5.7:** The kernel MUST provide `off(event, handler)` for manual unsubscription.

### 3.6 Error Handling

**FR-6.1:** Error strategy 'isolate' MUST:
- Catch plugin errors
- Call plugin's `onError` handler if present
- Call global `onError` handler
- Continue initializing other plugins

**FR-6.2:** Error strategy 'fail-fast' MUST:
- Throw immediately on first error
- Stop initialization process

**FR-6.3:** Error strategy 'collect' MUST:
- Catch all plugin errors
- Continue initialization
- Throw `AggregateError` at the end

### 3.7 Plugin Queries

**FR-7.1:** `getPlugin(name)` MUST return the plugin or `undefined`.

**FR-7.2:** `hasPlugin(name)` MUST return boolean.

**FR-7.3:** `listPlugins()` MUST return readonly array of all plugins.

**FR-7.4:** `getPluginNames()` MUST return array of plugin names.

**FR-7.5:** `getDependencyGraph()` MUST return dependency map.

### 3.8 Dynamic Plugin Management

**FR-8.1:** `unregister(name)` MUST:
- Call plugin's `onDestroy()` if kernel is initialized
- Remove plugin from registry
- Return `true` if removed, `false` if not found

**FR-8.2:** `replace(plugin)` MUST:
- Unregister existing plugin with same name
- Register new plugin
- Initialize if kernel is ready

**FR-8.3:** `reload(name)` MUST:
- Call `onDestroy()` on the plugin
- Call `onInit(context)` on the plugin

**FR-8.4:** Adding plugin after kernel is ready MUST auto-initialize it.

### 3.9 Context Management

**FR-9.1:** `getContext()` MUST return the current context.

**FR-9.2:** `updateContext(partial)` MUST merge partial with current context.

**FR-9.3:** Context MUST be passed to each plugin's `onInit(context)`.

### 3.10 Kernel State

**FR-10.1:** `isInitialized()` MUST return true if kernel is in Ready state.

**FR-10.2:** `isDestroyed()` MUST return true if kernel is in Destroyed state.

**FR-10.3:** Kernel MUST have states: Created, Initializing, Ready, Destroying, Destroyed.

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1.1:** Core bundle size MUST be < 4KB gzipped.

**NFR-1.2:** Full bundle size MUST be < 6KB gzipped.

**NFR-1.3:** Event emission MUST be < 1ms for 100 subscribers.

### 4.2 Compatibility

**NFR-2.1:** Runtime MUST support Node.js >= 18.

**NFR-2.2:** Runtime MUST support modern browsers (ES2022+).

**NFR-2.3:** Package MUST provide ESM and CJS builds.

**NFR-2.4:** TypeScript version MUST be >= 5.0.

### 4.3 Quality

**NFR-3.1:** Test coverage MUST be 100%.

**NFR-3.2:** TypeScript strict mode MUST be enabled.

**NFR-3.3:** All public APIs MUST have JSDoc with examples.

### 4.4 Dependencies

**NFR-4.1:** ONLY `@oxog/types` allowed as runtime dependency.

**NFR-4.2:** NO external runtime dependencies allowed.

## 5. Type Definitions

### 5.1 Public Types

```typescript
// Factory
export function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: KernelOptions<TContext, TEvents>): KernelInstance<TContext, TEvents>;

// Plugin helper
export function definePlugin<TContext>(
  factory: PluginFactory<TContext>
): PluginFactory<TContext>;

// Error strategy
export type ErrorStrategy = 'isolate' | 'fail-fast' | 'collect';

// Kernel state
export enum KernelState {
  Created = 'created',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed'
}

// Options
export interface KernelOptions<TContext, TEvents extends EventMap> {
  context?: TContext;
  errorStrategy?: ErrorStrategy;
  onError?: (error: Error, pluginName: string) => void;
  onBeforeInit?: () => MaybePromise<void>;
  onAfterInit?: () => MaybePromise<void>;
  onBeforeDestroy?: () => MaybePromise<void>;
  onAfterDestroy?: () => MaybePromise<void>;
}

// Kernel instance (extends Kernel from @oxog/types)
export interface KernelInstance<TContext, TEvents extends EventMap>
  extends Kernel<TContext> {
  use(plugin: Plugin<TContext>): this;
  useAll(plugins: Plugin<TContext>[]): this;
  unregister(name: string): Promise<boolean>;
  replace(plugin: Plugin<TContext>): Promise<void>;
  reload(name: string): Promise<void>;
  init(): Promise<void>;
  destroy(): Promise<void>;
  isInitialized(): boolean;
  isDestroyed(): boolean;
  getPlugin<T>(name: string): T | undefined;
  hasPlugin(name: string): boolean;
  listPlugins(): ReadonlyArray<Plugin<TContext>>;
  getPluginNames(): string[];
  getDependencyGraph(): Record<string, string[]>;
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  on(event: '*', handler: (event: string, payload: unknown) => void): Unsubscribe;
  on(event: `${string}:*`, handler: (event: string, payload: unknown) => void): Unsubscribe;
  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void;
  getContext(): TContext;
  updateContext(partial: Partial<TContext>): void;
}

// Plugin factory
export type PluginFactory<TContext, TOptions = unknown> =
  (options: TOptions) => Plugin<TContext>;
```

## 6. API Contract

### 6.1 createKernel

```typescript
function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: KernelOptions<TContext, TEvents>): KernelInstance<TContext, TEvents>
```

**Preconditions:** None

**Postconditions:** Returns a new KernelInstance in Created state

**Throws:** Never

### 6.2 kernel.use

```typescript
function use(plugin: Plugin<TContext>): this
```

**Preconditions:**
- Kernel not in Destroyed state
- Plugin name not already registered

**Postconditions:**
- Plugin added to registry
- Plugin's `install()` called

**Throws:**
- `PluginError` if duplicate name
- `PluginError` if kernel destroyed

### 6.3 kernel.init

```typescript
function init(): Promise<void>
```

**Preconditions:**
- Kernel in Created state
- All dependencies satisfied

**Postconditions:**
- All plugins initialized
- Kernel in Ready state

**Throws:**
- `PluginError` if circular dependencies
- `PluginError` if missing dependencies
- `AggregateError` if errorStrategy is 'collect' and errors occur

### 6.4 kernel.destroy

```typescript
function destroy(): Promise<void>
```

**Preconditions:** None

**Postconditions:**
- All plugins destroyed
- Kernel in Destroyed state
- All event subscriptions cleared

**Throws:** Never (errors are isolated)

### 6.5 kernel.on

```typescript
function on<K extends keyof TEvents>(
  event: K,
  handler: (payload: TEvents[K]) => void
): Unsubscribe
```

**Preconditions:** None

**Postconditions:** Handler subscribed to event

**Throws:** Never

### 6.6 kernel.emit

```typescript
function emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void
```

**Preconditions:** None

**Postconditions:** All handlers called with payload

**Throws:** Never

## 7. Error Scenarios

### 7.1 Duplicate Plugin Name

```typescript
kernel.use({ name: 'foo', version: '1.0.0', install() {} });
kernel.use({ name: 'foo', version: '2.0.0', install() {} });
// Throws: PluginError("Plugin 'foo' is already registered")
```

### 7.2 Circular Dependency

```typescript
const a = { name: 'a', dependencies: ['b'], install() {} };
const b = { name: 'b', dependencies: ['a'], install() {} };
kernel.use(a).use(b);
await kernel.init();
// Throws: PluginError("Circular dependency detected: a -> b -> a")
```

### 7.3 Missing Dependency

```typescript
const a = { name: 'a', dependencies: ['missing'], install() {} };
kernel.use(a);
await kernel.init();
// Throws: PluginError("Missing dependency: 'missing' required by 'a'")
```

### 7.4 Plugin Init Error

```typescript
const bad = {
  name: 'bad',
  version: '1.0.0',
  install() {},
  async onInit() { throw new Error('boom'); }
};
kernel.use(bad);
await kernel.init();
// Behavior depends on errorStrategy
```

## 8. Test Requirements

### 8.1 Unit Tests

- [ ] Event bus: emit, on, off, once, wildcard, pattern
- [ ] Dependency resolver: topological sort, cycle detection
- [ ] Lifecycle manager: init order, destroy order
- [ ] Error boundary: isolate, fail-fast, collect
- [ ] Context manager: get, update, merge

### 8.2 Integration Tests

- [ ] Full lifecycle: create → use → init → use → destroy
- [ ] Plugin communication: event bus between plugins
- [ ] Error scenarios: all error types and strategies

## 9. Documentation Requirements

### 9.1 LLM-Native

- `llms.txt` file < 2000 tokens
- Minimum 15 code examples
- Rich JSDoc on all public APIs

### 9.2 Website Pages

1. Home - Overview, quick start
2. Getting Started - Installation, basic usage
3. Kernel - createKernel, configuration
4. Plugins - Writing plugins, lifecycle
5. Events - Event bus, patterns
6. Dependencies - Resolution, graphs
7. Error Handling - Strategies
8. Context - State sharing
9. Advanced - Dynamic plugins, factories
10. API Reference - Full API docs
11. Examples - Interactive examples
