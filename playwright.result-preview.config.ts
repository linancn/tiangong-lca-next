import { defineConfig, devices } from '@playwright/test';

const port = '8012';
const baseURL = process.env.RESULT_PREVIEW_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/e2e/data-processing',
  outputDir: '.local/e2e-release/result-preview',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['line']],
  use: { baseURL, serviceWorkers: 'block', screenshot: 'off', trace: 'off', video: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && node scripts/qualification/serve-scope-closure-candidate.mjs',
    env: { REACT_APP_ENV: 'qualification', QUALIFICATION_APP_PORT: port },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
