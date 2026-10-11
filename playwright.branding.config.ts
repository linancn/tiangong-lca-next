import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Local brand proof uses the shared closed simulator, outside the reviewed release inventory.
export default defineConfig({
  ...base,
  testDir: './tests/e2e/branding',
  outputDir: '.local/brand-preview',
  globalSetup: undefined,
  globalTeardown: undefined,
  reporter: [['line']],
  projects: base.projects?.filter(({ name }) => name === 'chromium'),
});
