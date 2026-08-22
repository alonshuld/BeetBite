// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist',
      'playwright-report',
      'test-results',
      'playwright',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Fixtures require() the backend's generated Prisma client, which has no
      // static types available here.
      '@typescript-eslint/no-explicit-any': 'off',
      // `async ({}, use) => {}` is Playwright's documented fixture signature —
      // the empty pattern is how a fixture opts out of depending on others.
      'no-empty-pattern': 'off',
    },
  },
);
