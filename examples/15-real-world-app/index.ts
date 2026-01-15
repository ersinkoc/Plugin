/**
 * Example 15: Real-World Application
 *
 * This example demonstrates a realistic application structure using plugins.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin, EventMap } from '@oxog/types';

// Types
interface AppContext {
  env: 'development' | 'production';
  config: {
    port: number;
    database: { host: string; port: number };
  };
  services: {
    logger?: { log: (...args: unknown[]) => void };
    database?: { query: (sql: string) => Promise<unknown[]> };
    cache?: { get: (key: string) => string | undefined; set: (key: string, value: string) => void };
    auth?: { authenticate: (token: string) => boolean };
  };
}

interface AppEvents extends EventMap {
  'app:start': { timestamp: number };
  'app:stop': { reason: string };
  'user:login': { userId: string; ip: string };
  'user:logout': { userId: string };
  'request:start': { method: string; path: string };
  'request:end': { method: string; path: string; status: number };
  'error:occurred': { error: Error; context: string };
}

// Plugin 1: Configuration
const configPlugin: Plugin<AppContext> = {
  name: 'config',
  version: '1.0.0',
  install(kernel) {},
  async onInit(context) {
    const isDev = context.env === 'development';
    context.config = {
      port: isDev ? 3000 : 80,
      database: {
        host: isDev ? 'localhost' : 'db.prod.example.com',
        port: 5432
      }
    };
    console.log(`[Config] Environment: ${context.env}`);
    console.log(`[Config] Port: ${context.config.port}`);
  }
};

// Plugin 2: Logger
const loggerPlugin: Plugin<AppContext> = {
  name: 'logger',
  version: '1.0.0',
  dependencies: ['config'],
  install(kernel) {},
  async onInit(context) {
    const level = context.env === 'development' ? 'debug' : 'info';
    context.services.logger = {
      log: (...args: unknown[]) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}]`, ...args);
      }
    };
    console.log('[Logger] Initialized');
  }
};

// Plugin 3: Database
const databasePlugin: Plugin<AppContext> = {
  name: 'database',
  version: '1.0.0',
  dependencies: ['config', 'logger'],
  install(kernel) {},
  async onInit(context) {
    const { host, port } = context.config.database;
    const logger = context.services.logger!;

    logger.log(`[Database] Connecting to ${host}:${port}`);

    // Simulate connection
    await new Promise((resolve) => setTimeout(resolve, 100));

    context.services.database = {
      query: async (sql: string) => {
        logger.log(`[Database] Query: ${sql}`);
        return [{ id: 1, name: 'Test' }];
      }
    };

    logger.log('[Database] Connected');
  },
  async onDestroy() {
    console.log('[Database] Connection closed');
  }
};

// Plugin 4: Cache
const cachePlugin: Plugin<AppContext> = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['logger'],
  install(kernel) {},
  async onInit(context) {
    const store = new Map<string, string>();
    const logger = context.services.logger!;

    context.services.cache = {
      get: (key: string) => store.get(key),
      set: (key: string, value: string) => {
        store.set(key, value);
        logger.log(`[Cache] Set: ${key}`);
      }
    };

    logger.log('[Cache] Initialized');
  }
};

// Plugin 5: Authentication
const authPlugin: Plugin<AppContext> = {
  name: 'auth',
  version: '1.0.0',
  dependencies: ['database', 'cache', 'logger'],
  install(kernel) {},
  async onInit(context) {
    const logger = context.services.logger!;

    context.services.auth = {
      authenticate: (token: string) => {
        logger.log(`[Auth] Authenticating token: ${token.slice(0, 10)}...`);
        // Simplified auth logic
        return token.startsWith('valid-');
      }
    };

    logger.log('[Auth] Initialized');
  }
};

// Plugin 6: API Server
const apiPlugin: Plugin<AppContext, AppEvents> = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['auth', 'logger', 'database'],
  install(kernel) {},
  async onInit(context, kernel) {
    const logger = context.services.logger!;
    const auth = context.services.auth!;
    const db = context.services.database!;

    // Simulate request handling
    kernel.on('request:start' as any, (payload) => {
      logger.log(`[API] ${payload.method} ${payload.path}`);
    });

    kernel.on('request:end' as any, (payload) => {
      logger.log(`[API] ${payload.method} ${payload.path} -> ${payload.status}`);
    });

    logger.log('[API] Server initialized');
  }
};

// Main application
async function run() {
  const kernel = createKernel<AppContext, AppEvents>({
    context: {
      env: 'development',
      config: {} as any,
      services: {}
    },
    errorStrategy: 'isolate',
    onError: (error, pluginName) => {
      console.error(`[ERROR] Plugin "${pluginName}": ${error.message}`);
    },
    onBeforeInit: async () => {
      console.log('=== Application Starting ===\n');
    },
    onAfterInit: async () => {
      console.log('\n=== Application Ready ===');
      console.log(`Plugins: ${kernel.getPluginNames().join(', ')}`);
      console.log(`Dependency Graph:`, kernel.getDependencyGraph());
    },
    onBeforeDestroy: async () => {
      console.log('\n=== Application Stopping ===');
    }
  });

  // Register plugins (order doesn't matter due to dependency resolution)
  kernel.useAll([
    apiPlugin,
    configPlugin,
    loggerPlugin,
    databasePlugin,
    cachePlugin,
    authPlugin
  ]);

  // Initialize
  await kernel.init();

  // Simulate some application events
  console.log('\n=== Simulating Events ===');
  kernel.emit('request:start' as any, { method: 'GET', path: '/api/users' });
  kernel.emit('request:end' as any, { method: 'GET', path: '/api/users', status: 200 });
  kernel.emit('user:login' as any, { userId: 'user_123', ip: '192.168.1.1' });

  // Cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));
  await kernel.destroy();
  console.log('\n=== Application Stopped ===');
}

run().catch(console.error);

// Expected output:
// === Application Starting ===
//
// [Config] Environment: development
// [Config] Port: 3000
// [Logger] Initialized
// [Database] Connecting to localhost:5432
// [2025-01-15T...] [Database] Query: SELECT 1
// [2025-01-15T...] [Database] Connected
// [Cache] Initialized
// [Auth] Initialized
// [API] Server initialized
//
// === Application Ready ===
// Plugins: config, logger, database, cache, auth, api
// Dependency Graph: {
//   api: [ 'auth', 'logger', 'database' ],
//   config: [],
//   logger: [ 'config' ],
//   database: [ 'config', 'logger' ],
//   cache: [ 'logger' ],
//   auth: [ 'database', 'cache', 'logger' ]
// }
//
// === Simulating Events ===
// [2025-01-15T...] [API] GET /api/users
// [2025-01-15T...] [API] GET /api/users -> 200
//
// === Application Stopping ===
// [Database] Connection closed
//
// === Application Stopped ===
