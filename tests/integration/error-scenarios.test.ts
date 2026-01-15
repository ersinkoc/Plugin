/**
 * Integration tests for error scenarios
 */

import { describe, it, expect, vi } from 'vitest';
import { createKernel } from '../../src/index';
import type { Plugin, EventMap } from '../../src/index.js';
import { PluginError } from '../../src/index.js';

interface TestContext {
  errors?: string[];
  failedPlugins?: string[];
}

interface TestEvents extends EventMap {
  'error:occurred': { plugin: string; error: string };
}

describe('Error Scenarios Integration', () => {
  describe('plugin registration errors', () => {
    it('should reject duplicate plugin names', () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {}
      });

      expect(() =>
        kernel.use({
          name: 'test',
          version: '2.0.0',
          install() {}
        })
      ).toThrowError(PluginError);
    });

    it('should prevent adding plugins to destroyed kernel', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {}
      });

      await kernel.init();
      await kernel.destroy();

      expect(() =>
        kernel.use({
          name: 'another',
          version: '1.0.0',
          install() {}
        })
      ).toThrowError(PluginError);
    });
  });

  describe('dependency errors', () => {
    it('should detect circular dependencies', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['b'],
        install() {}
      });

      kernel.use({
        name: 'b',
        version: '1.0.0',
        dependencies: ['a'],
        install() {}
      });

      await expect(kernel.init()).rejects.toThrowError(PluginError);
      await expect(kernel.init()).rejects.toThrow(/Circular dependency/);
    });

    it('should detect complex circular dependencies', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['b'],
        install() {}
      });

      kernel.use({
        name: 'b',
        version: '1.0.0',
        dependencies: ['c'],
        install() {}
      });

      kernel.use({
        name: 'c',
        version: '1.0.0',
        dependencies: ['a'],
        install() {}
      });

      await expect(kernel.init()).rejects.toThrowError(PluginError);
    });

    it('should detect missing dependencies', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['missing'],
        install() {}
      });

      await expect(kernel.init()).rejects.toThrowError(PluginError);
      await expect(kernel.init()).rejects.toThrow(/Missing dependency/);
    });

    it('should report all missing dependencies', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['missing1', 'missing2'],
        install() {}
      });

      await expect(kernel.init()).rejects.toThrow(/Missing dependency/);
    });
  });

  describe('initialization errors', () => {
    it('should handle isolate strategy', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate',
        onError: (error, name) => {
          // Error handler called
        }
      });

      const errorHandler = vi.fn();

      kernel.use({
        name: 'good',
        version: '1.0.0',
        install() {},
        async onInit() {
          errorHandler('good');
        }
      });

      kernel.use({
        name: 'bad',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Bad plugin');
        },
        onError(err) {
          errorHandler('bad');
        }
      });

      kernel.use({
        name: 'also-good',
        version: '1.0.0',
        dependencies: ['bad'],
        install() {},
        async onInit() {
          errorHandler('also-good');
        }
      });

      await kernel.init();

      // All plugins should attempt init despite error
      expect(errorHandler).toHaveBeenCalledWith('good');
      expect(errorHandler).toHaveBeenCalledWith('also-good');
    });

    it('should handle fail-fast strategy', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'fail-fast'
      });

      const order: string[] = [];

      kernel.use({
        name: 'first',
        version: '1.0.0',
        install() {},
        async onInit() {
          order.push('first');
        }
      });

      kernel.use({
        name: 'second',
        version: '1.0.0',
        dependencies: ['first'],
        install() {},
        async onInit() {
          order.push('second');
          throw new Error('Failed');
        }
      });

      kernel.use({
        name: 'third',
        version: '1.0.0',
        dependencies: ['second'],
        install() {},
        async onInit() {
          order.push('third');
        }
      });

      await expect(kernel.init()).rejects.toThrow('Failed');

      expect(order).toEqual(['first', 'second']);
      expect(order).not.toContain('third');
    });

    it('should handle collect strategy', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'collect'
      });

      kernel.use({
        name: 'bad1',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Error 1');
        }
      });

      kernel.use({
        name: 'bad2',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Error 2');
        }
      });

      kernel.use({
        name: 'good',
        version: '1.0.0',
        install() {},
        async onInit() {}
      });

      try {
        await kernel.init();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        const agg = error as AggregateError;
        expect(agg.errors).toHaveLength(2);
        expect(agg.errors[0]).toBeInstanceOf(Error);
        expect(agg.errors[0].message).toBe('Error 1');
        expect(agg.errors[1].message).toBe('Error 2');
      }
    });

    it('should call plugin onError handler', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });

      const pluginErrorHandler = vi.fn();

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Test error');
        },
        onError: pluginErrorHandler
      });

      await kernel.init();

      expect(pluginErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' })
      );
    });

    it('should call global onError handler', async () => {
      const globalErrorHandler = vi.fn();

      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate',
        onError: globalErrorHandler
      });

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Test error');
        }
      });

      await kernel.init();

      expect(globalErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error' }),
        'test'
      );
    });
  });

  describe('destruction errors', () => {
    it('should handle errors during destroy', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'bad',
        version: '1.0.0',
        install() {},
        async onInit() {},
        async onDestroy() {
          throw new Error('Destroy failed');
        }
      });

      kernel.use({
        name: 'good',
        version: '1.0.0',
        dependencies: ['bad'],
        install() {},
        async onInit() {},
        async onDestroy() {}
      });

      await kernel.init();

      // Should not throw despite error
      await expect(kernel.destroy()).resolves.not.toThrow();

      expect(kernel.isDestroyed()).toBe(true);
    });
  });

  describe('runtime plugin errors', () => {
    it('should handle errors in event handlers', () => {
      const kernel = createKernel<TestContext, TestEvents>();
      const goodHandler = vi.fn();

      kernel.on('test:event' as any, () => {
        throw new Error('Handler error');
      });

      kernel.on('test:event' as any, goodHandler);

      // Should not throw
      expect(() =>
        kernel.emit('test:event' as any, {})
      ).not.toThrow();

      // Other handler should still be called
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('double initialization', () => {
    it('should prevent double init', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {}
      });

      await kernel.init();

      await expect(kernel.init()).rejects.toThrow(PluginError);
    });
  });

  describe('context errors', () => {
    it('should handle undefined context access', async () => {
      const kernel = createKernel<{ value?: number }, TestEvents>();

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit(context) {
          // value is optional, should handle gracefully
          const val = context.value ?? 0;
          context.value = val + 1;
        }
      });

      await expect(kernel.init()).resolves.not.toThrow();
      expect(kernel.getContext().value).toBe(1);
    });
  });

  describe('plugin state errors', () => {
    it('should handle plugin that fails during install', () => {
      const kernel = createKernel<TestContext, TestEvents>();

      expect(() =>
        kernel.use({
          name: 'bad',
          version: '1.0.0',
          install() {
            throw new Error('Install failed');
          }
        })
      ).toThrow('Install failed');
    });
  });

  describe('dynamic plugin errors', () => {
    it('should handle errors in late plugin initialization', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });

      await kernel.init();

      // Add failing plugin after kernel is ready
      await kernel.use({
        name: 'bad',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Late init failed');
        }
      });

      // Kernel should still be usable
      expect(kernel.isInitialized()).toBe(true);
    });

    it('should handle errors during reload', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });

      const plugin: Plugin<TestContext> = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {},
        async onDestroy() {
          throw new Error('Destroy failed');
        }
      };

      kernel.use(plugin);
      await kernel.init();

      // Should handle destroy error during reload
      await expect(kernel.reload('test')).resolves.not.toThrow();
    });
  });
});
