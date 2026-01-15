/**
 * Integration tests for plugin communication via events
 */

import { describe, it, expect, vi } from 'vitest';
import { createKernel } from '../../src/index';
import type { Plugin, EventMap, Kernel } from '@oxog/types';

interface TestContext {
  messages?: string[];
  eventsReceived?: number;
}

interface AppEvents extends EventMap {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'data:updated': { key: string; value: unknown };
  'notification:send': { message: string };
}

describe('Plugin Communication Integration', () => {
  describe('event-based communication', () => {
    it('should allow plugins to communicate via events', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const messages: string[] = [];

      const publisherPlugin: Plugin<TestContext> = {
        name: 'publisher',
        version: '1.0.0',
        install(kernel) {
          kernel.publish = (userId: string) => {
            kernel.emit('user:login', { userId, timestamp: Date.now() });
          };
        },
        async onInit(context) {
          context.messages = messages;
        }
      };

      const subscriberPlugin: Plugin<TestContext> = {
        name: 'subscriber',
        version: '1.0.0',
        install() {},
        async onInit(context) {
          context.messages = messages;
          // Subscribe to login events
          kernel.on('user:login', (payload) => {
            context.messages!.push(`User logged in: ${payload.userId}`);
          });
        }
      };

      kernel.use(publisherPlugin);
      kernel.use(subscriberPlugin);
      await kernel.init();

      // Publisher emits event
      (kernel as any).publish('user_123');

      expect(messages).toContain('User logged in: user_123');
    });

    it('should support multiple subscribers', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const logs: string[] = [];

      const emitterPlugin: Plugin<TestContext> = {
        name: 'emitter',
        version: '1.0.0',
        install(kernel) {
          kernel.emitData = (key: string, value: unknown) => {
            kernel.emit('data:updated', { key, value });
          };
        }
      };

      const subscriber1: Plugin<TestContext> = {
        name: 'sub1',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('data:updated', ({ key }) => {
            logs.push(`sub1: ${key}`);
          });
        }
      };

      const subscriber2: Plugin<TestContext> = {
        name: 'sub2',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('data:updated', ({ key }) => {
            logs.push(`sub2: ${key}`);
          });
        }
      };

      kernel.use(emitterPlugin);
      kernel.use(subscriber1);
      kernel.use(subscriber2);
      await kernel.init();

      (kernel as any).emitData('test', 123);

      expect(logs).toContain('sub1: test');
      expect(logs).toContain('sub2: test');
    });

    it('should support wildcard subscriptions', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const allEvents: string[] = [];

      const monitorPlugin: Plugin<TestContext> = {
        name: 'monitor',
        version: '1.0.0',
        install() {},
        async onInit(context) {
          context.eventsReceived = 0;
          kernel.onWildcard((event, payload) => {
            allEvents.push(event);
            context.eventsReceived = (context.eventsReceived || 0) + 1;
          });
        }
      };

      kernel.use(monitorPlugin);
      await kernel.init();

      kernel.emit('user:login', { userId: '123', timestamp: 100 });
      kernel.emit('user:logout', { userId: '123' });
      kernel.emit('data:updated', { key: 'test', value: 1 });

      expect(allEvents).toEqual(['kernel:ready', 'user:login', 'user:logout', 'data:updated']);
      expect(kernel.getContext().eventsReceived).toBe(4);
    });

    it('should support pattern subscriptions', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const userEvents: string[] = [];

      const userMonitorPlugin: Plugin<TestContext> = {
        name: 'user-monitor',
        version: '1.0.0',
        install() {},
        async onInit() {
          // @ts-expect-error - onPattern is internal API but used for testing
          kernel.onPattern('user:*', (event, payload) => {
            userEvents.push(event);
          });
        }
      };

      kernel.use(userMonitorPlugin);
      await kernel.init();

      kernel.emit('user:login', { userId: '123', timestamp: 100 });
      kernel.emit('user:logout', { userId: '123' });
      kernel.emit('data:updated', { key: 'test', value: 1 });

      expect(userEvents).toEqual(['user:login', 'user:logout']);
    });
  });

  describe('chained event processing', () => {
    it('should support event chains', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const chain: string[] = [];

      const pluginA: Plugin<TestContext> = {
        name: 'a',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('user:login', () => {
            chain.push('a');
            kernel.emit('notification:send', { message: 'Welcome!' });
          });
        }
      };

      const pluginB: Plugin<TestContext> = {
        name: 'b',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('notification:send', () => {
            chain.push('b');
          });
        }
      };

      kernel.use(pluginA);
      kernel.use(pluginB);
      await kernel.init();

      kernel.emit('user:login', { userId: '123', timestamp: 100 });

      expect(chain).toEqual(['a', 'b']);
    });
  });

  describe('plugin collaboration via kernel extensions', () => {
    it('should allow plugins to extend kernel', async () => {
      const kernel = createKernel<TestContext, AppEvents>();

      const loggerPlugin: Plugin<TestContext> = {
        name: 'logger',
        version: '1.0.0',
        install(kernel) {
          kernel.log = (...args: unknown[]) => {
            console.log('[LOG]', ...args);
          };
        }
      };

      const apiPlugin: Plugin<TestContext> = {
        name: 'api',
        version: '1.0.0',
        dependencies: ['logger'],
        install() {},
        async onInit(context, pluginKernel) {
          // Use logger from kernel
          const k = pluginKernel as Kernel<TestContext> & { log?: (...args: unknown[]) => void };
          expect(k.log).toBeDefined();
        }
      };

      kernel.use(loggerPlugin);
      kernel.use(apiPlugin);
      await kernel.init();

      expect((kernel as any).log).toBeDefined();
    });

    it('should allow plugins to share context', async () => {
      const kernel = createKernel<TestContext, AppEvents>();

      const pluginA: Plugin<TestContext> = {
        name: 'a',
        version: '1.0.0',
        install() {},
        async onInit(context) {
          context.messages = ['from A'];
        }
      };

      const pluginB: Plugin<TestContext> = {
        name: 'b',
        version: '1.0.0',
        dependencies: ['a'],
        install() {},
        async onInit(context) {
          context.messages?.push('from B');
        }
      };

      kernel.use(pluginA);
      kernel.use(pluginB);
      await kernel.init();

      expect(kernel.getContext().messages).toEqual(['from A', 'from B']);
    });
  });

  describe('event cleanup', () => {
    it('should cleanup subscriptions on destroy', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const handler = vi.fn();

      const plugin: Plugin<TestContext> = {
        name: 'test',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('user:login', handler);
        }
      };

      kernel.use(plugin);
      await kernel.init();
      await kernel.destroy();

      kernel.emit('user:login', { userId: '123', timestamp: 100 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('cross-plugin error handling', () => {
    it('should isolate handler errors', async () => {
      const kernel = createKernel<TestContext, AppEvents>();
      const goodHandler = vi.fn();

      const plugin1: Plugin<TestContext> = {
        name: 'bad-handler',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('user:login', () => {
            throw new Error('Handler error');
          });
        }
      };

      const plugin2: Plugin<TestContext> = {
        name: 'good-handler',
        version: '1.0.0',
        install() {},
        async onInit() {
          kernel.on('user:login', goodHandler);
        }
      };

      kernel.use(plugin1);
      kernel.use(plugin2);
      await kernel.init();

      // Should not throw, good handler should still be called
      expect(() =>
        kernel.emit('user:login', { userId: '123', timestamp: 100 })
      ).not.toThrow();

      expect(goodHandler).toHaveBeenCalled();
    });
  });
});
