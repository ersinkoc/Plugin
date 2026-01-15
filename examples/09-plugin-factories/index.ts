/**
 * Example 09: Plugin Factories
 *
 * This example demonstrates creating configurable plugins with factories.
 */

import { createKernel, definePlugin } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

// Define a plugin factory
const createLoggerPlugin = definePlugin((options: {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}) => {
  const prefix = options.prefix || '[LOG]';

  return {
    name: 'logger',
    version: '1.0.0',
    install(kernel) {
      const levels = ['debug', 'info', 'warn', 'error'];
      const currentLevelIndex = levels.indexOf(options.level);

      kernel.log = {
        debug: (...args: unknown[]) => {
          if (currentLevelIndex <= 0) console.log(prefix, '[DEBUG]', ...args);
        },
        info: (...args: unknown[]) => {
          if (currentLevelIndex <= 1) console.log(prefix, '[INFO]', ...args);
        },
        warn: (...args: unknown[]) => {
          if (currentLevelIndex <= 2) console.log(prefix, '[WARN]', ...args);
        },
        error: (...args: unknown[]) => {
          console.log(prefix, '[ERROR]', ...args);
        }
      };
    }
  } as Plugin;
});

// Use the factory to create plugins with different configs
const kernel = createKernel();

// Logger with INFO level
kernel.use(createLoggerPlugin({ level: 'info', prefix: '[APP]' }));

const log = (kernel as any).log;

console.log('=== INFO Level Logger ===');
log.debug('This will not be shown');
log.info('This will be shown');
log.warn('This will be shown');
log.error('This will be shown');

// Expected output:
// === INFO Level Logger ===
// [APP] [INFO] This will be shown
// [APP] [WARN] This will be shown
// [APP] [ERROR] This will be shown
