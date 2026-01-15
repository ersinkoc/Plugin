/**
 * @oxog/plugin - Micro-kernel plugin system
 *
 * A lightweight, typed plugin system with lifecycle management,
 * event bus, and dependency resolution.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { createKernel } from '@oxog/plugin';
 *
 * const kernel = createKernel();
 * kernel.use(myPlugin);
 * await kernel.init();
 * ```
 */

import type { EventMap } from '@oxog/types';

// Kernel exports
export { KernelInstance, KernelState } from './kernel.js';

// Helper exports
export { definePlugin } from './helpers.js';

// Type exports
export type { ErrorStrategy, PluginFactory } from './types.js';

// Re-exports from @oxog/types
export { PluginError } from '@oxog/types';
export type {
  Plugin,
  Kernel,
  MaybePromise,
  Unsubscribe,
  EventMap
} from '@oxog/types';

import { KernelInstance } from './kernel.js';

/**
 * Create a new micro-kernel instance.
 *
 * The kernel is the central component that manages plugins throughout
 * their lifecycle. It provides plugin registration, lifecycle hooks,
 * type-safe events, dependency resolution, and shared context.
 *
 * @template TContext - Type of shared context between plugins
 * @template TEvents - Event map for typed events
 * @param options - Optional kernel configuration
 * @returns A new kernel instance
 *
 * @example
 * ```typescript
 * // Simple usage
 * const kernel = createKernel();
 * ```
 *
 * @example
 * ```typescript
 * // With context type
 * interface AppContext {
 *   env: 'development' | 'production';
 *   debug: boolean;
 * }
 *
 * const kernel = createKernel<AppContext>({
 *   context: { env: 'development', debug: true }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With typed events
 * interface AppEvents {
 *   'user:login': { userId: string; timestamp: number };
 *   'user:logout': { userId: string };
 * }
 *
 * const kernel = createKernel<{}, AppEvents>();
 *
 * kernel.on('user:login', (payload) => {
 *   // payload is typed as { userId: string; timestamp: number }
 *   console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
 * });
 *
 * kernel.emit('user:login', { userId: '123', timestamp: Date.now() });
 * ```
 *
 * @example
 * ```typescript
 * // With full configuration
 * interface AppContext {
 *   config: { apiUrl: string };
 * }
 *
 * const kernel = createKernel<AppContext, {}>({
 *   context: {
 *     config: { apiUrl: 'https://api.example.com' }
 *   },
 *   errorStrategy: 'isolate', // 'isolate' | 'fail-fast' | 'collect'
 *   onError: (error, pluginName) => {
 *     console.error(`[${pluginName}] Error:`, error.message);
 *   },
 *   onBeforeInit: async () => {
 *     console.log('Initializing kernel...');
 *   },
 *   onAfterInit: async () => {
 *     console.log('Kernel ready!');
 *   },
 *   onBeforeDestroy: async () => {
 *     console.log('Destroying kernel...');
 *   },
 *   onAfterDestroy: async () => {
 *     console.log('Kernel destroyed');
 *   }
 * });
 * ```
 */
export function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: {
  /** Initial shared context value */
  context?: TContext;
  /** Error handling strategy: 'isolate' | 'fail-fast' | 'collect' */
  errorStrategy?: 'isolate' | 'fail-fast' | 'collect';
  /** Global error handler called when any plugin errors */
  onError?: (error: Error, pluginName: string) => void;
  /** Hook called before kernel initialization starts */
  onBeforeInit?: () => void | Promise<void>;
  /** Hook called after kernel initialization completes */
  onAfterInit?: () => void | Promise<void>;
  /** Hook called before kernel destruction starts */
  onBeforeDestroy?: () => void | Promise<void>;
  /** Hook called after kernel destruction completes */
  onAfterDestroy?: () => void | Promise<void>;
}): KernelInstance<TContext, TEvents> {
  return new KernelInstance<TContext, TEvents>(options);
}
