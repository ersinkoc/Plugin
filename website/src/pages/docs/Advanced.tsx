import { CodeBlock } from '@/components/code/CodeBlock';

const dynamicPluginsCode = `const kernel = createKernel();
await kernel.init();

// Add plugin after init (auto-initializes)
await kernel.use(newPlugin);

// Unregister plugin (calls onDestroy)
const removed = await kernel.unregister('old-plugin');
console.log('Plugin removed:', removed);

// Replace plugin (unregister + register)
await kernel.replace(updatedPlugin);

// Reload plugin (destroy + init)
await kernel.reload('my-plugin');`;

const pluginFactoryCode = `import { definePlugin } from '@oxog/plugin';

interface LoggerOptions {
  level: 'debug' | 'info' | 'warn' | 'error';
  prefix?: string;
  transport?: (level: string, message: string) => void;
}

const createLoggerPlugin = definePlugin<AppContext, LoggerOptions>((options) => ({
  name: 'logger',
  version: '1.0.0',
  
  install(kernel) {
    const prefix = options.prefix || '[LOG]';
    const transport = options.transport || console.log;
    
    kernel.log = {
      debug: (msg: string) => options.level === 'debug' && transport('debug', \`\${prefix} \${msg}\`),
      info: (msg: string) => ['debug', 'info'].includes(options.level) && transport('info', \`\${prefix} \${msg}\`),
      warn: (msg: string) => ['debug', 'info', 'warn'].includes(options.level) && transport('warn', \`\${prefix} \${msg}\`),
      error: (msg: string) => transport('error', \`\${prefix} \${msg}\`),
    };
  }
}));

// Use with different configurations
kernel.use(createLoggerPlugin({ level: 'info' }));
// or
kernel.use(createLoggerPlugin({ 
  level: 'debug', 
  prefix: '[APP]',
  transport: (level, msg) => sendToServer({ level, msg })
}));`;

const compositePluginCode = `const createFullStackPlugin = definePlugin((options) => ({
  name: 'fullstack',
  version: '1.0.0',
  dependencies: [],
  
  install(kernel) {
    // Register sub-plugins
    kernel.use(createDatabasePlugin(options.db));
    kernel.use(createCachePlugin(options.cache));
    kernel.use(createApiPlugin(options.api));
    
    // Expose unified API
    kernel.app = {
      db: kernel.db,
      cache: kernel.cache,
      api: kernel.api,
    };
  }
}));`;

const testingCode = `import { createKernel } from '@oxog/plugin';
import { describe, it, expect, vi } from 'vitest';

describe('MyPlugin', () => {
  it('should initialize correctly', async () => {
    const kernel = createKernel({
      context: { env: 'test' }
    });
    
    const onInit = vi.fn();
    kernel.use({
      name: 'test-plugin',
      version: '1.0.0',
      install: vi.fn(),
      onInit
    });
    
    await kernel.init();
    
    expect(onInit).toHaveBeenCalledWith({ env: 'test' });
  });
  
  it('should emit events', async () => {
    const kernel = createKernel();
    const handler = vi.fn();
    
    kernel.on('test:event', handler);
    kernel.emit('test:event', { data: 'hello' });
    
    expect(handler).toHaveBeenCalledWith({ data: 'hello' });
  });
});`;

export function Advanced() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Advanced Patterns</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Advanced patterns and techniques for building complex plugin systems.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Dynamic Plugin Management</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Add, remove, replace, and reload plugins at runtime:
      </p>
      <CodeBlock code={dynamicPluginsCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Configurable Plugin Factories</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Create highly configurable plugins with factory functions:
      </p>
      <CodeBlock code={pluginFactoryCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Composite Plugins</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Create plugins that manage multiple sub-plugins:
      </p>
      <CodeBlock code={compositePluginCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Testing Plugins</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Unit test your plugins with mocks:
      </p>
      <CodeBlock code={testingCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li>Use factory functions for configurable plugins</li>
        <li>Prefer composition over inheritance</li>
        <li>Keep plugins focused and single-purpose</li>
        <li>Use events for loose coupling</li>
        <li>Write tests for all plugin lifecycle methods</li>
        <li>Document plugin dependencies and APIs</li>
      </ul>
    </article>
  );
}
