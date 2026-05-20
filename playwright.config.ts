import { defineConfig } from '@playwright/test';

const CONSOLE_URL = process.env.CONSOLE_URL ?? 'https://console-openshift-console.apps.aws-jb-acsacm-1.dev05.red-chesterfield.com';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: CONSOLE_URL,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
