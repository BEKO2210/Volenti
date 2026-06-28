import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Integration tests hit a real Postgres (DATABASE_URL must be set to a migrated
// DB with RLS + the app role). Run via `pnpm test:integration`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/integration/**/*.test.ts'],
    globals: false,
    // Each test seeds its own tenant; run serially to keep assertions simple.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
