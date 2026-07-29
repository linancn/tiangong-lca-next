import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.e2e-runtime/closure-download',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:8011',
    screenshot: 'off',
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'cross-env PORT=8011 npm run start:main',
    url: 'http://127.0.0.1:8011',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
