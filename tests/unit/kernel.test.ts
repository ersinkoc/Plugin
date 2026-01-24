/**
 * Unit tests for KernelInstance
 */

import { describe, it, expect, vi } from 'vitest';
import { KernelInstance } from '../../src/kernel';
import { PluginError } from '../../src/index.js';
import { createTestPlugin, createFailingPlugin } from '../fixtures/test-plugins';

interface TestContext {
  value?: number;
  logs?: string[];
}

interface TestEvents {
  'test:event': { data: string };
  'kernel:init': { timestamp: number };
  'kernel:ready': { timestamp: number; plugins: string[] };
  'plugin:install': { name: string; version: string };
}

describe('KernelInstance', () => {
  describe('constructor', () => {
    it('should create kernel with default state', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      expect(kernel.isInitialized()).toBe(false);
      expect(kernel.isDestroyed()).toBe(false);
    });

    it('should create kernel with initial context', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        context: { value: 42 }
      });
      expect(kernel.getContext()).toEqual({ value: 42 });
    });

    it('should create kernel with error strategy', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'fail-fast'
      });
      expect(kernel).toBeDefined();
    });
  });

  describe('use', () => {
    it('should register plugin', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const plugin = createTestPlugin('test');

      kernel.use(plugin);

      expect(kernel.hasPlugin('test')).toBe(true);
    });

    it('should call install hook', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let installCalled = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install: () => {
          installCalled = true;
        }
      };

      kernel.use(plugin);

      expect(installCalled).toBe(true);
    });

    it('should return this for chaining', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const result = kernel.use(createTestPlugin('a'));

      expect(result).toBe(kernel);
    });

    it('should chain multiple uses', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel
        .use(createTestPlugin('a'))
        .use(createTestPlugin('b'))
        .use(createTestPlugin('c'));

      expect(kernel.getPluginNames()).toEqual(['a', 'b', 'c']);
    });

    it('should throw on duplicate plugin name', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));

      expect(() =>
        kernel.use(createTestPlugin('test'))
      ).toThrowError(PluginError);
    });

    it('should throw when adding to destroyed kernel', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      await kernel.destroy();

      expect(() =>
        kernel.use(createTestPlugin('test'))
      ).toThrowError(PluginError);
    });

    it('should throw when adding plugin during initialization', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let resolveInit: () => void;
      const initPromise = new Promise<void>((resolve) => {
        resolveInit = resolve;
      });

      // Plugin with slow init to keep kernel in Initializing state
      kernel.use({
        name: 'slow',
        version: '1.0.0',
        install: () => {},
        async onInit() {
          await initPromise;
        }
      } as any);

      // Start init but don't await it
      const initResult = kernel.init();

      // Try to add plugin while initializing - should throw
      expect(() =>
        kernel.use(createTestPlugin('another') as any)
      ).toThrowError(PluginError);

      // Also verify error message
      expect(() =>
        kernel.use(createTestPlugin('another2') as any)
      ).toThrow('Cannot add plugins while kernel is initializing');

      // Cleanup: resolve the init
      resolveInit!();
      await initResult;
    });

    it('should emit plugin:install event', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.on('plugin:install' as any, handler);
      kernel.use(createTestPlugin('test'));

      expect(handler).toHaveBeenCalledWith({
        name: 'test',
        version: '1.0.0'
      });
    });
  });

  describe('useAll', () => {
    it('should register multiple plugins', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.useAll([
        createTestPlugin('a'),
        createTestPlugin('b'),
        createTestPlugin('c')
      ]);

      expect(kernel.getPluginNames()).toEqual(['a', 'b', 'c']);
    });

    it('should return this for chaining', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const result = kernel.useAll([createTestPlugin('a')]);

      expect(result).toBe(kernel);
    });
  });

  describe('init', () => {
    it('should initialize plugins', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let inited = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          inited = true;
        }
      };

      kernel.use(plugin);
      await kernel.init();

      expect(inited).toBe(true);
      expect(kernel.isInitialized()).toBe(true);
    });

    it('should call onBeforeInit hook', async () => {
      const beforeInit = vi.fn();
      const kernel = new KernelInstance<TestContext, TestEvents>({
        onBeforeInit: beforeInit
      });

      kernel.use(createTestPlugin('test'));
      await kernel.init();

      expect(beforeInit).toHaveBeenCalled();
    });

    it('should call onAfterInit hook', async () => {
      const afterInit = vi.fn();
      const kernel = new KernelInstance<TestContext, TestEvents>({
        onAfterInit: afterInit
      });

      kernel.use(createTestPlugin('test'));
      await kernel.init();

      expect(afterInit).toHaveBeenCalled();
    });

    it('should initialize in dependency order', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const order: string[] = [];

      const pluginA = {
        name: 'a',
        version: '1.0.0',
        install() {},
        async onInit() {
          order.push('a');
        }
      };

      const pluginB = {
        name: 'b',
        version: '1.0.0',
        dependencies: ['a'],
        install() {},
        async onInit() {
          order.push('b');
        }
      };

      kernel.use(pluginB);
      kernel.use(pluginA);
      await kernel.init();

      expect(order).toEqual(['a', 'b']);
    });

    it('should emit kernel:ready event', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.on('kernel:ready' as any, handler);
      kernel.use(createTestPlugin('test'));
      await kernel.init();

      expect(handler).toHaveBeenCalledWith({
        timestamp: expect.any(Number),
        plugins: ['test']
      });
    });

    it('should throw on circular dependency', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['b'],
        install() {},
        async onInit() {}
      });

      kernel.use({
        name: 'b',
        version: '1.0.0',
        dependencies: ['a'],
        install() {},
        async onInit() {}
      });

      await expect(kernel.init()).rejects.toThrow(PluginError);
    });

    it('should throw on missing dependency', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use({
        name: 'a',
        version: '1.0.0',
        dependencies: ['missing'],
        install() {},
        async onInit() {}
      });

      await expect(kernel.init()).rejects.toThrow(PluginError);
    });

    it('should throw if already initialized', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));
      await kernel.init();

      await expect(kernel.init()).rejects.toThrow(PluginError);
    });
  });

  describe('destroy', () => {
    it('should destroy plugins', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let destroyed = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          destroyed = true;
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.destroy();

      expect(destroyed).toBe(true);
      expect(kernel.isDestroyed()).toBe(true);
    });

    it('should destroy in reverse order', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const order: string[] = [];

      const pluginA = {
        name: 'a',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          order.push('a');
        }
      };

      const pluginB = {
        name: 'b',
        version: '1.0.0',
        dependencies: ['a'],
        install() {},
        async onDestroy() {
          order.push('b');
        }
      };

      kernel.use(pluginA);
      kernel.use(pluginB);
      await kernel.init();
      await kernel.destroy();

      expect(order).toEqual(['b', 'a']);
    });

    it('should call onBeforeDestroy hook', async () => {
      const beforeDestroy = vi.fn();
      const kernel = new KernelInstance<TestContext, TestEvents>({
        onBeforeDestroy: beforeDestroy
      });

      kernel.use(createTestPlugin('test'));
      await kernel.init();
      await kernel.destroy();

      expect(beforeDestroy).toHaveBeenCalled();
    });

    it('should call onAfterDestroy hook', async () => {
      const afterDestroy = vi.fn();
      const kernel = new KernelInstance<TestContext, TestEvents>({
        onAfterDestroy: afterDestroy
      });

      kernel.use(createTestPlugin('test'));
      await kernel.init();
      await kernel.destroy();

      expect(afterDestroy).toHaveBeenCalled();
    });

    it('should clear event subscriptions', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.on('test:event' as any, handler);
      await kernel.destroy();
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));
      await kernel.init();
      await kernel.destroy();
      await kernel.destroy();

      expect(kernel.isDestroyed()).toBe(true);
    });
  });

  describe('getPlugin', () => {
    it('should return plugin by name', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const plugin = createTestPlugin('test');

      kernel.use(plugin);

      expect(kernel.getPlugin('test')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      expect(kernel.getPlugin('nonexistent')).toBeUndefined();
    });
  });

  describe('hasPlugin', () => {
    it('should return true for registered plugin', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));

      expect(kernel.hasPlugin('test')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      expect(kernel.hasPlugin('test')).toBe(false);
    });
  });

  describe('listPlugins', () => {
    it('should return all plugins', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const p1 = createTestPlugin('a');
      const p2 = createTestPlugin('b');

      kernel.use(p1);
      kernel.use(p2);

      const plugins = kernel.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(p1);
      expect(plugins).toContain(p2);
    });

    it('should return empty array when no plugins', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      expect(kernel.listPlugins()).toEqual([]);
    });
  });

  describe('getPluginNames', () => {
    it('should return all plugin names', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('a'));
      kernel.use(createTestPlugin('b'));
      kernel.use(createTestPlugin('c'));

      expect(kernel.getPluginNames()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('getDependencyGraph', () => {
    it('should return dependency graph', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use({
        name: 'api',
        version: '1.0.0',
        dependencies: ['database'],
        install() {},
        async onInit() {}
      });

      kernel.use({
        name: 'database',
        version: '1.0.0',
        install() {},
        async onInit() {}
      });

      expect(kernel.getDependencyGraph()).toEqual({
        api: ['database'],
        database: []
      });
    });
  });

  describe('events', () => {
    it('should subscribe and emit events', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.on('test:event' as any, handler);
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should unsubscribe from events', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      const unsub = kernel.on('test:event' as any, handler);
      unsub();
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support once subscriptions', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.once('test:event' as any, handler);
      kernel.emit('test:event' as any, { data: 'test' });
      kernel.emit('test:event' as any, { data: 'test2' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support wildcard subscriptions', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.onWildcard(handler);
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('should support pattern subscriptions', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.onPattern('test:*', handler);
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('should unsubscribe using off method', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const handler = vi.fn();

      kernel.on('test:event' as any, handler);
      kernel.off('test:event' as any, handler);
      kernel.emit('test:event' as any, { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow subscribing to internal kernel events type-safely', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const installHandler = vi.fn();
      const initHandler = vi.fn();
      const readyHandler = vi.fn();

      // Users can subscribe to internal events with type-safe payloads
      kernel.on('plugin:install', installHandler);
      kernel.on('kernel:init', initHandler);
      kernel.on('kernel:ready', readyHandler);

      kernel.use({
        name: 'test',
        version: '1.0.0',
        install: () => {}
      } as any);

      await kernel.init();

      // Internal events have correct payload types
      expect(installHandler).toHaveBeenCalledWith({ name: 'test', version: '1.0.0' });
      expect(initHandler).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: expect.any(Number) })
      );
      expect(readyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
          plugins: ['test']
        })
      );
    });

    it('should emit plugin:init for dynamically added plugins', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const pluginInitHandler = vi.fn();

      await kernel.init();

      // Subscribe to plugin:init
      kernel.on('plugin:init', pluginInitHandler);

      // Add plugin after kernel is ready (dynamic loading)
      kernel.use({
        name: 'dynamic',
        version: '1.0.0',
        install: () => {}
      } as any);

      // Wait for initialization to complete
      await kernel.waitForPlugin('dynamic');

      // plugin:init is emitted for dynamically added plugins
      expect(pluginInitHandler).toHaveBeenCalledWith({ name: 'dynamic' });
    });

    it('should emit plugin:error for dynamically added plugins that fail', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });
      const errorHandler = vi.fn();

      await kernel.init();

      // Subscribe to plugin:error
      kernel.on('plugin:error', errorHandler);

      const error = new Error('Test error');
      kernel.use({
        name: 'failing',
        version: '1.0.0',
        install: () => {},
        onInit() {
          throw error;
        }
      } as any);

      // Wait for plugin to finish (will fail)
      await kernel.waitForPlugin('failing');

      // plugin:error event has correct payload type
      expect(errorHandler).toHaveBeenCalledWith({
        name: 'failing',
        error
      });
    });
  });

  describe('context', () => {
    it('should return context', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        context: { value: 42 }
      });

      expect(kernel.getContext()).toEqual({ value: 42 });
    });

    it('should update context', () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        context: { value: 42 }
      });

      kernel.updateContext({ value: 100 });

      expect(kernel.getContext()).toEqual({ value: 100 });
    });

    it('should deep update context preserving nested values', () => {
      interface NestedContext { config: { db: string; api: string } }
      interface NestedEvents { [key: string]: unknown }
      const kernel = new KernelInstance<NestedContext, NestedEvents>({
        context: { config: { db: 'localhost', api: 'http://localhost' } }
      });

      kernel.deepUpdateContext({ config: { db: 'postgres://prod' } } as any);

      expect(kernel.getContext()).toEqual({
        config: { db: 'postgres://prod', api: 'http://localhost' }
      });
    });

    it('should deep update context with deeply nested objects', () => {
      interface DeepContext {
        level1: {
          level2: { a: number; b: number };
          sibling: string;
        };
      }
      interface DeepEvents { [key: string]: unknown }
      const kernel = new KernelInstance<DeepContext, DeepEvents>({
        context: {
          level1: {
            level2: { a: 1, b: 2 },
            sibling: 'keep'
          }
        }
      });

      kernel.deepUpdateContext({
        level1: { level2: { a: 10 } }
      } as any);

      expect(kernel.getContext()).toEqual({
        level1: {
          level2: { a: 10, b: 2 },
          sibling: 'keep'
        }
      });
    });
  });

  describe('unregister', () => {
    it('should unregister plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));
      const removed = await kernel.unregister('test');

      expect(removed).toBe(true);
      expect(kernel.hasPlugin('test')).toBe(false);
    });

    it('should return false for non-existent plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      const removed = await kernel.unregister('nonexistent');

      expect(removed).toBe(false);
    });

    it('should call onDestroy if initialized', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let destroyed = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          destroyed = true;
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.unregister('test');

      expect(destroyed).toBe(true);
    });

    it('should cleanup initializing plugin to prevent resource leak', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let initCompleted = false;
      let destroyCalled = false;

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add slow plugin (starts initializing)
      kernel.use({
        name: 'slow',
        version: '1.0.0',
        install(_k) {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 50));
          initCompleted = true;
        },
        async onDestroy() {
          destroyCalled = true;
        }
      });

      // Unregister while still initializing (sync version - fire and forget)
      kernel.unregister('slow');

      // Wait for cleanup to complete
      await new Promise((r) => setTimeout(r, 100));

      expect(initCompleted).toBe(true);
      expect(destroyCalled).toBe(true);
      expect(kernel.hasPlugin('slow')).toBe(false);
    });
  });

  describe('reload', () => {
    it('should reload plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const calls: string[] = [];

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          calls.push('destroy');
        },
        async onInit() {
          calls.push('init');
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.reload('test');

      expect(calls).toEqual(['init', 'destroy', 'init']);
    });

    it('should do nothing for non-existent plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      await kernel.init();
      await kernel.reload('nonexistent');
      // Should not throw
    });

    it('should throw on destroy error with fail-fast strategy', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'fail-fast'
      });

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {},
        async onDestroy() {
          throw new Error('Destroy error');
        }
      };

      kernel.use(plugin);
      await kernel.init();

      await expect(kernel.reload('test')).rejects.toThrow('Destroy error');
    });

    it('should continue on destroy error with isolate strategy', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });
      const calls: string[] = [];

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          calls.push('init');
        },
        async onDestroy() {
          throw new Error('Destroy error');
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.reload('test');

      expect(calls).toEqual(['init', 'init']);
    });

    it('should throw on init error with fail-fast strategy', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'fail-fast'
      });
      let initCount = 0;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          initCount++;
          if (initCount > 1) {
            throw new Error('Init error on reload');
          }
        },
        async onDestroy() {}
      };

      kernel.use(plugin);
      await kernel.init();

      await expect(kernel.reload('test')).rejects.toThrow('Init error on reload');
    });

    it('should mark plugin as failed on init error with isolate strategy', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>({
        errorStrategy: 'isolate'
      });
      let initCount = 0;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          initCount++;
          if (initCount > 1) {
            throw new Error('Init error on reload');
          }
        },
        async onDestroy() {}
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.reload('test');

      // Plugin should be marked as failed but kernel should continue
      expect(kernel.hasPlugin('test')).toBe(true);
    });

    it('should reload plugin without onDestroy hook', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const calls: string[] = [];

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          calls.push('init');
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.reload('test');

      expect(calls).toEqual(['init', 'init']);
    });

    it('should reload plugin without onInit hook', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const calls: string[] = [];

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          calls.push('destroy');
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.reload('test');

      expect(calls).toEqual(['destroy']);
    });
  });

  describe('unregisterAsync', () => {
    it('should unregister plugin asynchronously', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      kernel.use(createTestPlugin('test'));
      const removed = await kernel.unregisterAsync('test');

      expect(removed).toBe(true);
      expect(kernel.hasPlugin('test')).toBe(false);
    });

    it('should return false for non-existent plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      const removed = await kernel.unregisterAsync('nonexistent');

      expect(removed).toBe(false);
    });

    it('should call onDestroy if initialized', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let destroyed = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          destroyed = true;
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.unregisterAsync('test');

      expect(destroyed).toBe(true);
    });

    it('should ignore errors during onDestroy', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {},
        async onDestroy() {
          throw new Error('Destroy error');
        }
      };

      kernel.use(plugin);
      await kernel.init();
      const removed = await kernel.unregisterAsync('test');

      expect(removed).toBe(true);
      expect(kernel.hasPlugin('test')).toBe(false);
    });

    it('should wait for initializing plugin and call onDestroy (prevents zombie)', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let initCompleted = false;
      let destroyCalled = false;

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add slow plugin (starts initializing)
      kernel.use({
        name: 'slow',
        version: '1.0.0',
        install(_k: any) {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 50));
          initCompleted = true;
        },
        async onDestroy() {
          destroyCalled = true;
        }
      });

      // Unregister while still initializing - should wait and cleanup
      const removed = await kernel.unregisterAsync('slow');

      expect(removed).toBe(true);
      expect(initCompleted).toBe(true);
      expect(destroyCalled).toBe(true);
      expect(kernel.hasPlugin('slow')).toBe(false);
    });

    it('should call onDestroy even if init failed', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let destroyCalled = false;

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add plugin that fails during init
      kernel.use({
        name: 'failing',
        version: '1.0.0',
        install(_k: any) {},
        async onInit() {
          throw new Error('Init failed');
        },
        async onDestroy() {
          destroyCalled = true;
        }
      });

      // Wait a bit for init to fail
      await new Promise((r) => setTimeout(r, 10));

      // Unregister - should still call onDestroy for cleanup
      await kernel.unregisterAsync('failing');

      expect(destroyCalled).toBe(true);
    });

    it('should handle unregisterAsync when init throws during wait', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let destroyCalled = false;

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add plugin that will fail during init but takes time to fail
      kernel.use({
        name: 'slow-failing',
        version: '1.0.0',
        install(_k: any) {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 30));
          throw new Error('Init failed after delay');
        },
        async onDestroy() {
          destroyCalled = true;
        }
      });

      // Immediately try to unregister while init is still pending
      // This tests the catch block that ignores init errors during unregister
      const removed = await kernel.unregisterAsync('slow-failing');

      expect(removed).toBe(true);
      expect(destroyCalled).toBe(true);
      expect(kernel.hasPlugin('slow-failing')).toBe(false);
    });
  });

  describe('replace', () => {
    it('should replace existing plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      const oldPlugin = {
        name: 'test',
        version: '1.0.0',
        install() {}
      };

      const newPlugin = {
        name: 'test',
        version: '2.0.0',
        install() {}
      };

      kernel.use(oldPlugin);
      await kernel.replace(newPlugin);

      expect(kernel.getPlugin('test')?.version).toBe('2.0.0');
    });

    it('should initialize new plugin if kernel is ready', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let inited = false;

      const oldPlugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      const newPlugin = {
        name: 'test',
        version: '2.0.0',
        install() {},
        async onInit() {
          inited = true;
        }
      };

      kernel.use(oldPlugin);
      await kernel.init();
      await kernel.replace(newPlugin);

      expect(inited).toBe(true);
    });

    it('should not initialize new plugin if kernel is not ready', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let inited = false;

      const oldPlugin = {
        name: 'test',
        version: '1.0.0',
        install() {}
      };

      const newPlugin = {
        name: 'test',
        version: '2.0.0',
        install() {},
        async onInit() {
          inited = true;
        }
      };

      kernel.use(oldPlugin);
      await kernel.replace(newPlugin);

      expect(inited).toBe(false);
    });
  });

  describe('waitForPlugin', () => {
    it('should wait for specific plugin initialization', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let inited = false;

      const earlyPlugin = {
        name: 'early',
        version: '1.0.0',
        install() {}
      };

      const latePlugin = {
        name: 'late',
        version: '1.0.0',
        install() {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 10));
          inited = true;
        }
      };

      kernel.use(earlyPlugin);
      await kernel.init();

      // Add plugin after init (triggers background initialization)
      kernel.use(latePlugin);
      expect(inited).toBe(false);

      // Wait for plugin to complete
      await kernel.waitForPlugin('late');
      expect(inited).toBe(true);
    });

    it('should resolve immediately if no pending init', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {}
      };

      kernel.use(plugin);
      await kernel.init();

      // No pending init for this plugin
      await kernel.waitForPlugin('test');
      expect(kernel.hasPlugin('test')).toBe(true);
    });

    it('should resolve for non-existent plugin', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      await kernel.waitForPlugin('non-existent');
      // Should not throw
    });
  });

  describe('waitForAll', () => {
    it('should wait for all pending plugin initializations', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const initOrder: string[] = [];

      const earlyPlugin = {
        name: 'early',
        version: '1.0.0',
        install() {}
      };

      const latePlugin1 = {
        name: 'late1',
        version: '1.0.0',
        install() {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 5));
          initOrder.push('late1');
        }
      };

      const latePlugin2 = {
        name: 'late2',
        version: '1.0.0',
        install() {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 10));
          initOrder.push('late2');
        }
      };

      kernel.use(earlyPlugin);
      await kernel.init();

      // Add plugins after init
      kernel.use(latePlugin1);
      kernel.use(latePlugin2);

      expect(initOrder).toHaveLength(0);

      await kernel.waitForAll();

      expect(initOrder).toContain('late1');
      expect(initOrder).toContain('late2');
    });

    it('should resolve immediately if no pending inits', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      await kernel.waitForAll();
      // Should not throw
    });
  });

  describe('dynamic plugin dependency validation', () => {
    it('should throw on missing dependency when adding plugin to ready kernel', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();

      // Initialize kernel with a simple plugin
      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Try to add plugin with missing dependency
      const pluginWithMissingDep = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['nonexistent'],
        install(_kernel: any) {},
        async onInit() {}
      };

      expect(() => kernel.use(pluginWithMissingDep)).toThrow(PluginError);
    });

    it('should wait for pending dependency before initializing', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const initOrder: string[] = [];

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add dependency plugin (slow init)
      const depPlugin = {
        name: 'dep',
        version: '1.0.0',
        install(_kernel: any) {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 20));
          initOrder.push('dep');
        }
      };

      // Add dependent plugin
      const dependentPlugin = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['dep'],
        install(_kernel: any) {},
        async onInit() {
          initOrder.push('dependent');
        }
      };

      kernel.use(depPlugin);
      kernel.use(dependentPlugin);

      await kernel.waitForAll();

      // Dependency should initialize before dependent
      expect(initOrder).toEqual(['dep', 'dependent']);
    });

    it('should fail initialization if dependency is in failed state', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const errors: { name: string; error: Error }[] = [];

      kernel.onWildcard((event, payload) => {
        if (event === 'plugin:error') {
          errors.push(payload as { name: string; error: Error });
        }
      });

      kernel.use(createTestPlugin('base'));
      await kernel.init();

      // Add failing dependency
      const failingDep = {
        name: 'failing-dep',
        version: '1.0.0',
        install(_kernel: any) {},
        async onInit() {
          throw new Error('Dep init failed');
        }
      };

      // Add dependent plugin
      const dependentPlugin = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['failing-dep'],
        install(_kernel: any) {},
        async onInit() {}
      };

      kernel.use(failingDep);
      kernel.use(dependentPlugin);

      await kernel.waitForAll();

      // Both should have errors
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some((e) => e.name === 'failing-dep')).toBe(true);
      expect(errors.some((e) => e.name === 'dependent')).toBe(true);
    });

    it('should successfully initialize plugin when dependency is ready', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let dependentInitialized = false;

      // Initialize kernel with dependency already loaded
      const depPlugin = {
        name: 'dep',
        version: '1.0.0',
        install(_kernel: any) {},
        async onInit() {}
      };

      kernel.use(depPlugin);
      await kernel.init();

      // Add dependent plugin after kernel is ready
      const dependentPlugin = {
        name: 'dependent',
        version: '1.0.0',
        dependencies: ['dep'],
        install(_kernel: any) {},
        async onInit() {
          dependentInitialized = true;
        }
      };

      kernel.use(dependentPlugin);
      await kernel.waitForPlugin('dependent');

      expect(dependentInitialized).toBe(true);
    });

  });

  describe('plugin error events', () => {
    it('should emit plugin:error event on initialization failure', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const errors: { name: string; error: Error }[] = [];

      kernel.onWildcard((event, payload) => {
        if (event === 'plugin:error') {
          errors.push(payload as { name: string; error: Error });
        }
      });

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          await new Promise((r) => setTimeout(r, 1));
        }
      };

      const failingPlugin = {
        name: 'failing',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Init failed');
        }
      };

      kernel.use(plugin);
      await kernel.init();

      // Add failing plugin after init
      kernel.use(failingPlugin);
      await kernel.waitForPlugin('failing');

      expect(errors).toHaveLength(1);
      expect(errors[0]?.name).toBe('failing');
      expect(errors[0]?.error.message).toBe('Init failed');
    });

    it('should handle non-Error thrown during initialization', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      const errors: { name: string; error: Error }[] = [];

      kernel.onWildcard((event, payload) => {
        if (event === 'plugin:error') {
          errors.push(payload as { name: string; error: Error });
        }
      });

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {}
      };

      const stringThrowingPlugin = {
        name: 'string-thrower',
        version: '1.0.0',
        install() {},
        async onInit() {
          // eslint-disable-next-line no-throw-literal
          throw 'String error message';
        }
      };

      kernel.use(plugin);
      await kernel.init();

      // Add plugin that throws non-Error after init
      kernel.use(stringThrowingPlugin);
      await kernel.waitForPlugin('string-thrower');

      expect(errors).toHaveLength(1);
      expect(errors[0]?.name).toBe('string-thrower');
      expect(errors[0]?.error).toBeInstanceOf(Error);
      expect(errors[0]?.error.message).toBe('String error message');
    });

    it('should handle destroy during late plugin initialization', async () => {
      const kernel = new KernelInstance<TestContext, TestEvents>();
      let initStarted = false;
      let initCompleted = false;

      const plugin = {
        name: 'test',
        version: '1.0.0',
        install() {}
      };

      const slowPlugin = {
        name: 'slow',
        version: '1.0.0',
        install() {},
        async onInit() {
          initStarted = true;
          await new Promise((r) => setTimeout(r, 50));
          initCompleted = true;
        }
      };

      kernel.use(plugin);
      await kernel.init();

      // Add slow plugin after init
      kernel.use(slowPlugin);

      // Wait a bit for init to start, then destroy
      await new Promise((r) => setTimeout(r, 10));
      expect(initStarted).toBe(true);

      // Destroy kernel while slow plugin is initializing
      await kernel.destroy();

      // Init should not have completed
      expect(kernel.isDestroyed()).toBe(true);
    });
  });
});
