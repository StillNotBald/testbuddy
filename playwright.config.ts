import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against an already running app. Default is the production standalone build on :3100
 * (`npm run build && npm run start:standalone`). Override with BASE_URL. No webServer here:
 * tests never start or rebuild the app.
 */
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-390',
      // Chromium with a 390x844 touch viewport (no WebKit/Firefox download needed).
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
