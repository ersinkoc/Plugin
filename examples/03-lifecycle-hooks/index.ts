/**
 * Example 03: Lifecycle Hooks
 *
 * This example demonstrates plugin lifecycle: install, init, destroy.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const lifecyclePlugin: Plugin = {
  name: 'lifecycle-demo',
  version: '1.0.0',

  // Phase 1: Install (sync, called on use())
  install(kernel) {
    console.log('1. install() - Setting up plugin structure');
    kernel.state = 'installed';
  },

  // Phase 2: Init (async, called on kernel.init())
  async onInit(context) {
    console.log('2. onInit() - Initializing with async operations');
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('   Async operations complete');
  },

  // Phase 3: Destroy (async, called on kernel.destroy())
  async onDestroy() {
    console.log('3. onDestroy() - Cleaning up resources');
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log('   Cleanup complete');
  }
};

async function run() {
  const kernel = createKernel();

  console.log('Registering plugin...');
  kernel.use(lifecyclePlugin);

  console.log('\nInitializing kernel...');
  await kernel.init();

  console.log('\nDestroying kernel...');
  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// Registering plugin...
// 1. install() - Setting up plugin structure
//
// Initializing kernel...
// 2. onInit() - Initializing with async operations
//    Async operations complete
//
// Destroying kernel...
// 3. onDestroy() - Cleaning up resources
//    Cleanup complete
