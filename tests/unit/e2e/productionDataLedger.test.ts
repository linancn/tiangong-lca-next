import { readFileSync } from 'node:fs';
import path from 'node:path';

import { AUTHORING_LANGUAGES, REPOSITORY_ROOT } from '../../e2e/i18n/contracts';
import type {
  ProductionDataLedger,
  ProductionLedgerState,
  ProductionSynonymStage,
} from '../../e2e/i18n/production-data-safety';
import {
  getCodexE2EProcessSynonym,
  isExactLedgerControlledProcessSaveDraftBody,
  persistProductionLedgerCopies,
  productionDataLedgerSafetyContract,
  reconcileProductionLedgerCopies,
} from '../../e2e/i18n/production-data-safety';

const PROCESS_FIELDS = [
  'baseName',
  'treatmentStandardsRoutes',
  'mixAndLocationTypes',
  'functionalUnitFlowProperties',
  'generalComment',
] as const;

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

function makeLedgerAtState(state: ProductionLedgerState): ProductionDataLedger {
  const ledger = makeLedger();
  switch (state) {
    case 'initial':
      return {
        ...ledger,
        createAttempted: false,
        created: 0,
        leaked: 0,
        state,
      };
    case 'create-attempted':
      return {
        ...ledger,
        created: 0,
        leaked: 0,
        state,
      };
    case 'created':
      return ledger;
    case 'cleanup-prepared':
    case 'leak-result':
      return { ...ledger, cleanupPrepared: true, state };
  }
}

function makeExactMarkerPayload(
  ledger: ProductionDataLedger,
  synonymStage: ProductionSynonymStage = 'after-ui-save',
) {
  const multilingualField = (field: (typeof PROCESS_FIELDS)[number]) =>
    AUTHORING_LANGUAGES.map((language) => ({
      '#text': `${ledger.marker} ${field} ${language}`,
      '@xml:lang': language,
    }));
  return {
    processDataSet: {
      processInformation: {
        dataSetInformation: {
          'common:UUID': ledger.id,
          name: {
            baseName: multilingualField('baseName'),
            treatmentStandardsRoutes: multilingualField('treatmentStandardsRoutes'),
            mixAndLocationTypes: multilingualField('mixAndLocationTypes'),
            functionalUnitFlowProperties: multilingualField('functionalUnitFlowProperties'),
          },
          'common:synonyms': AUTHORING_LANGUAGES.map((language) => ({
            '#text': getCodexE2EProcessSynonym(ledger, language, synonymStage),
            '@xml:lang': language,
          })),
          'common:generalComment': multilingualField('generalComment'),
        },
      },
    },
  };
}

type SaveDraftTestBody = {
  id: string;
  jsonOrdered: ReturnType<typeof makeExactMarkerPayload>;
  ruleVerification: boolean;
  table: string;
  version: string;
};

function makeExactSaveDraftBody(ledger: ProductionDataLedger): SaveDraftTestBody {
  return {
    id: ledger.id,
    jsonOrdered: makeExactMarkerPayload(ledger),
    ruleVerification: false,
    table: ledger.table,
    version: ledger.version,
  };
}

function makePersistedRow(ledger: ProductionDataLedger, userId: string) {
  return {
    id: ledger.id,
    json: null,
    json_ordered: makeExactMarkerPayload(ledger),
    user_id: userId,
    version: ledger.version,
  };
}

function makeFullyPersistedRow(
  ledger: ProductionDataLedger,
  userId: string,
  synonymStage: ProductionSynonymStage,
) {
  const json = makeExactMarkerPayload(ledger, synonymStage);
  return {
    id: ledger.id,
    json,
    json_ordered: makeExactMarkerPayload(ledger, synonymStage),
    user_id: userId,
    version: ledger.version,
  };
}

describe('production data ledger safety contract', () => {
  const authenticatedUserId = 'authenticated-user-id';

  it('accepts only a matching owner and the complete exact-marker payload', () => {
    const ledger = makeLedger();

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: makeExactMarkerPayload(ledger),
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).not.toThrow();
  });

  it('refuses a row owned by another production user', () => {
    const ledger = makeLedger();

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: makeExactMarkerPayload(ledger),
          user_id: 'different-user-id',
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses a row whose persisted payload is missing one exact marker value', () => {
    const ledger = makeLedger();
    const payload = makeExactMarkerPayload(ledger);
    payload.processDataSet.processInformation.dataSetInformation.name.baseName.pop();

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses complete marker strings scattered outside the five exact ILCD fields', () => {
    const ledger = makeLedger();
    const payload = {
      processDataSet: {
        processInformation: {
          dataSetInformation: {
            'common:UUID': ledger.id,
            name: {},
            markerValues: PROCESS_FIELDS.flatMap((field) =>
              AUTHORING_LANGUAGES.map((language) => `${ledger.marker} ${field} ${language}`),
            ),
          },
        },
      },
    };

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses markers placed in the wrong ILCD field even when the global marker set is complete', () => {
    const ledger = makeLedger();
    const payload = makeExactMarkerPayload(ledger);
    const { name } = payload.processDataSet.processInformation.dataSetInformation;
    const baseNameText = name.baseName[0]['#text'];
    name.baseName[0]['#text'] = name.treatmentStandardsRoutes[0]['#text'];
    name.treatmentStandardsRoutes[0]['#text'] = baseNameText;

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses field markers whose language codes are paired with different elements', () => {
    const ledger = makeLedger();
    const payload = makeExactMarkerPayload(ledger);
    const { baseName } = payload.processDataSet.processInformation.dataSetInformation.name;
    const firstLanguage = baseName[0]['@xml:lang'];
    baseName[0]['@xml:lang'] = baseName[1]['@xml:lang'];
    baseName[1]['@xml:lang'] = firstLanguage;

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses an extra localized element even when all four exact markers remain present', () => {
    const ledger = makeLedger();
    const payload = makeExactMarkerPayload(ledger);
    payload.processDataSet.processInformation.dataSetInformation.name.baseName.push({
      '#text': `${ledger.marker} baseName en`,
      '@xml:lang': 'en',
    });

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses duplicate language markers even when every language remains represented', () => {
    const ledger = makeLedger();
    const payload = makeExactMarkerPayload(ledger);
    const { baseName } = payload.processDataSet.processInformation.dataSetInformation.name;
    baseName[3] = { '#text': `${ledger.marker} baseName de`, '@xml:lang': 'de' };

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('requires every non-null persisted representation to preserve the exact marker matrix', () => {
    const ledger = makeLedger();
    const orderedPayload = makeExactMarkerPayload(ledger);
    const normalizedPayload = makeExactMarkerPayload(ledger);
    normalizedPayload.processDataSet.processInformation.dataSetInformation.name.baseName[0][
      '#text'
    ] = 'tampered';

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: normalizedPayload,
          json_ordered: orderedPayload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('accepts exact before-save synonyms in both persisted JSON forms', () => {
    const ledger = makeLedger();
    const row = makeFullyPersistedRow(ledger, authenticatedUserId, 'before-ui-save');

    expect(() =>
      productionDataLedgerSafetyContract.assertPersistedProcessSynonyms(
        row,
        ledger,
        'before-ui-save',
      ),
    ).not.toThrow();
  });

  it.each([
    [
      'missing',
      (payload: ReturnType<typeof makeExactMarkerPayload>) => {
        payload.processDataSet.processInformation.dataSetInformation['common:synonyms'].pop();
      },
    ],
    [
      'duplicate',
      (payload: ReturnType<typeof makeExactMarkerPayload>) => {
        const synonyms =
          payload.processDataSet.processInformation.dataSetInformation['common:synonyms'];
        synonyms.push({ ...synonyms[0] });
      },
    ],
    [
      'wrong-value',
      (payload: ReturnType<typeof makeExactMarkerPayload>) => {
        payload.processDataSet.processInformation.dataSetInformation['common:synonyms'][0][
          '#text'
        ] = 'tampered';
      },
    ],
  ])('refuses %s before-save synonyms in either persisted JSON form', (_name, mutate) => {
    const ledger = makeLedger();

    for (const persistedField of ['json', 'json_ordered'] as const) {
      const row = makeFullyPersistedRow(ledger, authenticatedUserId, 'before-ui-save');
      mutate(row[persistedField]);

      expect(() =>
        productionDataLedgerSafetyContract.assertPersistedProcessSynonyms(
          row,
          ledger,
          'before-ui-save',
        ),
      ).toThrow(/exact before-ui-save synonyms in both persisted JSON forms/u);
    }
  });

  it('requires the fixture UUID at the exact ILCD UUID path', () => {
    const ledger = makeLedger();
    const exactPayload = makeExactMarkerPayload(ledger);
    exactPayload.processDataSet.processInformation.dataSetInformation['common:UUID'] =
      '22222222-2222-4222-8222-222222222222';
    const payload = { leakedUuid: ledger.id, ...exactPayload };

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: payload,
          user_id: authenticatedUserId,
          version: ledger.version,
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses a different version even when UUID, owner, and marker all match', () => {
    const ledger = makeLedger();

    expect(() =>
      productionDataLedgerSafetyContract.assertOwnedCodexRow(
        {
          id: ledger.id,
          json: null,
          json_ordered: makeExactMarkerPayload(ledger),
          user_id: authenticatedUserId,
          version: '01.02.000',
        },
        ledger,
        authenticatedUserId,
      ),
    ).toThrow(/not an exact owned codex-e2e fixture/u);
  });

  it('refuses a tampered ledger before any production cleanup query', () => {
    const ledger = makeLedger();

    expect(() =>
      productionDataLedgerSafetyContract.assertLedgerScope({
        ...ledger,
        marker: 'codex-e2e-a-different-id',
      }),
    ).toThrow(/outside codex-e2e scope/u);
  });

  it('allows production writes only in an explicitly confirmed non-CI local session', () => {
    expect(() =>
      productionDataLedgerSafetyContract.assertLocalProductionWriteEnvironment({
        E2E_BACKEND_TARGET: 'production',
        E2E_PRODUCTION_WRITE_CONFIRMATION: 'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS',
      }),
    ).not.toThrow();
    expect(() =>
      productionDataLedgerSafetyContract.assertLocalProductionWriteEnvironment({
        CI: 'true',
        E2E_BACKEND_TARGET: 'production',
        E2E_PRODUCTION_WRITE_CONFIRMATION: 'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS',
      }),
    ).toThrow(/forbidden in CI/u);
    expect(() =>
      productionDataLedgerSafetyContract.assertLocalProductionWriteEnvironment({
        E2E_PRODUCTION_WRITE_CONFIRMATION: 'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS',
      }),
    ).toThrow(/production backend target/u);
    expect(() =>
      productionDataLedgerSafetyContract.assertLocalProductionWriteEnvironment({
        E2E_BACKEND_TARGET: 'production',
      }),
    ).toThrow(/one-run local operator confirmation/u);
  });

  it('requires the complete production-data authorization envelope', () => {
    const authorizedEnvironment = {
      E2E_ALLOW_PRODUCTION_DATA: 'true',
      E2E_AUTHENTICATED: 'true',
      E2E_BACKEND_TARGET: 'production',
      E2E_PRODUCTION_WRITE_CONFIRMATION: 'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS',
    };
    expect(() =>
      productionDataLedgerSafetyContract.assertProductionDataWriteAuthorization(
        authorizedEnvironment,
      ),
    ).not.toThrow();
    expect(() =>
      productionDataLedgerSafetyContract.assertProductionDataWriteAuthorization({
        ...authorizedEnvironment,
        E2E_ALLOW_PRODUCTION_DATA: undefined,
      }),
    ).toThrow(/E2E_ALLOW_PRODUCTION_DATA=true/u);
    expect(() =>
      productionDataLedgerSafetyContract.assertProductionDataWriteAuthorization({
        ...authorizedEnvironment,
        E2E_AUTHENTICATED: undefined,
      }),
    ).toThrow(/E2E_AUTHENTICATED=true/u);
  });

  it('keeps authorization at the direct create mutation boundary', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/production-data-ledger.ts'),
      'utf8',
    );
    const createBoundary = source.indexOf('export async function createCodexE2EProcess');
    const authorization = source.indexOf(
      'assertProductionDataWriteAuthorization(process.env);',
      createBoundary,
    );
    const firstLedgerAccess = source.indexOf('resolveRecoveryLedgerPath(true);', createBoundary);
    expect(createBoundary).toBeGreaterThanOrEqual(0);
    expect(authorization).toBeGreaterThan(createBoundary);
    expect(authorization).toBeLessThan(firstLedgerAccess);
  });

  it('verifies before-save synonyms before transitioning a created fixture ledger', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/production-data-ledger.ts'),
      'utf8',
    );
    const createBoundary = source.indexOf('export async function createCodexE2EProcess');
    const persistedVerification = source.indexOf(
      "assertPersistedProcessSynonyms(persistedRow, attemptedLedger, 'before-ui-save');",
      createBoundary,
    );
    const createdTransition = source.indexOf('const createdLedger:', createBoundary);

    expect(persistedVerification).toBeGreaterThan(createBoundary);
    expect(persistedVerification).toBeLessThan(createdTransition);
  });

  it('accepts only the exact ledger-controlled Process save-draft body', () => {
    const ledger = makeLedger();
    expect(
      isExactLedgerControlledProcessSaveDraftBody(
        JSON.stringify(makeExactSaveDraftBody(ledger)),
        ledger,
      ),
    ).toBe(true);
  });

  it.each([
    [
      'id',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.id = '22222222-2222-4222-8222-222222222222';
      },
    ],
    [
      'version',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.version = '01.02.000';
      },
    ],
    [
      'table',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.table = 'flows';
      },
    ],
    [
      'ILCD UUID',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.jsonOrdered.processDataSet.processInformation.dataSetInformation['common:UUID'] =
          '22222222-2222-4222-8222-222222222222';
      },
    ],
    [
      'cleanup sentinel',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.jsonOrdered.processDataSet.processInformation.dataSetInformation.name.baseName[0][
          '#text'
        ] = 'tampered';
      },
    ],
    [
      'saved synonym',
      (body: ReturnType<typeof makeExactSaveDraftBody>) => {
        body.jsonOrdered.processDataSet.processInformation.dataSetInformation['common:synonyms'][2][
          '#text'
        ] = 'tampered';
      },
    ],
  ])('rejects a save-draft body with a mismatched %s', (_name, mutate) => {
    const ledger = makeLedger();
    const body = makeExactSaveDraftBody(ledger);
    mutate(body);
    expect(isExactLedgerControlledProcessSaveDraftBody(JSON.stringify(body), ledger)).toBe(false);
  });

  it('rejects malformed, missing, and expanded save-draft bodies', () => {
    const ledger = makeLedger();
    expect(isExactLedgerControlledProcessSaveDraftBody('{', ledger)).toBe(false);
    expect(isExactLedgerControlledProcessSaveDraftBody(undefined, ledger)).toBe(false);
    expect(
      isExactLedgerControlledProcessSaveDraftBody(
        JSON.stringify({ ...makeExactSaveDraftBody(ledger), unexpectedWrite: true }),
        ledger,
      ),
    ).toBe(false);
  });

  it('does not call delete when an unresolved create is invisible to the authenticated user', async () => {
    const ledger = makeLedger();
    const deleteExactVersion = jest.fn();
    const countRemaining = jest.fn();

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining,
        deleteExactVersion,
        ledger,
        prepareCleanup: jest.fn(async () => undefined),
        rows: [],
      }),
    ).rejects.toThrow(/not visible for marker verification/u);
    expect(deleteExactVersion).not.toHaveBeenCalled();
    expect(countRemaining).not.toHaveBeenCalled();
  });

  it('does not call delete when an exact-looking row exists without a recorded create attempt', async () => {
    const ledger = makeLedgerAtState('initial');
    const deleteExactVersion = jest.fn();
    const prepareCleanup = jest.fn(async () => undefined);

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining: jest.fn(),
        deleteExactVersion,
        ledger,
        prepareCleanup,
        rows: [makePersistedRow(ledger, authenticatedUserId)],
      }),
    ).rejects.toThrow(/never recorded a create attempt/u);
    expect(prepareCleanup).not.toHaveBeenCalled();
    expect(deleteExactVersion).not.toHaveBeenCalled();
  });

  it('validates the production row before invoking exact-version delete', async () => {
    const ledger = makeLedger();
    const row = makePersistedRow(ledger, 'different-user-id');
    const deleteExactVersion = jest.fn();
    const countRemaining = jest.fn();

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining,
        deleteExactVersion,
        ledger,
        prepareCleanup: jest.fn(async () => undefined),
        rows: [row],
      }),
    ).rejects.toThrow(/not an exact owned codex-e2e fixture/u);
    expect(deleteExactVersion).not.toHaveBeenCalled();
    expect(countRemaining).not.toHaveBeenCalled();
  });

  it('requires an exact server deletion receipt before checking zero remaining rows', async () => {
    const ledger = makeLedger();
    const row = makePersistedRow(ledger, authenticatedUserId);
    const callOrder: string[] = [];
    const prepareCleanup = jest.fn(async () => {
      callOrder.push('prepare');
    });
    const deleteExactVersion = jest.fn(async () => {
      callOrder.push('delete');
      return { command: 'dataset_delete', data: row, ok: true };
    });
    const countRemaining = jest.fn(async () => {
      callOrder.push('count');
      return 0;
    });

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining,
        deleteExactVersion,
        ledger,
        prepareCleanup,
        rows: [row],
      }),
    ).resolves.toEqual({ cleaned: 1, created: 1, leaked: 0 });
    expect(callOrder).toEqual(['prepare', 'delete', 'count']);
    expect(prepareCleanup).toHaveBeenCalledWith(
      expect.objectContaining({
        cleaned: 0,
        cleanupPrepared: true,
        createAttempted: true,
        created: 1,
        leaked: 1,
        state: 'cleanup-prepared',
      }),
    );
  });

  it('retains a non-zero leak result after a verified server deletion receipt', async () => {
    const ledger = makeLedger();
    const row = makePersistedRow(ledger, authenticatedUserId);

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining: async () => 1,
        deleteExactVersion: async () => ({ command: 'dataset_delete', data: row, ok: true }),
        ledger,
        prepareCleanup: async () => undefined,
        rows: [row],
      }),
    ).resolves.toEqual({ cleaned: 0, created: 1, leaked: 1 });
  });

  it('refuses an impossible exact-id count after deletion', async () => {
    const ledger = makeLedger();
    const row = makePersistedRow(ledger, authenticatedUserId);

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining: async () => 2,
        deleteExactVersion: async () => ({ command: 'dataset_delete', data: row, ok: true }),
        ledger,
        prepareCleanup: async () => undefined,
        rows: [row],
      }),
    ).rejects.toThrow(/exact UUID count is invalid/u);
  });

  it('reconciles an absent exact UUID only after cleanup was durably prepared', async () => {
    const ledger = makeLedgerAtState('cleanup-prepared');
    const deleteExactVersion = jest.fn();
    const prepareCleanup = jest.fn();
    const countRemaining = jest.fn(async () => 0);

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining,
        deleteExactVersion,
        ledger,
        prepareCleanup,
        rows: [],
      }),
    ).resolves.toEqual({ cleaned: 1, created: 1, leaked: 0 });
    expect(countRemaining).toHaveBeenCalledTimes(1);
    expect(prepareCleanup).not.toHaveBeenCalled();
    expect(deleteExactVersion).not.toHaveBeenCalled();
  });

  it('refuses prepared reconciliation when the exact UUID count is not zero', async () => {
    const ledger = makeLedgerAtState('cleanup-prepared');

    await expect(
      productionDataLedgerSafetyContract.executeVerifiedCodexCleanup({
        authenticatedUserId,
        countRemaining: async () => 1,
        deleteExactVersion: jest.fn(),
        ledger,
        prepareCleanup: jest.fn(),
        rows: [],
      }),
    ).rejects.toThrow(/prepared exact UUID is still visible/u);
  });

  it('refuses a ledger without an explicit cleanup preparation state', () => {
    const ledger = makeLedger();
    delete (ledger as Partial<ProductionDataLedger>).cleanupPrepared;
    expect(() => productionDataLedgerSafetyContract.assertLedgerScope(ledger)).toThrow(
      /outside codex-e2e scope/u,
    );
  });

  it('reconciles only recovery-backed ledger states and the atomic cleanup transition', () => {
    const primary = makeLedger();
    const recovery = makeLedgerAtState('cleanup-prepared');
    expect(reconcileProductionLedgerCopies(primary, recovery)).toEqual(recovery);
    expect(reconcileProductionLedgerCopies(recovery, primary)).toEqual(recovery);
    expect(reconcileProductionLedgerCopies(undefined, primary)).toEqual(primary);
  });

  it('refuses to let a stale run adopt a primary ledger without its recovery copy', () => {
    expect(() => reconcileProductionLedgerCopies(makeLedger(), undefined)).toThrow(
      /no matching recovery copy/u,
    );
  });

  it('refuses ledger-copy disagreement outside the cleanup-prepared transition', () => {
    const primary = makeLedger();
    expect(() => reconcileProductionLedgerCopies(primary, { ...primary, created: 2 })).toThrow(
      /outside codex-e2e scope/u,
    );
  });

  it.each([
    ['negative created count', { created: -1 }],
    ['fractional leaked count', { leaked: 0.5 }],
    ['string cleaned count', { cleaned: '0' }],
    ['counter/state mismatch', { created: 0 }],
    ['boolean/state mismatch', { cleanupPrepared: true }],
    ['unknown state', { state: 'cleanup-finished' }],
    ['unexpected property', { unexpected: true }],
  ])('refuses a corrupted ledger with %s', (_name, mutation) => {
    const corrupted = { ...makeLedger(), ...mutation } as unknown as ProductionDataLedger;
    expect(() => productionDataLedgerSafetyContract.assertLedgerScope(corrupted)).toThrow(
      /outside codex-e2e scope/u,
    );
  });

  it.each([
    { cleaned: -1, created: 1, leaked: 0 },
    { cleaned: 0, created: 2, leaked: 2 },
    { cleaned: 0, created: 1, leaked: 0 },
    { cleaned: 1, created: 0, leaked: 0 },
    { cleaned: 1.5, created: 1, leaked: 0 },
  ])('refuses a corrupted production evidence count tuple: %j', (result) => {
    expect(() => productionDataLedgerSafetyContract.assertProductionDataResult(result)).toThrow(
      /refusing evidence output/u,
    );
  });

  it.each([
    { cleaned: 0, created: 0, leaked: 0 },
    { cleaned: 0, created: 1, leaked: 1 },
    { cleaned: 1, created: 1, leaked: 0 },
  ])('accepts an exact production evidence count tuple: %j', (result) => {
    expect(() =>
      productionDataLedgerSafetyContract.assertProductionDataResult(result),
    ).not.toThrow();
  });

  const adjacentTransitions: Array<{
    name: string;
    next: ProductionDataLedger;
    previous: ProductionDataLedger | undefined;
  }> = [
    { name: 'initial ledger', previous: undefined, next: makeLedgerAtState('initial') },
    {
      name: 'create attempt',
      previous: makeLedgerAtState('initial'),
      next: makeLedgerAtState('create-attempted'),
    },
    {
      name: 'verified create',
      previous: makeLedgerAtState('create-attempted'),
      next: makeLedgerAtState('created'),
    },
    {
      name: 'recovered create prepared after exact-row proof',
      previous: makeLedgerAtState('create-attempted'),
      next: makeLedgerAtState('cleanup-prepared'),
    },
    {
      name: 'normal cleanup preparation',
      previous: makeLedgerAtState('created'),
      next: makeLedgerAtState('cleanup-prepared'),
    },
    {
      name: 'verified non-zero leak result',
      previous: makeLedgerAtState('cleanup-prepared'),
      next: makeLedgerAtState('leak-result'),
    },
  ];

  it.each(adjacentTransitions)(
    'keeps the $name transition recoverable when the recovery-copy write fails',
    async ({ next, previous }) => {
      let primary = previous;
      let recovery = previous;
      const writePrimary = jest.fn(async (value: ProductionDataLedger) => {
        primary = value;
      });

      await expect(
        persistProductionLedgerCopies({
          next,
          primary,
          recovery,
          writePrimary,
          writeRecovery: async () => {
            throw new Error('injected recovery-copy failure');
          },
        }),
      ).rejects.toThrow(/injected recovery-copy failure/u);
      expect(primary).toEqual(previous);
      expect(recovery).toEqual(previous);
      expect(writePrimary).not.toHaveBeenCalled();
      expect(reconcileProductionLedgerCopies(primary, recovery)).toEqual(previous);
    },
  );

  it.each(adjacentTransitions)(
    'reconciles the $name transition when the process crashes between ledger-copy writes',
    async ({ next, previous }) => {
      let primary = previous;
      let recovery = previous;

      await expect(
        persistProductionLedgerCopies({
          next,
          primary,
          recovery,
          writePrimary: async () => {
            throw new Error('injected primary-copy failure');
          },
          writeRecovery: async (value) => {
            recovery = value;
          },
        }),
      ).rejects.toThrow(/injected primary-copy failure/u);
      expect(primary).toEqual(previous);
      expect(recovery).toEqual(next);
      expect(reconcileProductionLedgerCopies(primary, recovery)).toEqual(next);
    },
  );

  it.each(adjacentTransitions)(
    'commits both copies for the complete $name transition',
    async ({ next, previous }) => {
      let primary = previous;
      let recovery = previous;

      await persistProductionLedgerCopies({
        next,
        primary,
        recovery,
        writePrimary: async (value) => {
          primary = value;
        },
        writeRecovery: async (value) => {
          recovery = value;
        },
      });
      expect(primary).toEqual(next);
      expect(recovery).toEqual(next);
      expect(reconcileProductionLedgerCopies(primary, recovery)).toEqual(next);
    },
  );

  it('refuses a non-adjacent state jump before writing either ledger copy', async () => {
    const writePrimary = jest.fn(async () => undefined);
    const writeRecovery = jest.fn(async () => undefined);
    await expect(
      persistProductionLedgerCopies({
        next: makeLedgerAtState('cleanup-prepared'),
        primary: makeLedgerAtState('initial'),
        recovery: makeLedgerAtState('initial'),
        writePrimary,
        writeRecovery,
      }),
    ).rejects.toThrow(/non-adjacent/u);
    expect(writePrimary).not.toHaveBeenCalled();
    expect(writeRecovery).not.toHaveBeenCalled();
  });
});
