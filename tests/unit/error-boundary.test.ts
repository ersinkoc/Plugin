/**
 * Unit tests for ErrorBoundary
 */

import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../../src/error-boundary';
import type { Plugin } from '../../src/index.js';

describe('ErrorBoundary', () => {
  const createMockPlugin = (
    hooks: Partial<Plugin<unknown>>
  ): Plugin<unknown> => ({
    name: 'test-plugin',
    version: '1.0.0',
    install() {},
    ...hooks
  });

  describe('constructor', () => {
    it('should create with isolate strategy by default', () => {
      const boundary = new ErrorBoundary('isolate');
      expect(boundary).toBeDefined();
    });

    it('should create with global handler', () => {
      const handler = vi.fn();
      const boundary = new ErrorBoundary('isolate', handler);
      expect(boundary).toBeDefined();
    });
  });

  describe('withBoundary - isolate strategy', () => {
    it('should call plugin onError on error', async () => {
      const onError = vi.fn();
      const plugin = createMockPlugin({ onError });
      const boundary = new ErrorBoundary('isolate');

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should call global handler on error', async () => {
      const globalHandler = vi.fn();
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('isolate', globalHandler);

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(globalHandler).toHaveBeenCalledWith(error, 'test');
    });

    it('should call both handlers on error', async () => {
      const pluginHandler = vi.fn();
      const globalHandler = vi.fn();
      const plugin = createMockPlugin({ onError: pluginHandler });
      const boundary = new ErrorBoundary('isolate', globalHandler);

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(pluginHandler).toHaveBeenCalledWith(error);
      expect(globalHandler).toHaveBeenCalledWith(error, 'test');
    });

    it('should handle errors in plugin error handlers', async () => {
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const plugin = createMockPlugin({ onError: badHandler });
      const globalHandler = vi.fn();
      const boundary = new ErrorBoundary('isolate', globalHandler);

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      // Should not throw, global handler should still be called
      expect(globalHandler).toHaveBeenCalled();
    });

    it('should handle errors in global error handler', async () => {
      const badGlobalHandler = vi.fn(() => {
        throw new Error('Global handler error');
      });
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('isolate', badGlobalHandler);

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      // Should not crash, global handler was called but threw
      expect(badGlobalHandler).toHaveBeenCalledWith(error, 'test');
    });

    it('should re-throw the original error', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('isolate');

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('collect strategy', () => {
    it('should collect errors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('collect');

      const error = new Error('Test error');
      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw error;
        })
      ).rejects.toThrow(error);

      expect(boundary.getErrors()).toHaveLength(1);
      expect(boundary.getErrors()[0]).toBe(error);
    });

    it('should collect multiple errors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('collect');

      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      await expect(
        boundary.withBoundary('test1', plugin, async () => {
          throw error1;
        })
      ).rejects.toThrow(error1);

      await expect(
        boundary.withBoundary('test2', plugin, async () => {
          throw error2;
        })
      ).rejects.toThrow(error2);

      expect(boundary.getErrors()).toHaveLength(2);
    });

    it('should throw AggregateError in throwIfErrors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('collect');

      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw new Error('Error');
        })
      ).rejects.toThrow();

      expect(() => boundary.throwIfErrors()).toThrow(AggregateError);
    });

    it('should clear errors after throwIfErrors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('collect');

      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw new Error('Error');
        })
      ).rejects.toThrow();

      expect(() => boundary.throwIfErrors()).toThrow(AggregateError);
      // After throwIfErrors throws, errors should be cleared
      expect(boundary.getErrors()).toHaveLength(0);
    });

    it('should not throw if no errors', () => {
      const boundary = new ErrorBoundary('collect');
      expect(() => boundary.throwIfErrors()).not.toThrow();
    });
  });

  describe('wrapIsolate', () => {
    it('should return result on success', async () => {
      const boundary = new ErrorBoundary('isolate');
      const result = await boundary.wrapIsolate(async () => 42);
      expect(result).toBe(42);
    });

    it('should return null on error', async () => {
      const boundary = new ErrorBoundary('isolate');
      const result = await boundary.wrapIsolate(async () => {
        throw new Error('Error');
      });
      expect(result).toBeNull();
    });
  });

  describe('wrapFailFast', () => {
    it('should return result on success', async () => {
      const boundary = new ErrorBoundary('fail-fast');
      const result = await boundary.wrapFailFast(async () => 42);
      expect(result).toBe(42);
    });

    it('should throw on error', async () => {
      const boundary = new ErrorBoundary('fail-fast');
      await expect(
        boundary.wrapFailFast(async () => {
          throw new Error('Error');
        })
      ).rejects.toThrow('Error');
    });
  });

  describe('wrapCollect', () => {
    it('should return result on success', async () => {
      const boundary = new ErrorBoundary('collect');
      const result = await boundary.wrapCollect(async () => 42);
      expect(result).toBe(42);
    });

    it('should return null on error', async () => {
      const boundary = new ErrorBoundary('collect');
      const result = await boundary.wrapCollect(async () => {
        throw new Error('Error');
      });
      expect(result).toBeNull();
    });

    it('should collect error', async () => {
      const boundary = new ErrorBoundary('collect');
      const error = new Error('Test');

      await boundary.wrapCollect(async () => {
        throw error;
      });

      expect(boundary.getErrors()).toContain(error);
    });
  });

  describe('clearErrors', () => {
    it('should clear collected errors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('collect');

      await expect(
        boundary.withBoundary('test', plugin, async () => {
          throw new Error('Error');
        })
      ).rejects.toThrow();

      boundary.clearErrors();
      expect(boundary.getErrors()).toHaveLength(0);
    });
  });

  describe('getErrors', () => {
    it('should return readonly array', () => {
      const boundary = new ErrorBoundary('collect');
      const errors = boundary.getErrors();

      expect(errors).toBeInstanceOf(Array);
      // Readonly array means we can't modify the internal reference
      // The array itself is frozen from external modification
      expect(Object.isFrozen(errors)).toBe(true);
    });

    it('should return empty array initially', () => {
      const boundary = new ErrorBoundary('collect');
      expect(boundary.getErrors()).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error errors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('isolate');
      const handler = vi.fn();
      const globalBoundary = new ErrorBoundary('isolate', handler);

      await expect(
        globalBoundary.withBoundary('test', plugin, async () => {
          throw 'string error';
        })
      ).rejects.toThrow();

      expect(handler).toHaveBeenCalled();
      const errorArg = handler.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
    });

    it('should handle null errors', async () => {
      const plugin = createMockPlugin({});
      const boundary = new ErrorBoundary('isolate');

      await expect(
        boundary.withBoundary('test', plugin, async () => {
          // @ts-expect-error - testing null throw
          throw null;
        })
      ).rejects.toThrow();
    });
  });
});
