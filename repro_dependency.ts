
import { KernelInstance } from './src/kernel';
import { Plugin } from './src/types';

const kernel = new KernelInstance();

const dependentPlugin: Plugin<any> = {
  name: 'dependent',
  version: '1.0.0',
  dependencies: ['missing-plugin'], // This dependency does not exist
  install: () => {},
  onInit: async () => {
    console.log('Dependent plugin initialized!');
  }
};

async function run() {
  await kernel.init(); // Kernel is now Ready
  console.log('Kernel ready.');

  try {
    // Adding a plugin with missing dependency after kernel is ready
    kernel.use(dependentPlugin);
    
    // Wait for it to try initializing
    await kernel.waitForPlugin('dependent');
    console.log('Success? (Should have failed)');
  } catch (e) {
    console.log('Caught error:', e);
  }
  
  // Check state
  const plugin = kernel.getPlugin('dependent');
  console.log('Plugin registered:', !!plugin);
}

run();
