import { resolve } from 'path';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    // Sources import each other as `src/...` (tsconfig `paths`).
    alias: { src: resolve(__dirname, 'src') },
  },
  test: {
    globals: true,
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        // Integration suites against a real Postgres from testcontainers
        // (requires Docker). Starting the container is the slow part, so the
        // hook timeout matters as much as the test timeout.
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
