import { CodeBlock } from '@/components/code/CodeBlock';

const contextCode = `interface AppContext {
  config: {
    apiUrl: string;
    timeout: number;
  };
  services: {
    http?: HttpClient;
    cache?: CacheService;
  };
}

const kernel = createKernel<AppContext>({
  context: {
    config: {
      apiUrl: 'https://api.example.com',
      timeout: 5000
    },
    services: {}
  }
});`;

const pluginContextCode = `const httpPlugin: Plugin<AppContext> = {
  name: 'http',
  version: '1.0.0',
  
  install(kernel) {
    const ctx = kernel.getContext();
    ctx.services.http = new HttpClient(ctx.config.apiUrl);
  },
  
  onInit(context) {
    // Context is passed directly to onInit
    console.log('API URL:', context.config.apiUrl);
  }
};`;

const updateContextCode = `// Get context from outside
const ctx = kernel.getContext();
console.log(ctx.config.apiUrl);

// Update context
kernel.updateContext({
  config: { ...ctx.config, timeout: 10000 }
});`;

const sharedStateCode = `interface AppContext {
  state: {
    user: User | null;
    theme: 'light' | 'dark';
  };
}

const authPlugin: Plugin<AppContext> = {
  name: 'auth',
  version: '1.0.0',
  
  install(kernel) {
    kernel.setUser = (user: User) => {
      const ctx = kernel.getContext();
      kernel.updateContext({
        state: { ...ctx.state, user }
      });
      kernel.emit('auth:login', { user });
    };
  }
};

const uiPlugin: Plugin<AppContext> = {
  name: 'ui',
  version: '1.0.0',
  
  install(kernel) {
    // React to auth changes
    kernel.on('auth:login', ({ user }) => {
      // Update UI with user info
    });
    
    // Read current state
    kernel.getCurrentUser = () => {
      return kernel.getContext().state.user;
    };
  }
};`;

export function Context() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Context</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Context provides a type-safe way to share state between plugins. 
        It's initialized when the kernel is created and can be read and updated by plugins.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Creating Context</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Define your context type and provide initial values:
      </p>
      <CodeBlock code={contextCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Accessing Context in Plugins</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Plugins can access and modify context:
      </p>
      <CodeBlock code={pluginContextCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Updating Context</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Context can be updated with partial values:
      </p>
      <CodeBlock code={updateContextCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Shared State Pattern</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Use context for shared application state:
      </p>
      <CodeBlock code={sharedStateCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Best Practices</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li>Keep context structure flat when possible</li>
        <li>Use immutable updates with spread operator</li>
        <li>Emit events when context changes for reactive updates</li>
        <li>Don't store large objects in context</li>
        <li>Use context for configuration and shared services</li>
      </ul>
    </article>
  );
}
