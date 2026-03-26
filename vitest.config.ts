import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@species': resolve(__dirname, 'src/species'),
      '@sprites': resolve(__dirname, 'src/sprites'),
    },
  },
});
