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

      <h2 className="text-2xl font-semibold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li>Keep dependency chains shallow</li>
        <li>Avoid circular dependencies by design</li>
        <li>Use events for loose coupling instead of direct dependencies</li>
        <li>Document plugin dependencies clearly</li>
      </ul>
    </article>
  );
}
