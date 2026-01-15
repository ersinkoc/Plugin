/**
 * Example 01: Basic Kernel
 *
 * This example demonstrates creating a simple kernel with a plugin.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

// Define a simple plugin
const helloPlugin: Plugin = {
  name: 'hello',
  version: '1.0.0',
  install(kernel) {
    // Extend the kernel with a hello function
    kernel.hello = (name: string) => {
      console.log(`Hello, ${name}!`);
    };
  }
};

// Create a kernel
const kernel = createKernel();

// Register the plugin
kernel.use(helloPlugin);

// Use the plugin's functionality
(kernel as any).hello('World');

// Expected output:
// Hello, World!
