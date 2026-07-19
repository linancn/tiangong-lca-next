import { rm } from 'node:fs/promises';

import { E2E_AUTH_STATE_PATH } from './contracts';
import { cleanupCodexE2EProcess, readProductionDataLedger } from './production-data-ledger';

export default async function globalTeardown(): Promise<void> {
  try {
    const ledger = await readProductionDataLedger();
    if (ledger) {
      const result = await cleanupCodexE2EProcess();
      if (result.leaked !== 0 || result.created !== result.cleaned) {
        throw new Error(
          `codex-e2e cleanup invariant failed: created=${result.created}, cleaned=${result.cleaned}, leaked=${result.leaked}`,
        );
      }
    }
  } finally {
    await rm(E2E_AUTH_STATE_PATH, { force: true });
  }
}
