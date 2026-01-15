/**
 * Test fixtures for plugin testing.
 *
 * @module fixtures/test-plugins
 */

import type { Plugin } from '../../src/index.js';

/**
 * Create a simple test plugin.
 *
 * @param name - Plugin name
 * @param dependencies - Optional plugin dependencies
 * @returns A test plugin
 */
export function createTestPlugin(
  name: string,
  dependencies?: string[]
): Plugin<Record<string, unknown>> {
  return {
    name,
    version: '1.0.0',
    dependencies,
    install() {},
    async onInit() {},
    async onDestroy() {}
  };
}

/**
 * Create a plugin that fails during init.
 *
 * @param name - Plugin name
 * @returns A plugin that throws in onInit
 */
export function createFailingPlugin(name: string): Plugin {
  return {
    name,
    version: '1.0.0',
    install() {},
    async onInit() {
      throw new Error(`Plugin ${name} failed`);
    }
  };
}

/**
 * Create a plugin with custom hooks.
 *
 * @param name - Plugin name
 * @param hooks - Custom lifecycle hooks
 * @returns A plugin with custom hooks
 */
export function createCustomPlugin<TContext = unknown>(
  name: string,
  hooks: {
    install?: (kernel: any) => void;
    onInit?: (context: TContext) => void | Promise<void>;
    onDestroy?: () => void | Promise<void>;
    onError?: (error: Error) => void;
  }
): Plugin<TContext> {
  return {
    name,
    version: '1.0.0',
    install: hooks.install || (() => {}),
    onInit: hooks.onInit,
    onDestroy: hooks.onDestroy,
    onError: hooks.onError
  };
}

/**
 * Create a logger plugin for testing.
 *
 * @returns A logger plugin
 */
export function createLoggerPlugin(): Plugin<{ logs: string[] }> {
  return {
    name: 'logger',
    version: '1.0.0',
    install(kernel) {
      kernel.logs = [] as string[];
      kernel.log = (...args: unknown[]) => {
        kernel.logs.push(args.join(' '));
      };
    }
  };
}

/**
 * Create a counter plugin for testing events.
 *
 * @returns A counter plugin
 */
export function createCounterPlugin(): Plugin<{ count: number }> {
  return {
    name: 'counter',
    version: '1.0.0',
    install(kernel) {
      kernel.count = 0;
    },
    async onInit(context) {
      // Increment counter when context changes
    }
  };
}

/**
 * Create a plugin that tracks lifecycle calls.
 *
 * @returns A plugin with lifecycle tracking
 */
export function createLifecycleTrackerPlugin(): Plugin<
  Record<string, unknown>
> & {
  getLifecycleCalls: () => string[];
} {
  const calls: string[] = [];

  return {
    name: 'lifecycle-tracker',
    version: '1.0.0',
    install() {
      calls.push('install');
    },
    async onInit() {
      calls.push('onInit');
    },
    async onDestroy() {
      calls.push('onDestroy');
    },
    onError() {
      calls.push('onError');
    },
    getLifecycleCalls: () => [...calls]
  };
}

/**
 * Create a plugin that depends on another plugin.
 *
 * @param name - Plugin name
 * @param dependencies - Array of plugin names to depend on
 * @returns A dependent plugin
 */
export function createDependentPlugin(
  name: string,
  dependencies: string[]
): Plugin {
  return {
    name,
    version: '1.0.0',
    dependencies,
    install() {},
    async onInit() {},
    async onDestroy() {}
  };
}

/**
 * Create a plugin with custom version.
 *
 * @param name - Plugin name
 * @param version - Plugin version
 * @returns A plugin with custom version
 */
export function createVersionedPlugin(
  name: string,
  version: string
): Plugin {
  return {
    name,
    version,
    install() {},
    async onInit() {},
    async onDestroy() {}
  };
}

/**
 * Create a spy plugin that records all calls.
 *
 * @returns A spy plugin
 */
export function createSpyPlugin(): Plugin & {
  getCalls: () => { method: string; args: unknown[] }[];
} {
  const calls: { method: string; args: unknown[] }[] = [];

  return {
    name: 'spy',
    version: '1.0.0',
    install(...args: unknown[]) {
      calls.push({ method: 'install', args });
    },
    async onInit(...args: unknown[]) {
      calls.push({ method: 'onInit', args });
    },
    async onDestroy(...args: unknown[]) {
      calls.push({ method: 'onDestroy', args });
    },
    onError(...args: unknown[]) {
      calls.push({ method: 'onError', args });
    },
    getCalls: () => [...calls]
  };
}
