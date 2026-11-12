import { defineConfig, devices } from '@playwright/test';

const DEV_URL = 'http://localhost:4200';
const externalBaseUrl = process.env['E2E_BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: 'html',
  use: {
    baseURL: externalBaseUrl ?? DEV_URL,
    timezoneId: 'Europe/Paris',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-dark',
      testMatch: /accessibility\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'pnpm start',
        url: DEV_URL,
        reuseExistingServer: !process.env.CI,
      },
});
