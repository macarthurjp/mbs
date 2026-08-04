import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    headless: !!process.env.CI || process.env.PLAYWRIGHT_HEADLESS === '1',
    launchOptions: {
      slowMo: process.env.CI ? 0 : 250,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER === '1'
    ? undefined
    : {
        command: 'npm run dev -- --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI || process.env.PLAYWRIGHT_REUSE_SERVER === '1',
        timeout: 60_000,
      },
});
