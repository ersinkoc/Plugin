/**
 * Example 13: Error Strategies
 *
 * This example demonstrates the three error handling strategies.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const createFailingPlugin = (name: string): Plugin => ({
  name,
  version: '1.0.0',
  install() {},
  async onInit() {
    throw new Error(`${name} failed!`);
  }
});

const createGoodPlugin = (name: string): Plugin => ({
  name,
  version: '1.0.0',
  install() {},
  async onInit() {
    console.log(`${name}: OK`);
  }
});

async function demonstrateStrategy(strategy: 'isolate' | 'fail-fast' | 'collect') {
  console.log(`\n=== Strategy: ${strategy} ===`);

  const kernel = createKernel({
    errorStrategy: strategy,
    onError: (error, name) => {
      console.log(`[ERROR HANDLER] ${name}: ${error.message}`);
    }
  });

  kernel.use(createGoodPlugin('good1'));
  kernel.use(createFailingPlugin('bad1'));
  kernel.use(createGoodPlugin('good2'));
  kernel.use(createFailingPlugin('bad2'));
  kernel.use(createGoodPlugin('good3'));

  try {
    await kernel.init();
    console.log(`Kernel initialized: ${kernel.isInitialized()}`);
  } catch (error) {
    if (error instanceof AggregateError) {
      console.log(`AggregateError with ${error.errors.length} errors:`);
      error.errors.forEach((e, i) => {
        console.log(`  ${i + 1}. ${(e as Error).message}`);
      });
    } else {
      console.log(`Error: ${(error as Error).message}`);
    }
  }
}

async function run() {
  await demonstrateStrategy('isolate');
  await demonstrateStrategy('fail-fast');
  await demonstrateStrategy('collect');
}

run().catch(console.error);

// Expected output:
// === Strategy: isolate ===
// good1: OK
// [ERROR HANDLER] bad1: bad1 failed!
// good2: OK
// [ERROR HANDLER] bad2: bad2 failed!
// good3: OK
// Kernel initialized: true
//
// === Strategy: fail-fast ===
// good1: OK
// [ERROR HANDLER] bad1: bad1 failed!
// Error: bad1 failed!
//
// === Strategy: collect ===
// good1: OK
// [ERROR HANDLER] bad1: bad1 failed!
// good2: OK
// [ERROR HANDLER] bad2: bad2 failed!
// good3: OK
// AggregateError with 2 errors:
//   1. bad1 failed!
//   2. bad2 failed!
