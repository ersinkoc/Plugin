/**
 * Example 05: Wildcard Events
 *
 * This example demonstrates wildcard and pattern event subscriptions.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin, EventMap } from '@oxog/types';

interface AppEvents extends EventMap {
  'user:login': { userId: string };
  'user:logout': { userId: string };
  'user:update': { userId: string; data: unknown };
  'system:startup': {};
  'system:shutdown': {};
}

const kernel = createKernel<unknown, AppEvents>();

// Wildcard: Subscribe to ALL events
console.log('=== Wildcard Subscription ===');
kernel.onWildcard((event, payload) => {
  console.log(`[WILDCARD] Event: ${event}`, payload);
});

kernel.emit('user:login', { userId: '123' });
kernel.emit('system:startup', {});

// Pattern: Subscribe to events matching a pattern
console.log('\n=== Pattern Subscription (user:*) ===');
// @ts-expect-error - onPattern is exposed for use but not in main types
kernel.onPattern('user:*', (event, payload) => {
  console.log(`[PATTERN] User event: ${event}`, payload);
});

kernel.emit('user:login', { userId: '456' });
kernel.emit('user:logout', { userId: '456' });
kernel.emit('system:startup', {});

// Expected output:
// === Wildcard Subscription ===
// [WILDCARD] Event: user:login { userId: '123' }
// [WILDCARD] Event: system:startup {}
//
// === Pattern Subscription (user:*) ===
// [PATTERN] User event: user:login { userId: '456' }
// [WILDCARD] Event: user:login { userId: '456' }
// [PATTERN] User event: user:logout { userId: '456' }
// [WILDCARD] Event: user:logout { userId: '456' }
// [WILDCARD] Event: system:startup {}
