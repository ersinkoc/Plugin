/**
 * Unit tests for ContextManager
 */

import { describe, it, expect } from 'vitest';
import { ContextManager } from '../../src/context-manager';

describe('ContextManager', () => {
  describe('constructor', () => {
    it('should create with initial value', () => {
      const initial = { env: 'dev', debug: true };
      const manager = new ContextManager(initial);
      expect(manager.get()).toEqual(initial);
    });

    it('should create with empty object', () => {
      const manager = new ContextManager({});
      expect(manager.get()).toEqual({});
    });
  });

  describe('get', () => {
    it('should return current context', () => {
      const manager = new ContextManager({ value: 42 });
      expect(manager.get()).toEqual({ value: 42 });
    });

    it('should return same reference', () => {
      const context = { value: 42 };
      const manager = new ContextManager(context);
      expect(manager.get()).toBe(context);
    });
  });

  describe('update', () => {
    it('should merge partial context', () => {
      const manager = new ContextManager<{ a: number; b?: string }>({
        a: 1,
        b: 'old'
      });
      manager.update({ b: 'new' });
      expect(manager.get()).toEqual({ a: 1, b: 'new' });
    });

    it('should add new properties', () => {
      const manager = new ContextManager<{ a: number; b?: string }>({ a: 1 });
      manager.update({ b: 'added' });
      expect(manager.get()).toEqual({ a: 1, b: 'added' });
    });

    it('should overwrite existing properties', () => {
      const manager = new ContextManager({ a: 1, b: 2 });
      manager.update({ a: 10 });
      expect(manager.get()).toEqual({ a: 10, b: 2 });
    });

    it('should handle empty update', () => {
      const manager = new ContextManager({ a: 1 });
      manager.update({});
      expect(manager.get()).toEqual({ a: 1 });
    });

    it('should handle multiple updates', () => {
      const manager = new ContextManager<{ a?: number; b?: number; c?: number }>(
        {}
      );
      manager.update({ a: 1 });
      manager.update({ b: 2 });
      manager.update({ c: 3 });
      expect(manager.get()).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe('shallow merge behavior', () => {
    it('should replace nested objects entirely', () => {
      type Nested = { config: { nested: { value: number } } };
      const manager = new ContextManager<Nested>({
        config: { nested: { value: 1 } }
      });
      manager.update({ config: { nested: { value: 2 } } as Nested['config'] });
      expect(manager.get().config.nested.value).toBe(2);
    });

    it('should not deep merge nested objects', () => {
      type Nested = { config: { a: number; b?: number } };
      const manager = new ContextManager<Nested>({
        config: { a: 1, b: 2 }
      });
      // This replaces config entirely, not a deep merge
      manager.update({ config: { a: 10 } });
      expect(manager.get().config).toEqual({ a: 10 });
    });
  });

  describe('deepUpdate', () => {
    it('should deep merge nested objects', () => {
      type Context = { config: { db: string; api: string } };
      const manager = new ContextManager<Context>({
        config: { db: 'localhost', api: 'http://localhost' }
      });

      // Deep merge - only updates db, keeps api
      manager.deepUpdate({ config: { db: 'postgres://prod' } } as any);

      expect(manager.get()).toEqual({
        config: { db: 'postgres://prod', api: 'http://localhost' }
      });
    });

    it('should handle deeply nested objects', () => {
      type Context = {
        level1: {
          level2: {
            level3: { a: number; b: number };
            other: string;
          };
          sibling: string;
        };
      };
      const manager = new ContextManager<Context>({
        level1: {
          level2: {
            level3: { a: 1, b: 2 },
            other: 'value'
          },
          sibling: 'keep'
        }
      });

      manager.deepUpdate({
        level1: { level2: { level3: { a: 10 } } }
      } as any);

      expect(manager.get()).toEqual({
        level1: {
          level2: {
            level3: { a: 10, b: 2 },
            other: 'value'
          },
          sibling: 'keep'
        }
      });
    });

    it('should replace arrays instead of merging', () => {
      type Context = { items: number[]; config: { tags: string[] } };
      const manager = new ContextManager<Context>({
        items: [1, 2, 3],
        config: { tags: ['a', 'b', 'c'] }
      });

      manager.deepUpdate({
        items: [4, 5],
        config: { tags: ['x'] }
      } as any);

      expect(manager.get()).toEqual({
        items: [4, 5],
        config: { tags: ['x'] }
      });
    });

    it('should handle null values correctly', () => {
      type Context = { a: string | null; config: { b: number | null } };
      const manager = new ContextManager<Context>({
        a: 'value',
        config: { b: 42 }
      });

      manager.deepUpdate({ a: null, config: { b: null } } as any);

      expect(manager.get()).toEqual({
        a: null,
        config: { b: null }
      });
    });

    it('should handle primitive values', () => {
      type Context = { count: number; name: string; active: boolean };
      const manager = new ContextManager<Context>({
        count: 0,
        name: 'old',
        active: false
      });

      manager.deepUpdate({ count: 10, active: true });

      expect(manager.get()).toEqual({
        count: 10,
        name: 'old',
        active: true
      });
    });

    it('should add new nested properties', () => {
      type Context = { config?: { a?: number; b?: number } };
      const manager = new ContextManager<Context>({});

      manager.deepUpdate({ config: { a: 1 } } as any);

      expect(manager.get()).toEqual({ config: { a: 1 } });

      manager.deepUpdate({ config: { b: 2 } } as any);

      expect(manager.get()).toEqual({ config: { a: 1, b: 2 } });
    });

    it('should handle target being non-object', () => {
      type Context = { value: string | { nested: number } };
      const manager = new ContextManager<Context>({
        value: 'string'
      });

      manager.deepUpdate({ value: { nested: 42 } });

      expect(manager.get()).toEqual({ value: { nested: 42 } });
    });

    it('should handle source being non-object', () => {
      type Context = { value: string | { nested: number } };
      const manager = new ContextManager<Context>({
        value: { nested: 42 }
      });

      manager.deepUpdate({ value: 'string' });

      expect(manager.get()).toEqual({ value: 'string' });
    });

    it('should handle empty partial', () => {
      type Context = { config: { a: number } };
      const manager = new ContextManager<Context>({
        config: { a: 1 }
      });

      manager.deepUpdate({});

      expect(manager.get()).toEqual({ config: { a: 1 } });
    });

    it('should handle target array being replaced with object', () => {
      type Context = { value: number[] | { nested: number } };
      const manager = new ContextManager<Context>({
        value: [1, 2, 3]
      });

      manager.deepUpdate({ value: { nested: 42 } });

      expect(manager.get()).toEqual({ value: { nested: 42 } });
    });
  });
});
