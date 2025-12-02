// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build artifacts:
    "storybook-static/**",
    "coverage/**",
  ]),
  // Allow 'any' in type definition files and stories (pre-existing tech debt)
  {
    files: ["types/**/*.ts", "**/*.stories.tsx", "stories/**/*.tsx", "lib/api/**/*.ts", "lib/types/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
