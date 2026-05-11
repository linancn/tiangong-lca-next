import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { FunctionRegion } from '@supabase/supabase-js';

import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  patchJsonOrderedWithActiveReferenceSeeds,
} from '../reference-seeds';
import {
  DEFAULT_SOURCE_EXPECTED_PATH,
  DEFAULT_SOURCE_ROLE,
  DEFAULT_USERS_PATH,
  buildCreateExpectations,
  buildPermanentDataSetUri,
  computeSourceRuleVerification,
  deepSortJson,
  evaluateExpectations,
  loadSourceFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  writeRuntimeRecord,
  type ExpectationResult,
  type FrontendProbeResult,
  type RuntimeFixture,
  type SupabaseTarget,
} from './sources-create-workflow-lib';

export const DEFAULT_SOURCE_CREATE_VIEW_COPY_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/sources/001_create_view_copy.json';
export const DEFAULT_SOURCE_CREATE_VIEW_COPY_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/001_create_view_copy.md';

type SupportedFlag =
  | 'create-data-file'
  | 'data-file'
  | 'frontend-url'
  | 'generate-id'
  | 'help'
  | 'keep-created'
  | 'keep-data'
  | 'no-generate-id'
  | 'no-keep-created'
  | 'no-keep-data'
  | 'no-verify-frontend'
  | 'no-write-runtime'
  | 'role'
  | 'runtime-record-file'
  | 'supabase-project-url'
  | 'supabase-publishable-key'
  | 'supabase-url'
  | 'users-file'
  | 'verify-frontend'
  | 'write-runtime';

type SourceWorkflowRecord = {
  id: string;
  json: Record<string, unknown>;
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type DetailSummary = {
  id?: string;
  ruleVerification?: boolean | null;
  success: boolean;
  userId?: string | null;
  version?: string;
};

type CreateStepResult = {
  expectationResults: ExpectationResult[];
  record: SourceWorkflowRecord;
  submittedRuleVerification: boolean;
};

type CopyStepResult = {
  expectationResults: ExpectationResult[];
  record: SourceWorkflowRecord;
  submittedRuleVerification: boolean | null;
};

type ViewStepResult = {
  detail: DetailSummary;
  expectationResults: ExpectationResult[];
};

type LoadedWorkflowModules = {
  sourcesApi: {
    createSource: (
      id: string,
      data: any,
    ) => Promise<{
      count: number | null;
      data: unknown;
      error: { message?: string } | null;
      status: number;
      statusText: string;
    }>;
    getSourceDetail: (
      id: string,
      version: string,
    ) => Promise<{
      data?: {
        id?: string;
        json?: Record<string, unknown> | null;
        ruleVerification?: boolean;
        userId?: string;
        version?: string;
      } | null;
      success?: boolean;
    }>;
  };
  sourcesUtil: {
    genSourceFromData: (data: any) => any;
  };
  supabase: SupabaseClient;
};

type ExpectationSection = 'viewSource' | 'copy' | 'viewCopy';

type ExpectationKey =
  | 'viewSource.detailSuccess'
  | 'viewSource.idMatchesCreate'
  | 'viewSource.version'
  | 'viewSource.jsonMatchesDatabase'
  | 'copy.rowExists'
  | 'copy.idDiffersFromSource'
  | 'copy.version'
  | 'copy.stateCode'
  | 'copy.userIdMatchesCurrentUser'
  | 'copy.teamIdNull'
  | 'copy.ruleVerificationMatchesSubmitted'
  | 'copy.sameContentExceptUuidTimestampPermanentUri'
  | 'copy.uuidMatchesCopiedId'
  | 'copy.permanentUriMatchesCopiedIdAndVersion'
  | 'viewCopy.detailSuccess'
  | 'viewCopy.idMatchesCopy'
  | 'viewCopy.version'
  | 'viewCopy.jsonMatchesDatabase';

type ParsedWorkflowExpectation = {
  expected: boolean | number | string | null;
  key: ExpectationKey;
  label: string;
};

type WorkflowActuals = Record<ExpectationKey, boolean | number | string | null>;

type CreatedRecordRef = {
  id: string;
  version: string;
};

type CopySummary = {
  comparableJsonMatchesSource: boolean;
  copiedId: string;
  copiedVersion: string;
  submittedRuleVerification: boolean | null;
};

export type SourceCreateViewCopyCliOptions = {
  createDataFile: string;
  createExpectedFile: string;
  followUpExpectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  keepData: boolean;
  role: string;
  runtimeRecordFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  usersFile: string;
  verifyFrontend: boolean;
  writeRuntime: boolean;
};

export type SourceCreateViewCopyResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  copy: CopySummary;
  copyStep: CopyStepResult;
  createStep: CreateStepResult;
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  runtimeFixture: RuntimeFixture;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  sourceViewStep: ViewStepResult;
  supabaseTarget: SupabaseTarget;
  viewCopyStep: ViewStepResult;
};

type StepRuntimeRecord = {
  expectationResults: ExpectationResult[];
  persistedRecord: Omit<SourceWorkflowRecord, 'json' | 'json_ordered'>;
  submittedRuleVerification: boolean | null;
};

export type SourceCreateViewCopyRuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  copy: StepRuntimeRecord & {
    expectedFile: string;
    summary: CopySummary;
  };
  create: StepRuntimeRecord & {
    expectedFile: string;
    fixtureFile: string;
    runtimeId: string;
    sourceFixtureId: string;
  };
  createdAt: string;
  frontendProbe: FrontendProbeResult;
  frontendUrl?: string;
  keepData: boolean;
  passed: boolean;
  role: string;
  sourceView: {
    detail: DetailSummary;
    expectedFile: string;
    expectationResults: ExpectationResult[];
  };
  supabase: {
    apiUrl: string;
    dashboardUrl?: string;
    projectId?: string;
  };
  user: {
    email: string;
    userId: string;
  };
  viewCopy: {
    detail: DetailSummary;
    expectedFile: string;
    expectationResults: ExpectationResult[];
  };
};

export type SourceCreateViewCopyDependencies = {
  computeCreateRuleVerificationFn?: (jsonOrdered: Record<string, any>) => Promise<boolean>;
  frontendFetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedWorkflowModules>;
};

const SOURCE_UUID_PATH = [
  'sourceDataSet',
  'sourceInformation',
  'dataSetInformation',
  'common:UUID',
] as const;
const SOURCE_TIMESTAMP_PATH = [
  'sourceDataSet',
  'administrativeInformation',
  'dataEntryBy',
  'common:timeStamp',
] as const;
const SOURCE_PERMANENT_URI_PATH = [
  'sourceDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:permanentDataSetURI',
] as const;
const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);
const EXPECTATION_KEYS = new Set<ExpectationKey>([
  'viewSource.detailSuccess',
  'viewSource.idMatchesCreate',
  'viewSource.version',
  'viewSource.jsonMatchesDatabase',
  'copy.rowExists',
  'copy.idDiffersFromSource',
  'copy.version',
  'copy.stateCode',
  'copy.userIdMatchesCurrentUser',
  'copy.teamIdNull',
  'copy.ruleVerificationMatchesSubmitted',
  'copy.sameContentExceptUuidTimestampPermanentUri',
  'copy.uuidMatchesCopiedId',
  'copy.permanentUriMatchesCopiedIdAndVersion',
  'viewCopy.detailSuccess',
  'viewCopy.idMatchesCopy',
  'viewCopy.version',
  'viewCopy.jsonMatchesDatabase',
]);

export const SOURCE_CREATE_VIEW_COPY_DATA_WORKFLOW_HELP = `Source create-view-copy data workflow

Usage:
  npm run test:workflows -- --sources:create-view-copy --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:workflows -- --sources:create-view-copy --role admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Workflow:
  1. Create one source from tests/data-workflows/fixtures/data/sources/001_create_view_copy.json
  2. View the created source through getSourceDetail
  3. Copy that source through the real createSource flow
  4. View the copied source through getSourceDetail

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/sources/001_create_view_copy.json
  --data-file <path>               Alias of --create-data-file
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep both source and copied sources after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the workflow sources after validation
  --no-keep-created                Alias of --no-keep-data
  --generate-id                    Replace the create fixture UUID with a fresh runtime UUID (default)
  --no-generate-id                 Reuse the create fixture UUID from the file as-is
  --write-runtime                  Write this run's runtime record to a file (default)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before running the workflow (default)
  --no-verify-frontend             Skip the frontend fetch probe
  --help                           Show this help text

Environment fallback:
  .env.users.local
  SUPABASE_URL
  SUPABASE_PUBLISHABLE_KEY
  TEST_USERS_JSON
  TEST_<ROLE>_EMAIL
  TEST_<ROLE>_PASSWORD
`;

export function parseCreateViewCopyCliArgs(
  argv: string[],
  cwd = process.cwd(),
): SourceCreateViewCopyCliOptions {
  let runtimeRecordFileExplicit = false;
  const defaultFollowUpExpectedFile = path.resolve(
    cwd,
    DEFAULT_SOURCE_CREATE_VIEW_COPY_EXPECTED_PATH,
  );
  const options: SourceCreateViewCopyCliOptions = {
    createDataFile: path.resolve(cwd, DEFAULT_SOURCE_CREATE_VIEW_COPY_FIXTURE_PATH),
    createExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_EXPECTED_PATH),
    followUpExpectedFile: defaultFollowUpExpectedFile,
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_SOURCE_ROLE,
    runtimeRecordFile: resolveCreateViewCopyRuntimeRecordFilePath(defaultFollowUpExpectedFile, cwd),
    usersFile: path.resolve(cwd, DEFAULT_USERS_PATH),
    verifyFrontend: true,
    writeRuntime: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      throw new Error(`Unsupported positional argument: ${arg}`);
    }

    const [rawFlag, inlineValue] = splitFlag(arg);
    const flag = rawFlag as SupportedFlag;

    switch (flag) {
      case 'help':
        options.help = true;
        break;
      case 'keep-created':
      case 'keep-data':
        options.keepData =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'keep-data');
        break;
      case 'no-keep-created':
      case 'no-keep-data':
        options.keepData = false;
        break;
      case 'generate-id':
        options.generateId =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'generate-id');
        break;
      case 'no-generate-id':
        options.generateId = false;
        break;
      case 'verify-frontend':
        options.verifyFrontend =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'verify-frontend');
        break;
      case 'no-verify-frontend':
        options.verifyFrontend = false;
        break;
      case 'write-runtime':
        options.writeRuntime =
          inlineValue === undefined ? true : parseBoolean(inlineValue, 'write-runtime');
        break;
      case 'no-write-runtime':
        options.writeRuntime = false;
        break;
      case 'role':
        options.role = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'frontend-url':
        options.frontendUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-url':
        options.supabaseUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = requireFlagValue(flag, inlineValue, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'create-data-file':
      case 'data-file':
        options.createDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'users-file':
        options.usersFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        runtimeRecordFileExplicit = true;
        options.writeRuntime = true;
        break;
      default:
        throw new Error(`Unknown flag: --${flag}`);
    }
  }

  if (!runtimeRecordFileExplicit) {
    options.runtimeRecordFile = resolveCreateViewCopyRuntimeRecordFilePath(
      options.followUpExpectedFile,
      cwd,
    );
  }

  return options;
}

export function resolveCreateViewCopyRuntimeRecordFilePath(seedFile: string, cwd = process.cwd()) {
  const absoluteSeedFile = path.resolve(cwd, seedFile);
  const relativeSeedFile = path.relative(cwd, absoluteSeedFile);
  const relativeSegments = relativeSeedFile.split(path.sep);
  const parsed = path.parse(absoluteSeedFile);
  const recordFilename = `${parsed.name}.last-run.json`;
  const dataWorkflowFixtureIndex = relativeSegments.findIndex(
    (segment, index) =>
      segment === 'tests' &&
      relativeSegments[index + 1] === 'data-workflows' &&
      relativeSegments[index + 2] === 'fixtures' &&
      (relativeSegments[index + 3] === 'data' || relativeSegments[index + 3] === 'result'),
  );

  if (dataWorkflowFixtureIndex !== -1) {
    return path.resolve(
      cwd,
      ...relativeSegments.slice(0, dataWorkflowFixtureIndex),
      'tests',
      'data-workflows',
      'runtime',
      ...relativeSegments.slice(dataWorkflowFixtureIndex + 4, -1),
      recordFilename,
    );
  }

  return path.join(parsed.dir, recordFilename);
}

export function buildCreateViewCopyExpectations(): ParsedWorkflowExpectation[] {
  return [
    buildExpectation('viewSource.detailSuccess', true, 'View source detail succeeds'),
    buildExpectation('viewSource.idMatchesCreate', true, 'View source id matches created record'),
    buildExpectation('viewSource.version', '01.01.000', 'View source version is 01.01.000'),
    buildExpectation(
      'viewSource.jsonMatchesDatabase',
      true,
      'View source json matches database json',
    ),
    buildExpectation('copy.rowExists', true, 'Copied row exists'),
    buildExpectation('copy.idDiffersFromSource', true, 'Copied id differs from source id'),
    buildExpectation('copy.version', '01.01.000', 'Copied version is 01.01.000'),
    buildExpectation('copy.stateCode', 0, 'Copied state_code is 0'),
    buildExpectation('copy.userIdMatchesCurrentUser', true, 'Copied user_id matches current user'),
    buildExpectation('copy.teamIdNull', true, 'Copied team_id is null'),
    buildExpectation(
      'copy.ruleVerificationMatchesSubmitted',
      true,
      'Copied rule_verification matches submitted value',
    ),
    buildExpectation(
      'copy.sameContentExceptUuidTimestampPermanentUri',
      true,
      'Copied json_ordered matches source except generated identity fields',
    ),
    buildExpectation(
      'copy.uuidMatchesCopiedId',
      true,
      'Copied json_ordered UUID matches copied id',
    ),
    buildExpectation(
      'copy.permanentUriMatchesCopiedIdAndVersion',
      true,
      'Copied permanentDataSetURI matches copied id and version',
    ),
    buildExpectation('viewCopy.detailSuccess', true, 'View copy detail succeeds'),
    buildExpectation('viewCopy.idMatchesCopy', true, 'View copy id matches copied record'),
    buildExpectation('viewCopy.version', '01.01.000', 'View copy version is 01.01.000'),
    buildExpectation('viewCopy.jsonMatchesDatabase', true, 'View copy json matches database json'),
  ];
}

export function evaluateCreateViewCopyExpectations(
  actuals: WorkflowActuals,
  expectations: ParsedWorkflowExpectation[],
): ExpectationResult[] {
  return expectations.map((expectation) => ({
    actual: actuals[expectation.key],
    expected: expectation.expected,
    label: expectation.label,
    passed: actuals[expectation.key] === expectation.expected,
  }));
}

function removeEmptyStructuresForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    const normalizedItems = value
      .map((item) => removeEmptyStructuresForComparison(item))
      .filter((item) => item !== undefined);

    return normalizedItems.length > 0 ? normalizedItems : undefined;
  }

  if (value && typeof value === 'object') {
    const normalizedEntries = Object.entries(value).reduce<Record<string, unknown>>(
      (accumulator, [key, nestedValue]) => {
        const normalizedValue = removeEmptyStructuresForComparison(nestedValue);

        if (normalizedValue !== undefined) {
          accumulator[key] = normalizedValue;
        }

        return accumulator;
      },
      {},
    );

    return Object.keys(normalizedEntries).length > 0 ? normalizedEntries : undefined;
  }

  return value;
}

export function normalizeJsonForCopyComparison(jsonOrdered: Record<string, unknown>) {
  const clonedJson = deepClone(jsonOrdered);
  deleteNestedValue(clonedJson, SOURCE_UUID_PATH);
  deleteNestedValue(clonedJson, SOURCE_TIMESTAMP_PATH);
  deleteNestedValue(clonedJson, SOURCE_PERMANENT_URI_PATH);
  return deepSortJson(removeEmptyStructuresForComparison(clonedJson) ?? {});
}

export function buildSourceCreateViewCopyRuntimeRecord(
  options: Pick<
    SourceCreateViewCopyCliOptions,
    'createDataFile' | 'createExpectedFile' | 'followUpExpectedFile' | 'frontendUrl' | 'keepData'
  >,
  result: Pick<
    SourceCreateViewCopyResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'copy'
    | 'copyStep'
    | 'createStep'
    | 'frontendProbe'
    | 'runtimeFixture'
    | 'selectedUser'
    | 'sourceViewStep'
    | 'supabaseTarget'
    | 'viewCopyStep'
  > & { passed: boolean },
): SourceCreateViewCopyRuntimeRecord {
  const {
    json: _createJson,
    json_ordered: _createJsonOrdered,
    ...createPersistedRecord
  } = result.createStep.record;
  const {
    json: _copyJson,
    json_ordered: _copyJsonOrdered,
    ...copyPersistedRecord
  } = result.copyStep.record;

  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    copy: {
      expectationResults: result.copyStep.expectationResults,
      expectedFile: options.followUpExpectedFile,
      persistedRecord: copyPersistedRecord,
      submittedRuleVerification: result.copyStep.submittedRuleVerification,
      summary: result.copy,
    },
    create: {
      expectationResults: result.createStep.expectationResults,
      expectedFile: options.createExpectedFile,
      fixtureFile: options.createDataFile,
      persistedRecord: createPersistedRecord,
      runtimeId: result.runtimeFixture.runtimeId,
      sourceFixtureId: result.runtimeFixture.sourceFixtureId,
      submittedRuleVerification: result.createStep.submittedRuleVerification,
    },
    createdAt: new Date().toISOString(),
    frontendProbe: result.frontendProbe,
    frontendUrl: options.frontendUrl,
    keepData: options.keepData,
    passed: result.passed,
    role: result.selectedUser.role,
    sourceView: {
      detail: result.sourceViewStep.detail,
      expectedFile: options.followUpExpectedFile,
      expectationResults: result.sourceViewStep.expectationResults,
    },
    supabase: {
      apiUrl: result.supabaseTarget.apiUrl,
      dashboardUrl: result.supabaseTarget.dashboardUrl,
      projectId: result.supabaseTarget.projectId,
    },
    user: {
      email: result.selectedUser.email,
      userId: result.selectedUser.userId,
    },
    viewCopy: {
      detail: result.viewCopyStep.detail,
      expectedFile: options.followUpExpectedFile,
      expectationResults: result.viewCopyStep.expectationResults,
    },
  };
}

export async function runSourceCreateViewCopySmoke(
  options: SourceCreateViewCopyCliOptions,
  dependencies: SourceCreateViewCopyDependencies = {},
): Promise<SourceCreateViewCopyResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadSourceFixture(options.createDataFile), {
    generateId: options.generateId,
    generateIdFn: dependencies.generateIdFn,
  });
  const createExpectations = buildCreateExpectations({ labelPrefix: 'Create' });
  const followUpExpectations = buildCreateViewCopyExpectations();
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);

  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.frontendFetchImpl)
      : { ok: true, skipped: true };

  const modules = await (dependencies.modulesLoader ?? loadWorkflowModules)(supabaseTarget);

  const signInResult = await modules.supabase.auth.signInWithPassword({
    email: selectedCredential.email,
    password: selectedCredential.password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed to sign in with role "${selectedCredential.role}": ${signInResult.error?.message ?? 'missing session'}`,
    );
  }

  const accessToken = signInResult.data.session.access_token;
  const selectedUser = {
    email: selectedCredential.email,
    role: selectedCredential.role,
    userId: signInResult.data.user.id,
  };

  await activateReferenceSeedsForSmoke({
    accessToken,
    currentUserId: selectedUser.userId,
    requiredSeeds: getReferenceSeedKeysForTable('sources'),
    supabase: modules.supabase,
  });
  patchJsonOrderedWithActiveReferenceSeeds(runtimeFixture.fixture.jsonOrdered, {
    currentDataset: {
      id: runtimeFixture.runtimeId,
      table: 'sources',
    },
  });

  let cleanupAttempted = false;
  let cleanupPassed = true;
  const createdRecords: CreatedRecordRef[] = [];

  try {
    const submittedCreateRuleVerification = await (
      dependencies.computeCreateRuleVerificationFn ?? computeSourceRuleVerification
    )(runtimeFixture.fixture.jsonOrdered);

    const createResult = await modules.supabase.functions.invoke('app_dataset_create', {
      body: {
        id: runtimeFixture.runtimeId,
        jsonOrdered: runtimeFixture.fixture.jsonOrdered,
        ruleVerification: submittedCreateRuleVerification,
        table: runtimeFixture.fixture.table,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (createResult.error) {
      const duplicateHint =
        createResult.error.message.includes('duplicate') ||
        createResult.error.message.includes('23505')
          ? ' Try re-enabling runtime id generation or remove the kept fixture data before re-running.'
          : '';
      throw new Error(`Create source failed: ${createResult.error.message}.${duplicateHint}`);
    }

    const createdRecord = await querySourceRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      runtimeFixture.version,
    );
    createdRecords.push({
      id: createdRecord.id,
      version: createdRecord.version,
    });

    const createExpectationResults = evaluateExpectations({
      currentUserId: selectedUser.userId,
      expectations: createExpectations,
      record: createdRecord,
      uploadedJsonOrdered: runtimeFixture.fixture.jsonOrdered,
    });

    const sourceDetailResponse = await modules.sourcesApi.getSourceDetail(
      createdRecord.id,
      createdRecord.version,
    );

    if (!sourceDetailResponse?.success || !sourceDetailResponse.data?.json) {
      throw new Error('View source failed: getSourceDetail returned no data.');
    }

    const sourceFormData = modules.sourcesUtil.genSourceFromData(
      (sourceDetailResponse.data.json as Record<string, any>)?.sourceDataSet ?? {},
    );

    if (!sourceFormData) {
      throw new Error('Failed to derive source form data from the viewed source detail.');
    }

    const copiedId = (dependencies.generateIdFn ?? randomUUID)();
    if (copiedId === createdRecord.id) {
      throw new Error('Copy source failed: generated id matches the source id.');
    }

    const copyCreateResult = await modules.sourcesApi.createSource(copiedId, sourceFormData);
    if (copyCreateResult.error) {
      throw new Error(`Copy source failed: ${copyCreateResult.error.message ?? 'unknown error'}`);
    }

    const submittedCopyRuleVerification = extractMutationRuleVerification(copyCreateResult.data);
    const copiedVersion = extractMutationVersion(copyCreateResult.data) ?? createdRecord.version;
    const copiedRecord = await querySourceRecord(modules.supabase, copiedId, copiedVersion);
    createdRecords.push({
      id: copiedRecord.id,
      version: copiedRecord.version,
    });

    const copiedDetailResponse = await modules.sourcesApi.getSourceDetail(
      copiedRecord.id,
      copiedRecord.version,
    );

    if (!copiedDetailResponse?.success || !copiedDetailResponse.data?.json) {
      throw new Error('View copied source failed: getSourceDetail returned no data.');
    }

    const comparableSourceJson = normalizeJsonForCopyComparison(createdRecord.json_ordered);
    const comparableCopiedJson = normalizeJsonForCopyComparison(copiedRecord.json_ordered);
    const comparableJsonMatchesSource =
      JSON.stringify(comparableSourceJson) === JSON.stringify(comparableCopiedJson);

    const actuals: WorkflowActuals = {
      'viewSource.detailSuccess': Boolean(
        sourceDetailResponse.success && sourceDetailResponse.data,
      ),
      'viewSource.idMatchesCreate': sourceDetailResponse.data?.id === createdRecord.id,
      'viewSource.version': sourceDetailResponse.data?.version ?? null,
      'viewSource.jsonMatchesDatabase':
        JSON.stringify(deepSortJson(sourceDetailResponse.data?.json ?? null)) ===
        JSON.stringify(deepSortJson(createdRecord.json ?? null)),
      'copy.rowExists': Boolean(copiedRecord.id),
      'copy.idDiffersFromSource': copiedRecord.id !== createdRecord.id,
      'copy.version': copiedRecord.version,
      'copy.stateCode': copiedRecord.state_code,
      'copy.userIdMatchesCurrentUser': copiedRecord.user_id === selectedUser.userId,
      'copy.teamIdNull': copiedRecord.team_id === null,
      'copy.ruleVerificationMatchesSubmitted':
        submittedCopyRuleVerification !== null &&
        copiedRecord.rule_verification === submittedCopyRuleVerification,
      'copy.sameContentExceptUuidTimestampPermanentUri': comparableJsonMatchesSource,
      'copy.uuidMatchesCopiedId':
        getNestedValue(copiedRecord.json_ordered as Record<string, any>, SOURCE_UUID_PATH) ===
        copiedId,
      'copy.permanentUriMatchesCopiedIdAndVersion':
        extractPermanentDataSetUri(copiedRecord.json_ordered) ===
        buildPermanentDataSetUri(copiedId, copiedRecord.version),
      'viewCopy.detailSuccess': Boolean(copiedDetailResponse.success && copiedDetailResponse.data),
      'viewCopy.idMatchesCopy': copiedDetailResponse.data?.id === copiedRecord.id,
      'viewCopy.version': copiedDetailResponse.data?.version ?? null,
      'viewCopy.jsonMatchesDatabase':
        JSON.stringify(deepSortJson(copiedDetailResponse.data?.json ?? null)) ===
        JSON.stringify(deepSortJson(copiedRecord.json ?? null)),
    };

    const followUpExpectationResults = evaluateCreateViewCopyExpectations(
      actuals,
      followUpExpectations,
    );

    const createStep: CreateStepResult = {
      expectationResults: createExpectationResults,
      record: createdRecord,
      submittedRuleVerification: submittedCreateRuleVerification,
    };
    const sourceViewStep: ViewStepResult = {
      detail: toDetailSummary(sourceDetailResponse),
      expectationResults: filterExpectationResultsBySection(
        followUpExpectationResults,
        followUpExpectations,
        'viewSource.',
      ),
    };
    const copyStep: CopyStepResult = {
      expectationResults: filterExpectationResultsBySection(
        followUpExpectationResults,
        followUpExpectations,
        'copy.',
      ),
      record: copiedRecord,
      submittedRuleVerification: submittedCopyRuleVerification,
    };
    const viewCopyStep: ViewStepResult = {
      detail: toDetailSummary(copiedDetailResponse),
      expectationResults: filterExpectationResultsBySection(
        followUpExpectationResults,
        followUpExpectations,
        'viewCopy.',
      ),
    };

    if (!options.keepData) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedSources(modules.supabase, accessToken, createdRecords);
    }

    const copy: CopySummary = {
      comparableJsonMatchesSource,
      copiedId,
      copiedVersion: copiedRecord.version,
      submittedRuleVerification: submittedCopyRuleVerification,
    };

    const passed =
      createExpectationResults.every((expectation) => expectation.passed) &&
      followUpExpectationResults.every((expectation) => expectation.passed) &&
      cleanupPassed;

    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildSourceCreateViewCopyRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        copy,
        copyStep,
        createStep,
        frontendProbe,
        passed,
        runtimeFixture,
        selectedUser,
        sourceViewStep,
        supabaseTarget,
        viewCopyStep,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      copy,
      copyStep,
      createStep,
      frontendProbe,
      passed,
      runtimeFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      selectedUser,
      sourceViewStep,
      supabaseTarget,
      viewCopyStep,
    };
  } catch (error) {
    if (!options.keepData && createdRecords.length > 0) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedSources(modules.supabase, accessToken, createdRecords);
    }

    if (error instanceof Error && cleanupAttempted && !cleanupPassed) {
      throw new Error(`${error.message} Cleanup also failed.`);
    }

    throw error;
  } finally {
    clearActiveReferenceSeeds();
    await modules.supabase.auth.signOut();
  }
}

function buildExpectation(
  key: ExpectationKey,
  expected: boolean | number | string | null,
  label: string,
): ParsedWorkflowExpectation {
  if (!EXPECTATION_KEYS.has(key)) {
    throw new Error(`Unsupported expectation key: ${key}`);
  }

  return {
    expected,
    key,
    label,
  };
}

function splitFlag(arg: string): [string, string | undefined] {
  const withoutPrefix = arg.slice(2);
  const equalsIndex = withoutPrefix.indexOf('=');

  if (equalsIndex === -1) {
    return [withoutPrefix, undefined];
  }

  return [withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1)];
}

function requireFlagValue(
  flag: string,
  inlineValue: string | undefined,
  readNextValue: () => string | undefined,
) {
  if (inlineValue !== undefined) {
    return inlineValue;
  }

  const nextValue = readNextValue();
  if (!nextValue || nextValue.startsWith('--')) {
    throw new Error(`Missing value for --${flag}`);
  }

  return nextValue;
}

function parseBoolean(value: string, flag: string) {
  const normalized = value.trim().toLowerCase();
  if (TRUE_LITERALS.has(normalized)) {
    return true;
  }
  if (FALSE_LITERALS.has(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value for --${flag}: ${value}`);
}

async function querySourceRecord(
  supabase: SupabaseClient,
  id: string,
  version: string,
): Promise<SourceWorkflowRecord> {
  const result = await supabase
    .from('sources')
    .select('id,json,json_ordered,user_id,state_code,version,team_id,rule_verification,reviews')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle<SourceWorkflowRecord>();

  if (result.error || !result.data) {
    throw new Error(
      `Failed to query source by id/version: ${result.error?.message ?? 'record not found'}`,
    );
  }

  return result.data;
}

async function loadWorkflowModules(supabaseTarget: SupabaseTarget): Promise<LoadedWorkflowModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const sourcesApiModule = await import('../../../../src/services/sources/api');
  const sourcesUtilModule = await import('../../../../src/services/sources/util');

  const supabaseExports = extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule);
  const sourcesApiExports =
    extractModuleExports<LoadedWorkflowModules['sourcesApi']>(sourcesApiModule);
  const sourcesUtilExports =
    extractModuleExports<LoadedWorkflowModules['sourcesUtil']>(sourcesUtilModule);

  return {
    sourcesApi: {
      createSource: sourcesApiExports.createSource,
      getSourceDetail: sourcesApiExports.getSourceDetail,
    },
    sourcesUtil: {
      genSourceFromData: sourcesUtilExports.genSourceFromData,
    },
    supabase: supabaseExports.supabase,
  };
}

function extractModuleExports<T>(moduleValue: Record<string, unknown>) {
  return ((moduleValue['module.exports'] as T | undefined) ??
    (moduleValue.default as T | undefined) ??
    (moduleValue as T)) as T;
}

function filterExpectationResultsBySection(
  expectationResults: ExpectationResult[],
  expectations: ParsedWorkflowExpectation[],
  prefix: `${ExpectationSection}.`,
) {
  return expectationResults.filter((_expectation, index) =>
    expectations[index]?.key.startsWith(prefix),
  );
}

function toDetailSummary(detailResponse: {
  data?: {
    id?: string;
    ruleVerification?: boolean;
    userId?: string;
    version?: string;
  } | null;
  success?: boolean;
}): DetailSummary {
  return {
    id: detailResponse.data?.id,
    ruleVerification: detailResponse.data?.ruleVerification,
    success: Boolean(detailResponse.success && detailResponse.data),
    userId: detailResponse.data?.userId,
    version: detailResponse.data?.version,
  };
}

function extractMutationRuleVerification(data: unknown): boolean | null {
  const row = extractFirstMutationRow(data);
  return typeof row?.rule_verification === 'boolean' ? row.rule_verification : null;
}

function extractMutationVersion(data: unknown): string | null {
  const row = extractFirstMutationRow(data);
  return typeof row?.version === 'string' ? row.version : null;
}

function extractFirstMutationRow(data: unknown): Record<string, unknown> | null {
  const payload =
    data && typeof data === 'object' && !Array.isArray(data) && 'data' in data
      ? (data as Record<string, unknown>).data
      : data;

  if (Array.isArray(payload)) {
    const firstRow = payload[0];
    return firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)
      ? (firstRow as Record<string, unknown>)
      : null;
  }

  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;
}

function extractPermanentDataSetUri(jsonOrdered: Record<string, unknown>) {
  const uri = getNestedValue(jsonOrdered, SOURCE_PERMANENT_URI_PATH);
  return typeof uri === 'string' ? uri : undefined;
}

async function cleanupCreatedSources(
  supabase: SupabaseClient,
  accessToken: string,
  createdRecords: CreatedRecordRef[],
) {
  const uniqueRecords = Array.from(
    new Map(createdRecords.map((record) => [`${record.id}:${record.version}`, record])).values(),
  ).reverse();
  let cleanupPassed = true;

  for (const record of uniqueRecords) {
    const deleteResult = await supabase.functions.invoke('app_dataset_delete', {
      body: {
        id: record.id,
        table: 'sources',
        version: record.version,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (deleteResult.error) {
      cleanupPassed = false;
    }
  }

  return cleanupPassed;
}

function deleteNestedValue(source: Record<string, unknown>, keys: readonly string[]) {
  if (keys.length === 0) {
    return;
  }

  const parent = keys.slice(0, -1).reduce<Record<string, unknown> | undefined>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    const next = current[key];
    return next && typeof next === 'object' && !Array.isArray(next)
      ? (next as Record<string, unknown>)
      : undefined;
  }, source);

  if (!parent || typeof parent !== 'object') {
    return;
  }

  delete parent[keys[keys.length - 1] as keyof typeof parent];
}

function getNestedValue(source: Record<string, any>, keys: readonly string[]) {
  return keys.reduce<any>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return current[key];
  }, source);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
