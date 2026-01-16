/**
 * Unit tests for EventBus
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/event-bus';

interface TestEvents {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'data:update': { key: string; value: unknown };
}

describe('EventBus', () => {
  describe('on and emit', () => {
    it('should subscribe and emit events', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.on('user:login', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '123', timestamp: 1000 });
    });

    it('should support multiple handlers for same event', () => {
      const bus = new EventBus<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('user:login', handler1);
      bus.on('user:login', handler2);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should call handlers with correct payload type', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.on('user:login', handler);
      bus.emit('user:login', { userId: 'abc', timestamp: 999 });

      expect(handler).toHaveBeenCalledWith({ userId: 'abc', timestamp: 999 });
    });
  });

  describe('off', () => {
    it('should remove specific handler', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.on('user:login', handler);
      bus.off('user:login', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not affect other handlers', () => {
      const bus = new EventBus<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('user:login', handler1);
      bus.on('user:login', handler2);
      bus.off('user:login', handler1);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle removing non-existent handler', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      expect(() => bus.off('user:login', handler)).not.toThrow();
    });
  });

  describe('unsubscribe function', () => {
    it('should return unsubscribe function from on', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      const unsub = bus.on('user:login', handler);
      unsub();
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow multiple unsubscribe calls', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      const unsub = bus.on('user:login', handler);
      unsub();
      unsub();
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('should call handler only once', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.once('user:login', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      bus.emit('user:login', { userId: '456', timestamp: 2000 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ userId: '123', timestamp: 1000 });
    });

    it('should return unsubscribe function', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      const unsub = bus.once('user:login', handler);
      unsub();
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('wildcard handlers', () => {
    it('should call wildcard handlers for all events', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.onWildcard(handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      bus.emit('user:logout', { userId: '123' });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 'user:login', {
        userId: '123',
        timestamp: 1000
      });
      expect(handler).toHaveBeenNthCalledWith(2, 'user:logout', {
        userId: '123'
      });
    });

    it('should unsubscribe wildcard handler', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      const unsub = bus.onWildcard(handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      unsub();
      bus.emit('user:logout', { userId: '123' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('pattern handlers', () => {
    it('should match prefix pattern', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.onPattern('user:*', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      bus.emit('user:logout', { userId: '123' });
      bus.emit('data:update', { key: 'test', value: 1 });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 'user:login', {
        userId: '123',
        timestamp: 1000
      });
      expect(handler).toHaveBeenNthCalledWith(2, 'user:logout', {
        userId: '123'
      });
    });

    it('should match all with asterisk', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.onPattern('*', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      bus.emit('data:update', { key: 'test', value: 1 });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe pattern handler', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      const unsub = bus.onPattern('user:*', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      unsub();
      bus.emit('user:logout', { userId: '123' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should match exact event name pattern', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.onPattern('user:login', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });
      bus.emit('user:logout', { userId: '123' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('user:login', { userId: '123', timestamp: 1000 });
    });

    it('should not match non-matching exact pattern', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.onPattern('user:logout', handler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('handler error handling', () => {
    it('should continue on handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();

      bus.on('user:login', errorHandler);
      bus.on('user:login', normalHandler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });

    it('should not throw on handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });

      bus.on('user:login', errorHandler);

      expect(() =>
        bus.emit('user:login', { userId: '123', timestamp: 1000 })
      ).not.toThrow();
    });

    it('should continue on wildcard handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Wildcard handler error');
      });
      const normalHandler = vi.fn();

      bus.onWildcard(errorHandler);
      bus.onWildcard(normalHandler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });

    it('should not throw on wildcard handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Wildcard handler error');
      });

      bus.onWildcard(errorHandler);

      expect(() =>
        bus.emit('user:login', { userId: '123', timestamp: 1000 })
      ).not.toThrow();
    });

    it('should continue on pattern handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Pattern handler error');
      });
      const normalHandler = vi.fn();

      bus.onPattern('user:*', errorHandler);
      bus.onPattern('user:*', normalHandler);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });

    it('should not throw on pattern handler error', () => {
      const bus = new EventBus<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('Pattern handler error');
      });

      bus.onPattern('user:*', errorHandler);

      expect(() =>
        bus.emit('user:login', { userId: '123', timestamp: 1000 })
      ).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all handlers', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.on('user:login', handler);
      bus.onWildcard(handler);
      bus.onPattern('user:*', handler);
      bus.clear();
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle emitting to event with no handlers', () => {
      const bus = new EventBus<TestEvents>();

      expect(() =>
        bus.emit('user:login', { userId: '123', timestamp: 1000 })
      ).not.toThrow();
    });

    it('should deduplicate same handler registration', () => {
      const bus = new EventBus<TestEvents>();
      const handler = vi.fn();

      bus.on('user:login', handler);
      bus.on('user:login', handler); // Same handler registered again
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      // Handler deduplication: same handler only called once
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should allow different handlers for same event', () => {
      const bus = new EventBus<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('user:login', handler1);
      bus.on('user:login', handler2);
      bus.emit('user:login', { userId: '123', timestamp: 1000 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
