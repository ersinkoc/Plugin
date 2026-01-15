/**
 * Example 04: Typed Events
 *
 * This example demonstrates type-safe event communication.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin, EventMap } from '@oxog/types';

// Define event types
interface AppEvents extends EventMap {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'message:send': { from: string; to: string; text: string };
}

// Create kernel with typed events
const kernel = createKernel<unknown, AppEvents>();

// Subscribe to typed events
const unsub = kernel.on('user:login', (payload) => {
  // payload is typed as { userId: string; timestamp: number }
  console.log(`User ${payload.userId} logged in at ${payload.timestamp}`);
});

// Emit typed events
kernel.emit('user:login', { userId: 'user_123', timestamp: Date.now() });
kernel.emit('user:logout', { userId: 'user_123' });

// Unsubscribe
unsub();
kernel.emit('user:login', { userId: 'user_456', timestamp: Date.now() });

// Expected output:
// User user_123 logged in at 1234567890
