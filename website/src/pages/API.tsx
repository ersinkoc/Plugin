import { CodeBlock } from '@/components/code/CodeBlock';

const createKernelCode = `function createKernel<
  TContext = unknown,
  TEvents extends EventMap = EventMap
>(options?: KernelOptions<TContext, TEvents>): KernelInstance<TContext, TEvents>`;

const definePluginCode = `function definePlugin<TContext, TOptions = unknown>(
  factory: (options: TOptions) => Plugin<TContext>
): (options: TOptions) => Plugin<TContext>`;

const pluginInterfaceCode = `interface Plugin<TContext = unknown> {
  name: string;
  version: string;
  dependencies?: string[];
  install(kernel: Kernel<TContext>): void;
  onInit?(context: TContext): MaybePromise<void>;
  onDestroy?(): MaybePromise<void>;
  onError?(error: Error): void;
}`;

const kernelInterfaceCode = `interface KernelInstance<TContext, TEvents> {
  // Plugin Management
  use(plugin: Plugin<TContext>): this;
  useAll(plugins: Plugin<TContext>[]): this;
  unregister(name: string): Promise<boolean>;
  replace(plugin: Plugin<TContext>): Promise<void>;
  reload(name: string): Promise<void>;
  
  // Lifecycle
  init(): Promise<void>;
  destroy(): Promise<void>;
  isInitialized(): boolean;
  isDestroyed(): boolean;
  
  // Plugin Queries
  getPlugin<T>(name: string): T | undefined;
  hasPlugin(name: string): boolean;
  listPlugins(): ReadonlyArray<Plugin<TContext>>;
  getPluginNames(): string[];
  getDependencyGraph(): Record<string, string[]>;
  
  // Events
  on<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  once<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): Unsubscribe;
  off<K extends keyof TEvents>(event: K, handler: (payload: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void;
  
  // Context
  getContext(): TContext;
  updateContext(partial: Partial<TContext>): void;
}`;

export function API() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">API Reference</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-12">
        Complete API documentation for @oxog/plugin.
      </p>

      {/* createKernel */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-[hsl(var(--border))]">
          createKernel()
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          Creates a new micro-kernel instance.
        </p>
        <CodeBlock code={createKernelCode} language="typescript" />
        
        <h3 className="text-lg font-semibold mt-6 mb-3">Parameters</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-[hsl(var(--muted-foreground))]">
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">options.context</td>
                <td className="py-2 pr-4 font-mono">TContext</td>
                <td className="py-2">Initial context value</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">options.errorStrategy</td>
                <td className="py-2 pr-4 font-mono">ErrorStrategy</td>
                <td className="py-2">'isolate' | 'fail-fast' | 'collect'</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">options.onError</td>
                <td className="py-2 pr-4 font-mono">Function</td>
                <td className="py-2">Global error handler</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* definePlugin */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-[hsl(var(--border))]">
          definePlugin()
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          Helper function for creating configurable plugin factories with type inference.
        </p>
        <CodeBlock code={definePluginCode} language="typescript" />
      </section>

      {/* Plugin Interface */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-[hsl(var(--border))]">
          Plugin Interface
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          The interface all plugins must implement.
        </p>
        <CodeBlock code={pluginInterfaceCode} language="typescript" />
        
        <h3 className="text-lg font-semibold mt-6 mb-3">Properties</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-[hsl(var(--muted-foreground))]">
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">name</td>
                <td className="py-2 pr-4 font-mono">string</td>
                <td className="py-2">Unique plugin identifier</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">version</td>
                <td className="py-2 pr-4 font-mono">string</td>
                <td className="py-2">Semantic version string</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">dependencies</td>
                <td className="py-2 pr-4 font-mono">string[]</td>
                <td className="py-2">Names of required plugins</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">install</td>
                <td className="py-2 pr-4 font-mono">Function</td>
                <td className="py-2">Sync setup (called on use())</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">onInit</td>
                <td className="py-2 pr-4 font-mono">Function</td>
                <td className="py-2">Async init (called on init())</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">onDestroy</td>
                <td className="py-2 pr-4 font-mono">Function</td>
                <td className="py-2">Async cleanup</td>
              </tr>
              <tr className="border-b border-[hsl(var(--border))]">
                <td className="py-2 pr-4 font-mono">onError</td>
                <td className="py-2 pr-4 font-mono">Function</td>
                <td className="py-2">Error handler for this plugin</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Kernel Interface */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-[hsl(var(--border))]">
          KernelInstance Interface
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          The full API available on kernel instances.
        </p>
        <CodeBlock code={kernelInterfaceCode} language="typescript" />
      </section>

      {/* Types */}
      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 pb-2 border-b border-[hsl(var(--border))]">
          Type Exports
        </h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">
          Types exported from @oxog/plugin:
        </p>
        <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
          <li><code className="text-[hsl(var(--primary))]">Plugin&lt;TContext&gt;</code> - Plugin interface</li>
          <li><code className="text-[hsl(var(--primary))]">Kernel&lt;TContext&gt;</code> - Kernel interface</li>
          <li><code className="text-[hsl(var(--primary))]">EventMap</code> - Event type map</li>
          <li><code className="text-[hsl(var(--primary))]">ErrorStrategy</code> - Error handling strategy</li>
          <li><code className="text-[hsl(var(--primary))]">PluginFactory</code> - Plugin factory type</li>
          <li><code className="text-[hsl(var(--primary))]">KernelState</code> - Kernel lifecycle state</li>
          <li><code className="text-[hsl(var(--primary))]">MaybePromise&lt;T&gt;</code> - T | Promise&lt;T&gt;</li>
          <li><code className="text-[hsl(var(--primary))]">Unsubscribe</code> - () =&gt; void</li>
        </ul>
      </section>
    </div>
  );
}
