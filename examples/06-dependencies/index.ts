/**
 * Example 06: Dependencies
 *
 * This example demonstrates automatic dependency resolution.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

// Plugins with dependency relationships
const databasePlugin: Plugin = {
  name: 'database',
  version: '1.0.0',
  install(kernel) {
    console.log('Database plugin: setting up connection');
    kernel.db = { connected: true };
  },
  async onInit() {
    console.log('Database plugin: connecting...');
  }
};

const cachePlugin: Plugin = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['database'], // Requires database
  install(kernel) {
    console.log('Cache plugin: setting up cache');
  },
  async onInit(context, kernel) {
    console.log('Cache plugin: initializing (database ready)');
  }
};

const apiPlugin: Plugin = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['cache', 'database'], // Requires both
  install(kernel) {
    console.log('API plugin: setting up routes');
  },
  async onInit() {
    console.log('API plugin: starting server (cache and database ready)');
  }
};

async function run() {
  const kernel = createKernel();

  // Register in any order - kernel will resolve dependencies
  console.log('Registering plugins (random order)...');
  kernel.use(apiPlugin);      // Registered first but depends on others
  kernel.use(databasePlugin); // No dependencies
  kernel.use(cachePlugin);    // Depends on database

  console.log('\nInitializing kernel...');
  await kernel.init();

  console.log('\nDependency graph:', kernel.getDependencyGraph());

  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// Registering plugins (random order)...
// API plugin: setting up routes
// Database plugin: setting up connection
// Cache plugin: setting up cache
//
// Initializing kernel...
// Database plugin: connecting...
// Cache plugin: initializing (database ready)
// API plugin: starting server (cache and database ready)
//
// Dependency graph: {
//   api: ['cache', 'database'],
//   database: [],
//   cache: ['database']
// }
