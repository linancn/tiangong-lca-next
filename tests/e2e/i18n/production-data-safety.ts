import { AUTHORING_LANGUAGES, PRODUCTION_DATA_MARKER_PREFIX } from './contracts';

export const PROCESS_TABLE = 'processes' as const;
export const PROCESS_VERSION = '01.01.000' as const;
export const LOCAL_PRODUCTION_WRITE_CONFIRMATION =
  'I_AUTHORIZE_ONE_CODEX_E2E_PRODUCTION_PROCESS' as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const MULTILINGUAL_PROCESS_FIELDS = [
  'baseName',
  'treatmentStandardsRoutes',
  'mixAndLocationTypes',
  'functionalUnitFlowProperties',
  'generalComment',
] as const;

export const PRODUCTION_SYNONYM_STAGES = ['before-ui-save', 'after-ui-save'] as const;
export type ProductionSynonymStage = (typeof PRODUCTION_SYNONYM_STAGES)[number];

export const PRODUCTION_LEDGER_STATES = [
  'initial',
  'create-attempted',
  'created',
  'cleanup-prepared',
  'leak-result',
] as const;
export type ProductionLedgerState = (typeof PRODUCTION_LEDGER_STATES)[number];

export type ProductionDataLedger = {
  cleaned: number;
  cleanupPrepared: boolean;
  createAttempted: boolean;
  created: number;
  id: string;
  leaked: number;
  marker: string;
  state: ProductionLedgerState;
  table: typeof PROCESS_TABLE;
  version: typeof PROCESS_VERSION;
};

export type PersistedProcessRow = {
  id: string;
  json: unknown;
  json_ordered: unknown;
  user_id: string | null;
  version: string;
};

export type ProductionDataResult = Pick<ProductionDataLedger, 'cleaned' | 'created' | 'leaked'>;

export function assertProductionDataResult(result: ProductionDataResult): void {
  if (
    !result ||
    typeof result !== 'object' ||
    Array.isArray(result) ||
    Object.keys(result).length !== 3 ||
    !Object.prototype.hasOwnProperty.call(result, 'cleaned') ||
    !Object.prototype.hasOwnProperty.call(result, 'created') ||
    !Object.prototype.hasOwnProperty.call(result, 'leaked') ||
    !Number.isInteger(result.cleaned) ||
    !Number.isInteger(result.created) ||
    !Number.isInteger(result.leaked) ||
    !['0:0:0', '0:1:1', '1:1:0'].includes(`${result.cleaned}:${result.created}:${result.leaked}`)
  ) {
    throw new Error('The codex-e2e production-data result is invalid; refusing evidence output.');
  }
}

const LEDGER_KEYS = [
  'cleaned',
  'cleanupPrepared',
  'createAttempted',
  'created',
  'id',
  'leaked',
  'marker',
  'state',
  'table',
  'version',
] as const;

const LEDGER_STATE_COUNTERS: Record<
  ProductionLedgerState,
  Pick<
    ProductionDataLedger,
    'cleaned' | 'cleanupPrepared' | 'createAttempted' | 'created' | 'leaked'
  >
> = {
  initial: {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: false,
    created: 0,
    leaked: 0,
  },
  'create-attempted': {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: true,
    created: 0,
    leaked: 0,
  },
  created: {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: true,
    created: 1,
    leaked: 1,
  },
  'cleanup-prepared': {
    cleaned: 0,
    cleanupPrepared: true,
    createAttempted: true,
    created: 1,
    leaked: 1,
  },
  'leak-result': {
    cleaned: 0,
    cleanupPrepared: true,
    createAttempted: true,
    created: 1,
    leaked: 1,
  },
};

const ALLOWED_LEDGER_TRANSITIONS: Record<ProductionLedgerState, readonly ProductionLedgerState[]> =
  {
    initial: ['create-attempted'],
    'create-attempted': ['created', 'cleanup-prepared'],
    created: ['cleanup-prepared'],
    'cleanup-prepared': ['leak-result'],
    'leak-result': [],
  };

function hasExactLedgerKeys(ledger: ProductionDataLedger): boolean {
  return (
    Object.keys(ledger).length === LEDGER_KEYS.length &&
    LEDGER_KEYS.every((key) => Object.prototype.hasOwnProperty.call(ledger, key))
  );
}

function hasValidStateCounters(ledger: ProductionDataLedger): boolean {
  if (!PRODUCTION_LEDGER_STATES.includes(ledger.state)) {
    return false;
  }
  const expected = LEDGER_STATE_COUNTERS[ledger.state];
  return (
    Number.isInteger(ledger.cleaned) &&
    ledger.cleaned >= 0 &&
    Number.isInteger(ledger.created) &&
    ledger.created >= 0 &&
    Number.isInteger(ledger.leaked) &&
    ledger.leaked >= 0 &&
    ledger.cleaned === expected.cleaned &&
    ledger.cleanupPrepared === expected.cleanupPrepared &&
    ledger.createAttempted === expected.createAttempted &&
    ledger.created === expected.created &&
    ledger.leaked === expected.leaked
  );
}

export function assertLedgerScope(ledger: ProductionDataLedger): void {
  if (
    !ledger ||
    typeof ledger !== 'object' ||
    Array.isArray(ledger) ||
    !hasExactLedgerKeys(ledger) ||
    !UUID_PATTERN.test(ledger.id) ||
    typeof ledger.cleanupPrepared !== 'boolean' ||
    typeof ledger.createAttempted !== 'boolean' ||
    !hasValidStateCounters(ledger) ||
    ledger.table !== PROCESS_TABLE ||
    ledger.version !== PROCESS_VERSION ||
    ledger.marker !== `${PRODUCTION_DATA_MARKER_PREFIX}-${ledger.id}`
  ) {
    throw new Error('Refusing production cleanup because the ledger is outside codex-e2e scope.');
  }
}

function hasSameLedgerScope(left: ProductionDataLedger, right: ProductionDataLedger): boolean {
  return (
    left.id === right.id &&
    left.marker === right.marker &&
    left.table === right.table &&
    left.version === right.version
  );
}

function isAllowedLedgerTransition(
  previous: ProductionDataLedger,
  next: ProductionDataLedger,
): boolean {
  return (
    hasSameLedgerScope(previous, next) &&
    ALLOWED_LEDGER_TRANSITIONS[previous.state].includes(next.state)
  );
}

export function reconcileProductionLedgerCopies(
  primary: ProductionDataLedger | undefined,
  recovery: ProductionDataLedger | undefined,
): ProductionDataLedger | undefined {
  if (!primary && !recovery) {
    return undefined;
  }
  if (!primary || !recovery) {
    const survivingCopy = primary ?? recovery!;
    assertLedgerScope(survivingCopy);
    return survivingCopy;
  }
  assertLedgerScope(primary);
  assertLedgerScope(recovery);
  if (hasSameLedgerScope(primary, recovery) && primary.state === recovery.state) {
    return primary;
  }
  if (isAllowedLedgerTransition(primary, recovery)) {
    return recovery;
  }
  if (isAllowedLedgerTransition(recovery, primary)) {
    return primary;
  }
  throw new Error('Primary and recovery codex-e2e ledgers disagree; refusing production work.');
}

export async function persistProductionLedgerCopies(input: {
  next: ProductionDataLedger;
  primary: ProductionDataLedger | undefined;
  recovery: ProductionDataLedger | undefined;
  writePrimary: (ledger: ProductionDataLedger) => Promise<void>;
  writeRecovery: (ledger: ProductionDataLedger) => Promise<void>;
}): Promise<void> {
  const { next, primary, recovery, writePrimary, writeRecovery } = input;
  assertLedgerScope(next);
  const current = reconcileProductionLedgerCopies(primary, recovery);
  if (
    (!current && next.state !== 'initial') ||
    (current &&
      !(
        (hasSameLedgerScope(current, next) && current.state === next.state) ||
        isAllowedLedgerTransition(current, next)
      ))
  ) {
    throw new Error('Refusing a non-adjacent codex-e2e ledger transition.');
  }
  // Recovery is written first. A crash before the primary write therefore leaves either the
  // prior state or one provably adjacent state, both of which reconcile deterministically.
  await writeRecovery(next);
  await writePrimary(next);
}

export function assertLocalProductionWriteEnvironment(environment: NodeJS.ProcessEnv): void {
  if (environment.E2E_BACKEND_TARGET !== 'production') {
    throw new Error('Production-data E2E is only defined for the production backend target.');
  }
  if (environment.CI || environment.GITHUB_ACTIONS) {
    throw new Error('Production-data E2E is forbidden in CI and GitHub Actions.');
  }
  if (environment.E2E_PRODUCTION_WRITE_CONFIRMATION !== LOCAL_PRODUCTION_WRITE_CONFIRMATION) {
    throw new Error(
      'Production-data E2E requires the exact one-run local operator confirmation token.',
    );
  }
}

export function assertProductionDataWriteAuthorization(environment: NodeJS.ProcessEnv): void {
  if (environment.E2E_ALLOW_PRODUCTION_DATA !== 'true') {
    throw new Error('Production-data E2E requires E2E_ALLOW_PRODUCTION_DATA=true.');
  }
  if (environment.E2E_AUTHENTICATED !== 'true') {
    throw new Error('Production-data E2E requires E2E_AUTHENTICATED=true.');
  }
  assertLocalProductionWriteEnvironment(environment);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readDataSetInformation(payload: unknown): Record<string, unknown> | null {
  const root = asRecord(payload);
  const processDataSet = asRecord(root?.processDataSet);
  const processInformation = asRecord(processDataSet?.processInformation);
  return asRecord(processInformation?.dataSetInformation);
}

function readLocalizedElements(value: unknown): Record<string, unknown>[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((element) => asRecord(element))
    .filter((element): element is Record<string, unknown> => element !== null);
}

export function getCodexE2EProcessSynonym(
  ledger: ProductionDataLedger,
  languageCode: (typeof AUTHORING_LANGUAGES)[number],
  stage: ProductionSynonymStage,
): string {
  return `${ledger.marker} synonyms ${stage} ${languageCode}`;
}

export function makeCodexE2EProcessSynonyms(
  ledger: ProductionDataLedger,
  stage: ProductionSynonymStage,
): Array<{ '#text': string; '@xml:lang': (typeof AUTHORING_LANGUAGES)[number] }> {
  return AUTHORING_LANGUAGES.map((languageCode) => ({
    '#text': getCodexE2EProcessSynonym(ledger, languageCode, stage),
    '@xml:lang': languageCode,
  }));
}

function fieldHasExactCodexMarkers(
  dataSetInformation: Record<string, unknown>,
  field: (typeof MULTILINGUAL_PROCESS_FIELDS)[number],
  ledger: ProductionDataLedger,
): boolean {
  const name = asRecord(dataSetInformation.name);
  const fieldValue =
    field === 'generalComment' ? dataSetInformation['common:generalComment'] : name?.[field];
  const elements = readLocalizedElements(fieldValue);
  if (elements.length !== AUTHORING_LANGUAGES.length) {
    return false;
  }
  return AUTHORING_LANGUAGES.every((languageCode) => {
    const matchingElements = elements.filter((element) => element['@xml:lang'] === languageCode);
    return (
      matchingElements.length === 1 &&
      matchingElements[0]['#text'] === `${ledger.marker} ${field} ${languageCode}`
    );
  });
}

function payloadHasExactCodexMarker(payload: unknown, ledger: ProductionDataLedger): boolean {
  const dataSetInformation = readDataSetInformation(payload);
  if (!dataSetInformation || dataSetInformation['common:UUID'] !== ledger.id) {
    return false;
  }
  return MULTILINGUAL_PROCESS_FIELDS.every((field) =>
    fieldHasExactCodexMarkers(dataSetInformation, field, ledger),
  );
}

function payloadHasExactSavedSynonyms(payload: unknown, ledger: ProductionDataLedger): boolean {
  const dataSetInformation = readDataSetInformation(payload);
  if (!dataSetInformation) {
    return false;
  }
  const synonyms = readLocalizedElements(dataSetInformation['common:synonyms']);
  if (synonyms.length !== AUTHORING_LANGUAGES.length) {
    return false;
  }
  return AUTHORING_LANGUAGES.every((languageCode) => {
    const matchingElements = synonyms.filter((element) => element['@xml:lang'] === languageCode);
    return (
      matchingElements.length === 1 &&
      matchingElements[0]['#text'] ===
        getCodexE2EProcessSynonym(ledger, languageCode, 'after-ui-save')
    );
  });
}

export function isExactLedgerControlledProcessSaveDraftBody(
  postData: string | null | undefined,
  ledger: ProductionDataLedger,
): boolean {
  try {
    assertLedgerScope(ledger);
    const body = asRecord(JSON.parse(postData ?? ''));
    if (!body) {
      return false;
    }
    const allowedKeys = new Set([
      'id',
      'jsonOrdered',
      'modelId',
      'ruleVerification',
      'table',
      'version',
    ]);
    if (
      !Object.keys(body).every((key) => allowedKeys.has(key)) ||
      body.id !== ledger.id ||
      body.table !== ledger.table ||
      body.version !== ledger.version ||
      (body.modelId !== undefined && body.modelId !== null) ||
      (typeof body.ruleVerification !== 'boolean' && body.ruleVerification !== null) ||
      !payloadHasExactCodexMarker(body.jsonOrdered, ledger) ||
      !payloadHasExactSavedSynonyms(body.jsonOrdered, ledger)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function assertOwnedCodexRow(
  row: PersistedProcessRow,
  ledger: ProductionDataLedger,
  authenticatedUserId: string,
): void {
  const persistedPayloads = [row.json_ordered, row.json].filter(
    (payload) => payload !== null && payload !== undefined,
  );
  if (
    row.id !== ledger.id ||
    row.user_id !== authenticatedUserId ||
    row.version !== ledger.version ||
    persistedPayloads.length === 0 ||
    !persistedPayloads.every((payload) => payloadHasExactCodexMarker(payload, ledger))
  ) {
    throw new Error(
      'Refusing production cleanup because the persisted row is not an exact owned codex-e2e fixture.',
    );
  }
}

function readDeletedRowFromCommandResponse(value: unknown): PersistedProcessRow {
  if (!value || typeof value !== 'object') {
    throw new Error('codex-e2e cleanup returned no server deletion receipt.');
  }
  const response = value as Record<string, unknown>;
  if (
    response.ok !== true ||
    response.command !== 'dataset_delete' ||
    !response.data ||
    typeof response.data !== 'object'
  ) {
    throw new Error('codex-e2e cleanup returned an invalid server deletion receipt.');
  }
  return response.data as PersistedProcessRow;
}

export async function executeVerifiedCodexCleanup(input: {
  authenticatedUserId: string;
  countRemaining: () => Promise<number>;
  deleteExactVersion: () => Promise<unknown>;
  ledger: ProductionDataLedger;
  prepareCleanup: (preparedLedger: ProductionDataLedger) => Promise<void>;
  rows: PersistedProcessRow[];
}): Promise<ProductionDataResult> {
  const { authenticatedUserId, countRemaining, deleteExactVersion, ledger, prepareCleanup, rows } =
    input;
  assertLedgerScope(ledger);
  const hasUnresolvedCreateAttempt =
    ledger.createAttempted &&
    (ledger.created === 0 || ledger.cleaned < ledger.created || ledger.leaked > 0);
  if (rows.length === 0) {
    if (ledger.cleanupPrepared && ledger.createAttempted) {
      const leaked = await countRemaining();
      if (leaked !== 0) {
        throw new Error(
          'Refusing cleanup reconciliation because the prepared exact UUID is still visible.',
        );
      }
      return { cleaned: ledger.created, created: ledger.created, leaked: 0 };
    }
    if (hasUnresolvedCreateAttempt) {
      throw new Error(
        'Refusing to report cleanup because an attempted create is not visible for marker verification.',
      );
    }
    return { cleaned: ledger.cleaned, created: ledger.created, leaked: 0 };
  }
  if (rows.length > 1) {
    throw new Error('Refusing cleanup because the exact codex-e2e UUID has multiple versions.');
  }
  if (!ledger.createAttempted) {
    throw new Error('Refusing cleanup because the ledger never recorded a create attempt.');
  }

  assertOwnedCodexRow(rows[0], ledger, authenticatedUserId);
  if (!ledger.cleanupPrepared) {
    await prepareCleanup({
      ...ledger,
      cleaned: 0,
      cleanupPrepared: true,
      createAttempted: true,
      created: 1,
      leaked: 1,
      state: 'cleanup-prepared',
    });
  }
  const commandResponse = await deleteExactVersion();
  const deletedRow = readDeletedRowFromCommandResponse(commandResponse);
  assertOwnedCodexRow(deletedRow, ledger, authenticatedUserId);
  const leaked = await countRemaining();
  if (!Number.isInteger(leaked) || leaked < 0 || leaked > 1) {
    throw new Error('Refusing cleanup because the exact UUID count is invalid.');
  }
  return {
    cleaned: leaked === 0 ? 1 : 0,
    created: 1,
    leaked,
  };
}

export const productionDataLedgerSafetyContract = {
  assertLedgerScope,
  assertLocalProductionWriteEnvironment,
  assertProductionDataWriteAuthorization,
  assertOwnedCodexRow,
  assertProductionDataResult,
  executeVerifiedCodexCleanup,
  getCodexE2EProcessSynonym,
  isExactLedgerControlledProcessSaveDraftBody,
  makeCodexE2EProcessSynonyms,
  persistProductionLedgerCopies,
  reconcileProductionLedgerCopies,
};
