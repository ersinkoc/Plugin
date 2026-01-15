import { CodeBlock } from '@/components/code/CodeBlock';

const basicKernelCode = `import { createKernel } from '@oxog/plugin';

// Simple usage
const kernel = createKernel();`;

const typedKernelCode = `interface AppContext {
  env: 'development' | 'production';
  debug: boolean;
}

interface AppEvents {
  'app:start': { timestamp: number };
  'app:stop': { reason: string };
}

const kernel = createKernel<AppContext, AppEvents>({
  context: {
    env: 'development',
    debug: true
  }
});`;

const configuredKernelCode = `const kernel = createKernel({
  context: { env: 'production' },
  errorStrategy: 'isolate', // 'isolate' | 'fail-fast' | 'collect'
  onError: (error, pluginName) => {
    console.error(\`[\${pluginName}] Error:\`, error);
  },
  onBeforeInit: async () => {
    console.log('Before init');
  },
  onAfterInit: async () => {
    console.log('After init');
  },
  onBeforeDestroy: async () => {
    console.log('Before destroy');
  },
  onAfterDestroy: async () => {
    console.log('After destroy');
  }
});`;

const lifecycleCode = `const kernel = createKernel();

// Register plugins
kernel.use(pluginA).use(pluginB);

// Initialize all plugins
await kernel.init();

// Check state
console.log(kernel.isInitialized()); // true

// Use the kernel...

// Cleanup
await kernel.destroy();
console.log(kernel.isDestroyed()); // true`;

export function Kernel() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Kernel</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        The kernel is the heart of the plugin system. It manages plugin registration, 
        lifecycle, events, and dependency resolution.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Creating a Kernel</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Create a new kernel instance using the <code className="text-[hsl(var(--primary))]">createKernel()</code> factory function:
      </p>
      <CodeBlock code={basicKernelCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Typed Context and Events</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        For full type safety, provide type parameters for context and events:
      </p>
      <CodeBlock code={typedKernelCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Configuration Options</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        The kernel accepts various configuration options for error handling and lifecycle hooks:
      </p>
      <CodeBlock code={configuredKernelCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Configuration Options</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-2 pr-4">Option</th>
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--muted-foreground))]">
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">context</td>
              <td className="py-2 pr-4 font-mono">TContext</td>
              <td className="py-2">Initial context value</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">errorStrategy</td>
              <td className="py-2 pr-4 font-mono">'isolate' | 'fail-fast' | 'collect'</td>
              <td className="py-2">How to handle plugin errors</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">onError</td>
              <td className="py-2 pr-4 font-mono">(error, pluginName) =&gt; void</td>
              <td className="py-2">Global error handler</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">onBeforeInit</td>
              <td className="py-2 pr-4 font-mono">() =&gt; void | Promise</td>
              <td className="py-2">Called before initialization</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">onAfterInit</td>
              <td className="py-2 pr-4 font-mono">() =&gt; void | Promise</td>
              <td className="py-2">Called after initialization</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Kernel Lifecycle</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        The kernel has a defined lifecycle:
      </p>
      <CodeBlock code={lifecycleCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Lifecycle States</h3>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li><strong className="text-[hsl(var(--foreground))]">Created</strong> - Initial state, plugins can be registered</li>
        <li><strong className="text-[hsl(var(--foreground))]">Initializing</strong> - Plugins are being initialized</li>
        <li><strong className="text-[hsl(var(--foreground))]">Ready</strong> - All plugins initialized, kernel is active</li>
        <li><strong className="text-[hsl(var(--foreground))]">Destroying</strong> - Plugins are being destroyed</li>
        <li><strong className="text-[hsl(var(--foreground))]">Destroyed</strong> - Kernel is no longer usable</li>
      </ul>
    </article>
  );
}
