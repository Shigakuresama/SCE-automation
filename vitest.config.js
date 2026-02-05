import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['sce-extension/**/*.test.js'],
    exclude: ['node_modules/**', 'lib/**', 'dist/**', 'build/**'],
    testTimeout: 10000,
    root: '/home/sergio/Projects/SCE'
  },
  resolve: {
    alias: {
      '@': '/home/sergio/Projects/SCE'
    }
  }
});
