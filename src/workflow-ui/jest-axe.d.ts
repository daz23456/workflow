/// <reference types="vitest" />

declare module 'jest-axe' {
  import type { AxeResults } from 'axe-core';

  export function toHaveNoViolations(results: AxeResults): {
    pass: boolean;
    message: () => string;
  };

  export function axe(
    html: Element | Document,
    options?: any
  ): Promise<AxeResults>;

  export function configureAxe(options?: any): typeof axe;
}

declare global {
  namespace Vi {
    interface Assertion {
      toHaveNoViolations(): void;
    }
    interface AsymmetricMatchersContaining {
      toHaveNoViolations(): void;
    }
  }
}

export {};
