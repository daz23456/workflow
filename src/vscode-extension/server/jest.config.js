/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@workflow/types$': '<rootDir>/../../../packages/workflow-types/src',
    '^@workflow/validation$': '<rootDir>/../../../packages/workflow-validation/src',
    '^@workflow/graph$': '<rootDir>/../../../packages/workflow-graph/src',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/server.ts', // Main entry point with side effects
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
