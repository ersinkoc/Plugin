/**
 * Example 07: Error Handling
 *
 * This example demonstrates plugin error handlers.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const goodPlugin: Plugin = {
  name: 'good',
  version: '1.0.0',
  install() {},
  async onInit() {
    console.log('Good plugin: initializing successfully');
  },
  onError(error) {
    console.log('Good plugin: error handler called (should not happen)');
  }
};

const badPlugin: Plugin = {
  name: 'bad',
  version: '1.0.0',
  install() {},
  async onInit() {
    console.log('Bad plugin: about to fail');
    throw new Error('Bad plugin failed!');
  },
  onError(error) {
    // Plugin-specific error handler
    console.log(`Bad plugin: caught error - ${error.message}`);
  }
};

async function run() {
  const kernel = createKernel({
    // Global error handler
    onError: (error, pluginName) => {
      console.log(`[GLOBAL] Plugin "${pluginName}" error: ${error.message}`);
    },
    errorStrategy: 'isolate' // Continue on error
  });

  kernel.use(goodPlugin);
  kernel.use(badPlugin);

  console.log('Initializing kernel...');
  await kernel.init();

  console.log('\nKernel is ready despite error!');
  console.log(`Is initialized: ${kernel.isInitialized()}`);

  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// Initializing kernel...
// Good plugin: initializing successfully
// Bad plugin: about to fail
// Bad plugin: caught error - Bad plugin failed!
// [GLOBAL] Plugin "bad" error: Bad plugin failed!
//
// Kernel is ready despite error!
// Is initialized: true
