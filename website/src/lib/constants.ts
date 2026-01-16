export const PACKAGE_NAME = '@oxog/plugin';
export const PACKAGE_SHORT_NAME = 'plugin';
export const GITHUB_REPO = 'ersinkoc/plugin';
export const NPM_PACKAGE = '@oxog/plugin';
export const VERSION = '1.0.1';
export const DESCRIPTION = 'Micro-kernel plugin system for the @oxog ecosystem with typed events, lifecycle hooks, and dependency resolution.';
export const DOMAIN = 'plugin.oxog.dev';

export const NAV_ITEMS = [
  { label: 'Docs', href: '/docs' },
  { label: 'API', href: '/api' },
  { label: 'Examples', href: '/examples' },
];

export const SIDEBAR_ITEMS = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Installation', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { label: 'Kernel', href: '/docs/kernel' },
      { label: 'Plugins', href: '/docs/plugins' },
      { label: 'Events', href: '/docs/events' },
      { label: 'Dependencies', href: '/docs/dependencies' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { label: 'Error Handling', href: '/docs/error-handling' },
      { label: 'Context', href: '/docs/context' },
      { label: 'Advanced Patterns', href: '/docs/advanced' },
    ],
  },
];

export const FEATURES = [
  {
    title: 'Zero Dependencies',
    description: 'No runtime dependencies. Everything implemented from scratch for maximum control and minimal bundle size.',
    icon: 'Sparkles',
  },
  {
    title: 'Type-Safe',
    description: 'Full TypeScript support with end-to-end type inference. Catch errors at compile time, not runtime.',
    icon: 'Shield',
  },
  {
    title: 'Plugin System',
    description: 'Micro-kernel architecture with a powerful plugin system. Extend functionality with ease.',
    icon: 'Puzzle',
  },
  {
    title: 'Event Bus',
    description: 'Type-safe event bus with wildcard support. Plugin-to-plugin communication made simple.',
    icon: 'Radio',
  },
  {
    title: 'Lifecycle Hooks',
    description: 'Full control over plugin lifecycle. Install, initialize, and destroy with async support.',
    icon: 'RefreshCw',
  },
  {
    title: 'Dependency Resolution',
    description: 'Automatic topological sorting of plugins. Dependencies are resolved in the correct order.',
    icon: 'GitBranch',
  },
];
