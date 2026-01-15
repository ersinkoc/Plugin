/**
 * Example 10: Dynamic Plugins
 *
 * This example demonstrates adding/removing plugins at runtime.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const createCounterPlugin = (name: string, startValue: number): Plugin => ({
  name,
  version: '1.0.0',
  install(kernel) {
    kernel[`${name}Count`] = startValue;
  },
  async onInit(context, kernel) {
    console.log(`${name}: initialized with value ${startValue}`);
  },
  async onDestroy() {
    console.log(`${name}: destroyed`);
  }
});

async function run() {
  const kernel = createKernel();

  console.log('=== Initial plugins ===');
  kernel.use(createCounterPlugin('counter1', 10));
  kernel.use(createCounterPlugin('counter2', 20));

  await kernel.init();
  console.log('counter1:', (kernel as any).counter1);
  console.log('counter2:', (kernel as any).counter2);

  console.log('\n=== Adding plugin after init ===');
  await kernel.use(createCounterPlugin('counter3', 30));
  console.log('counter3:', (kernel as any).counter3);

  console.log('\n=== Unregistering plugin ===');
  const removed = await kernel.unregister('counter2');
  console.log('Removed counter2:', removed);
  console.log('Has counter2:', kernel.hasPlugin('counter2'));

  console.log('\n=== Replacing plugin ===');
  await kernel.replace(createCounterPlugin('counter1', 100));
  console.log('counter1 after replace:', (kernel as any).counter1);

  console.log('\n=== Reloading plugin ===');
  await kernel.reload('counter1');
  console.log('counter1 reloaded');

  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// === Initial plugins ===
// counter1: initialized with value 10
// counter2: initialized with value 20
// counter1: 10
// counter2: 20
//
// === Adding plugin after init ===
// counter3: initialized with value 30
// counter3: 30
//
// === Unregistering plugin ===
// counter2: destroyed
// Removed counter2: true
// Has counter2: false
//
// === Replacing plugin ===
// counter1: destroyed
// counter1: initialized with value 100
// counter1 after replace: 100
//
// === Reloading plugin ===
// counter1: destroyed
// counter1: initialized with value 100
// counter1 reloaded
