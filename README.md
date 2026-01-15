# @oxog/plugin

[![npm version](https://badge.fury.io/js/%40oxog%2Fplugin.svg)](https://www.npmjs.com/package/@oxog/plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Micro-kernel plugin system for the @oxog ecosystem with typed events, lifecycle hooks, and dependency resolution.

**@oxog/plugin** is the heart of the @oxog ecosystem. It provides the core micro-kernel implementation that all other @oxog packages build upon.

## Features

- **Plugin Lifecycle** - `install` → `init` → `destroy` with full async support
- **Typed Events** - Type-safe event bus for inter-plugin communication
- **Dependency Resolution** - Automatic topological sorting of plugins
- **Error Boundaries** - Configurable strategies: isolate, fail-fast, collect
- **Context Management** - Shared state between plugins
- **Dynamic Plugins** - Add, remove, replace, and reload at runtime
- **Fluent API** - Chainable method calls
- **Zero Dependencies** - Only `@oxog/types` at runtime
- **Universal** - Works in Node.js >= 18 and modern browsers
- **Tiny Bundle** - < 4KB gzipped core, < 6KB total

## Installation

```bash
npm install @oxog/plugin
```

## Quick Start

```typescript
import { createKernel } from '@oxog/plugin';

// Create a kernel
const kernel = createKernel();

// Define a plugin
const loggerPlugin = {
  name: 'logger',
  version: '1.0.0',
  install(kernel) {
    kernel.log = (...args) => console.log('[LOG]', ...args);
  }
};

// Register and initialize
kernel.use(loggerPlugin);
await kernel.init();

// Use the plugin
(kernel as any).log('Hello, World!');

// Cleanup
await kernel.destroy();
```

## Documentation

For full documentation, examples, and API reference, visit [plugin.oxog.dev](https://plugin.oxog.dev).

### Examples

- [01 - Basic Kernel](./examples/01-basic-kernel)
- [02 - Plugin Registration](./examples/02-plugin-registration)
- [03 - Lifecycle Hooks](./examples/03-lifecycle-hooks)
- [04 - Typed Events](./examples/04-typed-events)
- [05 - Wildcard Events](./examples/05-wildcard-events)
- [06 - Dependencies](./examples/06-dependencies)
- [07 - Error Handling](./examples/07-error-handling)
- [08 - Context Sharing](./examples/08-context-sharing)
- [09 - Plugin Factories](./examples/09-plugin-factories)
- [10 - Dynamic Plugins](./examples/10-dynamic-plugins)
- [11 - Plugin Queries](./examples/11-plugin-queries)
- [12 - Kernel Events](./examples/12-kernel-events)
- [13 - Error Strategies](./examples/13-error-strategies)
- [14 - Replace & Reload](./examples/14-replace-reload)
- [15 - Real-World App](./examples/15-real-world-app)

## API Reference

### `createKernel<TContext, TEvents>(options?)`

Creates a new micro-kernel instance.

**Options:**
- `context` - Initial shared context
- `errorStrategy` - 'isolate' | 'fail-fast' | 'collect'
- `onError` - Global error handler
- `onBeforeInit`, `onAfterInit` - Init lifecycle hooks
- `onBeforeDestroy`, `onAfterDestroy` - Destroy lifecycle hooks

**Returns:** `KernelInstance<TContext, TEvents>`

### KernelInstance Methods

| Method | Description |
|--------|-------------|
| `use(plugin)` | Register a plugin |
| `useAll(plugins[])` | Register multiple plugins |
| `init()` | Initialize all plugins |
| `destroy()` | Destroy all plugins |
| `getPlugin(name)` | Get a plugin by name |
| `hasPlugin(name)` | Check if plugin exists |
| `listPlugins()` | Get all plugins |
| `getPluginNames()` | Get all plugin names |
| `getDependencyGraph()` | Get dependency graph |
| `on(event, handler)` | Subscribe to event |
| `once(event, handler)` | Subscribe once |
| `emit(event, payload)` | Emit event |
| `off(event, handler)` | Unsubscribe |
| `getContext()` | Get shared context |
| `updateContext(partial)` | Update context |
| `unregister(name)` | Remove plugin |
| `replace(plugin)` | Replace plugin |
| `reload(name)` | Reload plugin |

## Plugin Interface

```typescript
interface Plugin<TContext> {
  name: string;
  version: string;
  dependencies?: string[];

  install(kernel: Kernel<TContext>): void;
  onInit?(context: TContext): MaybePromise<void>;
  onDestroy?(): MaybePromise<void>;
  onError?(error: Error): void;
}
```

## License

[MIT](LICENSE) © Ersin Koç

## Links

- [GitHub](https://github.com/ersinkoc/plugin)
- [Website](https://plugin.oxog.dev)
- [Documentation](https://plugin.oxog.dev)
- [npm](https://www.npmjs.com/package/@oxog/plugin)

---

Made with ❤️ by Ersin Koç
