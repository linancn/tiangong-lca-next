import { defineConfig, devices } from '@playwright/test';

const appPort = process.env.QUALIFICATION_APP_PORT ?? '8011';
const baseURL = process.env.QUALIFICATION_BASE_URL ?? `http://127.0.0.1:${appPort}`;
const supabaseURL = process.env.QUALIFICATION_SUPABASE_URL ?? 'http://127.0.0.1:54321';

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.e2e-runtime/closure-download',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  reporter: [['line']],
  use: {
    baseURL,
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
    command: 'pnpm build && node scripts/qualification/serve-scope-closure-candidate.mjs',
    env: {
      QUALIFICATION_APP_PORT: appPort,
      SUPABASE_PUBLISHABLE_KEY: 'qualification-public-placeholder',
      SUPABASE_URL: supabaseURL,
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
