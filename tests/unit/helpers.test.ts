import { describe, it, expect } from 'vitest';
import { definePlugin, KernelState } from '../../src/helpers.js';
import type { Plugin } from '../../src/index.js';

describe('helpers', () => {
  describe('definePlugin', () => {
    it('should return the same factory function', () => {
      const factory = (options: { level: string }) => ({
        name: 'test',
        version: '1.0.0',
        install: () => {},
      });

      const result = definePlugin(factory);
      expect(result).toBe(factory);
    });

    it('should preserve type inference for factory options', () => {
      interface LoggerOptions {
        level: 'debug' | 'info' | 'warn' | 'error';
        prefix?: string;
      }

      const createLogger = definePlugin<Record<string, unknown>>((options: LoggerOptions) => ({
        name: 'logger',
        version: '1.0.0',
        install(kernel) {
          kernel.logLevel = options.level;
          kernel.prefix = options.prefix || '[LOG]';
        },
      }));

      const plugin = createLogger({ level: 'info', prefix: '[APP]' });
      expect(plugin.name).toBe('logger');
      expect(plugin.version).toBe('1.0.0');
      expect(typeof plugin.install).toBe('function');
    });

    it('should work with plugins that have all lifecycle hooks', () => {
      const createPlugin = definePlugin<{ env: string }>((options: { name: string }) => ({
        name: options.name,
        version: '1.0.0',
        dependencies: [],
        install: () => {},
        onInit: async () => {},
        onDestroy: async () => {},
        onError: () => {},
      }));

      const plugin = createPlugin({ name: 'full-plugin' });
      expect(plugin.name).toBe('full-plugin');
      expect(plugin.dependencies).toEqual([]);
      expect(plugin.onInit).toBeDefined();
      expect(plugin.onDestroy).toBeDefined();
      expect(plugin.onError).toBeDefined();
    });
  });

  describe('KernelState export', () => {
    it('should export KernelState enum', () => {
      expect(KernelState).toBeDefined();
      expect(KernelState.Created).toBe('created');
      expect(KernelState.Initializing).toBe('initializing');
      expect(KernelState.Ready).toBe('ready');
      expect(KernelState.Destroying).toBe('destroying');
      expect(KernelState.Destroyed).toBe('destroyed');
    });
  });
});
