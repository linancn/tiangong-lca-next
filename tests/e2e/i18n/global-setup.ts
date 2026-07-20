import { mkdir, rm } from 'node:fs/promises';

import type { FullConfig } from '@playwright/test';

import {
  resolveCandidateReadinessBrowserName,
  waitForCandidateFrontendReady,
} from './candidate-readiness';
import {
  assertCandidateFrontendTarget,
  E2E_AUTH_STATE_PATH,
  E2E_LEDGER_RESULT_PATH,
  E2E_RUNTIME_DIR,
  isProductionDataRun,
} from './contracts';
import { createCodexE2EProcess } from './production-data-ledger';
import { assertProductionDataWriteAuthorization } from './production-data-safety';

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== 'string') {
    throw new Error('Playwright E2E requires a local candidate baseURL.');
  }
  assertCandidateFrontendTarget(baseURL);
  await mkdir(E2E_RUNTIME_DIR, { recursive: true });
  await Promise.all([
    rm(E2E_AUTH_STATE_PATH, { force: true }),
    rm(E2E_LEDGER_RESULT_PATH, { force: true }),
  ]);
  await waitForCandidateFrontendReady(
    baseURL,
    resolveCandidateReadinessBrowserName(process.env.E2E_READINESS_BROWSER),
  );

  if (!isProductionDataRun()) {
    return;
  }
  assertProductionDataWriteAuthorization(process.env);
  await createCodexE2EProcess();
}
