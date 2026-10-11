import { defineConfig } from 'vite-plus';

// Shared format, lint and staged-file settings for the whole workspace. App
// configs (apps/frontend/vite.config.ts, apps/backend/vite.config.ts) only hold
// their own Vite and Vitest settings: `vp check` always reads these root
// `fmt` / `lint` blocks, so per-app differences live in `overrides` here.

const error = (rules: string[]) =>
  Object.fromEntries(rules.map((rule) => [rule, 'error' as const]));

// What each app's ESLint config enabled through `eslint.configs.recommended` +
// `tseslint.configs.recommended` (converted with @oxlint/migrate).
const recommended = error([
  'constructor-super',
  'for-direction',
  'getter-return',
  'no-array-constructor',
  'no-async-promise-executor',
  'no-case-declarations',
  'no-class-assign',
  'no-compare-neg-zero',
  'no-cond-assign',
  'no-const-assign',
  'no-constant-binary-expression',
  'no-constant-condition',
  'no-control-regex',
  'no-debugger',
  'no-delete-var',
  'no-dupe-class-members',
  'no-dupe-else-if',
  'no-dupe-keys',
  'no-duplicate-case',
  'no-empty',
  'no-empty-character-class',
  'no-empty-pattern',
  'no-empty-static-block',
  'no-ex-assign',
  'no-extra-boolean-cast',
  'no-fallthrough',
  'no-func-assign',
  'no-global-assign',
  'no-import-assign',
  'no-invalid-regexp',
  'no-irregular-whitespace',
  'no-loss-of-precision',
  'no-misleading-character-class',
  'no-new-native-nonconstructor',
  'no-nonoctal-decimal-escape',
  'no-obj-calls',
  'no-prototype-builtins',
  'no-redeclare',
  'no-regex-spaces',
  'no-self-assign',
  'no-setter-return',
  'no-shadow-restricted-names',
  'no-sparse-arrays',
  'no-this-before-super',
  'no-undef',
  'no-unreachable',
  'no-unsafe-finally',
  'no-unsafe-negation',
  'no-unsafe-optional-chaining',
  'no-unused-expressions',
  'no-unused-labels',
  'no-unused-private-class-members',
  'no-unused-vars',
  'no-useless-backreference',
  'no-useless-catch',
  'no-useless-escape',
  'no-with',
  'require-yield',
  'use-isnan',
  'valid-typeof',
  'typescript/ban-ts-comment',
  'typescript/no-duplicate-enum-values',
  'typescript/no-empty-object-type',
  'typescript/no-extra-non-null-assertion',
  'typescript/no-misused-new',
  'typescript/no-namespace',
  'typescript/no-non-null-asserted-optional-chain',
  'typescript/no-require-imports',
  'typescript/no-this-alias',
  'typescript/no-unnecessary-type-constraint',
  'typescript/no-unsafe-declaration-merging',
  'typescript/no-unsafe-function-type',
  'typescript/no-wrapper-object-types',
  'typescript/prefer-as-const',
  'typescript/prefer-namespace-keyword',
  'typescript/triple-slash-reference',
]);

// The extra rules of `tseslint.configs.recommendedTypeChecked`, which the
// backend and frontend use (e2e stays on the untyped set).
const recommendedTypeChecked = {
  ...error([
    'typescript/await-thenable',
    'typescript/no-array-delete',
    'typescript/no-base-to-string',
    'typescript/no-duplicate-type-constituents',
    'typescript/no-for-in-array',
    'typescript/no-implied-eval',
    'typescript/no-misused-promises',
    'typescript/no-redundant-type-constituents',
    'typescript/no-unnecessary-type-assertion',
    'typescript/no-unsafe-assignment',
    'typescript/no-unsafe-call',
    'typescript/no-unsafe-enum-comparison',
    'typescript/no-unsafe-member-access',
    'typescript/no-unsafe-return',
    'typescript/no-unsafe-unary-minus',
    'typescript/only-throw-error',
    'typescript/prefer-promise-reject-errors',
    'typescript/require-await',
    'typescript/restrict-plus-operands',
    'typescript/restrict-template-expressions',
    'typescript/unbound-method',
  ]),
  'typescript/no-floating-promises': 'warn',
  'typescript/no-unsafe-argument': 'warn',
} as const;

export default defineConfig({
  fmt: {
    // Same output as the Prettier setup this replaced. Oxfmt's own default
    // printWidth is 100, Prettier's was 80.
    printWidth: 80,
    singleQuote: true,
    trailingComma: 'all',
    ignorePatterns: [
      '**/src/generated/**',
      'pnpm-lock.yaml',
      // Prettier only ever formatted code here. Oxfmt pads Markdown tables to
      // their widest cell, which turns the CLAUDE.md tables into walls of
      // dashes; YAML, CSS and the old HTML mockup stay hand-formatted too.
      '**/*.md',
      '**/*.{yml,yaml}',
      '**/*.{css,html}',
    ],
    overrides: [
      {
        // The frontend never had a .prettierrc, so it kept Prettier's
        // double-quote default.
        files: ['apps/frontend/**'],
        options: { singleQuote: false },
      },
    ],
  },
  lint: {
    plugins: ['typescript', 'unicorn'],
    jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
    categories: { correctness: 'off' },
    env: { builtin: true },
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/backend/src/generated/**',
      'apps/e2e/playwright-report/**',
      'apps/e2e/test-results/**',
      'apps/e2e/playwright/**',
    ],
    rules: {
      ...recommended,
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    overrides: [
      {
        // typescript-eslint's `eslint-recommended` layer: TypeScript itself
        // already reports these in .ts files.
        files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
        rules: {
          'constructor-super': 'off',
          'getter-return': 'off',
          'no-class-assign': 'off',
          'no-const-assign': 'off',
          'no-dupe-class-members': 'off',
          'no-dupe-keys': 'off',
          'no-func-assign': 'off',
          'no-import-assign': 'off',
          'no-new-native-nonconstructor': 'off',
          'no-obj-calls': 'off',
          'no-redeclare': 'off',
          'no-setter-return': 'off',
          'no-this-before-super': 'off',
          'no-undef': 'off',
          'no-unreachable': 'off',
          'no-unsafe-negation': 'off',
          'no-with': 'off',
          'no-var': 'error',
          'prefer-const': 'error',
          'prefer-rest-params': 'error',
          'prefer-spread': 'error',
        },
      },
      {
        files: ['apps/backend/**', 'apps/frontend/**'],
        rules: recommendedTypeChecked,
      },
      {
        files: ['apps/backend/**', 'apps/e2e/**'],
        env: { node: true },
      },
      {
        files: ['apps/backend/**/*.spec.ts', 'apps/backend/test/**'],
        env: { vitest: true },
      },
      {
        files: ['apps/frontend/**'],
        plugins: ['typescript', 'unicorn', 'react'],
        env: { browser: true },
        rules: {
          'react/rules-of-hooks': 'error',
          'react/exhaustive-deps': 'warn',
          'react/only-export-components': [
            'warn',
            { allowConstantExport: true },
          ],
        },
      },
      {
        // A route table, not a hot-reloaded component module: its lazy page
        // components are local by design.
        files: ['apps/frontend/src/router.tsx'],
        plugins: ['typescript', 'unicorn', 'react'],
        rules: { 'react/only-export-components': 'off' },
      },
      {
        // Vite configs and scripts run in Node, not the browser.
        files: [
          'apps/frontend/scripts/**',
          'apps/frontend/*.config.ts',
          'apps/frontend/*.config.js',
          'apps/frontend/vite.config.e2e.ts',
        ],
        env: { node: true },
      },
      {
        files: ['apps/e2e/**'],
        rules: {
          // `async ({}, use) => {}` is Playwright's documented fixture
          // signature: the empty pattern is how a fixture opts out of
          // depending on others.
          'no-empty-pattern': 'off',
        },
      },
    ],
  },
  staged: {
    // Check only, never rewrite: the hook reports, the author fixes
    // (`pnpm lint` / `pnpm format`).
    '*.{ts,tsx,js,mjs}': 'vp check',
  },
});
