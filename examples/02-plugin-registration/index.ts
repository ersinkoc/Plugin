/**
 * Example 02: Plugin Registration
 *
 * This example demonstrates different ways to register plugins.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

// Create multiple plugins
const pluginA: Plugin = {
  name: 'alpha',
  version: '1.0.0',
  install(kernel) {
    console.log('Alpha plugin installed');
  }
};

const pluginB: Plugin = {
  name: 'beta',
  version: '1.0.0',
  install(kernel) {
    console.log('Beta plugin installed');
  }
};

const pluginC: Plugin = {
  name: 'gamma',
  version: '1.0.0',
  install(kernel) {
    console.log('Gamma plugin installed');
  }
};

// Method 1: Chain registration
console.log('Method 1: Chaining');
const kernel1 = createKernel();
kernel1.use(pluginA).use(pluginB).use(pluginC);

// Method 2: Batch registration
console.log('\nMethod 2: Batch registration');
const kernel2 = createKernel();
kernel2.useAll([pluginA, pluginB, pluginC]);

// Expected output:
// Method 1: Chaining
// Alpha plugin installed
// Beta plugin installed
// Gamma plugin installed
//
// Method 2: Batch registration
// Alpha plugin installed
// Beta plugin installed
// Gamma plugin installed
