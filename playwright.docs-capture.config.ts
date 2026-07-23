import { defineConfig, devices } from '@playwright/test';

export const DOCS_CAPTURE_DEFAULTS = {
  locale: 'en-US',
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  actionTimeout: 20_000,
  navigationTimeout: 45_000,
  screenshotTimeout: 30_000,
} as const;

// This config is intentionally separate from semantic localization E2E. The
// docs capture entry point launches Playwright directly, uses explicit output
// paths, and does not inherit the release-E2E reporters or auth lifecycle.
export default defineConfig({
  testDir: './scripts/docs-screenshots',
  outputDir: '.local/docs-screenshot-capture/test-results',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    locale: DOCS_CAPTURE_DEFAULTS.locale,
    viewport: DOCS_CAPTURE_DEFAULTS.viewport,
    deviceScaleFactor: DOCS_CAPTURE_DEFAULTS.deviceScaleFactor,
    screenshot: 'off',
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
    actionTimeout: DOCS_CAPTURE_DEFAULTS.actionTimeout,
    navigationTimeout: DOCS_CAPTURE_DEFAULTS.navigationTimeout,
  },
});
