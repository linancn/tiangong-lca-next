import { defineConfig, devices } from '@playwright/test';

import {
  assertCandidateFrontendTarget,
  E2E_RUNTIME_DIR,
  PLAYWRIGHT_BROWSER_PROJECTS,
} from './tests/e2e/i18n/contracts';

// Playwright otherwise persists an automatic ARIA snapshot on failure even when screenshots,
// traces, and video are disabled. Authenticated runs must never write page contents to artifacts.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8000';
assertCandidateFrontendTarget(baseURL);

const authenticatedRun = process.env.E2E_AUTHENTICATED === 'true';
const verifiedEvidenceRun = process.env.E2E_WRITE_VERIFIED_EVIDENCE === 'true';
if (
  verifiedEvidenceRun &&
  (!authenticatedRun ||
    process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true' ||
    process.env.E2E_BACKEND_TARGET !== 'production')
) {
  throw new Error(
    'Verified evidence requires authenticated production-backed execution and exact cleanup.',
  );
}

export default defineConfig({
  testDir: './tests/e2e/i18n',
  outputDir: `${E2E_RUNTIME_DIR}/test-results`,
  failOnFlakyTests: Boolean(process.env.CI),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: authenticatedRun ? 1 : process.env.CI ? 2 : 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  globalSetup: './tests/e2e/i18n/global-setup.ts',
  globalTeardown: './tests/e2e/i18n/global-teardown.ts',
  reporter: [['line'], ['./tests/e2e/i18n/evidence-reporter.ts']],
  use: {
    baseURL,
    locale: 'en-US',
    screenshot: 'off',
    serviceWorkers: 'block',
    trace: 'off',
    video: 'off',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: PLAYWRIGHT_BROWSER_PROJECTS[0],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: PLAYWRIGHT_BROWSER_PROJECTS[1],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: PLAYWRIGHT_BROWSER_PROJECTS[2],
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run start:main',
    url: baseURL,
    // Evidence must always exercise the server spawned for this invocation. If the URL is
    // already occupied, Playwright fails instead of silently proving an unrelated local build.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
