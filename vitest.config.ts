import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 98,
        statements: 100
      },
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        'examples/',
        'website/',
        'tests/',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/*.config.js'
      ]
    }
  }
});
