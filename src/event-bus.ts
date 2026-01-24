/**
 * Event Bus - Type-safe event emission and subscription.
 *
 * Provides typed event communication between plugins with support
 * for wildcards, pattern matching, and auto-cleanup.
 *
 * @module event-bus
 */

import type { EventMap, Unsubscribe } from '@oxog/types';
import type { EventHandler, WildcardHandler, PatternHandler } from './types.js';

/**
 * Type-safe event bus for plugin communication.
 *
 * Features:
 * - Typed events via generics
 * - Wildcard subscription (`'*'`)
 * - Pattern subscription (`'prefix:*'`)
 * - `once()` for single-fire subscriptions
 * - Auto-cleanup on unsubscribe
 *
 * @template TEvents - Event map interface
 *
 * @example
 * ```typescript
 * interface Events {
 *   'user:login': { userId: string };
 *   'user:logout': { userId: string };
 * };
 *
 * const bus = new EventBus<Events>();
 *
 * // Subscribe to specific event
 * const unsub = bus.on('user:login', (payload) => {
 *   console.log(payload.userId); // string
 * });
 *
 * // Emit event
 * bus.emit('user:login', { userId: '123' });
 *
 * // Unsubscribe
 * unsub();
 * ```
 */
export class EventBus<TEvents extends EventMap> {
  private handlers = new Map<string, Array<EventHandler<unknown>>>();
  private wildcardHandlers = new Array<WildcardHandler>();
  private patternHandlers = new Map<string, Array<PatternHandler>>();

  /**
   * Maps original handlers to their wrapped versions for once() subscriptions.
   * Key format: "eventName:handlerIndex" -> wrapped handler
   * This allows off() to work correctly with once() subscriptions.
   */
  private onceWrappers = new Map<EventHandler<unknown>, EventHandler<unknown>>();

  /**
   * Subscribe to a specific event.
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = bus.on('user:login', (payload) => {
   *   console.log('User logged in:', payload.userId);
   * });
   * // Call unsub() to remove the handler
   * ```
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const eventKey = String(event);
    if (!this.handlers.has(eventKey)) {
      this.handlers.set(eventKey, []);
    }

    const handlers = this.handlers.get(eventKey)!;
    const typedHandler = handler as EventHandler<unknown>;

    // Prevent duplicate handler registration
    if (!handlers.includes(typedHandler)) {
      handlers.push(typedHandler);
    }

    return () => {
      const currentHandlers = this.handlers.get(eventKey);
      if (currentHandlers) {
        const index = currentHandlers.indexOf(typedHandler);
        if (index !== -1) {
          currentHandlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to an event for a single emission.
   *
   * The handler is automatically removed after the first event.
   * You can also manually unsubscribe using off() with the original handler.
   *
   * @param event - Event name
   * @param handler - Event handler function
   * @returns Unsubscribe function (usually not needed)
   *
   * @example
   * ```typescript
   * bus.once('app:ready', () => {
   *   console.log('App is ready!');
   * });
   *
   * // Can also be cancelled before firing:
   * const handler = () => console.log('ready');
   * bus.once('app:ready', handler);
   * bus.off('app:ready', handler); // Works correctly
   * ```
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): Unsubscribe {
    const typedHandler = handler as EventHandler<unknown>;

    const wrapped: EventHandler<TEvents[K]> = (payload) => {
      // Clean up the mapping
      this.onceWrappers.delete(typedHandler);
      // Remove from handlers using wrapped (which is what's registered)
      this.off(event, wrapped);
      // Call original handler
      handler(payload);
    };

    // Store mapping so off() can find the wrapper
    this.onceWrappers.set(typedHandler, wrapped as EventHandler<unknown>);

    return this.on(event, wrapped);
  }

  /**
   * Unsubscribe a specific event handler.
   *
   * Works with both on() and once() subscriptions.
   *
   * @param event - Event name
   * @param handler - Handler to remove
   *
   * @example
   * ```typescript
   * const handler = (payload) => console.log(payload);
   * bus.on('event', handler);
   * bus.off('event', handler);
   *
   * // Also works with once():
   * bus.once('event', handler);
   * bus.off('event', handler); // Cancels the once subscription
   * ```
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    const handlers = this.handlers.get(String(event));
    if (handlers) {
      const typedHandler = handler as EventHandler<unknown>;

      // Check if this handler has a once() wrapper
      const wrappedHandler = this.onceWrappers.get(typedHandler);
      const handlerToRemove = wrappedHandler || typedHandler;

      const index = handlers.indexOf(handlerToRemove);
      if (index !== -1) {
        handlers.splice(index, 1);
        // Clean up the wrapper mapping if it was a once() handler
        if (wrappedHandler) {
          this.onceWrappers.delete(typedHandler);
        }
      }
    }
  }

  /**
   * Emit an event to all subscribers.
   *
   * Handlers are called synchronously. Errors in handlers are caught
   * and logged but don't stop other handlers from executing.
   *
   * @param event - Event name
   * @param payload - Event payload
   *
   * @example
   * ```typescript
   * bus.emit('user:login', { userId: '123' });
   * ```
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const eventKey = String(event);

    // Direct handlers
    this.handlers.get(eventKey)?.forEach((h) => {
      try {
        h(payload);
      } catch {
        // Silently ignore handler errors
      }
    });

    // Wildcard handlers
    this.wildcardHandlers.forEach((h) => {
      try {
        h(eventKey, payload);
      } catch {
        // Silently ignore handler errors
      }
    });

    // Pattern handlers
    for (const [pattern, handlers] of this.patternHandlers) {
      if (this.matchPattern(pattern, eventKey)) {
        handlers.forEach((h) => {
          try {
            h(eventKey, payload);
          } catch {
            // Silently ignore handler errors
          }
        });
      }
    }
  }

  /**
   * Subscribe to all events (wildcard).
   *
   * @param handler - Handler receiving (event, payload)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * bus.onWildcard((event, payload) => {
   *   console.log(`[${event}]`, payload);
   * });
   * ```
   */
  onWildcard(handler: WildcardHandler): Unsubscribe {
    // Prevent duplicate handler registration
    if (!this.wildcardHandlers.includes(handler)) {
      this.wildcardHandlers.push(handler);
    }
    return () => {
      const index = this.wildcardHandlers.indexOf(handler);
      if (index !== -1) {
        this.wildcardHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to events matching a pattern.
   *
   * Pattern supports:
   * - `'*'` - Match all events
   * - `'prefix:*'` - Match events starting with prefix
   *
   * @param pattern - Pattern string
   * @param handler - Handler receiving (event, payload)
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * bus.onPattern('user:*', (event, payload) => {
   *   console.log('User event:', event);
   * });
   * ```
   */
  onPattern(pattern: string, handler: PatternHandler): Unsubscribe {
    if (!this.patternHandlers.has(pattern)) {
      this.patternHandlers.set(pattern, []);
    }

    const handlers = this.patternHandlers.get(pattern)!;

    // Prevent duplicate handler registration
    if (!handlers.includes(handler)) {
      handlers.push(handler);
    }

    return () => {
      const currentHandlers = this.patternHandlers.get(pattern);
      if (currentHandlers) {
        const index = currentHandlers.indexOf(handler);
        if (index !== -1) {
          currentHandlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Clear all event subscriptions.
   *
   * This is called automatically when the kernel is destroyed.
   *
   * @internal
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.length = 0;
    this.patternHandlers.clear();
    this.onceWrappers.clear();
  }

  /**
   * Match an event against a pattern.
   *
   * @param pattern - Pattern string (supports `*` and `prefix:*`)
   * @param event - Event name to match
   * @returns True if event matches pattern
   *
   * @internal
   */
  private matchPattern(pattern: string, event: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return event.startsWith(prefix + ':');
    }
    return pattern === event;
  }
}
