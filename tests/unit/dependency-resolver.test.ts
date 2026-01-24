/**
 * Unit tests for DependencyResolver
 */

import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '../../src/dependency-resolver';
import { PluginError } from '../../src/index.js';

describe('DependencyResolver', () => {
  describe('addPlugin', () => {
    it('should add plugin with no dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);

      expect(resolver.getGraph()).toEqual({ a: [] });
    });

    it('should add plugin with dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b', 'c']);

      expect(resolver.getGraph()).toEqual({ a: ['b', 'c'] });
    });

    it('should add multiple plugins', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', []);
      resolver.addPlugin('c', ['a']);

      expect(resolver.getGraph()).toEqual({
        a: ['b'],
        b: [],
        c: ['a']
      });
    });
  });

  describe('removePlugin', () => {
    it('should remove plugin from graph', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.removePlugin('a');

      expect(resolver.getGraph()).toEqual({});
    });

    it('should remove from other plugins dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', ['a']);
      resolver.removePlugin('a');

      expect(resolver.getGraph()).toEqual({ b: [] });
    });

    it('should handle removing non-existent plugin', () => {
      const resolver = new DependencyResolver();

      expect(() => resolver.removePlugin('nonexistent')).not.toThrow();
    });
  });

  describe('resolve - simple ordering', () => {
    it('should return single plugin with no deps', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);

      const order = resolver.resolve();
      expect(order).toEqual(['a']);
    });

    it('should order two plugins with dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('b', ['a']);
      resolver.addPlugin('a', []);

      const order = resolver.resolve();
      expect(order).toEqual(['a', 'b']);
    });

    it('should handle multiple independent plugins', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', []);
      resolver.addPlugin('c', []);

      const order = resolver.resolve();
      expect(order).toContain('a');
      expect(order).toContain('b');
      expect(order).toContain('c');
      expect(order).toHaveLength(3);
    });
  });

  describe('resolve - complex ordering', () => {
    it('should resolve chain of dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('d', ['c']);
      resolver.addPlugin('c', ['b']);
      resolver.addPlugin('b', ['a']);
      resolver.addPlugin('a', []);

      const order = resolver.resolve();
      expect(order).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should resolve diamond dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', ['a']);
      resolver.addPlugin('c', ['a']);
      resolver.addPlugin('d', ['b', 'c']);

      const order = resolver.resolve();
      expect(order[0]).toBe('a');
      expect(order[3]).toBe('d');
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('d'));
      expect(order.indexOf('c')).toBeLessThan(order.indexOf('d'));
    });

    it('should resolve multiple dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('api', ['database', 'cache']);
      resolver.addPlugin('cache', ['database']);
      resolver.addPlugin('database', []);

      const order = resolver.resolve();
      expect(order).toEqual(['database', 'cache', 'api']);
    });
  });

  describe('resolve - circular dependencies', () => {
    it('should throw on direct circular dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['a']);

      expect(() => resolver.resolve()).toThrowError(PluginError);
      expect(() => resolver.resolve()).toThrowError(/Circular dependency/);
    });

    it('should throw on indirect circular dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['c']);
      resolver.addPlugin('c', ['a']);

      expect(() => resolver.resolve()).toThrowError(PluginError);
      expect(() => resolver.resolve()).toThrowError(/Circular dependency/);
    });

    it('should include cycle path in error', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['a']);

      try {
        resolver.resolve();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PluginError);
        const message = (error as Error).message;
        expect(message).toMatch(/Circular dependency/);
        expect(message).toMatch(/a.*b.*a/);
      }
    });
  });

  describe('resolve - missing dependencies', () => {
    it('should throw on missing dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['missing']);

      expect(() => resolver.resolve()).toThrowError(PluginError);
      expect(() => resolver.resolve()).toThrowError(/Missing dependency/);
      expect(() => resolver.resolve()).toThrowError(/missing/);
    });

    it('should include plugin name in error', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('my-plugin', ['missing-dep']);

      try {
        resolver.resolve();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PluginError);
        const message = (error as Error).message;
        expect(message).toContain('my-plugin');
        expect(message).toContain('missing-dep');
      }
    });

    it('should handle multiple missing dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['missing1', 'missing2']);

      expect(() => resolver.resolve()).toThrowError(/Missing dependency/);
    });
  });

  describe('validateSinglePlugin', () => {
    it('should not throw for valid plugin with no dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);

      expect(() => resolver.validateSinglePlugin('a')).not.toThrow();
    });

    it('should not throw for plugin with satisfied dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', ['a']);

      expect(() => resolver.validateSinglePlugin('b')).not.toThrow();
    });

    it('should throw for missing dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['missing']);

      expect(() => resolver.validateSinglePlugin('a')).toThrow(PluginError);
      expect(() => resolver.validateSinglePlugin('a')).toThrow(
        "Missing dependency: 'missing' required by 'a'"
      );
    });

    it('should throw for circular dependency involving the plugin', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['a']);

      expect(() => resolver.validateSinglePlugin('a')).toThrow(PluginError);
      expect(() => resolver.validateSinglePlugin('a')).toThrow(/Circular dependency detected/);
    });

    it('should throw for complex circular dependency involving the plugin', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['c']);
      resolver.addPlugin('c', ['a']); // a -> b -> c -> a

      expect(() => resolver.validateSinglePlugin('a')).toThrow(PluginError);
      expect(() => resolver.validateSinglePlugin('b')).toThrow(PluginError);
      expect(() => resolver.validateSinglePlugin('c')).toThrow(PluginError);
    });

    it('should return early if plugin has no dependencies', () => {
      const resolver = new DependencyResolver();
      // Plugin not in graph - should return early
      expect(() => resolver.validateSinglePlugin('nonexistent')).not.toThrow();
    });
  });

  describe('detectCycle', () => {
    it('should return null for acyclic graph', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', ['a']);

      expect(resolver.detectCycle()).toBeNull();
    });

    it('should return cycle path for circular dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['a']);

      const cycle = resolver.detectCycle();
      expect(cycle).not.toBeNull();
      expect(cycle).toContain('a');
      expect(cycle).toContain('b');
    });

    it('should skip non-existent dependencies during cycle detection', () => {
      const resolver = new DependencyResolver();
      // Create a graph where 'a' depends on 'missing' which doesn't exist as a plugin
      resolver.addPlugin('a', ['missing']);

      // detectCycle should not crash and return null (no cycle)
      expect(resolver.detectCycle()).toBeNull();
    });

    it('should handle complex cycle with external dependencies', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b', 'external']);
      resolver.addPlugin('b', ['c']);
      resolver.addPlugin('c', ['a']); // Creates cycle: a -> b -> c -> a

      const cycle = resolver.detectCycle();
      expect(cycle).not.toBeNull();
      expect(cycle).toContain('a');
    });

    it('should return null for empty graph', () => {
      const resolver = new DependencyResolver();
      expect(resolver.detectCycle()).toBeNull();
    });

    it('should detect cycle with multiple entry points', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('x', []);  // Independent plugin
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', ['c']);
      resolver.addPlugin('c', ['a']); // Cycle in separate component

      const cycle = resolver.detectCycle();
      expect(cycle).not.toBeNull();
    });
  });

  describe('getGraph', () => {
    it('should return empty object initially', () => {
      const resolver = new DependencyResolver();
      expect(resolver.getGraph()).toEqual({});
    });

    it('should return graph object', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['b']);
      resolver.addPlugin('b', []);

      expect(resolver.getGraph()).toEqual({
        a: ['b'],
        b: []
      });
    });

    it('should return plain object not Map', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);

      const graph = resolver.getGraph();
      expect(graph).not.toBeInstanceOf(Map);
      expect(typeof graph).toBe('object');
    });
  });

  describe('clear', () => {
    it('should clear all plugins', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', []);
      resolver.clear();

      expect(resolver.getGraph()).toEqual({});
    });

    it('should allow adding after clear', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.clear();
      resolver.addPlugin('b', []);

      expect(resolver.getGraph()).toEqual({ b: [] });
    });
  });

  describe('edge cases', () => {
    it('should handle empty graph', () => {
      const resolver = new DependencyResolver();
      const order = resolver.resolve();
      expect(order).toEqual([]);
    });

    it('should handle plugin with self dependency', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', ['a']);

      // Self-dependency is a circular dependency
      expect(() => resolver.resolve()).toThrowError(PluginError);
    });

    it('should ignore missing deps in graph building', () => {
      const resolver = new DependencyResolver();
      resolver.addPlugin('a', []);
      resolver.addPlugin('b', ['a', 'missing']);

      // resolve() should throw due to missing dependency
      expect(() => resolver.resolve()).toThrowError(/Missing dependency/);
    });
  });
});
