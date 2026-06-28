import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    // Unit/integration tests only. Playwright E2E lives in src/tests/e2e.
    include: ['src/tests/unit/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
