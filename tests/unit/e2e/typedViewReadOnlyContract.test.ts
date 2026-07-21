import { readFileSync } from 'node:fs';
import path from 'node:path';

import { AUTHORING_LANGUAGES, REPOSITORY_ROOT } from '../../e2e/i18n/contracts';
import type { ProductionDataLedger } from '../../e2e/i18n/production-data-safety';
import {
  assertExactReadOnlyProcessValidationDraft,
  PROCESS_SAVE_DRAFT_PATH,
} from '../../e2e/i18n/typed-view-readonly-fixture';

function makeLedger(): ProductionDataLedger {
  const id = '11111111-1111-4111-8111-111111111111';
  return {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: true,
    created: 1,
    id,
    leaked: 1,
    marker: `codex-e2e-${id}`,
    state: 'created',
    table: 'processes',
    version: '01.01.000',
  };
}

function makeExactBody(ledger: ProductionDataLedger): Record<string, unknown> {
  const multilingualField = (field: string) =>
    AUTHORING_LANGUAGES.map((languageCode) => ({
      '#text': `${ledger.marker} ${field} ${languageCode}`,
      '@xml:lang': languageCode,
    }));
  return {
    id: ledger.id,
    jsonOrdered: {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            'common:UUID': ledger.id,
            name: {
              baseName: multilingualField('baseName'),
              functionalUnitFlowProperties: multilingualField('functionalUnitFlowProperties'),
              mixAndLocationTypes: multilingualField('mixAndLocationTypes'),
              treatmentStandardsRoutes: multilingualField('treatmentStandardsRoutes'),
            },
            'common:generalComment': multilingualField('generalComment'),
          },
        },
      },
    },
    ruleVerification: false,
    table: ledger.table,
    version: ledger.version,
  };
}

function makeRequest(
  ledger: ProductionDataLedger,
  overrides: {
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    method?: string;
    url?: string;
  } = {},
) {
  return {
    headers: () => overrides.headers ?? { apikey: 'verified-public-key' },
    method: () => overrides.method ?? 'POST',
    postData: () => JSON.stringify(overrides.body ?? makeExactBody(ledger)),
    url: () =>
      overrides.url ??
      `https://example.supabase.co${PROCESS_SAVE_DRAFT_PATH}?forceFunctionRegion=us-east-1`,
  };
}

describe('typed Process required-state read-only trap contract', () => {
  const expectedOrigin = 'https://example.supabase.co';
  const expectedPublishableKey = 'verified-public-key';

  it('accepts only the exact ledger-controlled validation draft request', () => {
    const ledger = makeLedger();
    expect(() =>
      assertExactReadOnlyProcessValidationDraft({
        expectedOrigin,
        expectedPublishableKey,
        ledger,
        request: makeRequest(ledger),
      }),
    ).not.toThrow();
  });

  it.each([
    ['method', { method: 'GET' }],
    [
      'origin',
      { url: `https://other.invalid${PROCESS_SAVE_DRAFT_PATH}?forceFunctionRegion=us-east-1` },
    ],
    [
      'pathname',
      {
        url: 'https://example.supabase.co/functions/v1/app_dataset_delete?forceFunctionRegion=us-east-1',
      },
    ],
    ['query', { url: `https://example.supabase.co${PROCESS_SAVE_DRAFT_PATH}?extra=true` }],
    ['publishable key', { headers: { apikey: 'wrong-key' } }],
  ])('rejects a mismatched %s before a route can be aborted', (_name, overrides) => {
    const ledger = makeLedger();
    expect(() =>
      assertExactReadOnlyProcessValidationDraft({
        expectedOrigin,
        expectedPublishableKey,
        ledger,
        request: makeRequest(ledger, overrides),
      }),
    ).toThrow(/Refusing the typed-view read-only save-draft trap/u);
  });

  it('rejects expanded body keys and tampered multilingual marker matrices', () => {
    const ledger = makeLedger();
    const expanded = { ...makeExactBody(ledger), unexpected: true };
    expect(() =>
      assertExactReadOnlyProcessValidationDraft({
        expectedOrigin,
        expectedPublishableKey,
        ledger,
        request: makeRequest(ledger, { body: expanded }),
      }),
    ).toThrow(/body keys must be exact/u);

    const tampered = makeExactBody(ledger);
    const jsonOrdered = tampered.jsonOrdered as {
      processDataSet: {
        processInformation: {
          dataSetInformation: { name: { baseName: Array<Record<string, string>> } };
        };
      };
    };
    jsonOrdered.processDataSet.processInformation.dataSetInformation.name.baseName.pop();
    expect(() =>
      assertExactReadOnlyProcessValidationDraft({
        expectedOrigin,
        expectedPublishableKey,
        ledger,
        request: makeRequest(ledger, { body: tampered }),
      }),
    ).toThrow(/five-field, four-language marker matrix/u);
  });

  it('pins the required-state browser case to a local abort without mutation allowlist opt-in', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/typed-view-variants.spec.ts'),
      'utf8',
    );
    expect(source).toContain('page.route(PROCESS_SAVE_DRAFT_ROUTE_PATTERN');
    expect(source).toContain('assertExactReadOnlyProcessValidationDraft({');
    expect(source).toContain("await route.abort('blockedbyclient');");
    expect(source).not.toContain('ledgerControlledProcessSaveDraft');
  });

  it('generates one isolated test and one bounded initial navigation per required-state variant', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/typed-view-variants.spec.ts'),
      'utf8',
    );
    const generatedCasesStart = source.indexOf('PROCESS_REQUIRED_VARIANTS.forEach(');
    const generatedCases = source.slice(generatedCasesStart);
    const initialStep = generatedCases.indexOf('`${assertionId} initial mount`');
    const variantNavigation = generatedCases.indexOf('await page.goto(', initialStep);
    const localeLoop = generatedCases.indexOf('for (const locale of APP_LOCALES)', initialStep);

    expect(generatedCasesStart).toBeGreaterThanOrEqual(0);
    expect(generatedCases).toContain('test(`Process ${required} deep-link state');
    expect(generatedCases).toContain('test.setTimeout(10 * 60_000);');
    expect(generatedCases).toContain(
      "annotateEvidence(testInfo, processAssertion, 'typed-process-required-state')",
    );
    expect(initialStep).toBeGreaterThanOrEqual(0);
    expect(variantNavigation).toBeGreaterThan(initialStep);
    expect(variantNavigation).toBeLessThan(localeLoop);
    expect(generatedCases.match(/await page[.]goto[(]/gu)).toHaveLength(1);
    expect(generatedCases).toContain('timeout: 45_000');
    expect(generatedCases).toContain('{ timeout: 90_000 }');
    expect(generatedCases).toContain('await expectProcessDeepLinkMountSettled({');
    expect(generatedCases).toContain('await page.reload({ waitUntil:');
    expect(generatedCases).toContain('expect(initialNavigationCount).toBe(1);');
    expect(generatedCases).toContain('expect(reloadProofCount).toBe(APP_LOCALES.length);');
    expect(generatedCases).toContain("required === 'required' ? APP_LOCALES.length + 1 : 0");
    expect(generatedCases).toContain(
      'expect(trappedValidationDrafts).toBe(expectedTrappedValidationDrafts);',
    );
  });

  it('defines readiness as authenticated shell, exact deep link, trapped required save, and settled drawer', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/typed-view-variants.spec.ts'),
      'utf8',
    );
    const readinessStart = source.indexOf('async function expectProcessDeepLinkMountSettled');
    const readinessEnd = source.indexOf("test('Process edit and view deep links", readinessStart);
    const readiness = source.slice(readinessStart, readinessEnd);

    expect(readinessStart).toBeGreaterThanOrEqual(0);
    expect(readiness).toContain('await expectSpaLocation(page, expectedLocation);');
    expect(readiness).toContain("page.locator('.tg-global-header-avatar-trigger')");
    expect(readiness).toContain("page.locator('.tg-global-language-selector')");
    expect(readiness).toContain("page.getByTestId('process-deep-link-state')");
    expect(readiness).toContain("toHaveAttribute('data-auto-check-required', required)");
    expect(readiness).toContain('.toBeGreaterThan(trappedValidationDraftsBeforeMount);');
    expect(readiness).toContain("drawer.locator('.ant-spin-spinning')");
    expect(readiness).toContain(
      'expect(readTrappedValidationDrafts()).toBe(trappedValidationDraftsBeforeMount);',
    );
  });

  it('settles each Process drawer before changing locale and proves localized copy afterward', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/typed-view-variants.spec.ts'),
      'utf8',
    );
    const scenarioStart = source.indexOf("test('Process edit and view deep links");
    const scenarioEnd = source.indexOf('PROCESS_REQUIRED_VARIANTS.forEach(', scenarioStart);
    const scenario = source.slice(scenarioStart, scenarioEnd);
    const navigation = scenario.indexOf('await page.goto(');
    const initialMount = scenario.indexOf('await expectProcessDrawerMounted(', navigation);
    const localeChange = scenario.indexOf('await selectAppLocaleThroughUi(', initialMount);
    const localizedDrawer = scenario.indexOf('await expectProcessDrawer(', localeChange);

    expect(navigation).toBeGreaterThan(-1);
    expect(initialMount).toBeGreaterThan(navigation);
    expect(localeChange).toBeGreaterThan(initialMount);
    expect(localizedDrawer).toBeGreaterThan(localeChange);
    expect(source).toContain("drawer.locator('.ant-spin-spinning')");
  });
});
