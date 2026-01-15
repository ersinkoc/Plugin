# Plugin - @oxog NPM Package

## Package Identity

| Field | Value |
|-------|-------|
| **npm** | `@oxog/plugin` |
| **GitHub** | `https://github.com/ersinkoc/plugin` |
| **Website** | `https://plugin.oxog.dev` |
| **Author** | Ersin Koç |
| **License** | MIT |

> NO social media, Discord, email, or external links.

---

## Description

**One-line:** Micro-kernel plugin system for the @oxog ecosystem with typed events, lifecycle hooks, and dependency resolution.

`@oxog/plugin` is the heart of the @oxog ecosystem. It provides the core micro-kernel implementation that all other @oxog packages build upon. Features include plugin lifecycle management (install → init → destroy), typed event bus for inter-plugin communication, automatic dependency resolution, configurable error boundaries, and a clean chainable API.

---

## @oxog Dependencies

This package uses the following @oxog packages:

### @oxog/types

Provides the core type definitions:
- `Plugin<TContext>` - Plugin interface
- `Kernel<TContext>` - Kernel interface  
- `OxogError`, `PluginError` - Error classes
- `MaybePromise`, `Unsubscribe` - Utility types
- `EventMap`, `TypedEventEmitter` - Event types

```typescript
import type { 
  Plugin, 
  Kernel, 
  PluginError,
  MaybePromise,
  Unsubscribe,
  EventMap
} from '@oxog/types';
```

---

## NON-NEGOTIABLE RULES

### 1. DEPENDENCY POLICY

```json
{
  "dependencies": {
    "@oxog/types": "^1.0.0"
  }
}
```

- ONLY `@oxog/*` packages allowed as runtime dependencies
- NO external packages (lodash, eventemitter3, etc.)
- Implement event bus, dependency resolution from scratch

**Allowed devDependencies:**
```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

### 2. 100% TEST COVERAGE

- Every line, branch, function tested
- All tests must pass
- Use Vitest
- Thresholds enforced in config

### 3. MICRO-KERNEL ARCHITECTURE

This package IS the micro-kernel implementation:

```
┌─────────────────────────────────────────────────┐
│                   User Code                      │
├─────────────────────────────────────────────────┤
│             Plugin Registry API                  │
│    use() · register() · unregister() · list()   │
├──────────┬──────────┬──────────┬────────────────┤
│  Core    │ Optional │ Imported │   Community    │
│ Plugins  │ Plugins  │ Plugins  │    Plugins     │
├──────────┴──────────┴──────────┴────────────────┤
│                 Micro Kernel                     │
│     Event Bus · Lifecycle · Error Boundary      │
└─────────────────────────────────────────────────┘
```

### 4. DEVELOPMENT WORKFLOW

Create these documents FIRST:

1. **SPECIFICATION.md** - Complete spec
2. **IMPLEMENTATION.md** - Architecture
3. **TASKS.md** - Ordered task list

Only then implement code following TASKS.md.

### 5. TYPESCRIPT STRICT MODE

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### 6. LLM-NATIVE DESIGN

- `llms.txt` file (< 2000 tokens)
- Predictable API naming
- Rich JSDoc with @example
- Minimum 15 examples
- README optimized for LLMs

---

## CORE FEATURES

### 1. createKernel() Factory

Create a new micro-kernel instance with optional configuration.

```typescript
import { createKernel } from '@oxog/plugin';

// Simple usage
const kernel = createKernel();

// With context type
interface AppContext {
  env: 'development' | 'production';
  debug: boolean;
}

const kernel = createKernel<AppContext>({
  context: {
    env: 'development',
    debug: true
  }
});

// With typed events
interface AppEvents {
  'app:start': { timestamp: number };
  'app:stop': { reason: string };
  'plugin:error': { pluginName: string; error: Error };
}

const kernel = createKernel<AppContext, AppEvents>({
  context: { env: 'production', debug: false }
});

// Full configuration
const kernel = createKernel<AppContext, AppEvents>({
  context: { env: 'development', debug: true },
  errorStrategy: 'isolate', // 'isolate' | 'fail-fast' | 'collect'
  onError: (error, pluginName) => {
    console.error(`[${pluginName}] Error:`, error);
  }
});
```

### 2. Plugin Registration

Register plugins with automatic dependency resolution.

```typescript
import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const loggerPlugin: Plugin = {
  name: 'logger',
  version: '1.0.0',
  install(kernel) {
    kernel.logger = {
      log: (...args) => console.log('[LOG]', ...args),
      error: (...args) => console.error('[ERROR]', ...args)
    };
  }
};

const metricsPlugin: Plugin = {
  name: 'metrics',
  version: '1.0.0',
  dependencies: ['logger'], // Requires logger
  install(kernel) {
    const logger = kernel.getPlugin('logger');
    // Use logger...
  }
};

const kernel = createKernel();

// Chained registration
kernel
  .use(loggerPlugin)
  .use(metricsPlugin);

// Or array registration
kernel.useAll([loggerPlugin, metricsPlugin]);

// Plugins are sorted by dependencies automatically
await kernel.init();
```

### 3. Plugin Lifecycle

Explicit lifecycle management with async support.

```typescript
import { createKernel } from '@oxog/plugin';

const myPlugin: Plugin<AppContext> = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Phase 1: Install (sync, called on use())
  install(kernel) {
    console.log('Installing...');
    // Extend kernel, setup basic structure
    kernel.myFeature = { ready: false };
  },
  
  // Phase 2: Init (async, called on kernel.init())
  async onInit(context) {
    console.log('Initializing with context:', context);
    // Async setup, connect to services, etc.
    await loadResources();
    kernel.myFeature.ready = true;
  },
  
  // Phase 3: Destroy (async, called on kernel.destroy())
  async onDestroy() {
    console.log('Destroying...');
    // Cleanup resources, disconnect, etc.
    await cleanup();
  },
  
  // Error handler (called when error occurs in this plugin)
  onError(error) {
    console.error('Plugin error:', error);
  }
};

const kernel = createKernel();
kernel.use(myPlugin);

// Lifecycle
await kernel.init();     // Calls onInit for all plugins (in dependency order)
// ... use kernel ...
await kernel.destroy();  // Calls onDestroy for all plugins (reverse order)
```

### 4. Typed Event Bus

Type-safe event communication between plugins.

```typescript
import { createKernel } from '@oxog/plugin';

interface MyEvents {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'data:update': { key: string; value: unknown };
}

const kernel = createKernel<{}, MyEvents>();

// Subscribe to events (returns unsubscribe function)
const unsubscribe = kernel.on('user:login', (payload) => {
  // payload is typed as { userId: string; timestamp: number }
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

// Emit events
kernel.emit('user:login', { 
  userId: 'user_123', 
  timestamp: Date.now() 
});

// Unsubscribe
unsubscribe();

// Subscribe once (auto-unsubscribes after first event)
kernel.once('user:logout', (payload) => {
  console.log(`User ${payload.userId} logged out`);
});

// Wildcard subscription (all events)
kernel.on('*', (event, payload) => {
  console.log(`[${event}]`, payload);
});

// Pattern subscription (events starting with 'user:')
kernel.on('user:*', (event, payload) => {
  console.log(`User event: ${event}`, payload);
});
```

### 5. Dependency Resolution

Automatic topological sorting of plugins based on dependencies.

```typescript
import { createKernel } from '@oxog/plugin';

const database: Plugin = {
  name: 'database',
  version: '1.0.0',
  install(kernel) { /* ... */ }
};

const cache: Plugin = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['database'], // Needs database
  install(kernel) { /* ... */ }
};

const api: Plugin = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['cache', 'database'], // Needs both
  install(kernel) { /* ... */ }
};

const kernel = createKernel();

// Register in any order
kernel.use(api);      // Registered first but depends on others
kernel.use(database); // No dependencies
kernel.use(cache);    // Depends on database

// init() will call onInit in correct order:
// 1. database (no deps)
// 2. cache (after database)
// 3. api (after cache and database)
await kernel.init();

// destroy() calls onDestroy in reverse order:
// 1. api
// 2. cache
// 3. database
await kernel.destroy();
```

### 6. Error Boundaries

Configurable error isolation strategies.

```typescript
import { createKernel } from '@oxog/plugin';

// Strategy 1: Isolate (default) - Plugin errors don't affect others
const kernel1 = createKernel({
  errorStrategy: 'isolate',
  onError: (error, pluginName) => {
    console.error(`[${pluginName}] Error (isolated):`, error.message);
  }
});

// Strategy 2: Fail Fast - First error stops everything
const kernel2 = createKernel({
  errorStrategy: 'fail-fast'
});

try {
  await kernel2.init();
} catch (error) {
  console.error('Kernel init failed:', error);
}

// Strategy 3: Collect - Collect all errors, throw aggregate
const kernel3 = createKernel({
  errorStrategy: 'collect'
});

try {
  await kernel3.init();
} catch (error) {
  if (error instanceof AggregateError) {
    console.error('Multiple plugin errors:', error.errors);
  }
}

// Per-plugin error handling
const safePlugin: Plugin = {
  name: 'safe',
  version: '1.0.0',
  install(kernel) { /* ... */ },
  onError(error) {
    // Handle this plugin's errors specifically
    reportToMonitoring(error);
  }
};
```

### 7. Plugin Queries

Query and inspect registered plugins.

```typescript
import { createKernel } from '@oxog/plugin';

const kernel = createKernel();
kernel.use(pluginA).use(pluginB).use(pluginC);

// Check if plugin is registered
if (kernel.hasPlugin('logger')) {
  console.log('Logger is available');
}

// Get plugin by name
const logger = kernel.getPlugin('logger');
if (logger) {
  console.log(`Logger v${logger.version}`);
}

// Get plugin with type assertion
const typedPlugin = kernel.getPlugin<LoggerPlugin>('logger');

// List all plugins
const plugins = kernel.listPlugins();
console.log(`${plugins.length} plugins registered`);

// Get plugin names
const names = kernel.getPluginNames();
// ['logger', 'metrics', 'cache']

// Get dependency graph
const graph = kernel.getDependencyGraph();
// { api: ['cache', 'database'], cache: ['database'], database: [] }
```

### 8. Dynamic Plugin Management

Add and remove plugins at runtime.

```typescript
import { createKernel } from '@oxog/plugin';

const kernel = createKernel();
await kernel.init();

// Add plugin after init (auto-initializes)
await kernel.use(newPlugin);

// Unregister plugin (calls onDestroy)
const removed = await kernel.unregister('old-plugin');
console.log('Plugin removed:', removed);

// Replace plugin (unregister + register)
await kernel.replace(updatedPlugin);

// Reload plugin (destroy + init)
await kernel.reload('my-plugin');

// Check if kernel is initialized
if (kernel.isInitialized()) {
  // Safe to use plugins
}

// Check if kernel is destroyed
if (kernel.isDestroyed()) {
  // Kernel no longer usable
}
```

### 9. Context Management

Share state between plugins via context.

```typescript
import { createKernel } from '@oxog/plugin';

interface AppContext {
  config: {
    apiUrl: string;
    timeout: number;
  };
  services: {
    http?: HttpClient;
    cache?: CacheService;
  };
}

const kernel = createKernel<AppContext>({
  context: {
    config: {
      apiUrl: 'https://api.example.com',
      timeout: 5000
    },
    services: {}
  }
});

// Plugin can read and modify context
const httpPlugin: Plugin<AppContext> = {
  name: 'http',
  version: '1.0.0',
  install(kernel) {
    const ctx = kernel.getContext();
    ctx.services.http = new HttpClient(ctx.config.apiUrl);
  },
  onInit(context) {
    // Context is passed directly to onInit
    console.log('API URL:', context.config.apiUrl);
  }
};

// Get context from outside
const ctx = kernel.getContext();
console.log(ctx.config.apiUrl);

// Update context
kernel.updateContext({
  config: { ...ctx.config, timeout: 10000 }
});
```

### 10. Plugin Factories

Create configurable plugins with factory functions.

```typescript
import { createKernel, definePlugin } from '@oxog/plugin';

// definePlugin helper for type safety
const createLoggerPlugin = definePlugin<AppContext>((options: {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}) => ({
  name: 'logger',
  version: '1.0.0',
  
  install(kernel) {
    const prefix = options.prefix || '[LOG]';
    kernel.logger = {
      debug: (...args) => options.level === 'debug' && console.log(prefix, ...args),
      info: (...args) => ['debug', 'info'].includes(options.level) && console.info(prefix, ...args),
      warn: (...args) => ['debug', 'info', 'warn'].includes(options.level) && console.warn(prefix, ...args),
      error: (...args) => console.error(prefix, ...args),
    };
  }
}));

// Use factory
const kernel = createKernel();
kernel.use(createLoggerPlugin({ level: 'info', prefix: '[APP]' }));
```

---

## API DESIGN

### Main Exports

```typescript
// Factory function
export function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: KernelOptions<TContext, TEvents>): KernelInstance<TContext, TEvents>;

// Plugin factory helper
export function definePlugin<TContext = unknown>(
  factory: PluginFactory<TContext>
): PluginFactory<TContext>;

// Type re-exports from @oxog/types
export type { Plugin, Kernel, PluginError } from '@oxog/types';
```

### Type Definitions

```typescript
import type { Plugin, Kernel, EventMap, MaybePromise, Unsubscribe } from '@oxog/types';

/**
 * Error handling strategy.
 */
export type ErrorStrategy = 'isolate' | 'fail-fast' | 'collect';

/**
 * Kernel configuration options.
 */
export interface KernelOptions<TContext, TEvents extends EventMap> {
  /** Initial context value */
  context?: TContext;
  
  /** Error handling strategy */
  errorStrategy?: ErrorStrategy;
  
  /** Global error handler */
  onError?: (error: Error, pluginName: string) => void;
  
  /** Called before init */
  onBeforeInit?: () => MaybePromise<void>;
  
  /** Called after init */
  onAfterInit?: () => MaybePromise<void>;
  
  /** Called before destroy */
  onBeforeDestroy?: () => MaybePromise<void>;
  
  /** Called after destroy */
  onAfterDestroy?: () => MaybePromise<void>;
}

/**
 * Extended kernel instance with full API.
 */
export interface KernelInstance<TContext, TEvents extends EventMap> 
  extends Kernel<TContext> {
  
  // Plugin Management
  use(plugin: Plugin<TContext>): this;
  useAll(plugins: Plugin<TContext>[]): this;
  unregister(name: string): Promise<boolean>;
  replace(plugin: Plugin<TContext>): Promise<void>;
  reload(name: string): Promise<void>;
  
  // Lifecycle
  init(): Promise<void>;
  destroy(): Promise<void>;
  isInitialized(): boolean;
  isDestroyed(): boolean;
  
  // Plugin Queries
  getPlugin<T extends Plugin<TContext> = Plugin<TContext>>(name: string): T | undefined;
  hasPlugin(name: string): boolean;
  listPlugins(): ReadonlyArray<Plugin<TContext>>;
  getPluginNames(): string[];
  getDependencyGraph(): Record<string, string[]>;
  
  // Events (typed)
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  on(event: '*', handler: (event: string, payload: unknown) => void): Unsubscribe;
  on(event: `${string}:*`, handler: (event: string, payload: unknown) => void): Unsubscribe;
  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void;
  
  // Context
  getContext(): TContext;
  updateContext(partial: Partial<TContext>): void;
}

/**
 * Plugin factory function type.
 */
export type PluginFactory<TContext, TOptions = unknown> = 
  (options: TOptions) => Plugin<TContext>;

/**
 * Kernel state enum.
 */
export enum KernelState {
  Created = 'created',
  Initializing = 'initializing',
  Ready = 'ready',
  Destroying = 'destroying',
  Destroyed = 'destroyed'
}

/**
 * Internal events emitted by kernel.
 */
export interface KernelEvents {
  'kernel:init': { timestamp: number };
  'kernel:ready': { timestamp: number; plugins: string[] };
  'kernel:destroy': { timestamp: number };
  'kernel:destroyed': { timestamp: number };
  'plugin:install': { name: string; version: string };
  'plugin:init': { name: string };
  'plugin:destroy': { name: string };
  'plugin:error': { name: string; error: Error };
}
```

---

## INTERNAL ARCHITECTURE

### Core Modules

```
src/
├── index.ts              # Public exports
├── kernel.ts             # KernelInstance implementation
├── event-bus.ts          # Event bus with wildcards
├── dependency-resolver.ts # Topological sort
├── lifecycle-manager.ts  # Init/destroy orchestration
├── error-boundary.ts     # Error handling strategies
├── context-manager.ts    # Context state management
└── helpers.ts            # definePlugin, utilities
```

### Event Bus Implementation

```typescript
// Internal event bus supporting:
// - Typed events
// - Wildcard '*' (all events)
// - Pattern 'prefix:*' (events starting with prefix)
// - Once subscriptions
// - Proper cleanup on unsubscribe

class EventBus<TEvents extends EventMap> {
  private handlers: Map<string, Set<Function>>;
  private wildcardHandlers: Set<Function>;
  private patternHandlers: Map<string, Set<Function>>;
  
  on<K extends keyof TEvents>(event: K, handler: Function): Unsubscribe;
  once<K extends keyof TEvents>(event: K, handler: Function): Unsubscribe;
  off<K extends keyof TEvents>(event: K, handler: Function): void;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
}
```

### Dependency Resolver Implementation

```typescript
// Topological sort using Kahn's algorithm
// Detects circular dependencies and throws clear error

class DependencyResolver {
  resolve(plugins: Plugin[]): Plugin[]; // Sorted order
  detectCycle(plugins: Plugin[]): string[] | null; // Returns cycle path
  getGraph(): Record<string, string[]>; // Dependency graph
}
```

---

## TECHNICAL REQUIREMENTS

| Requirement | Value |
|-------------|-------|
| Runtime | Universal (Node.js + Browser) |
| Module Format | ESM + CJS |
| Node.js | >= 18 |
| TypeScript | >= 5.0 |
| Bundle (core) | < 4KB gzipped |
| Bundle (all) | < 6KB gzipped |

---

## PROJECT STRUCTURE

```
plugin/
├── .github/workflows/
│   ├── deploy.yml
│   └── publish.yml
├── src/
│   ├── index.ts
│   ├── kernel.ts
│   ├── event-bus.ts
│   ├── dependency-resolver.ts
│   ├── lifecycle-manager.ts
│   ├── error-boundary.ts
│   ├── context-manager.ts
│   ├── helpers.ts
│   └── types.ts
├── tests/
│   ├── unit/
│   │   ├── kernel.test.ts
│   │   ├── event-bus.test.ts
│   │   ├── dependency-resolver.test.ts
│   │   ├── lifecycle-manager.test.ts
│   │   ├── error-boundary.test.ts
│   │   └── context-manager.test.ts
│   ├── integration/
│   │   ├── full-lifecycle.test.ts
│   │   ├── plugin-communication.test.ts
│   │   └── error-scenarios.test.ts
│   └── fixtures/
│       └── test-plugins.ts
├── examples/
│   ├── 01-basic-kernel/
│   ├── 02-plugin-registration/
│   ├── 03-lifecycle-hooks/
│   ├── 04-typed-events/
│   ├── 05-wildcard-events/
│   ├── 06-dependencies/
│   ├── 07-error-handling/
│   ├── 08-context-sharing/
│   ├── 09-plugin-factories/
│   ├── 10-dynamic-plugins/
│   ├── 11-plugin-queries/
│   ├── 12-kernel-events/
│   ├── 13-error-strategies/
│   ├── 14-replace-reload/
│   └── 15-real-world-app/
├── website/
│   ├── public/CNAME
│   └── src/
├── llms.txt
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── README.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .prettierrc
├── eslint.config.js
└── .gitignore
```

---

## GITHUB WORKFLOWS

### deploy.yml (Website)

```yaml
name: Deploy Website

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run build
      - working-directory: ./website
        run: npm ci && npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './website/dist'
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### publish.yml (npm)

```yaml
name: Publish to npm

on:
  push:
    tags: ['v*']

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## WEBSITE REQUIREMENTS

- React 19 + Vite 6 + Tailwind CSS v4
- @oxog/codeshine for syntax highlighting (or Shiki if not ready)
- shadcn/ui components
- Lucide React icons
- JetBrains Mono + Inter fonts
- CNAME: plugin.oxog.dev
- Footer: "Made with ❤️ by Ersin KOÇ"
- GitHub link only (no social media)

### Pages

1. **Home** - Overview, quick start, key features
2. **Getting Started** - Installation, basic usage
3. **Kernel** - createKernel, configuration, lifecycle
4. **Plugins** - Writing plugins, lifecycle hooks
5. **Events** - Event bus, typed events, wildcards
6. **Dependencies** - Dependency resolution, graphs
7. **Error Handling** - Strategies, boundaries
8. **Context** - Sharing state between plugins
9. **Advanced** - Dynamic plugins, factories, patterns
10. **API Reference** - Full API documentation
11. **Examples** - Interactive examples

---

## IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Create SPECIFICATION.md
- [ ] Create IMPLEMENTATION.md
- [ ] Create TASKS.md

### During Implementation
- [ ] Follow TASKS.md sequentially
- [ ] Write tests with each feature
- [ ] Maintain 100% coverage
- [ ] JSDoc on every public API

### Package Completion
- [ ] All tests passing (100%)
- [ ] Coverage at 100%
- [ ] No TypeScript errors
- [ ] Package builds

### LLM-Native Completion
- [ ] llms.txt created (< 2000 tokens)
- [ ] README optimized
- [ ] 15+ examples
- [ ] 8-12 npm keywords

### Website Completion
- [ ] All pages implemented
- [ ] Syntax highlighting integrated
- [ ] Dark/Light theme
- [ ] CNAME configured

### Final
- [ ] `npm run build` succeeds
- [ ] `npm run test:coverage` shows 100%
- [ ] Website builds
- [ ] All examples run

---

## BEGIN IMPLEMENTATION

Start with **SPECIFICATION.md**, then **IMPLEMENTATION.md**, then **TASKS.md**.

Only after all three documents are complete, implement code following TASKS.md sequentially.

**Remember:**
- Production-ready for npm publish
- Only @oxog/types as dependency
- 100% test coverage
- LLM-native design
- Beautiful documentation website
