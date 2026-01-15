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
});
