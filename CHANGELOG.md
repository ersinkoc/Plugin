# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.1]: https://github.com/ersinkoc/plugin/releases/tag/v1.0.1
[1.0.0]: https://github.com/ersinkoc/plugin/releases/tag/v1.0.0
