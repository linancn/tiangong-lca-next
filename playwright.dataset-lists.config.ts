import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Browser layout proof against synthetic intercepted data; never production evidence.
export default defineConfig({
  ...base,
  testDir: './tests/e2e/dataset-lists',
  outputDir: '.local/dataset-list-unification/visual',
  globalSetup: undefined,
  globalTeardown: undefined,
  reporter: [['line']],
  projects: base.projects?.filter(({ name }) => name === 'chromium'),
});
