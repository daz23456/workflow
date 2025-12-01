/**
 * Type declarations for jest-axe with Vitest
 */

declare module 'jest-axe' {
  import { AxeResults } from 'axe-core';

  export function axe(
    html: Element | Document,
    options?: Record<string, unknown>
  ): Promise<AxeResults>;

  export function toHaveNoViolations(results: AxeResults): {
    pass: boolean;
    message(): string;
  };
}

// Extend Vitest expect matchers
interface CustomMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
