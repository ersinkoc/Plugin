/**
 * Unit tests for LifecycleManager
 */

import { describe, it, expect, vi } from 'vitest';
import { LifecycleManager } from '../../src/lifecycle-manager';
import { ErrorBoundary } from '../../src/error-boundary';
import type { InternalPlugin } from '../../src/types';
import type { Plugin } from '@oxog/types';

describe('LifecycleManager', () => {
  const createInternalPlugin = (
    plugin: Plugin<unknown>
  ): InternalPlugin<unknown> => ({
    plugin,
    state: 'registered'
  });

  describe('initialize', () => {
    it('should call onInit for each plugin in order', async () => {
      const manager = new LifecycleManager<unknown>();
      const order: string[] = [];

      const plugin1: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {
          order.push('p1');
        }
      };

      const plugin2: Plugin = {
        name: 'p2',
        version: '1.0.0',
        install() {},
        async onInit() {
          order.push('p2');
        }
      };

      const plugins = new Map([
        ['p1', createInternalPlugin(plugin1)],
        ['p2', createInternalPlugin(plugin2)]
      ]);

      await manager.initialize(
        plugins,
        ['p1', 'p2'],
        {},
        new ErrorBoundary('isolate')
      );

      expect(order).toEqual(['p1', 'p2']);
    });

    it('should pass context to onInit', async () => {
      const manager = new LifecycleManager<{ value: number }>();
      const context = { value: 42 };
      let receivedContext: unknown;

      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit(ctx) {
          receivedContext = ctx;
        }
      };

      const plugins = new Map([['p1', createInternalPlugin(plugin)]]);

      await manager.initialize(
        plugins,
        ['p1'],
        context,
        new ErrorBoundary('isolate')
      );

      expect(receivedContext).toBe(context);
    });

    it('should set plugin state to ready', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      const internal = createInternalPlugin(plugin);
      const plugins = new Map([['p1', internal]]);

      await manager.initialize(
        plugins,
        ['p1'],
        {},
        new ErrorBoundary('isolate')
      );

      expect(internal.state).toBe('ready');
    });

    it('should set initializedAt timestamp', async () => {
      const manager = new LifecycleManager<unknown>();
      const before = Date.now();

      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      const internal = createInternalPlugin(plugin);
      const plugins = new Map([['p1', internal]]);

      await manager.initialize(
        plugins,
        ['p1'],
        {},
        new ErrorBoundary('isolate')
      );

      expect(internal.initializedAt).toBeDefined();
      expect(internal.initializedAt).toBeGreaterThanOrEqual(before);
      expect(internal.initializedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should handle plugin without onInit', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {}
      };

      const internal = createInternalPlugin(plugin);
      const plugins = new Map([['p1', internal]]);

      await manager.initialize(
        plugins,
        ['p1'],
        {},
        new ErrorBoundary('isolate')
      );

      expect(internal.state).toBe('ready');
    });

    it('should handle async onInit', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };

      const internal = createInternalPlugin(plugin);
      const plugins = new Map([['p1', internal]]);

      await manager.initialize(
        plugins,
        ['p1'],
        {},
        new ErrorBoundary('isolate')
      );

      expect(internal.state).toBe('ready');
    });
  });

  describe('destroy', () => {
    it('should call onDestroy in reverse order', async () => {
      const manager = new LifecycleManager<unknown>();
      const order: string[] = [];

      const plugin1: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          order.push('p1');
        }
      };

      const plugin2: Plugin = {
        name: 'p2',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          order.push('p2');
        }
      };

      const plugins = new Map([
        ['p1', createInternalPlugin(plugin1)],
        ['p2', createInternalPlugin(plugin2)]
      ]);

      await manager.destroy(
        plugins,
        ['p1', 'p2'],
        new ErrorBoundary('isolate')
      );

      expect(order).toEqual(['p2', 'p1']);
    });

    it('should set plugin state to destroyed', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onDestroy() {}
      };

      const internal = createInternalPlugin(plugin);
      internal.state = 'ready';
      const plugins = new Map([['p1', internal]]);

      await manager.destroy(plugins, ['p1'], new ErrorBoundary('isolate'));

      expect(internal.state).toBe('destroyed');
    });

    it('should handle plugin without onDestroy', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {}
      };

      const internal = createInternalPlugin(plugin);
      internal.state = 'ready';
      const plugins = new Map([['p1', internal]]);

      await manager.destroy(plugins, ['p1'], new ErrorBoundary('isolate'));

      expect(internal.state).toBe('destroyed');
    });

    it('should handle async onDestroy', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      };

      const internal = createInternalPlugin(plugin);
      internal.state = 'ready';
      const plugins = new Map([['p1', internal]]);

      await manager.destroy(plugins, ['p1'], new ErrorBoundary('isolate'));

      expect(internal.state).toBe('destroyed');
    });
  });

  describe('error handling', () => {
    it('should use error boundary for init errors', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {
          throw new Error('Init error');
        }
      };

      const plugins = new Map([['p1', createInternalPlugin(plugin)]]);

      await expect(
        manager.initialize(
          plugins,
          ['p1'],
          {},
          new ErrorBoundary('fail-fast')
        )
      ).rejects.toThrow('Init error');
    });

    it('should use error boundary for destroy errors', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onDestroy() {
          throw new Error('Destroy error');
        }
      };

      const internal = createInternalPlugin(plugin);
      internal.state = 'ready';
      const plugins = new Map([['p1', internal]]);

      await expect(
        manager.destroy(plugins, ['p1'], new ErrorBoundary('fail-fast'))
      ).rejects.toThrow('Destroy error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty plugin list', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugins = new Map();

      await expect(
        manager.initialize(plugins, [], {}, new ErrorBoundary('isolate'))
      ).resolves.not.toThrow();

      await expect(
        manager.destroy(plugins, [], new ErrorBoundary('isolate'))
      ).resolves.not.toThrow();
    });

    it('should handle missing plugin in order during initialize', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onInit() {}
      };

      const plugins = new Map([['p1', createInternalPlugin(plugin)]]);

      // p2 doesn't exist in plugins map
      await expect(
        manager.initialize(
          plugins,
          ['p1', 'p2'],
          {},
          new ErrorBoundary('isolate')
        )
      ).resolves.not.toThrow();
    });

    it('should handle missing plugin in order during destroy', async () => {
      const manager = new LifecycleManager<unknown>();
      const plugin: Plugin = {
        name: 'p1',
        version: '1.0.0',
        install() {},
        async onDestroy() {}
      };

      const internal = createInternalPlugin(plugin);
      internal.state = 'ready';
      const plugins = new Map([['p1', internal]]);

      // p2 doesn't exist in plugins map
      await expect(
        manager.destroy(
          plugins,
          ['p1', 'p2'],
          new ErrorBoundary('isolate')
        )
      ).resolves.not.toThrow();

      expect(internal.state).toBe('destroyed');
    });
  });
});
