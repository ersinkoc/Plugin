import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  treeshake: true,
  minify: true,
  clean: true,
  target: 'es2022',
  sourcemap: true,
  splitting: false
});
