import { CodeBlock } from '@/components/code/CodeBlock';

const basicPluginCode = `import type { Plugin } from '@oxog/plugin';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  // Called synchronously when plugin is registered
  install(kernel) {
    kernel.myFeature = { ready: false };
  },
  
  // Called asynchronously during kernel.init()
  async onInit(context) {
    await loadResources();
    kernel.myFeature.ready = true;
  },
  
  // Called asynchronously during kernel.destroy()
  async onDestroy() {
    await cleanup();
  },
  
  // Called when an error occurs in this plugin
  onError(error) {
    console.error('Plugin error:', error);
  }
};`;

const pluginWithDepsCode = `const databasePlugin: Plugin = {
  name: 'database',
  version: '1.0.0',
  install(kernel) {
    kernel.db = createDatabase();
  }
};

const cachePlugin: Plugin = {
  name: 'cache',
  version: '1.0.0',
  dependencies: ['database'], // Depends on database
  install(kernel) {
    // Database is already installed
    kernel.cache = createCache(kernel.db);
  }
};

const kernel = createKernel();
kernel.use(cachePlugin); // Order doesn't matter
kernel.use(databasePlugin);

// init() will call onInit in correct order:
// 1. database
// 2. cache
await kernel.init();`;

const pluginFactoryCode = `import { definePlugin } from '@oxog/plugin';

const createLoggerPlugin = definePlugin<AppContext>((options: {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
}) => ({
  name: 'logger',
  version: '1.0.0',
  
  install(kernel) {
    const prefix = options.prefix || '[LOG]';
    kernel.logger = {
      debug: (...args) => 
        options.level === 'debug' && console.log(prefix, ...args),
      info: (...args) => 
        ['debug', 'info'].includes(options.level) && console.info(prefix, ...args),
      error: (...args) => console.error(prefix, ...args),
    };
  }
}));

// Use the factory
const kernel = createKernel();
kernel.use(createLoggerPlugin({ level: 'info', prefix: '[APP]' }));`;

const pluginQueriesCode = `const kernel = createKernel();
kernel.use(pluginA).use(pluginB).use(pluginC);

// Check if plugin is registered
if (kernel.hasPlugin('logger')) {
  console.log('Logger is available');
}

// Get plugin by name
const logger = kernel.getPlugin('logger');
if (logger) {
  console.log(\`Logger v\${logger.version}\`);
}

// List all plugins
const plugins = kernel.listPlugins();
console.log(\`\${plugins.length} plugins registered\`);

// Get plugin names
const names = kernel.getPluginNames();
// ['pluginA', 'pluginB', 'pluginC']

// Get dependency graph
const graph = kernel.getDependencyGraph();
// { cache: ['database'], database: [] }`;

export function Plugins() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Plugins</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Plugins are the building blocks of your application. They extend the kernel's 
        functionality and can communicate with each other through events.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Plugin Structure</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        A plugin is an object with a name, version, and optional lifecycle hooks:
      </p>
      <CodeBlock code={basicPluginCode} language="typescript" filename="my-plugin.ts" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Lifecycle Phases</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-2 pr-4">Phase</th>
              <th className="text-left py-2 pr-4">Method</th>
              <th className="text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--muted-foreground))]">
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-semibold text-[hsl(var(--foreground))]">Install</td>
              <td className="py-2 pr-4 font-mono">install(kernel)</td>
              <td className="py-2">Sync, called on kernel.use()</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-semibold text-[hsl(var(--foreground))]">Init</td>
              <td className="py-2 pr-4 font-mono">onInit(context)</td>
              <td className="py-2">Async, called on kernel.init()</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-semibold text-[hsl(var(--foreground))]">Destroy</td>
              <td className="py-2 pr-4 font-mono">onDestroy()</td>
              <td className="py-2">Async, called on kernel.destroy()</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-semibold text-[hsl(var(--foreground))]">Error</td>
              <td className="py-2 pr-4 font-mono">onError(error)</td>
              <td className="py-2">Called when this plugin errors</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Plugin Dependencies</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Plugins can declare dependencies on other plugins. The kernel will automatically 
        resolve and order them:
      </p>
      <CodeBlock code={pluginWithDepsCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Plugin Factories</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Use the <code className="text-[hsl(var(--primary))]">definePlugin</code> helper to create 
        configurable plugins:
      </p>
      <CodeBlock code={pluginFactoryCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Plugin Queries</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Query and inspect registered plugins:
      </p>
      <CodeBlock code={pluginQueriesCode} language="typescript" />
    </article>
  );
}
