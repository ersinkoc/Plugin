
import { KernelInstance } from './src/kernel';
import { Plugin } from './src/types';

const kernel = new KernelInstance();

let resourceLeaked = false;

const slowPlugin: Plugin<any> = {
  name: 'slow',
  version: '1.0.0',
  install: () => {},
  onInit: async () => {
    // Simulate slow init
    await new Promise(resolve => setTimeout(resolve, 100));
    resourceLeaked = true; // This represents opening a DB connection, etc.
    console.log('Plugin onInit finished (Resource allocated)');
  },
  onDestroy: async () => {
    resourceLeaked = false;
    console.log('Plugin onDestroy called (Resource cleaned)');
  }
};

async function run() {
  await kernel.init();
  
  // 1. Add plugin (starts init immediately because kernel is Ready)
  kernel.use(slowPlugin);
  
  // 2. Immediately unregister it while it's waiting in the setTimeout of onInit
  // internal.state should be 'initializing'
  const removed = kernel.unregister('slow');
  console.log('Unregister called. Result:', removed);
  
  // 3. Wait for the pending init to finish
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // 4. Check if we leaked
  if (resourceLeaked) {
    console.log('FAIL: Resource leaked! onDestroy was not called.');
  } else {
    console.log('SUCCESS: Resource cleaned up.');
  }
}

run();
