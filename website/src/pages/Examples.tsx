import { useState } from 'react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { cn } from '@/lib/utils';

const examples = [
  {
    id: 'basic',
    title: 'Basic Kernel',
    category: 'Getting Started',
    code: `import { createKernel } from '@oxog/plugin';

const kernel = createKernel();

const helloPlugin = {
  name: 'hello',
  version: '1.0.0',
  install(kernel) {
    kernel.sayHello = () => console.log('Hello, World!');
  }
};

kernel.use(helloPlugin);
await kernel.init();

kernel.sayHello(); // Hello, World!`,
  },
  {
    id: 'typed-context',
    title: 'Typed Context',
    category: 'Getting Started',
    code: `import { createKernel } from '@oxog/plugin';

interface AppContext {
  env: 'development' | 'production';
  version: string;
}

const kernel = createKernel<AppContext>({
  context: {
    env: 'development',
    version: '1.0.0'
  }
});

kernel.use({
  name: 'config',
  version: '1.0.0',
  install(kernel) {
    const ctx = kernel.getContext();
    console.log('Environment:', ctx.env);
  }
});`,
  },
  {
    id: 'events',
    title: 'Event Communication',
    category: 'Events',
    code: `import { createKernel } from '@oxog/plugin';

interface AppEvents {
  'user:login': { userId: string };
  'user:logout': { userId: string };
}

const kernel = createKernel<{}, AppEvents>();

// Producer plugin
kernel.use({
  name: 'auth',
  version: '1.0.0',
  install(kernel) {
    kernel.login = (userId: string) => {
      kernel.emit('user:login', { userId });
    };
  }
});

// Consumer plugin
kernel.use({
  name: 'analytics',
  version: '1.0.0',
  install(kernel) {
    kernel.on('user:login', ({ userId }) => {
      console.log('User logged in:', userId);
    });
  }
});

await kernel.init();
kernel.login('user_123');`,
  },
  {
    id: 'dependencies',
    title: 'Plugin Dependencies',
    category: 'Dependencies',
    code: `import { createKernel } from '@oxog/plugin';

const database = {
  name: 'database',
  version: '1.0.0',
  install(kernel) {
    kernel.db = { query: async (sql) => ({ rows: [] }) };
  },
  async onInit() {
    console.log('Database connected');
  }
};

const userService = {
  name: 'user-service',
  version: '1.0.0',
  dependencies: ['database'],
  install(kernel) {
    kernel.users = {
      async find(id) {
        return kernel.db.query('SELECT * FROM users WHERE id = ?', id);
      }
    };
  }
};

const kernel = createKernel();
kernel.use(userService); // Order doesn't matter
kernel.use(database);
await kernel.init(); // database init first, then user-service`,
  },
  {
    id: 'error-handling',
    title: 'Error Handling',
    category: 'Error Handling',
    code: `import { createKernel } from '@oxog/plugin';

const kernel = createKernel({
  errorStrategy: 'isolate',
  onError: (error, pluginName) => {
    console.error(\`[\${pluginName}]\`, error.message);
  }
});

kernel.use({
  name: 'risky',
  version: '1.0.0',
  install() {},
  async onInit() {
    throw new Error('Something went wrong!');
  },
  onError(error) {
    console.log('Plugin-level error handler:', error.message);
  }
});

kernel.use({
  name: 'safe',
  version: '1.0.0',
  install() {},
  async onInit() {
    console.log('Safe plugin initialized');
  }
});

await kernel.init();
// Output:
// [risky] Something went wrong!
// Plugin-level error handler: Something went wrong!
// Safe plugin initialized`,
  },
  {
    id: 'plugin-factory',
    title: 'Plugin Factory',
    category: 'Advanced',
    code: `import { createKernel, definePlugin } from '@oxog/plugin';

interface LoggerOptions {
  level: 'debug' | 'info' | 'error';
  prefix?: string;
}

const createLogger = definePlugin<unknown, LoggerOptions>((options) => ({
  name: 'logger',
  version: '1.0.0',
  install(kernel) {
    const prefix = options.prefix || '[LOG]';
    kernel.log = {
      debug: (msg) => options.level === 'debug' && console.log(prefix, msg),
      info: (msg) => ['debug', 'info'].includes(options.level) && console.info(prefix, msg),
      error: (msg) => console.error(prefix, msg),
    };
  }
}));

const kernel = createKernel();
kernel.use(createLogger({ level: 'info', prefix: '[APP]' }));
await kernel.init();

kernel.log.info('Application started');`,
  },
  {
    id: 'dynamic-plugins',
    title: 'Dynamic Plugin Management',
    category: 'Advanced',
    code: `import { createKernel } from '@oxog/plugin';

const kernel = createKernel();
await kernel.init();

// Add plugin at runtime
kernel.use({
  name: 'hot-module',
  version: '1.0.0',
  install(kernel) {
    kernel.hotFeature = true;
  },
  async onInit() {
    console.log('Hot module loaded!');
  }
});

console.log(kernel.hotFeature); // true

// Replace plugin
await kernel.replace({
  name: 'hot-module',
  version: '2.0.0',
  install(kernel) {
    kernel.hotFeature = 'upgraded';
  }
});

console.log(kernel.hotFeature); // 'upgraded'

// Unregister plugin
await kernel.unregister('hot-module');`,
  },
  {
    id: 'lifecycle-hooks',
    title: 'Kernel Lifecycle Hooks',
    category: 'Advanced',
    code: `import { createKernel } from '@oxog/plugin';

const kernel = createKernel({
  context: { startTime: 0 },
  onBeforeInit: async () => {
    console.log('Before init');
  },
  onAfterInit: async () => {
    console.log('After init - kernel ready');
  },
  onBeforeDestroy: async () => {
    console.log('Before destroy - saving state');
  },
  onAfterDestroy: async () => {
    console.log('After destroy - cleanup complete');
  }
});

kernel.use({
  name: 'app',
  version: '1.0.0',
  install(kernel) {
    console.log('Plugin installed');
  },
  async onInit(ctx) {
    ctx.startTime = Date.now();
    console.log('Plugin initialized');
  },
  async onDestroy() {
    console.log('Plugin destroyed');
  }
});

await kernel.init();
// Output:
// Plugin installed
// Before init
// Plugin initialized
// After init - kernel ready

await kernel.destroy();
// Output:
// Before destroy - saving state
// Plugin destroyed
// After destroy - cleanup complete`,
  },
];

const categories = ['Getting Started', 'Events', 'Dependencies', 'Error Handling', 'Advanced'];

export function Examples() {
  const [activeCategory, setActiveCategory] = useState('Getting Started');

  const filteredExamples = examples.filter((ex) => ex.category === activeCategory);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Examples</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Learn by example with these practical code snippets.
      </p>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeCategory === cat
                ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Examples */}
      <div className="space-y-8">
        {filteredExamples.map((example) => (
          <div key={example.id}>
            <h2 className="text-xl font-semibold mb-4">{example.title}</h2>
            <CodeBlock code={example.code} language="typescript" filename={`${example.id}.ts`} />
          </div>
        ))}
      </div>
    </div>
  );
}
