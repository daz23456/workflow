import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/*.stories.tsx',
        '**/*.test.{ts,tsx}',
        '.storybook/',
        'e2e/',
      ],
      thresholds: {
        // Primary metric (aligns with project standards from Stages 1-7.9)
        lines: 90,
        // Secondary metrics (informational, not enforced)
        // branches: 90,  // Not enforced - can be low due to safety checks/defaults
        // functions: 90,  // Not enforced
        // statements: 90,  // Not enforced
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
