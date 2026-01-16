import { CodeBlock } from '@/components/code/CodeBlock';

const typedEventsCode = `interface MyEvents {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'data:update': { key: string; value: unknown };
}

const kernel = createKernel<{}, MyEvents>();

// Subscribe to events
const unsubscribe = kernel.on('user:login', (payload) => {
  // payload is typed as { userId: string; timestamp: number }
  console.log(\`User \${payload.userId} logged in\`);
});

// Emit events
kernel.emit('user:login', { 
  userId: 'user_123', 
  timestamp: Date.now() 
});

// Unsubscribe when done
unsubscribe();`;

const onceCode = `// Subscribe once (auto-unsubscribes after first event)
kernel.once('user:logout', (payload) => {
  console.log(\`User \${payload.userId} logged out\`);
});`;

const wildcardCode = `// Subscribe to all events
kernel.onWildcard((event, payload) => {
  console.log(\`[\${event}]\`, payload);
});

// Subscribe to pattern (events starting with 'user:')
kernel.onPattern('user:*', (event, payload) => {
  console.log(\`User event: \${event}\`, payload);
});`;

const pluginEventsCode = `const analyticsPlugin: Plugin<{}, AppEvents> = {
  name: 'analytics',
  version: '1.0.0',
  
  install(kernel) {
    // Subscribe to user events
    kernel.on('user:login', (payload) => {
      trackEvent('login', { userId: payload.userId });
    });
    
    kernel.on('user:logout', (payload) => {
      trackEvent('logout', { userId: payload.userId });
    });
  }
};

const authPlugin: Plugin<{}, AppEvents> = {
  name: 'auth',
  version: '1.0.0',
  
  install(kernel) {
    kernel.login = async (userId: string) => {
      // ... perform login
      kernel.emit('user:login', { userId, timestamp: Date.now() });
    };
    
    kernel.logout = async (userId: string) => {
      // ... perform logout
      kernel.emit('user:logout', { userId });
    };
  }
};`;

export function Events() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Events</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        The event bus provides type-safe communication between plugins. 
        Events are emitted and received with full TypeScript type inference.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Typed Events</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Define your event types and get full type safety:
      </p>
      <CodeBlock code={typedEventsCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">One-time Subscriptions</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Use <code className="text-[hsl(var(--primary))]">once()</code> for events that should only be handled once:
      </p>
      <CodeBlock code={onceCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Wildcard Subscriptions</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Subscribe to multiple events using wildcards:
      </p>
      <CodeBlock code={wildcardCode} language="typescript" />

      <h3 className="text-xl font-semibold mt-8 mb-4">Wildcard Patterns</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-2 pr-4">Pattern</th>
              <th className="text-left py-2">Description</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--muted-foreground))]">
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">*</td>
              <td className="py-2">Matches all events</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">prefix:*</td>
              <td className="py-2">Matches events starting with "prefix:"</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Plugin Communication</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Events are the recommended way for plugins to communicate:
      </p>
      <CodeBlock code={pluginEventsCode} language="typescript" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Built-in Kernel Events</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        The kernel emits these events during its lifecycle:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left py-2 pr-4">Event</th>
              <th className="text-left py-2 pr-4">Payload</th>
              <th className="text-left py-2">When</th>
            </tr>
          </thead>
          <tbody className="text-[hsl(var(--muted-foreground))]">
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">kernel:init</td>
              <td className="py-2 pr-4 font-mono">timestamp</td>
              <td className="py-2">Kernel starts initializing</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">kernel:ready</td>
              <td className="py-2 pr-4 font-mono">timestamp, plugins</td>
              <td className="py-2">Kernel initialization complete</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">kernel:destroy</td>
              <td className="py-2 pr-4 font-mono">timestamp</td>
              <td className="py-2">Kernel starts destroying</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">kernel:destroyed</td>
              <td className="py-2 pr-4 font-mono">timestamp</td>
              <td className="py-2">Kernel destruction complete</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">plugin:install</td>
              <td className="py-2 pr-4 font-mono">name, version</td>
              <td className="py-2">Plugin is registered</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">plugin:init</td>
              <td className="py-2 pr-4 font-mono">name</td>
              <td className="py-2">Plugin initialization complete</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">plugin:destroy</td>
              <td className="py-2 pr-4 font-mono">name</td>
              <td className="py-2">Plugin is destroyed</td>
            </tr>
            <tr className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-mono text-[hsl(var(--foreground))]">plugin:error</td>
              <td className="py-2 pr-4 font-mono">name, error</td>
              <td className="py-2">Plugin error occurs</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Handler Deduplication</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        The event bus automatically prevents duplicate handler registration.
        If you register the same handler function multiple times, it will only be called once per event:
      </p>
      <CodeBlock code={`const handler = (payload) => console.log(payload);

// Register same handler twice
kernel.on('event', handler);
kernel.on('event', handler);

// Handler will only be called once
kernel.emit('event', { data: 'test' });`} language="typescript" />
    </article>
  );
}
