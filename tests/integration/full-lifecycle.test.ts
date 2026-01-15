/**
 * Integration tests for full kernel lifecycle
 */

import { describe, it, expect, vi } from 'vitest';
import { createKernel } from '../../src/index';
import type { Plugin, EventMap } from '@oxog/types';

interface TestContext {
  logs?: string[];
  counter?: number;
}

interface TestEvents extends EventMap {
  'app:start': { timestamp: number };
  'app:stop': { reason: string };
  'plugin:ready': { name: string };
}

describe('Full Lifecycle Integration', () => {
  describe('complete lifecycle flow', () => {
    it('should handle create -> use -> init -> use -> destroy', async () => {
      const kernel = createKernel<TestContext, TestEvents>();
      const lifecycle: string[] = [];

      const loggerPlugin: Plugin<TestContext> = {
        name: 'logger',
        version: '1.0.0',
        install(kernel) {
          kernel.logs = [];
          lifecycle.push('logger:install');
        },
        async onInit(context) {
          context.logs = context.logs || [];
          context.logs.push('logger:init');
          lifecycle.push('logger:onInit');
        },
        async onDestroy() {
          lifecycle.push('logger:onDestroy');
        }
      };

      const counterPlugin: Plugin<TestContext> = {
        name: 'counter',
        version: '1.0.0',
        dependencies: ['logger'],
        install(kernel) {
          kernel.counter = 0;
          lifecycle.push('counter:install');
        },
        async onInit(context) {
          context.counter = 10;
          lifecycle.push('counter:onInit');
        },
        async onDestroy() {
          lifecycle.push('counter:onDestroy');
        }
      };

      // Use plugins
      kernel.use(loggerPlugin);
      kernel.use(counterPlugin);

      expect(lifecycle).toContain('logger:install');
      expect(lifecycle).toContain('counter:install');

      // Init kernel
      await kernel.init();

      expect(kernel.isInitialized()).toBe(true);
      expect(lifecycle).toContain('logger:onInit');
      expect(lifecycle).toContain('counter:onInit');

      // Add plugin after init
      const latePlugin: Plugin<TestContext> = {
        name: 'late',
        version: '1.0.0',
        install(kernel) {
          lifecycle.push('late:install');
        },
        async onInit(context) {
          context.logs?.push('late:init');
          lifecycle.push('late:onInit');
        },
        async onDestroy() {
          lifecycle.push('late:onDestroy');
        }
      };

      await kernel.use(latePlugin);
      expect(lifecycle).toContain('late:onInit');

      // Destroy kernel
      await kernel.destroy();

      expect(kernel.isDestroyed()).toBe(true);
      expect(lifecycle).toContain('late:onDestroy');
      expect(lifecycle).toContain('counter:onDestroy');
      expect(lifecycle).toContain('logger:onDestroy');
    });

    it('should maintain context throughout lifecycle', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        context: { counter: 0 }
      });

      const plugin1: Plugin<TestContext> = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit(context) {
          context.counter = (context.counter || 0) + 10;
        }
      };

      const plugin2: Plugin<TestContext> = {
        name: 'p2',
        version: '1.0.0',
        dependencies: ['p1'],
        install() {},
        async onInit(context) {
          context.counter = (context.counter || 0) + 20;
        }
      };

      kernel.use(plugin1);
      kernel.use(plugin2);
      await kernel.init();

      expect(kernel.getContext().counter).toBe(30);
    });
  });

  describe('plugin dependencies resolution', () => {
    it('should resolve complex dependency graph', async () => {
      const kernel = createKernel<TestContext, TestEvents>();
      const order: string[] = [];

      const plugins: Plugin<TestContext>[] = [
        {
          name: 'database',
          version: '1.0.0',
          install() {},
          async onInit() {
            order.push('database');
          }
        },
        {
          name: 'cache',
          version: '1.0.0',
          dependencies: ['database'],
          install() {},
          async onInit() {
            order.push('cache');
          }
        },
        {
          name: 'api',
          version: '1.0.0',
          dependencies: ['cache', 'database'],
          install() {},
          async onInit() {
            order.push('api');
          }
        },
        {
          name: 'auth',
          version: '1.0.0',
          dependencies: ['database'],
          install() {},
          async onInit() {
            order.push('auth');
          }
        },
        {
          name: 'web',
          version: '1.0.0',
          dependencies: ['api', 'auth'],
          install() {},
          async onInit() {
            order.push('web');
          }
        }
      ];

      // Register in random order
      kernel.use(plugins[4]); // web
      kernel.use(plugins[1]); // cache
      kernel.use(plugins[0]); // database
      kernel.use(plugins[3]); // auth
      kernel.use(plugins[2]); // api

      await kernel.init();

      // Verify dependency order
      expect(order.indexOf('database')).toBeLessThan(order.indexOf('cache'));
      expect(order.indexOf('database')).toBeLessThan(order.indexOf('auth'));
      expect(order.indexOf('cache')).toBeLessThan(order.indexOf('api'));
      expect(order.indexOf('auth')).toBeLessThan(order.indexOf('web'));
      expect(order.indexOf('api')).toBeLessThan(order.indexOf('web'));
    });
  });

  describe('error handling throughout lifecycle', () => {
    it('should isolate errors during init', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });

      const errorHandler = vi.fn();
      kernel.on('kernel:ready' as any, errorHandler);

      const goodPlugin: Plugin<TestContext> = {
        name: 'good',
        version: '1.0.0',
        install() {},
        async onInit() {
          // Should still be called
        }
      };

      const badPlugin: Plugin<TestContext> = {
        name: 'bad',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Bad plugin failed');
        },
        onError(error) {
          // Should be called
        }
      };

      kernel.use(goodPlugin);
      kernel.use(badPlugin);

      await kernel.init();

      // Kernel should still be ready despite error
      expect(kernel.isInitialized()).toBe(true);
      expect(errorHandler).toHaveBeenCalled();
    });

    it('should fail-fast on error', async () => {
      const kernel = createKernel<TestContext, TestEvents>({
        errorStrategy: 'fail-fast'
      });

      kernel.use({
        name: 'bad',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Failed');
        }
      });

      await expect(kernel.init()).rejects.toThrow('Failed');
    });

    it('should collect all errors', async () => {
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

      try {
        await kernel.init();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
      }
    });
  });

  describe('kernel events', () => {
    it('should emit kernel lifecycle events', async () => {
      const kernel = createKernel<TestContext, TestEvents>();
      const events: string[] = [];

      kernel.on('kernel:init' as any, () => events.push('init'));
      kernel.on('kernel:ready' as any, () => events.push('ready'));
      kernel.on('kernel:destroy' as any, () => events.push('destroy'));
      kernel.on('kernel:destroyed' as any, () => events.push('destroyed'));

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {}
      });

      await kernel.init();
      await kernel.destroy();

      expect(events).toEqual(['init', 'ready', 'destroy', 'destroyed']);
    });
  });

  describe('dynamic plugin management', () => {
    it('should add and remove plugins at runtime', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      const plugin1: Plugin<TestContext> = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      const plugin2: Plugin<TestContext> = {
        name: 'p2',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      await kernel.init();

      // Add after init
      await kernel.use(plugin1);
      expect(kernel.hasPlugin('p1')).toBe(true);

      // Add another
      await kernel.use(plugin2);
      expect(kernel.hasPlugin('p2')).toBe(true);

      // Remove
      const removed = await kernel.unregister('p1');
      expect(removed).toBe(true);
      expect(kernel.hasPlugin('p1')).toBe(false);
    });

    it('should replace plugin', async () => {
      const kernel = createKernel<TestContext, TestEvents>();

      const plugin1: Plugin<TestContext> = {
        name: 'test',
        version: '1.0.0',
        install(kernel) {
          kernel.value = 'v1';
        }
      };

      const plugin2: Plugin<TestContext> = {
        name: 'test',
        version: '2.0.0',
        install(kernel) {
          kernel.value = 'v2';
        }
      };

      kernel.use(plugin1);
      await kernel.init();

      expect((kernel as any).value).toBe('v1');

      await kernel.replace(plugin2);

      expect((kernel as any).value).toBe('v2');
    });

    it('should reload plugin', async () => {
      const kernel = createKernel<TestContext, TestEvents>();
      let initCount = 0;

      const plugin: Plugin<TestContext> = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          initCount++;
        }
      };

      kernel.use(plugin);
      await kernel.init();

      expect(initCount).toBe(1);

      await kernel.reload('test');

      expect(initCount).toBe(2);
    });
  });
});
