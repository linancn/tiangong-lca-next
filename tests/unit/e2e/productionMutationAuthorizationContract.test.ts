import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(process.cwd());

function read(relativePath: string): string {
  return readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8');
}

describe('production semantic E2E mutation authorization contract', () => {
  it('documents a usable recovery ledger outside the candidate worktree', () => {
    const dev = read('DEV.md');
    expect(dev).toContain(
      'E2E_RECOVERY_LEDGER_PATH=/tmp/tiangong-lca-next-codex-e2e-recovery.json',
    );
  });

  it('keeps CI retries diagnostic while failing the workflow on a flaky first attempt', () => {
    const config = read('playwright.config.ts');
    expect(config).toContain('failOnFlakyTests: Boolean(process.env.CI)');
    expect(config).toContain('retries: process.env.CI ? 1 : 0');
    expect(config).toContain('const expectTimeout = authenticatedRun ? 45_000 : 15_000;');
    expect(config).toContain('timeout: expectTimeout');
  });

  it('revalidates the complete operator envelope at create and exact-delete boundaries', () => {
    const ledger = read('tests/e2e/i18n/production-data-ledger.ts');
    const createStart = ledger.indexOf('export async function createCodexE2EProcess');
    const cleanupStart = ledger.indexOf('export async function cleanupCodexE2EProcess');
    const create = ledger.slice(createStart, cleanupStart);
    const cleanup = ledger.slice(cleanupStart);

    expect(createStart).toBeGreaterThanOrEqual(0);
    expect(cleanupStart).toBeGreaterThan(createStart);
    expect(create.match(/assertProductionDataWriteAuthorization\(process[.]env\);/gu)).toHaveLength(
      2,
    );
    expect(create.indexOf('assertProductionDataWriteAuthorization(process.env);')).toBeLessThan(
      create.indexOf("client.functions.invoke('app_dataset_create'"),
    );
    expect(
      cleanup.match(/assertProductionDataWriteAuthorization\(process[.]env\);/gu),
    ).toHaveLength(2);
    expect(cleanup.indexOf('assertProductionDataWriteAuthorization(process.env);')).toBeLessThan(
      cleanup.indexOf('withAuthenticatedClient'),
    );
    expect(
      cleanup.lastIndexOf('assertProductionDataWriteAuthorization(process.env);'),
    ).toBeLessThan(cleanup.indexOf("client.functions.invoke('app_dataset_delete'"));
  });

  it('revalidates the complete operator envelope before enabling and clicking the browser save', () => {
    const fixtures = read('tests/e2e/i18n/fixtures.ts');
    const authoring = read('tests/e2e/i18n/process-persisted-authoring.spec.ts');
    const requestGuard = read('tests/e2e/i18n/production-request-guard.ts');
    const fixtureAuthorization = fixtures.indexOf(
      'assertProductionDataWriteAuthorization(process.env);',
    );
    const fixtureLedgerRead = fixtures.indexOf('await readProductionDataLedger()');
    const saveAuthorization = authoring.lastIndexOf(
      'assertProductionDataWriteAuthorization(process.env);',
    );
    const saveResponse = authoring.indexOf('const saveResponse = page.waitForResponse');
    const saveClick = authoring.indexOf("name: getLocaleMessage('de-DE', 'pages.button.save')");
    const guardAuthorization = requestGuard.lastIndexOf(
      'assertProductionDataWriteAuthorization(process.env);',
    );
    const guardEscapeHatchStart = requestGuard.indexOf('const isExactSaveDraftTarget');
    const guardEscapeHatch = requestGuard.slice(guardEscapeHatchStart, guardAuthorization);
    const guardFallback = requestGuard.indexOf('await route.fallback();', guardAuthorization);

    expect(fixtureAuthorization).toBeGreaterThanOrEqual(0);
    expect(fixtureLedgerRead).toBeGreaterThan(fixtureAuthorization);
    expect(saveAuthorization).toBeGreaterThanOrEqual(0);
    expect(saveResponse).toBeGreaterThan(saveAuthorization);
    expect(saveClick).toBeGreaterThan(saveResponse);
    expect(guardEscapeHatchStart).toBeGreaterThanOrEqual(0);
    expect(guardEscapeHatch).toContain(
      'hasExactSearchEntries(requestTarget, LEDGER_CONTROLLED_SAVE_DRAFT_SEARCH_ENTRIES)',
    );
    expect(requestGuard).toContain(
      "const LEDGER_CONTROLLED_SAVE_DRAFT_SEARCH_ENTRIES = [['forceFunctionRegion', 'us-east-1']] as const;",
    );
    expect(guardAuthorization).toBeGreaterThanOrEqual(0);
    expect(guardFallback).toBeGreaterThan(guardAuthorization);
  });
});
