import { CodeBlock } from '@/components/code/CodeBlock';

const dependencyCode = `const database: Plugin = {
  name: 'database',
  version: '1.0.0',
  install(kernel) { /* ... */ }
};

const cache: Plugin = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['database'], // Needs database
  install(kernel) { /* ... */ }
};

const api: Plugin = {
  name: 'api',
  version: '1.0.0',
  dependencies: ['cache', 'database'], // Needs both
  install(kernel) { /* ... */ }
};

const kernel = createKernel();

// Register in any order
kernel.use(api);      // First, but depends on others
kernel.use(database); // No dependencies
kernel.use(cache);    // Depends on database

// init() calls onInit in correct order:
// 1. database (no deps)
// 2. cache (after database)
// 3. api (after cache and database)
await kernel.init();

// destroy() calls onDestroy in reverse order:
// 1. api
// 2. cache
// 3. database
await kernel.destroy();`;

const graphCode = `const graph = kernel.getDependencyGraph();
// {
//   database: [],
//   cache: ['database'],
//   api: ['cache', 'database']
// }`;

const circularErrorCode = `// This will throw an error
const pluginA: Plugin = {
  name: 'a',
  dependencies: ['b'],
  // ...
};

const pluginB: Plugin = {
  name: 'b',
  dependencies: ['a'], // Circular!
  // ...
};

kernel.use(pluginA).use(pluginB);
await kernel.init(); // Throws: Circular dependency detected: a -> b -> a`;

const missingErrorCode = `// This will throw an error
const myPlugin: Plugin = {
  name: 'my-plugin',
  dependencies: ['non-existent'], // Not registered
  // ...
};

kernel.use(myPlugin);
await kernel.init(); // Throws: Missing dependency: 'non-existent' required by 'my-plugin'`;

const dynamicDepsCode = `// Dependencies are also validated for dynamic plugins
await kernel.init();

// This throws immediately - 'missing' is not registered
kernel.use({
  name: 'late-plugin',
  dependencies: ['missing'],
  install() {}
}); // Throws: Missing dependency: 'missing' required by 'late-plugin'

// This works - 'database' is already initialized
kernel.use({
  name: 'late-api',
  dependencies: ['database'],
  install() {},
  async onInit() {
    // Safe to use database here
  }
});

// Wait for the new plugin to initialize
await kernel.waitForPlugin('late-api');`;

const dependencyOrderCode = `// Dynamic plugins wait for their dependencies
await kernel.init();

// Add dependency first (slow init)
kernel.use({
  name: 'slow-dep',
  install() {},
  async onInit() {
    await new Promise(r => setTimeout(r, 1000));
    console.log('slow-dep ready');
  }
});

// Add dependent immediately after
kernel.use({
  name: 'dependent',
  dependencies: ['slow-dep'],
  install() {},
  async onInit() {
    // This runs AFTER slow-dep completes
    console.log('dependent ready');
  }
});

await kernel.waitForAll();
// Output:
// slow-dep ready
// dependent ready`;

export function Dependencies() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Dependencies</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Plugins can declare dependencies on other plugins. The kernel automatically 
        resolves and orders them using topological sorting.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Declaring Dependencies</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Add a <code className="text-[hsl(var(--primary))]">dependencies</code> array to your plugin:
      </p>
      <CodeBlock code={dependencyCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Dependency Graph</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        You can inspect the dependency graph:
      </p>
      <CodeBlock code={graphCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Error Handling</h2>
      
      <h3 className="text-xl font-semibold mt-8 mb-4">Circular Dependencies</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Circular dependencies are detected and throw an error:
      </p>
      <CodeBlock code={circularErrorCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Missing Dependencies</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Missing dependencies are also detected:
      </p>
      <CodeBlock code={missingErrorCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Dynamic Plugin Dependencies</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Dependencies are validated even when adding plugins after <code className="text-[hsl(var(--primary))]">init()</code>.
        Missing dependencies throw immediately, and dependent plugins automatically wait for their dependencies:
      </p>
      <CodeBlock code={dynamicDepsCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Dependency Initialization Order</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        When adding multiple plugins dynamically, dependent plugins wait for their dependencies to complete:
      </p>
      <CodeBlock code={dependencyOrderCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li>Keep dependency chains shallow</li>
        <li>Avoid circular dependencies by design</li>
        <li>Use events for loose coupling instead of direct dependencies</li>
        <li>Document plugin dependencies clearly</li>
        <li>Always use <code className="text-[hsl(var(--primary))]">waitForPlugin()</code> or <code className="text-[hsl(var(--primary))]">waitForAll()</code> after adding dynamic plugins</li>
      </ul>
    </article>
  );
}
