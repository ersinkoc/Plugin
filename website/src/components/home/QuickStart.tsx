import { CodeBlock } from '@/components/code/CodeBlock';

const quickStartCode = `import { createKernel } from '@oxog/plugin';

const loggerPlugin = {
  name: 'logger',
  version: '1.0.0',
  install(kernel) {
    kernel.log = (msg) => console.log('[LOG]', msg);
  },
  async onInit() {
    console.log('Logger initialized');
  }
};

const kernel = createKernel();
kernel.use(loggerPlugin);

await kernel.init();
kernel.log('Hello from plugin!');`;

export function QuickStart() {
  return (
    <section className="py-20">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Quick Start</h2>
          <p className="text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto">
            Create your first plugin system in seconds with our fluent builder API.
          </p>
        </div>

        {/* Code block */}
        <div className="max-w-3xl mx-auto">
          <CodeBlock code={quickStartCode} language="typescript" filename="app.ts" />
        </div>
      </div>
    </section>
  );
}
