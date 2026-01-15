/**
 * Example 11: Plugin Queries
 *
 * This example demonstrates querying and inspecting registered plugins.
 */

import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/types';

const plugins: Plugin[] = [
  { name: 'logger', version: '1.0.0', install() {} },
  { name: 'database', version: '2.0.0', install() {} },
  { name: 'cache', version: '1.5.0', dependencies: ['database'], install() {} },
  { name: 'api', version: '3.0.0', dependencies: ['cache'], install() {} }
];

const kernel = createKernel();
kernel.useAll(plugins);

console.log('=== Plugin Queries ===\n');

// Check if plugin exists
console.log(`Has 'logger': ${kernel.hasPlugin('logger')}`);
console.log(`Has 'nonexistent': ${kernel.hasPlugin('nonexistent')}`);

// Get specific plugin
const logger = kernel.getPlugin('logger');
if (logger) {
  console.log(`\nLogger plugin version: ${logger.version}`);
}

// List all plugins
console.log('\nAll plugins:');
kernel.listPlugins().forEach((p) => {
  console.log(`  - ${p.name} v${p.version}`);
});

// Get plugin names
console.log('\nPlugin names:', kernel.getPluginNames());

// Get dependency graph
console.log('\nDependency graph:');
const graph = kernel.getDependencyGraph();
for (const [name, deps] of Object.entries(graph)) {
  console.log(`  ${name} -> [${deps.join(', ') || 'none'}]`);
}

// Expected output:
// === Plugin Queries ===
//
// Has 'logger': true
// Has 'nonexistent': false
//
// Logger plugin version: 1.0.0
//
// All plugins:
//   - logger v1.0.0
//   - database v2.0.0
//   - cache v1.5.0
//   - api v3.0.0
//
// Plugin names: [ 'logger', 'database', 'cache', 'api' ]
//
// Dependency graph:
//   logger -> [none]
//   database -> [none]
//   cache -> [database]
//   api -> [cache]
