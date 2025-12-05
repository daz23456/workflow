import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'cobertura'],
      include: ['src/**/*.ts'],
      exclude: ['src/cli.ts', 'src/index.ts', 'src/types.ts'], // Exclude CLI entry point and type definitions
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 90,
        statements: 90
      }
    }
  }
});
