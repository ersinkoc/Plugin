/**
 * Helper utilities for plugin development.
 *
 * @module helpers
 */

import type { PluginFactory } from './types.js';
import { KernelState } from './types.js';

/**
 * Create a type-safe plugin factory.
 *
 * Helper function to define plugin factories with proper type inference.
 *
 * @param factory - Plugin factory function
 * @returns The same factory function (type helper only)
 *
 * @example
 * ```typescript
 * import { definePlugin } from '@oxog/plugin';
 *
 * const createLogger = definePlugin((options: { level: string }) => ({
 *   name: 'logger',
 *   version: '1.0.0',
 *   install(kernel) {
 *     kernel.logLevel = options.level;
 *   }
 * }));
 *
 * const logger = createLogger({ level: 'info' });
 * ```
 */
export function definePlugin<TContext>(
  factory: PluginFactory<TContext>
): PluginFactory<TContext> {
  return factory;
}

/**
 * Export KernelState enum.
 */
export { KernelState } from './types.js';

/**
 * Export internal types.
 */
export type { ErrorStrategy, PluginFactory } from './types.js';
