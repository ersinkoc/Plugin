import { CodeBlock } from '@/components/code/CodeBlock';

const installCode = `npm install @oxog/plugin`;

const basicUsageCode = `import { createKernel } from '@oxog/plugin';
import type { Plugin } from '@oxog/plugin';

// Create a kernel
const kernel = createKernel();

// Define a plugin
const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  install(kernel) {
    console.log('Plugin installed!');
  },
  async onInit() {
    console.log('Plugin initialized!');
  },
  async onDestroy() {
    console.log('Plugin destroyed!');
  }
};

// Register and initialize
kernel.use(myPlugin);
await kernel.init();

// Later, cleanup
await kernel.destroy();`;

export function GettingStarted() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">Getting Started</h1>
      
      <p className="text-[hsl(var(--muted-foreground))] text-lg mb-8">
        Learn how to install and use @oxog/plugin in your project.
      </p>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Installation</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Install the package using your preferred package manager:
      </p>
      <CodeBlock code={installCode} language="bash" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Basic Usage</h2>
      <p className="text-[hsl(var(--muted-foreground))] mb-4">
        Here's a basic example of creating a kernel and registering a plugin:
      </p>
      <CodeBlock code={basicUsageCode} language="typescript" filename="app.ts" />

      <h2 className="text-2xl font-semibold mt-12 mb-4">Key Concepts</h2>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2">
        <li><strong className="text-[hsl(var(--foreground))]">Kernel</strong> - The micro-kernel that manages plugins</li>
        <li><strong className="text-[hsl(var(--foreground))]">Plugin</strong> - A module that extends the kernel's functionality</li>
        <li><strong className="text-[hsl(var(--foreground))]">Lifecycle</strong> - Plugins have install, init, and destroy phases</li>
        <li><strong className="text-[hsl(var(--foreground))]">Events</strong> - Type-safe communication between plugins</li>
        <li><strong className="text-[hsl(var(--foreground))]">Dependencies</strong> - Plugins can depend on other plugins</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-12 mb-4">Next Steps</h2>
      <p className="text-[hsl(var(--muted-foreground))]">
        Now that you have the basics, explore the documentation to learn more about:
      </p>
      <ul className="list-disc list-inside text-[hsl(var(--muted-foreground))] space-y-2 mt-4">
        <li>Creating and configuring the kernel</li>
        <li>Writing plugins with lifecycle hooks</li>
        <li>Using the typed event bus</li>
        <li>Managing plugin dependencies</li>
        <li>Error handling strategies</li>
      </ul>
    </article>
  );
}
