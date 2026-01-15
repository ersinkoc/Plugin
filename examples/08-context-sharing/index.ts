/**
 * Example 08: Context Sharing
 *
 * This example demonstrates sharing state between plugins via context.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

interface AppContext {
  config: {
    apiUrl: string;
    timeout: number;
  };
  services: {
    http?: { request: (url: string) => Promise<string> };
    cache?: { get: (key: string) => string };
  };
}

const httpPlugin: Plugin<AppContext> = {
  name: 'http',
  version: '1.0.0',
  install() {},
  async onInit(context) {
    // Read and use configuration
    const { apiUrl, timeout } = context.config;
    console.log(`HTTP plugin: configured for ${apiUrl} (timeout: ${timeout}ms)`);

    // Add service to context
    context.services.http = {
      request: async (url: string) => {
        return `Response from ${url}`;
      }
    };
  }
};

const cachePlugin: Plugin<AppContext> = {
  name: 'cache',
  version: '1.0.0',
  install() {},
  async onInit(context) {
    console.log('Cache plugin: initializing');

    // Add cache service
    context.services.cache = {
      get: (key: string) => `cached:${key}`
    };
  }
};

const apiPlugin: Plugin<AppContext> = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['http', 'cache'],
  install() {},
  async onInit(context) {
    console.log('API plugin: using shared services');

    // Use services provided by other plugins
    const cached = context.services.cache?.get('user:123');
    console.log(`  From cache: ${cached}`);

    // Note: context.services.http might be undefined in this example
    console.log('  Services available:', Object.keys(context.services));
  }
};

async function run() {
  const kernel = createKernel<AppContext>({
    context: {
      config: {
        apiUrl: 'https://api.example.com',
        timeout: 5000
      },
      services: {}
    }
  });

  kernel.use(httpPlugin);
  kernel.use(cachePlugin);
  kernel.use(apiPlugin);

  await kernel.init();

  // Update context at runtime
  console.log('\nUpdating config...');
  kernel.updateContext({
    config: { ...kernel.getContext().config, timeout: 10000 }
  });
  console.log('New timeout:', kernel.getContext().config.timeout);

  await kernel.destroy();
}

run().catch(console.error);

// Expected output:
// HTTP plugin: configured for https://api.example.com (timeout: 5000ms)
// Cache plugin: initializing
// API plugin: using shared services
//   From cache: cached:user:123
//   Services available: [ 'http', 'cache' ]
//
// Updating config...
// New timeout: 10000
