/**
 * Example 14: Replace and Reload
 *
 * This example demonstrates replacing and reloading plugins.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

let version = 1;

const createVersionedPlugin = (): Plugin => ({
  name: 'service',
  version: `${version}.0.0`,
  install(kernel) {
    kernel.serviceVersion = version;
    kernel.getServiceData = () => `v${version}`;
  },
  async onInit() {
    console.log(`Service v${version}: initialized`);
  },
  async onDestroy() {
    console.log(`Service v${version}: destroyed`);
  }
});

async function run() {
  const kernel = createKernel();

  // Initial plugin
  console.log('=== Initial Load ===');
  kernel.use(createVersionedPlugin());
  await kernel.init();
  console.log('Service version:', (kernel as any).serviceVersion);
  console.log('Service data:', (kernel as any).getServiceData());

  // Replace with new version
  console.log('\n=== Replace Plugin ===');
  version = 2;
  await kernel.replace(createVersionedPlugin());
  console.log('Service version:', (kernel as any).serviceVersion);
  console.log('Service data:', (kernel as any).getServiceData());

  // Reload current version
  console.log('\n=== Reload Plugin ===');
  await kernel.reload('service');

  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// === Initial Load ===
// Service v1: initialized
// Service version: 1
// Service data: v1
//
// === Replace Plugin ===
// Service v1: destroyed
// Service v2: initialized
// Service version: 2
// Service data: v2
//
// === Reload Plugin ===
// Service v2: destroyed
// Service v2: initialized
