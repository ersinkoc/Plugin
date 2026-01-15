/**
 * Example 12: Kernel Events
 *
 * This example demonstrates built-in kernel lifecycle events.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin, EventMap } from '@oxog/types';

interface AppEvents extends EventMap {
  'kernel:init': { timestamp: number };
  'kernel:ready': { timestamp: number; plugins: string[] };
  'kernel:destroy': { timestamp: number };
  'kernel:destroyed': { timestamp: number };
  'plugin:install': { name: string; version: string };
  'plugin:init': { name: string };
  'plugin:destroy': { name: string };
}

const kernel = createKernel<unknown, AppEvents>();

// Subscribe to kernel events
kernel.on('kernel:init' as any, (payload) => {
  console.log(`[KERNEL] Initializing at ${payload.timestamp}`);
});

kernel.on('kernel:ready' as any, (payload) => {
  console.log(`[KERNEL] Ready! Plugins: ${payload.plugins.join(', ')}`);
});

kernel.on('kernel:destroy' as any, (payload) => {
  console.log(`[KERNEL] Destroying at ${payload.timestamp}`);
});

kernel.on('kernel:destroyed' as any, (payload) => {
  console.log(`[KERNEL] Destroyed at ${payload.timestamp}`);
});

kernel.on('plugin:install' as any, (payload) => {
  console.log(`[PLUGIN] ${payload.name}@${payload.version} installed`);
});

// Create a plugin that emits custom events
const eventPlugin: Plugin = {
  name: 'event-emitter',
  version: '1.0.0',
  install() {},
  async onInit() {
    console.log('[PLUGIN] event-emitter initialized');
  },
  async onDestroy() {
    console.log('[PLUGIN] event-emitter destroyed');
  }
};

async function run() {
  console.log('=== Kernel Event Flow ===\n');

  console.log('Registering plugin...');
  kernel.use(eventPlugin);

  console.log('\nInitializing...');
  await kernel.init();

  console.log('\nDestroying...');
  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// === Kernel Event Flow ===
//
// Registering plugin...
// [PLUGIN] event-emitter@1.0.0 installed
//
// Initializing...
// [KERNEL] Initializing at 1234567890
// [PLUGIN] event-emitter initialized
// [KERNEL] Ready! Plugins: event-emitter
//
// Destroying...
// [KERNEL] Destroying at 1234567891
// [PLUGIN] event-emitter destroyed
// [KERNEL] Destroyed at 1234567891
