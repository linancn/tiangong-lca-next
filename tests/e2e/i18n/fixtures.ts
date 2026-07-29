import { test as base, expect } from '@playwright/test';

import type { HarnessPersona } from './harness-contract';
import { installVerifiedProductionReadOnlyGuard } from './production-backend-target';
import { readProductionDataLedger } from './production-data-ledger';
import { assertProductionDataWriteAuthorization } from './production-data-safety';
import {
  assertLedgerControlledSaveDraftClosure,
  assertNoBlockedProductionRequests,
  type ProductionRequestGuard,
} from './production-request-guard';
import {
  assertSemanticBackendSimulatorClosed,
  installSemanticBackendSimulator,
} from './semantic-backend-simulator';

type I18nFixtures = {
  productionRequestGuard: ProductionRequestGuard;
};

type I18nOptions = {
  allowLedgerControlledProcessSaveDraft: boolean;
  semanticPersona: HarnessPersona;
};

export const test = base.extend<I18nFixtures & I18nOptions>({
  allowLedgerControlledProcessSaveDraft: [false, { option: true }],
  semanticPersona: ['standard_user', { option: true }],
  productionRequestGuard: [
    async (
      { allowLedgerControlledProcessSaveDraft, browserName, context, semanticPersona },
      use,
    ) => {
      const ledgerControlledSaveRequested =
        allowLedgerControlledProcessSaveDraft &&
        browserName === 'chromium' &&
        process.env.E2E_AUTHENTICATED === 'true' &&
        process.env.E2E_ALLOW_PRODUCTION_DATA === 'true';
      if (ledgerControlledSaveRequested) {
        assertProductionDataWriteAuthorization(process.env);
      }
      const ledgerControlledProcessSaveDraft = ledgerControlledSaveRequested
        ? await readProductionDataLedger()
        : undefined;
      if (ledgerControlledSaveRequested && !ledgerControlledProcessSaveDraft) {
        throw new Error('Ledger-controlled Process UI save requires the global setup ledger.');
      }
      const qualification = process.env.E2E_QUALIFICATION === 'true';
      const guard = qualification
        ? await installSemanticBackendSimulator(context, semanticPersona, {
            allowLedgerControlledProcessSaveDraft:
              allowLedgerControlledProcessSaveDraft && browserName === 'chromium',
          })
        : (
            await installVerifiedProductionReadOnlyGuard(context, {
              ledgerControlledProcessSaveDraft,
            })
          ).guard;
      await use(guard);
      if ('externalRequests' in guard && 'productionWrites' in guard) {
        assertSemanticBackendSimulatorClosed(guard);
      } else assertNoBlockedProductionRequests(guard);
      if (ledgerControlledProcessSaveDraft) {
        assertLedgerControlledSaveDraftClosure(guard);
      }
    },
    { auto: true },
  ],
});

export type { Browser, Locator, Page, Route, TestInfo } from '@playwright/test';
export { expect };
