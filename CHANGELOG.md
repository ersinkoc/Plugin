# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-01-25

### Fixed

- **Dynamic Plugin Dependency Validation**
  - Plugins added after `init()` now properly validate dependencies before initialization
  - Missing dependencies throw `PluginError` immediately when calling `use()` on ready kernel
  - Circular dependencies involving dynamically added plugins are now detected
  - Dependent plugins wait for their dependencies to complete initialization
  - If a dependency fails to initialize, dependent plugins are marked as failed with `plugin:error` event

- **Zombie Plugin Resource Leak Prevention**
  - `unregister()` and `unregisterAsync()` now properly handle plugins in `Initializing` state
  - When unregistering an initializing plugin, the system waits for init to complete then calls `onDestroy`
  - `onDestroy` is now called even if `onInit` failed, ensuring resource cleanup
  - Prevents memory leaks from orphaned resources (DB connections, event listeners, etc.)

- **EventBus.once() Subscription Cancellation**
  - `off()` now correctly removes `once()` subscriptions using the original handler reference
  - Previously, calling `off(event, handler)` after `once(event, handler)` would silently fail
  - Internal wrapper mapping tracks original handlers for proper cleanup

- **Plugin Registration During Initialization**
  - `use()` now throws `PluginError` when called while kernel is in `Initializing` state
  - Previously, plugins added during initialization would be silently ignored (never initialized)
  - Clear error message guides users to register plugins before `init()` or wait until ready

- **Internal Events Type-Safety**
  - Removed unsafe `unknown` type cast when emitting internal kernel events
  - EventBus now uses combined type `CombinedEvents<TEvents>` for type-safe internal events
  - Users can subscribe to internal events (`plugin:install`, `kernel:ready`, etc.) with full type inference
  - Internal event names are protected: user-defined events with same names use internal event types
  - Prevents runtime type mismatches when subscribing to internal events

### Added

- **DependencyResolver.validateSinglePlugin()**
  - New method to validate a single plugin's dependencies
  - Used internally for dynamic plugin validation
  - Checks for missing dependencies and circular references

- **Deep Context Merge**
  - `deepUpdateContext()` method for recursive nested object merging
  - Prevents data loss when updating nested configuration objects
  - `updateContext()` remains unchanged (shallow merge) for backward compatibility
  - Arrays are replaced, not merged (consistent with common deep merge behavior)

### Technical Details

- 245 tests with 100% code coverage
- No breaking changes from 1.0.1

## [1.0.1] - 2026-01-16

### Added

- **Late Plugin Initialization Control**
  - `waitForPlugin(name)` - Wait for specific plugin to complete initialization
  - `waitForAll()` - Wait for all pending plugin initializations
  - Useful when adding plugins after `init()` and need to ensure they're ready

- **Handler Deduplication**
  - Event bus now prevents duplicate handler registration
  - Same handler registered multiple times will only be called once per event
  - Applies to `on()`, `onWildcard()`, and `onPattern()` methods

- **Plugin Error Events**
  - `plugin:error` event now emitted when plugin initialization fails
  - Payload includes `{ name: string; error: Error }`

### Fixed

- **Race Condition in Late Plugin Initialization**
  - Plugins added after `init()` now properly tracked with pending promises
  - `replace()` now waits for pending initialization instead of double-initializing

### Changed

- Improved internal type safety with `InternalKernelEvents` interface
- Removed redundant error conversion in catch blocks (ErrorBoundary handles this)
- Documentation updates for new methods and events

### Technical Details

- 212 tests with 100% coverage
- No breaking changes from 1.0.0

## [1.0.0] - 2026-01-15

### Added

- **Core Kernel Implementation**
  - `createKernel()` factory function for creating micro-kernel instances
  - Fluent API with chainable method calls
  - Full TypeScript support with generics for context and events

- **Plugin Lifecycle Management**
  - `install()` - Synchronous plugin registration hook
  - `onInit()` - Async initialization with context access
  - `onDestroy()` - Async cleanup on shutdown
  - `onError()` - Per-plugin error handling

- **Typed Event System**
  - Type-safe event emission and subscription
  - `on()`, `once()`, `off()` for standard subscriptions
  - `onWildcard()` for listening to all events
  - `onPattern()` for prefix-based pattern matching (e.g., `user:*`)

- **Dependency Resolution**
  - Automatic topological sorting of plugins based on dependencies
  - Circular dependency detection with helpful error messages
  - Missing dependency validation

- **Error Handling Strategies**
  - `isolate` - Continue execution, isolate failing plugins
  - `fail-fast` - Stop immediately on first error
  - `collect` - Collect all errors, throw aggregate at end

- **Context Management**
  - Shared context object accessible to all plugins
  - `getContext()` and `updateContext()` methods
  - Type-safe context with generics

- **Dynamic Plugin Operations**
  - `unregister()` / `unregisterAsync()` - Remove plugins at runtime
  - `replace()` - Hot-swap plugin implementations
  - `reload()` - Re-initialize plugins without full restart

- **Kernel Lifecycle Hooks**
  - `onBeforeInit` / `onAfterInit` - Pre/post initialization
  - `onBeforeDestroy` / `onAfterDestroy` - Pre/post destruction

- **Query Methods**
  - `getPlugin()` - Get plugin by name
  - `hasPlugin()` - Check plugin existence
  - `listPlugins()` - Get all registered plugins
  - `getPluginNames()` - Get plugin name list
  - `getDependencyGraph()` - Get dependency graph object

- **Helper Utilities**
  - `definePlugin()` - Type-safe plugin factory helper
  - `KernelState` enum export

### Technical Details

- Zero runtime dependencies (only `@oxog/types` for type definitions)
- ESM-only package with TypeScript declarations
- Node.js >= 18 required
- < 4KB gzipped core bundle
- 100% test coverage (210 tests)

[1.0.2]: https://github.com/ersinkoc/plugin/releases/tag/v1.0.2
[1.0.1]: https://github.com/ersinkoc/plugin/releases/tag/v1.0.1
[1.0.0]: https://github.com/ersinkoc/plugin/releases/tag/v1.0.0
