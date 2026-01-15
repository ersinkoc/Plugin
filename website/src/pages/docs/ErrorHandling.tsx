import { CodeBlock } from '@/components/code/CodeBlock';

const isolateCode = `// Strategy 1: Isolate (default)
// Plugin errors don't affect others
const kernel = createKernel({
  errorStrategy: 'isolate',
  onError: (error, pluginName) => {
    console.error(\`[\${pluginName}] Error (isolated):\`, error.message);
  }
});`;

const failFastCode = `// Strategy 2: Fail Fast
// First error stops everything
const kernel = createKernel({
  errorStrategy: 'fail-fast'
});

try {
  await kernel.init();
} catch (error) {
  console.error('Kernel init failed:', error);
}`;

const collectCode = `// Strategy 3: Collect
// Collect all errors, throw aggregate at the end
const kernel = createKernel({
  errorStrategy: 'collect'
});

try {
  await kernel.init();
} catch (error) {
  if (error instanceof AggregateError) {
    console.error('Multiple plugin errors:', error.errors);
  }
}`;

const pluginErrorCode = `const safePlugin: Plugin = {
  name: 'safe',
  version: '1.0.0',
  
  install(kernel) {
    // ...
  },
  
  // Handle errors from this plugin
  onError(error) {
    // Log to monitoring service
    reportToMonitoring(error);
    
    // Attempt recovery
    this.recover();
  },
  
  recover() {
    // Custom recovery logic
  }
};`;

export function ErrorHandling() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Error Handling</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        The kernel provides configurable error handling strategies to control 
        how plugin errors are handled during initialization and execution.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Error Strategies</h2>
      
      <h3 className="text-xl font-semibold mt-8 mb-4">Isolate (Default)</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Plugin errors are isolated and don't affect other plugins:
      </p>
      <CodeBlock code={isolateCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Fail Fast</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Stop immediately on the first error:
      </p>
      <CodeBlock code={failFastCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Collect</h3>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Collect all errors and throw an AggregateError:
      </p>
      <CodeBlock code={collectCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Strategy Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-2 pr-4">Strategy</th>
              <th className="text-left py-2 pr-4">Behavior</th>
              <th className="text-left py-2">Use Case</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--muted-foreground))]">
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">isolate</td>
              <td className="py-2 pr-4">Continue on error</td>
              <td className="py-2">Production, resilience</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">fail-fast</td>
              <td className="py-2 pr-4">Stop on first error</td>
              <td className="py-2">Development, critical systems</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">collect</td>
              <td className="py-2 pr-4">Collect all errors</td>
              <td className="py-2">Testing, batch operations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Per-Plugin Error Handling</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Plugins can implement their own error handling:
      </p>
      <CodeBlock code={pluginErrorCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li>Use <code className="text-[hsl(var(--primary))]">fail-fast</code> during development</li>
        <li>Use <code className="text-[hsl(var(--primary))]">isolate</code> in production for resilience</li>
        <li>Always implement <code className="text-[hsl(var(--primary))]">onError</code> for critical plugins</li>
        <li>Log errors to a monitoring service</li>
        <li>Design plugins to handle partial failures gracefully</li>
      </ul>
    </article>
  );
}
