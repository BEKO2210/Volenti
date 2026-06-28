import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config (Priya · QA). Boots the production build and exercises
 * critical user flows in a mobile-first viewport. CI runs these against the
 * built app; the webServer block starts it automatically.
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        // Allow pointing at a pre-installed Chromium (e.g. sandboxed CI images)
        // without re-downloading. Unset in normal CI -> Playwright's own browser.
        ...(process.env.CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
