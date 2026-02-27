import { defineConfig, devices } from '@playwright/test'

/**
 * E2E test suite for Stacked. Runs against a running app (e.g. npm run dev).
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test or env for authenticated flows.
 * @see README.md and tests/README.md
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: 'test-results',
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'authenticated',
      use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' },
      dependencies: ['setup'],
      testIgnore: ['**/auth.spec.ts', '**/api-unauth.spec.ts'],
    },
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/auth.spec.ts', '**/api-unauth.spec.ts'],
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'next dev -H 127.0.0.1 -p 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
