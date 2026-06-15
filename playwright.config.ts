import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    // Dedicated port so we never attach to another project's dev server on 5173
    baseURL: 'http://localhost:5183',
    screenshot: 'on',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    port: 5183,
    reuseExistingServer: false,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
