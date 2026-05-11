import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';
import { FunctionRegion } from '@supabase/supabase-js';

import {
  DEFAULT_PROCESS_CHECK_DATA_FIXTURE_PATH,
  getFixtureOrderedJson,
  loadProcessCheckDataFixture,
} from '../processes/processes-check-data-workflow-lib';
import {
  computeProcessRuleVerification,
  prepareProcessJsonOrderedForRuntime,
} from '../processes/processes-create-workflow-lib';
import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  patchJsonOrderedWithActiveReferenceSeeds,
} from '../reference-seeds';
import {
  buildDataWorkflowHelpText,
  deepClone,
  evaluateStructuredExpectations,
  extractDetailResultFlag,
  loadUsersConfig,
  normalizeSupabaseTarget,
  parseBoolean,
  pickCredentialByRole,
  pollUntil,
  printCompactSmokeSummary,
  readJsonFile,
  requireFlagValue,
  resolveRuntimeRecordFilePath,
  shouldPrintDetailedResult,
  splitFlag,
  writeRuntimeRecord,
  type FrontendProbeResult,
  type StructuredExpectation,
  type StructuredExpectationResult,
  type SupabaseTarget,
} from '../workflow-shared';

export const DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/001_create.json';
export const DEFAULT_LIFECYCLEMODEL_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/001_create.md';
export const DEFAULT_LIFECYCLEMODEL_CHECK_DATA_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/002_check_data_success.json';
export const DEFAULT_LIFECYCLEMODEL_CHECK_DATA_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/002_check_data_success.md';
export const DEFAULT_LIFECYCLEMODEL_EDIT_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/003_edit_data_validate_false.json';
export const DEFAULT_LIFECYCLEMODEL_EDIT_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/003_edit_data_validate_false.md';
export const DEFAULT_LIFECYCLEMODEL_CREATE_VIEW_COPY_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/001_create_view_copy.json';
export const DEFAULT_LIFECYCLEMODEL_CREATE_VIEW_COPY_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/001_create_view_copy.md';
export const DEFAULT_LIFECYCLEMODEL_CREATE_VERSION_UPDATE_REFERENCE_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/004_create_version_update_reference.json';
export const DEFAULT_LIFECYCLEMODEL_CREATE_VERSION_UPDATE_REFERENCE_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/004_create_version_update_reference.md';
export const DEFAULT_LIFECYCLEMODEL_CREATE_CONTRIBUTE_TEAM_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/005_create_contribute_team.json';
export const DEFAULT_LIFECYCLEMODEL_CREATE_CONTRIBUTE_TEAM_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/005_create_contribute_team.md';
export const DEFAULT_LIFECYCLEMODEL_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/lifeCycleModels/007_full_text_search.json';
export const DEFAULT_LIFECYCLEMODEL_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/lifeCycleModels/007_full_text_search.md';

export const DEFAULT_LIFECYCLEMODEL_ROLE = 'user';
export const DEFAULT_LIFECYCLEMODEL_TEAM_ROLE = 'team-member';
export const DEFAULT_USERS_PATH = 'tests/data-workflows/fixtures/data/users.json';
export const DEFAULT_SEED_PROCESS_FIXTURE_PATH = DEFAULT_PROCESS_CHECK_DATA_FIXTURE_PATH;

const MODEL_ID_PLACEHOLDER = '__RUNTIME_MODEL_ID__';
const MODEL_COPY_ID_PLACEHOLDER = '__RUNTIME_MODEL_COPY_ID__';
const PRIMARY_PROCESS_ID_PLACEHOLDER = '__RUNTIME_PRIMARY_PROCESS_ID__';
const PRIMARY_PROCESS_VERSION_PLACEHOLDER = '__RUNTIME_PRIMARY_PROCESS_VERSION__';
const LIFECYCLEMODEL_PERMANENT_URI_BASE =
  'https://lcdn.tiangong.earth/datasetdetail/lifecyclemodel.xhtml';
const LIFECYCLEMODEL_UUID_PATH = [
  'lifeCycleModelDataSet',
  'lifeCycleModelInformation',
  'dataSetInformation',
  'common:UUID',
] as const;
const LIFECYCLEMODEL_VERSION_PATH = [
  'lifeCycleModelDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:dataSetVersion',
] as const;
const LIFECYCLEMODEL_PERMANENT_URI_PATH = [
  'lifeCycleModelDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:permanentDataSetURI',
] as const;

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
  | 'seed-process-data-file'
  | 'supabase-project-url'
  | 'supabase-publishable-key'
  | 'supabase-url'
  | 'users-file'
  | 'verify-frontend'
  | 'write-runtime';

export type LifeCycleModelWorkflowKind =
  | 'check-data'
  | 'create'
  | 'create-contribute-team'
  | 'create-version-update-reference'
  | 'create-view-copy'
  | 'edit'
  | 'full-text-search';

export type LifeCycleModelWorkflowConfig = {
  command: string;
  dataType: string;
  defaultCreateDataFile?: string;
  defaultDataFile: string;
  defaultExpectedFile: string;
  defaultRole?: string;
  helpTitle: string;
  kind: LifeCycleModelWorkflowKind;
};

export type LifeCycleModelCliOptions = {
  createDataFile?: string;
  dataFile: string;
  expectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  keepData: boolean;
  role: string;
  runtimeRecordFile: string;
  seedProcessDataFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  usersFile: string;
  verifyFrontend: boolean;
  writeRuntime: boolean;
};

export type LifeCycleModelFixture = {
  id: string;
  payload: Record<string, any>;
  searchKeyword?: string;
  table?: 'lifecyclemodels';
};

export type RuntimeLifeCycleModelFixture = {
  copyId: string;
  fixture: LifeCycleModelFixture;
  runtimeId: string;
  sourceFixtureId: string;
  version: string;
};

type LifeCycleModelRecord = {
  id: string;
  json: Record<string, unknown> | null;
  json_tg: Record<string, unknown> | null;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type RuntimeSeedProcess = {
  id: string;
  reusable?: boolean;
  ruleVerification: boolean;
  sourceFixtureFile: string;
  version: string;
};

type ValidationResultRaw = {
  datasetSdkValid: boolean;
  nonExistentRef: unknown[];
  ruleVerification: boolean;
  unRuleVerification: unknown[];
};

type LoadedWorkflowModules = {
  generalApi: {
    getTeamIdByUserId: () => Promise<string | null>;
  };
  lifeCycleModelsApi: {
    contributeLifeCycleModel: (id: string, version: string) => Promise<unknown>;
    createLifeCycleModel: (data: any) => Promise<LifeCycleModelMutationResult>;
    deleteLifeCycleModel: (id: string, version: string) => Promise<LifeCycleModelMutationResult>;
    getLifeCycleModelDetail: (
      id: string,
      version: string,
    ) => Promise<{ data?: unknown; success?: boolean }>;
    getLifeCycleModelTablePgroongaSearch: (
      params: { current?: number; pageSize?: number },
      lang: string,
      dataSource: string,
      queryText: string,
      filterCondition: unknown,
      stateCode?: string | number,
    ) => Promise<{ data?: Array<{ id?: string }>; success?: boolean; total?: number }>;
    lifeCycleModel_hybrid_search: (
      params: { current?: number; pageSize?: number },
      lang: string,
      dataSource: string,
      queryText: string,
      filterCondition: unknown,
      stateCode?: string | number,
    ) => Promise<{ data?: Array<{ id?: string }>; success?: boolean; total?: number }>;
    updateLifeCycleModel: (data: any) => Promise<LifeCycleModelMutationResult>;
  };
  review: {
    validateDatasetRuleVerification: (
      datasetType: 'lifeCycleModel data set' | 'process data set',
      orderedJson: Record<string, any>,
      userTeamId?: string,
    ) => Promise<ValidationResultRaw>;
  };
  supabase: SupabaseClient;
};

type LifeCycleModelMutationResult = {
  code?: string;
  error?: unknown;
  message?: string;
  ok?: boolean;
  version?: string;
};

type LifeCycleModelStepResult = {
  label: string;
  record?: LifeCycleModelRecord;
  search?: SearchSummary;
};

type SearchSummary = {
  hybridContainsRuntimeId: boolean;
  hybridCount: number;
  pgroongaContainsRuntimeId: boolean;
  pgroongaCount: number;
};

type WorkflowSession = {
  accessToken: string;
  user: {
    id: string;
  };
};

export type LifeCycleModelSmokeResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  expectationResults: StructuredExpectationResult[];
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  runtimeFixture: RuntimeLifeCycleModelFixture;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  seedProcesses: RuntimeSeedProcess[];
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  steps: LifeCycleModelStepResult[];
  supabaseTarget: SupabaseTarget;
};

export type LifeCycleModelSmokeDependencies = {
  fetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedWorkflowModules>;
  now?: () => string;
};

export const LIFECYCLEMODEL_WORKFLOW_CONFIGS: Record<
  LifeCycleModelWorkflowKind,
  LifeCycleModelWorkflowConfig
> = {
  create: {
    command: 'test:lifecyclemodels:create',
    dataType: 'lifecycle model',
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_EXPECTED_PATH,
    helpTitle: 'Lifecycle model create data workflow',
    kind: 'create',
  },
  'check-data': {
    command: 'test:lifecyclemodels:check-data',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_CHECK_DATA_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_CHECK_DATA_EXPECTED_PATH,
    helpTitle: 'Lifecycle model check-data data workflow',
    kind: 'check-data',
  },
  edit: {
    command: 'test:lifecyclemodels:edit',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_EDIT_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_EDIT_EXPECTED_PATH,
    helpTitle: 'Lifecycle model edit data workflow',
    kind: 'edit',
  },
  'create-view-copy': {
    command: 'test:lifecyclemodels:create-view-copy',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_CREATE_VIEW_COPY_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_CREATE_VIEW_COPY_EXPECTED_PATH,
    helpTitle: 'Lifecycle model create/view/copy data workflow',
    kind: 'create-view-copy',
  },
  'create-version-update-reference': {
    command: 'test:lifecyclemodels:create-version-update-reference',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_CREATE_VERSION_UPDATE_REFERENCE_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_CREATE_VERSION_UPDATE_REFERENCE_EXPECTED_PATH,
    helpTitle: 'Lifecycle model create-version/update-reference data workflow',
    kind: 'create-version-update-reference',
  },
  'create-contribute-team': {
    command: 'test:lifecyclemodels:create-contribute-team',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_CREATE_CONTRIBUTE_TEAM_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_CREATE_CONTRIBUTE_TEAM_EXPECTED_PATH,
    defaultRole: DEFAULT_LIFECYCLEMODEL_TEAM_ROLE,
    helpTitle: 'Lifecycle model create/contribute team data workflow',
    kind: 'create-contribute-team',
  },
  'full-text-search': {
    command: 'test:lifecyclemodels:full-text-search',
    dataType: 'lifecycle model',
    defaultCreateDataFile: DEFAULT_LIFECYCLEMODEL_FIXTURE_PATH,
    defaultDataFile: DEFAULT_LIFECYCLEMODEL_FULL_TEXT_SEARCH_FIXTURE_PATH,
    defaultExpectedFile: DEFAULT_LIFECYCLEMODEL_FULL_TEXT_SEARCH_EXPECTED_PATH,
    helpTitle: 'Lifecycle model full-text-search data workflow',
    kind: 'full-text-search',
  },
};

export function buildLifeCycleModelSmokeHelp(config: LifeCycleModelWorkflowConfig) {
  const workflowText =
    config.kind === 'create'
      ? `Workflow:
  1. Seed a runtime process dependency
  2. Create one lifecycle model through the prepared lifecycle model payload
  3. Query lifecyclemodels by id/version and validate the expected contract`
      : `Workflow:
  1. Seed a runtime process dependency
  2. Create one lifecycle model from ${config.defaultCreateDataFile}
  3. Run the ${config.kind} follow-up step from ${config.defaultDataFile}
  4. Query lifecyclemodels by id/version and validate the expected contract`;

  return `${config.helpTitle}

Usage:
  npm run ${config.command} -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co --supabase-publishable-key <key>
  npm run ${config.command} -- --detail-result --no-keep-data

${workflowText}

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "${config.defaultRole ?? DEFAULT_LIFECYCLEMODEL_ROLE}")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --data-file <path>               Defaults to ${config.defaultDataFile}
  --create-data-file <path>        Defaults to ${config.defaultCreateDataFile ?? config.defaultDataFile}
  --seed-process-data-file <path>  Defaults to ${DEFAULT_SEED_PROCESS_FIXTURE_PATH}
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the created lifecycle model and seed process after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete created lifecycle model and seed process after validation
  --no-keep-created                Alias of --no-keep-data
  --generate-id                    Replace fixture placeholders with fresh runtime UUIDs (default)
  --no-generate-id                 Reuse fixture UUIDs where possible
  --write-runtime                  Write this run's runtime record to a file (default)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before run (default)
  --no-verify-frontend             Skip the frontend fetch probe
  --help                           Show this help text
`;
}

export function parseLifeCycleModelCliArgs(
  argv: string[],
  config: LifeCycleModelWorkflowConfig,
  cwd = process.cwd(),
): LifeCycleModelCliOptions {
  let runtimeRecordFileExplicit = false;
  const defaultDataFile = path.resolve(cwd, config.defaultDataFile);
  const options: LifeCycleModelCliOptions = {
    createDataFile: config.defaultCreateDataFile
      ? path.resolve(cwd, config.defaultCreateDataFile)
      : undefined,
    dataFile: defaultDataFile,
    expectedFile: path.resolve(cwd, config.defaultExpectedFile),
    generateId: true,
    help: false,
    keepData: true,
    role: config.defaultRole ?? DEFAULT_LIFECYCLEMODEL_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(defaultDataFile, cwd),
    seedProcessDataFile: path.resolve(cwd, DEFAULT_SEED_PROCESS_FIXTURE_PATH),
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
    const readNextValue = () => argv[index + 1];
    const consumeValue = () => {
      const value = requireFlagValue(rawFlag, inlineValue, readNextValue);
      if (inlineValue === undefined) {
        index += 1;
      }
      return value;
    };

    switch (flag) {
      case 'create-data-file':
        options.createDataFile = path.resolve(cwd, consumeValue());
        break;
      case 'data-file':
        options.dataFile = path.resolve(cwd, consumeValue());
        if (!runtimeRecordFileExplicit) {
          options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.dataFile, cwd);
        }
        break;
      case 'frontend-url':
        options.frontendUrl = consumeValue();
        break;
      case 'generate-id':
        options.generateId = inlineValue === undefined ? true : parseBoolean(inlineValue, flag);
        break;
      case 'help':
        options.help = true;
        break;
      case 'keep-created':
      case 'keep-data':
        options.keepData = inlineValue === undefined ? true : parseBoolean(inlineValue, flag);
        break;
      case 'no-generate-id':
        options.generateId = false;
        break;
      case 'no-keep-created':
      case 'no-keep-data':
        options.keepData = false;
        break;
      case 'no-verify-frontend':
        options.verifyFrontend = false;
        break;
      case 'no-write-runtime':
        options.writeRuntime = false;
        break;
      case 'role':
        options.role = consumeValue();
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(cwd, consumeValue());
        runtimeRecordFileExplicit = true;
        options.writeRuntime = true;
        break;
      case 'seed-process-data-file':
        options.seedProcessDataFile = path.resolve(cwd, consumeValue());
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = consumeValue();
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = consumeValue();
        break;
      case 'supabase-url':
        options.supabaseUrl = consumeValue();
        break;
      case 'users-file':
        options.usersFile = path.resolve(cwd, consumeValue());
        break;
      case 'verify-frontend':
        options.verifyFrontend = inlineValue === undefined ? true : parseBoolean(inlineValue, flag);
        break;
      case 'write-runtime':
        options.writeRuntime = inlineValue === undefined ? true : parseBoolean(inlineValue, flag);
        break;
      default:
        throw new Error(`Unknown flag: --${rawFlag}`);
    }
  }

  return options;
}

export async function loadLifeCycleModelFixture(filePath: string): Promise<LifeCycleModelFixture> {
  const fixture = await readJsonFile<LifeCycleModelFixture>(filePath);

  if (!fixture || typeof fixture !== 'object' || !fixture.payload) {
    throw new Error(`Invalid lifecycle model fixture: ${filePath}`);
  }

  return {
    table: 'lifecyclemodels',
    ...fixture,
  };
}

export async function runLifeCycleModelDataWorkflow(
  config: LifeCycleModelWorkflowConfig,
  options: LifeCycleModelCliOptions,
  dependencies: LifeCycleModelSmokeDependencies = {},
): Promise<LifeCycleModelSmokeResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);
  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontend(options.frontendUrl, dependencies.fetchImpl)
      : { ok: true, skipped: true };
  const modules = await (dependencies.modulesLoader ?? loadLifeCycleModelWorkflowModules)(
    supabaseTarget,
  );
  const session = await signInWorkflowUser(modules.supabase, selectedCredential);
  const runtimeModelId = options.generateId ? generateId(dependencies) : undefined;
  const copyModelId = options.generateId ? generateId(dependencies) : undefined;
  const referenceSeeds = await activateReferenceSeedsForSmoke({
    accessToken: session.accessToken,
    currentUserId: session.user.id,
    requiredSeeds: getReferenceSeedKeysForTable('processes'),
    supabase: modules.supabase,
  });
  const seedProcess = referenceSeeds?.process
    ? {
        id: referenceSeeds.process.id,
        reusable: true,
        ruleVerification: true,
        sourceFixtureFile: 'reference-seed:test-process-reference',
        version: referenceSeeds.process.version,
      }
    : await createRuntimeSeedProcess({
        accessToken: session.accessToken,
        dependencies,
        filePath: options.seedProcessDataFile,
        generateId: options.generateId,
        supabase: modules.supabase,
      });
  const seedProcesses = [seedProcess];
  const placeholders = buildRuntimePlaceholderMap({
    copyId: copyModelId,
    modelId: runtimeModelId,
    seedProcess,
  });
  const createFixture = await prepareRuntimeLifeCycleModelFixture(
    await loadLifeCycleModelFixture(options.createDataFile ?? options.dataFile),
    placeholders,
    dependencies,
    options.generateId,
  );
  const followUpFixture =
    config.kind === 'create'
      ? createFixture
      : await prepareRuntimeLifeCycleModelFixture(
          await loadLifeCycleModelFixture(options.dataFile),
          {
            ...placeholders,
            [MODEL_ID_PLACEHOLDER]: createFixture.runtimeId,
            [MODEL_COPY_ID_PLACEHOLDER]: createFixture.copyId,
          },
          dependencies,
          false,
        );
  const steps: LifeCycleModelStepResult[] = [];
  const createdModelRefs: Array<{ id: string; version: string }> = [];
  let cleanupAttempted = false;
  let cleanupPassed = true;

  try {
    const createRecord = await createAndQueryLifeCycleModel({
      accessToken: session.accessToken,
      fixture: createFixture,
      modules,
      stepLabel: 'create',
    });
    steps.push({ label: 'create', record: createRecord });
    createdModelRefs.push({ id: createRecord.id, version: createRecord.version });

    if (config.kind === 'check-data' || config.kind === 'edit') {
      const updateRecord = await updateAndQueryLifeCycleModel({
        accessToken: session.accessToken,
        fixture: followUpFixture,
        modules,
        stepLabel: config.kind,
        version: createRecord.version,
      });
      steps.push({ label: config.kind, record: updateRecord });
    } else if (config.kind === 'create-view-copy') {
      const detail = await modules.lifeCycleModelsApi.getLifeCycleModelDetail(
        createRecord.id,
        createRecord.version,
      );
      steps.push({
        label: 'view-source',
        record: {
          ...createRecord,
          json_tg: {
            ...(createRecord.json_tg ?? {}),
            detailSuccess: detail.success === true,
          },
        },
      });
      const copyFixture = retargetRuntimeLifeCycleModelFixture(
        followUpFixture,
        followUpFixture.copyId,
      );
      const copyRecord = await createAndQueryLifeCycleModel({
        accessToken: session.accessToken,
        fixture: copyFixture,
        modules,
        stepLabel: 'copy',
      });
      steps.push({ label: 'copy', record: copyRecord });
      createdModelRefs.push({ id: copyRecord.id, version: copyRecord.version });
    } else if (config.kind === 'create-version-update-reference') {
      const versionRecord = await createAndQueryLifeCycleModel({
        accessToken: session.accessToken,
        fixture: followUpFixture,
        modules,
        stepLabel: 'create-version',
      });
      steps.push({ label: 'create-version', record: versionRecord });
      createdModelRefs.push({ id: versionRecord.id, version: versionRecord.version });
      const updateRecord = await updateAndQueryLifeCycleModel({
        accessToken: session.accessToken,
        fixture: followUpFixture,
        modules,
        stepLabel: 'update-reference',
        version: versionRecord.version,
      });
      steps.push({ label: 'update-reference', record: updateRecord });
    } else if (config.kind === 'create-contribute-team') {
      const contributeResult = await modules.lifeCycleModelsApi.contributeLifeCycleModel(
        createRecord.id,
        createRecord.version,
      );
      if (isMutationFailure(contributeResult)) {
        throw new Error(
          extractMutationMessage(contributeResult, 'Contribute lifecycle model failed'),
        );
      }
      const contributedRecord = await queryLifeCycleModelRecord(
        modules.supabase,
        createRecord.id,
        createRecord.version,
      );
      steps.push({ label: 'contribute', record: contributedRecord });
    } else if (config.kind === 'full-text-search') {
      const search = await runLifeCycleModelSearch({
        fixture: followUpFixture,
        modules,
      });
      steps.push({ label: 'full-text-search', search });
    }

    const expectationResults = await evaluateWorkflowExpectations({
      config,
      expectedFile: options.expectedFile,
      runtimeFixture: createFixture,
      seedProcesses,
      session,
      steps,
    });

    if (!options.keepData) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupRuntimeData({
        accessToken: session.accessToken,
        modelRefs: createdModelRefs,
        modules,
        seedProcesses,
      });
    }

    const passed = expectationResults.every((expectation) => expectation.passed) && cleanupPassed;
    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      await writeRuntimeRecord(
        runtimeRecordFile,
        buildLifeCycleModelRuntimeRecord({
          cleanupAttempted,
          cleanupPassed,
          config,
          expectationResults,
          frontendProbe,
          options,
          passed,
          runtimeFixture: createFixture,
          seedProcesses,
          selectedUser: {
            email: selectedCredential.email,
            role: selectedCredential.resolvedRole,
            userId: session.user.id,
          },
          steps,
          supabaseTarget,
        }),
      );
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      expectationResults,
      frontendProbe,
      passed,
      runtimeFixture: createFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      seedProcesses,
      selectedUser: {
        email: selectedCredential.email,
        role: selectedCredential.resolvedRole,
        userId: session.user.id,
      },
      steps,
      supabaseTarget,
    };
  } catch (error) {
    if (!options.keepData) {
      cleanupAttempted = true;
      const recoveredCleanupPassed = await cleanupRuntimeData({
        accessToken: session.accessToken,
        modelRefs: createdModelRefs,
        modules,
        seedProcesses,
      });
      cleanupPassed = cleanupPassed && recoveredCleanupPassed;
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

export async function runLifeCycleModelSmokeMain(
  config: LifeCycleModelWorkflowConfig,
  argv: string[] = process.argv.slice(2),
) {
  const detailResultState = extractDetailResultFlag(argv);
  const options = parseLifeCycleModelCliArgs(detailResultState.argv, config);

  if (options.help) {
    console.log(buildDataWorkflowHelpText(buildLifeCycleModelSmokeHelp(config)));
    return;
  }

  const result = await runLifeCycleModelDataWorkflow(config, options);
  const showDetailedResult = shouldPrintDetailedResult(
    detailResultState.detailResult,
    result.passed,
  );
  const lastRecord = [...result.steps].reverse().find((step) => step.record)?.record;

  if (!showDetailedResult) {
    printCompactSmokeSummary({
      dataId: lastRecord?.id ?? result.runtimeFixture.runtimeId,
      dataType: config.dataType,
      passed: result.passed,
      version: lastRecord?.version ?? result.runtimeFixture.version,
    });
  } else {
    printDetailedResult(config, options, result);
  }

  if (!result.passed) {
    throw new Error(`${config.helpTitle} failed.`);
  }

  if (showDetailedResult) {
    console.log(`${config.helpTitle} passed.`);
  }
}

async function probeFrontend(
  frontendUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FrontendProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetchImpl(frontendUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: frontendUrl,
    };
  } catch (error) {
    return {
      ok: false,
      statusText: error instanceof Error ? error.message : 'Frontend probe failed',
      url: frontendUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function prepareRuntimeLifeCycleModelFixture(
  fixture: LifeCycleModelFixture,
  placeholders: Record<string, string>,
  dependencies: LifeCycleModelSmokeDependencies,
  generateMissingRuntimeIds: boolean,
): Promise<RuntimeLifeCycleModelFixture> {
  const runtimeId =
    placeholders[MODEL_ID_PLACEHOLDER] ??
    (generateMissingRuntimeIds ? generateId(dependencies) : fixture.id);
  const copyId =
    placeholders[MODEL_COPY_ID_PLACEHOLDER] ??
    (generateMissingRuntimeIds ? generateId(dependencies) : `${runtimeId}-copy`);
  const runtimePlaceholders = {
    ...placeholders,
    [MODEL_ID_PLACEHOLDER]: runtimeId,
    [MODEL_COPY_ID_PLACEHOLDER]: copyId,
  };
  const replacedPayload = replacePlaceholders(fixture.payload, runtimePlaceholders);
  const searchKeyword = fixture.searchKeyword
    ? replacePlaceholders(fixture.searchKeyword, runtimePlaceholders)
    : undefined;
  const payload = prepareLifeCycleModelPayloadForRuntime(replacedPayload, {
    primaryProcessId: placeholders[PRIMARY_PROCESS_ID_PLACEHOLDER],
    primaryProcessVersion: placeholders[PRIMARY_PROCESS_VERSION_PLACEHOLDER],
    runtimeId,
    sourceFixtureId: fixture.id,
  });
  const version = getLifeCycleModelPayloadVersion(payload) ?? '01.01.000';

  return {
    copyId,
    fixture: {
      ...fixture,
      payload,
      searchKeyword,
    },
    runtimeId,
    sourceFixtureId: fixture.id,
    version,
  };
}

function retargetRuntimeLifeCycleModelFixture(
  fixture: RuntimeLifeCycleModelFixture,
  runtimeId: string,
): RuntimeLifeCycleModelFixture {
  const payload = prepareLifeCycleModelPayloadForRuntime(fixture.fixture.payload, {
    runtimeId,
    sourceFixtureId: fixture.runtimeId,
  });

  return {
    ...fixture,
    fixture: {
      ...fixture.fixture,
      payload,
    },
    runtimeId,
    version: getLifeCycleModelPayloadVersion(payload) ?? fixture.version,
  };
}

function prepareLifeCycleModelPayloadForRuntime(
  rawPayload: Record<string, any>,
  options: {
    primaryProcessId?: string;
    primaryProcessVersion?: string;
    runtimeId: string;
    sourceFixtureId?: string;
  },
): Record<string, any> {
  const sourceModelIds = collectSourceModelIds(rawPayload, options.sourceFixtureId);
  const payload = sourceModelIds.reduce<Record<string, any>>(
    (currentPayload, sourceModelId) =>
      sourceModelId === options.runtimeId
        ? currentPayload
        : replaceExactString(currentPayload, sourceModelId, options.runtimeId),
    deepClone(rawPayload),
  );

  if (isBundlePayload(payload)) {
    payload.modelId = options.runtimeId;
    setNestedValue(payload.parent.jsonOrdered, LIFECYCLEMODEL_UUID_PATH, options.runtimeId);

    const version = getBundlePayloadVersion(payload) ?? '01.01.000';
    setNestedValue(payload.parent.jsonOrdered, LIFECYCLEMODEL_VERSION_PATH, version);
    setNestedValue(
      payload.parent.jsonOrdered,
      LIFECYCLEMODEL_PERMANENT_URI_PATH,
      buildLifeCycleModelPermanentDataSetUri(options.runtimeId, version),
    );

    patchPrimaryProcessReferences(payload, options.primaryProcessId, options.primaryProcessVersion);
    ensurePrimarySubmodel(payload, options.runtimeId, version);
    patchProcessMutationModelIds(payload, options.runtimeId);
    patchJsonOrderedWithActiveReferenceSeeds(payload.parent.jsonOrdered);
    (payload.processMutations ?? []).forEach((mutation: Record<string, any>) => {
      if (mutation?.jsonOrdered) {
        patchJsonOrderedWithActiveReferenceSeeds(mutation.jsonOrdered);
      }
    });
    return payload;
  }

  const legacyPayload = {
    ...payload,
    id: options.runtimeId,
  };
  const version = getLegacyPayloadVersion(legacyPayload) ?? '01.01.000';
  setNestedValue(legacyPayload, LIFECYCLEMODEL_UUID_PATH.slice(1), options.runtimeId);
  setNestedValue(legacyPayload, LIFECYCLEMODEL_VERSION_PATH.slice(1), version);
  setNestedValue(
    legacyPayload,
    LIFECYCLEMODEL_PERMANENT_URI_PATH.slice(1),
    buildLifeCycleModelPermanentDataSetUri(options.runtimeId, version),
  );
  patchJsonOrderedWithActiveReferenceSeeds(legacyPayload);

  return legacyPayload;
}

async function createRuntimeSeedProcess(input: {
  accessToken: string;
  dependencies: LifeCycleModelSmokeDependencies;
  filePath: string;
  generateId: boolean;
  supabase: SupabaseClient;
}): Promise<RuntimeSeedProcess> {
  const seedFixture = await loadProcessCheckDataFixture(input.filePath);
  const rawOrderedJson = getFixtureOrderedJson(seedFixture);

  if (!rawOrderedJson) {
    throw new Error(
      `Seed process fixture ${input.filePath} does not contain ordered process JSON.`,
    );
  }

  const runtimeId = input.generateId
    ? generateId(input.dependencies)
    : getProcessId(rawOrderedJson);
  const prepared = prepareProcessJsonOrderedForRuntime(rawOrderedJson, {
    runtimeId,
    version: getProcessVersion(rawOrderedJson) ?? '01.01.000',
  });
  const ruleVerification = await computeProcessRuleVerification(prepared.jsonOrdered);
  const createResult = await input.supabase.functions.invoke('app_dataset_create', {
    body: {
      id: runtimeId,
      jsonOrdered: prepared.jsonOrdered,
      ruleVerification,
      table: 'processes',
    },
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });

  if (createResult.error) {
    throw new Error(`Create lifecycle model seed process failed: ${createResult.error.message}.`);
  }

  return {
    id: runtimeId,
    ruleVerification,
    sourceFixtureFile: input.filePath,
    version: prepared.version,
  };
}

async function createAndQueryLifeCycleModel(input: {
  accessToken: string;
  fixture: RuntimeLifeCycleModelFixture;
  modules: LoadedWorkflowModules;
  stepLabel: string;
}) {
  const result = isBundlePayload(input.fixture.fixture.payload)
    ? await saveLifeCycleModelBundle({
        accessToken: input.accessToken,
        modules: input.modules,
        payload: input.fixture.fixture.payload,
        stepLabel: input.stepLabel,
      })
    : await input.modules.lifeCycleModelsApi.createLifeCycleModel(input.fixture.fixture.payload);

  if (isMutationFailure(result)) {
    throw new Error(extractMutationMessage(result, `Lifecycle model ${input.stepLabel} failed`));
  }

  const version = result.version ?? input.fixture.version;
  return queryLifeCycleModelRecord(input.modules.supabase, input.fixture.runtimeId, version);
}

async function updateAndQueryLifeCycleModel(input: {
  accessToken: string;
  fixture: RuntimeLifeCycleModelFixture;
  modules: LoadedWorkflowModules;
  stepLabel: string;
  version: string;
}) {
  const payload = buildUpdatePayload(input.fixture, input.version);
  const result = isBundlePayload(payload)
    ? await saveLifeCycleModelBundle({
        accessToken: input.accessToken,
        modules: input.modules,
        payload,
        stepLabel: input.stepLabel,
      })
    : await input.modules.lifeCycleModelsApi.updateLifeCycleModel(payload);

  if (isMutationFailure(result)) {
    throw new Error(extractMutationMessage(result, `Lifecycle model ${input.stepLabel} failed`));
  }

  return queryLifeCycleModelRecord(input.modules.supabase, input.fixture.runtimeId, input.version);
}

function buildUpdatePayload(
  fixture: RuntimeLifeCycleModelFixture,
  version: string,
): Record<string, any> {
  const payload = prepareLifeCycleModelPayloadForRuntime(fixture.fixture.payload, {
    runtimeId: fixture.runtimeId,
    sourceFixtureId: fixture.runtimeId,
  });

  if (isBundlePayload(payload)) {
    payload.mode = 'update';
    payload.version = version;
    setNestedValue(payload.parent.jsonOrdered, LIFECYCLEMODEL_VERSION_PATH, version);
    setNestedValue(
      payload.parent.jsonOrdered,
      LIFECYCLEMODEL_PERMANENT_URI_PATH,
      buildLifeCycleModelPermanentDataSetUri(fixture.runtimeId, version),
    );
    ensurePrimarySubmodel(payload, fixture.runtimeId, version);
    patchProcessMutationVersions(payload, version);
    return payload;
  }

  return {
    ...payload,
    id: fixture.runtimeId,
    version,
    administrativeInformation: {
      ...(payload.administrativeInformation ?? {}),
      publicationAndOwnership: {
        ...(payload.administrativeInformation?.publicationAndOwnership ?? {}),
        'common:dataSetVersion': version,
      },
    },
  };
}

async function saveLifeCycleModelBundle(input: {
  accessToken: string;
  modules: LoadedWorkflowModules;
  payload: Record<string, any>;
  stepLabel: string;
}) {
  const payload = await attachRuleVerificationToBundlePayload(input.payload, input.modules);
  const result = await input.modules.supabase.functions.invoke('save_lifecycle_model_bundle', {
    body: payload,
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    throw new Error(`Lifecycle model ${input.stepLabel} failed: ${result.error.message}.`);
  }

  return result.data as LifeCycleModelMutationResult;
}

async function attachRuleVerificationToBundlePayload(
  rawPayload: Record<string, any>,
  modules: LoadedWorkflowModules,
) {
  const payload = deepClone(rawPayload);
  const userTeamId = (await modules.generalApi.getTeamIdByUserId()) ?? '';
  const parentValidation = await modules.review.validateDatasetRuleVerification(
    'lifeCycleModel data set',
    payload.parent.jsonOrdered,
    userTeamId,
  );

  payload.parent = {
    ...payload.parent,
    ruleVerification: parentValidation.ruleVerification,
  };
  payload.processMutations = await Promise.all(
    (payload.processMutations ?? []).map(async (mutation: Record<string, any>) => {
      if (mutation.op === 'delete') {
        return mutation;
      }

      const processValidation = await modules.review.validateDatasetRuleVerification(
        'process data set',
        mutation.jsonOrdered,
        userTeamId,
      );

      return {
        ...mutation,
        modelId: payload.modelId,
        ruleVerification: processValidation.ruleVerification,
      };
    }),
  );

  return payload;
}

async function runLifeCycleModelSearch(input: {
  fixture: RuntimeLifeCycleModelFixture;
  modules: LoadedWorkflowModules;
}): Promise<SearchSummary> {
  const keywords = getLifeCycleModelSearchKeywords(input.fixture);
  const query = async () => {
    let fallbackSummary: SearchSummary | undefined;

    for (const keyword of keywords) {
      const pgroonga = await input.modules.lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'my',
        keyword,
        {},
      );
      const summary = {
        hybridContainsRuntimeId: false,
        hybridCount: 0,
        pgroongaContainsRuntimeId: Boolean(
          pgroonga.data?.some((row) => row.id === input.fixture.runtimeId),
        ),
        pgroongaCount: pgroonga.data?.length ?? 0,
      };

      if (summary.pgroongaContainsRuntimeId) {
        return summary;
      }

      fallbackSummary = fallbackSummary ?? summary;
    }

    return (
      fallbackSummary ?? {
        hybridContainsRuntimeId: false,
        hybridCount: 0,
        pgroongaContainsRuntimeId: false,
        pgroongaCount: 0,
      }
    );
  };

  return pollUntil(query, (summary) => summary.pgroongaContainsRuntimeId, {
    intervalMs: 500,
    timeoutMs: 8000,
  });
}

function getLifeCycleModelSearchKeywords(fixture: RuntimeLifeCycleModelFixture) {
  return Array.from(
    new Set(
      [fixture.fixture.searchKeyword, fixture.runtimeId, getBaseNameText(fixture.fixture.payload)]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0),
    ),
  );
}

async function queryLifeCycleModelRecord(
  supabase: SupabaseClient,
  id: string,
  version: string,
): Promise<LifeCycleModelRecord> {
  const result = await supabase
    .from('lifecyclemodels')
    .select('id,json,json_tg,user_id,state_code,version,team_id,rule_verification,reviews')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle<LifeCycleModelRecord>();

  if (result.error || !result.data) {
    throw new Error(
      `Failed to query lifecycle model by id/version: ${result.error?.message ?? 'record not found'}`,
    );
  }

  return result.data;
}

async function cleanupRuntimeData(input: {
  accessToken: string;
  modelRefs: Array<{ id: string; version: string }>;
  modules: LoadedWorkflowModules;
  seedProcesses: RuntimeSeedProcess[];
}) {
  let cleanupPassed = true;

  for (const modelRef of [...input.modelRefs].reverse()) {
    const deleteResult = await input.modules.lifeCycleModelsApi.deleteLifeCycleModel(
      modelRef.id,
      modelRef.version,
    );

    if (isMutationFailure(deleteResult)) {
      cleanupPassed = false;
    }
  }

  for (const seedProcess of input.seedProcesses) {
    if (seedProcess.reusable) {
      continue;
    }

    const deleteResult = await input.modules.supabase.functions.invoke('app_dataset_delete', {
      body: {
        id: seedProcess.id,
        table: 'processes',
        version: seedProcess.version,
      },
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (deleteResult.error) {
      cleanupPassed = false;
    }
  }

  return cleanupPassed;
}

async function evaluateWorkflowExpectations(input: {
  config: LifeCycleModelWorkflowConfig;
  expectedFile: string;
  runtimeFixture: RuntimeLifeCycleModelFixture;
  seedProcesses: RuntimeSeedProcess[];
  session: WorkflowSession;
  steps: LifeCycleModelStepResult[];
}) {
  const expectations = buildLifeCycleModelExpectations(input.config.kind);
  const context = buildExpectationContext(input.steps, input.runtimeFixture, input.seedProcesses);

  return evaluateStructuredExpectations({
    context,
    expectations,
    placeholders: {
      currentUserId: input.session.user.id,
      runtimeCopyModelId: input.runtimeFixture.copyId,
      runtimeModelId: input.runtimeFixture.runtimeId,
      runtimePrimaryProcessId: input.seedProcesses[0]?.id,
      runtimePrimaryProcessVersion: input.seedProcesses[0]?.version,
      runtimeVersion: input.runtimeFixture.version,
    },
  });
}

function expectation(path: string, expected: string, label: string): StructuredExpectation {
  return { expected, label, path };
}

export function buildLifeCycleModelExpectations(
  kind: LifeCycleModelWorkflowKind,
): StructuredExpectation[] {
  const createExpectations = [
    expectation('create.summary.rowExists', 'true', 'Create row exists'),
    expectation('create.record.id', 'runtimeModelId', 'Create id matches runtime model id'),
    expectation(
      'create.record.version',
      'runtimeVersion',
      'Create version matches runtime version',
    ),
    expectation('create.record.user_id', 'currentUserId', 'Create user_id matches current user'),
    expectation('create.record.state_code', '0', 'Create state_code is 0'),
    expectation('create.record.team_id', 'null', 'Create team_id is null'),
    expectation('create.summary.nodesCount', '1', 'Create model has one xflow node'),
    expectation(
      'create.summary.primarySubmodelId',
      'runtimeModelId',
      'Create primary submodel id matches runtime model id',
    ),
  ];

  switch (kind) {
    case 'create':
      return createExpectations;
    case 'check-data':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation('checkData.summary.rowExists', 'true', 'Check-data row exists'),
        expectation('checkData.record.id', 'runtimeModelId', 'Check-data id matches runtime id'),
        expectation(
          'checkData.record.version',
          'runtimeVersion',
          'Check-data version matches runtime version',
        ),
        expectation(
          'checkData.record.user_id',
          'currentUserId',
          'Check-data user_id matches current user',
        ),
        expectation('checkData.record.state_code', '0', 'Check-data state_code is 0'),
        expectation('checkData.summary.nodesCount', '1', 'Check-data model has one xflow node'),
        expectation(
          'checkData.summary.primarySubmodelId',
          'runtimeModelId',
          'Check-data primary submodel id matches runtime model id',
        ),
      ];
    case 'edit':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation('edit.summary.rowExists', 'true', 'Edit row exists'),
        expectation('edit.record.id', 'runtimeModelId', 'Edit id matches runtime id'),
        expectation(
          'edit.record.version',
          'runtimeVersion',
          'Edit version matches runtime version',
        ),
        expectation('edit.record.user_id', 'currentUserId', 'Edit user_id matches current user'),
        expectation('edit.record.state_code', '0', 'Edit state_code is 0'),
        expectation('edit.summary.nodesCount', '1', 'Edit model has one xflow node'),
      ];
    case 'create-view-copy':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation(
          'viewSource.record.json_tg.detailSuccess',
          'true',
          'View-source detail succeeds',
        ),
        expectation('copy.summary.rowExists', 'true', 'Copy row exists'),
        expectation('copy.record.id', 'runtimeCopyModelId', 'Copy id matches runtime copy id'),
        expectation(
          'copy.record.version',
          'runtimeVersion',
          'Copy version matches runtime version',
        ),
        expectation('copy.record.user_id', 'currentUserId', 'Copy user_id matches current user'),
        expectation(
          'copy.summary.primarySubmodelId',
          'runtimeCopyModelId',
          'Copy primary submodel id matches runtime copy id',
        ),
      ];
    case 'create-version-update-reference':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation('createVersion.summary.rowExists', 'true', 'Create-version row exists'),
        expectation(
          'createVersion.record.id',
          'runtimeModelId',
          'Create-version id matches runtime model id',
        ),
        expectation(
          'createVersion.record.version',
          '01.01.001',
          'Create-version version is 01.01.001',
        ),
        expectation('updateReference.summary.rowExists', 'true', 'Update-reference row exists'),
        expectation(
          'updateReference.record.id',
          'runtimeModelId',
          'Update-reference id matches runtime model id',
        ),
        expectation(
          'updateReference.record.version',
          '01.01.001',
          'Update-reference version is 01.01.001',
        ),
        expectation(
          'updateReference.summary.primarySubmodelId',
          'runtimeModelId',
          'Update-reference primary submodel id matches runtime model id',
        ),
      ];
    case 'create-contribute-team':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation('contribute.summary.rowExists', 'true', 'Contributed row exists'),
        expectation('contribute.record.id', 'runtimeModelId', 'Contributed id matches runtime id'),
        expectation(
          'contribute.record.version',
          'runtimeVersion',
          'Contributed version matches runtime version',
        ),
        expectation('contribute.record.state_code', '0', 'Contributed state_code is 0'),
        expectation(
          'contribute.summary.primarySubmodelId',
          'runtimeModelId',
          'Contributed primary submodel id matches runtime model id',
        ),
      ];
    case 'full-text-search':
      return [
        expectation('create.summary.rowExists', 'true', 'Create row exists'),
        expectation(
          'fullTextSearch.pgroongaContainsRuntimeId',
          'true',
          'Full-text search contains runtime model id',
        ),
      ];
  }
}

async function signInWorkflowUser(
  supabase: SupabaseClient,
  credential: { email: string; password: string; requestedRole: string; resolvedRole: string },
): Promise<WorkflowSession> {
  const signInResult = await supabase.auth.signInWithPassword({
    email: credential.email,
    password: credential.password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed to sign in with requested role "${credential.requestedRole}" (resolved "${credential.resolvedRole}"): ${signInResult.error?.message ?? 'missing session'}`,
    );
  }

  return {
    accessToken: signInResult.data.session.access_token,
    user: {
      id: signInResult.data.user.id,
    },
  };
}

function buildExpectationContext(
  steps: LifeCycleModelStepResult[],
  runtimeFixture: RuntimeLifeCycleModelFixture,
  seedProcesses: RuntimeSeedProcess[],
) {
  const stepContext = steps.reduce<Record<string, unknown>>((accumulator, step) => {
    accumulator[toContextKey(step.label)] = buildStepContext(step);
    return accumulator;
  }, {});
  const lastRecord = [...steps].reverse().find((step) => step.record)?.record;

  return {
    copy: stepContext.copy,
    create: stepContext.create,
    edit: stepContext.edit,
    checkData: stepContext.checkData,
    contribute: stepContext.contribute,
    createVersion: stepContext.createVersion,
    updateReference: stepContext.updateReference,
    fullTextSearch: stepContext.fullTextSearch,
    viewSource: stepContext.viewSource,
    record: lastRecord,
    runtime: {
      copyId: runtimeFixture.copyId,
      id: runtimeFixture.runtimeId,
      primaryProcessId: seedProcesses[0]?.id,
      primaryProcessVersion: seedProcesses[0]?.version,
      version: runtimeFixture.version,
    },
    summary: summarizeRecord(lastRecord),
  };
}

function buildStepContext(step: LifeCycleModelStepResult) {
  if (step.search) {
    return step.search;
  }

  return {
    record: step.record,
    summary: summarizeRecord(step.record),
  };
}

function summarizeRecord(record?: LifeCycleModelRecord) {
  const submodels = Array.isArray(record?.json_tg?.submodels)
    ? (record?.json_tg?.submodels as any[])
    : [];
  const nodes = Array.isArray((record?.json_tg as any)?.xflow?.nodes)
    ? ((record?.json_tg as any).xflow.nodes as any[])
    : [];
  const edges = Array.isArray((record?.json_tg as any)?.xflow?.edges)
    ? ((record?.json_tg as any).xflow.edges as any[])
    : [];

  return {
    firstSubmodelId: submodels[0]?.id ?? null,
    nodesCount: nodes.length,
    primarySubmodelId: submodels.find((submodel) => submodel?.type === 'primary')?.id ?? null,
    rowExists: Boolean(record),
    submodelsCount: submodels.length,
    edgesCount: edges.length,
  };
}

function buildLifeCycleModelRuntimeRecord(input: {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  config: LifeCycleModelWorkflowConfig;
  expectationResults: StructuredExpectationResult[];
  frontendProbe: FrontendProbeResult;
  options: LifeCycleModelCliOptions;
  passed: boolean;
  runtimeFixture: RuntimeLifeCycleModelFixture;
  seedProcesses: RuntimeSeedProcess[];
  selectedUser: { email: string; role: string; userId: string };
  steps: LifeCycleModelStepResult[];
  supabaseTarget: SupabaseTarget;
}) {
  return {
    cleanupAttempted: input.cleanupAttempted,
    cleanupPassed: input.cleanupPassed,
    createdAt: new Date().toISOString(),
    expectedFile: input.options.expectedFile,
    expectationResults: input.expectationResults,
    fixtureFile: input.options.dataFile,
    frontendProbe: input.frontendProbe,
    frontendUrl: input.options.frontendUrl,
    keepData: input.options.keepData,
    passed: input.passed,
    runtimeFixture: {
      copyId: input.runtimeFixture.copyId,
      runtimeId: input.runtimeFixture.runtimeId,
      sourceFixtureId: input.runtimeFixture.sourceFixtureId,
      version: input.runtimeFixture.version,
    },
    seedProcesses: input.seedProcesses,
    steps: input.steps.map((step) => ({
      label: step.label,
      record: step.record
        ? {
            id: step.record.id,
            rule_verification: step.record.rule_verification,
            state_code: step.record.state_code,
            team_id: step.record.team_id,
            user_id: step.record.user_id,
            version: step.record.version,
          }
        : undefined,
      search: step.search,
    })),
    supabase: {
      apiUrl: input.supabaseTarget.apiUrl,
      dashboardUrl: input.supabaseTarget.dashboardUrl,
      projectId: input.supabaseTarget.projectId,
    },
    user: {
      email: input.selectedUser.email,
      role: input.selectedUser.role,
      userId: input.selectedUser.userId,
    },
    workflow: input.config.kind,
  };
}

async function loadLifeCycleModelWorkflowModules(
  supabaseTarget: SupabaseTarget,
): Promise<LoadedWorkflowModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const generalApiModule = await import('../../../../src/services/general/api');
  const lifeCycleModelsApiModule = await import('../../../../src/services/lifeCycleModels/api');
  const reviewModule = await import('../../../../src/pages/Utils/review');

  return {
    generalApi: extractModuleExports<LoadedWorkflowModules['generalApi']>(generalApiModule),
    lifeCycleModelsApi:
      extractModuleExports<LoadedWorkflowModules['lifeCycleModelsApi']>(lifeCycleModelsApiModule),
    review: extractModuleExports<LoadedWorkflowModules['review']>(reviewModule),
    supabase: extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule).supabase,
  };
}

function extractModuleExports<T>(moduleValue: Record<string, unknown>) {
  return ((moduleValue['module.exports'] as T | undefined) ??
    (moduleValue.default as T | undefined) ??
    (moduleValue as T)) as T;
}

function buildRuntimePlaceholderMap(input: {
  copyId?: string;
  modelId?: string;
  seedProcess: RuntimeSeedProcess;
}) {
  return {
    [MODEL_COPY_ID_PLACEHOLDER]: input.copyId ?? MODEL_COPY_ID_PLACEHOLDER,
    [MODEL_ID_PLACEHOLDER]: input.modelId ?? MODEL_ID_PLACEHOLDER,
    [PRIMARY_PROCESS_ID_PLACEHOLDER]: input.seedProcess.id,
    [PRIMARY_PROCESS_VERSION_PLACEHOLDER]: input.seedProcess.version,
  };
}

function replacePlaceholders<T>(value: T, placeholders: Record<string, string>): T {
  if (Array.isArray(value)) {
    return value.map((item) => replacePlaceholders(item, placeholders)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, item]) => {
        accumulator[key] = replacePlaceholders(item, placeholders);
        return accumulator;
      },
      {},
    ) as T;
  }

  if (typeof value === 'string') {
    let replacedValue: string = value;
    Object.entries(placeholders).forEach(([placeholder, replacement]) => {
      replacedValue = replacedValue.split(placeholder).join(replacement);
    });
    return replacedValue as T;
  }

  return value;
}

function collectSourceModelIds(payload: Record<string, any>, sourceFixtureId?: string) {
  return Array.from(
    new Set(
      [
        sourceFixtureId,
        payload.id,
        payload.modelId,
        getBundlePayloadModelId(payload),
        getLegacyPayloadModelId(payload),
      ].filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  ).filter((value) => !value.startsWith('__RUNTIME_'));
}

function replaceExactString<T>(value: T, source: string, replacement: string): T {
  if (typeof value === 'string') {
    return value.split(source).join(replacement) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceExactString(item, source, replacement)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, item]) => {
        accumulator[key] = replaceExactString(item, source, replacement);
        return accumulator;
      },
      {},
    ) as T;
  }

  return value;
}

function isBundlePayload(payload: Record<string, any>): payload is Record<string, any> & {
  modelId: string;
  parent: {
    jsonOrdered: Record<string, any>;
    jsonTg: Record<string, any>;
  };
} {
  return Boolean(payload?.parent?.jsonOrdered && payload?.parent?.jsonTg && payload?.modelId);
}

function getBundlePayloadModelId(payload: Record<string, any>) {
  return getNestedValue<string>(payload.parent?.jsonOrdered, LIFECYCLEMODEL_UUID_PATH);
}

function getLegacyPayloadModelId(payload: Record<string, any>) {
  return getNestedValue<string>(payload, LIFECYCLEMODEL_UUID_PATH.slice(1));
}

function patchPrimaryProcessReferences(
  payload: Record<string, any>,
  primaryProcessId?: string,
  primaryProcessVersion?: string,
) {
  if (!primaryProcessId || primaryProcessId.startsWith('__RUNTIME_')) {
    return;
  }

  const processVersion =
    primaryProcessVersion && !primaryProcessVersion.startsWith('__RUNTIME_')
      ? primaryProcessVersion
      : '01.01.000';
  const processRefs = jsonToList(
    payload.parent.jsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation?.technology
      ?.processes?.processInstance,
  );

  processRefs.forEach((processRef) => {
    const reference = processRef?.referenceToProcess;
    if (!reference || typeof reference !== 'object') {
      return;
    }

    reference['@refObjectId'] = primaryProcessId;
    reference['@version'] = processVersion;
    reference['@uri'] = `../processes/${primaryProcessId}.xml`;
  });

  const nodes = payload.parent.jsonTg?.xflow?.nodes;
  if (Array.isArray(nodes)) {
    nodes.forEach((node) => {
      if (!node?.data || typeof node.data !== 'object') {
        return;
      }

      node.data.id = primaryProcessId;
      node.data.version = processVersion;
    });
  }
}

function ensurePrimarySubmodel(payload: Record<string, any>, runtimeId: string, version: string) {
  const jsonTg = payload.parent.jsonTg;
  const submodels: Array<Record<string, any>> = Array.isArray(jsonTg.submodels)
    ? jsonTg.submodels
    : [];
  const primaryIndex = submodels.findIndex((submodel) => submodel?.type === 'primary');
  const primarySubmodel = {
    ...(primaryIndex >= 0 ? submodels[primaryIndex] : {}),
    id: runtimeId,
    type: 'primary',
    version,
  };

  jsonTg.submodels =
    primaryIndex >= 0
      ? submodels.map((submodel, index) => (index === primaryIndex ? primarySubmodel : submodel))
      : [primarySubmodel, ...submodels];
}

function patchProcessMutationModelIds(payload: Record<string, any>, runtimeId: string) {
  if (!Array.isArray(payload.processMutations)) {
    payload.processMutations = [];
    return;
  }

  payload.processMutations = payload.processMutations.map((mutation: Record<string, any>) =>
    mutation.op === 'delete'
      ? mutation
      : {
          ...mutation,
          modelId: runtimeId,
        },
  );
}

function patchProcessMutationVersions(payload: Record<string, any>, version: string) {
  if (!Array.isArray(payload.processMutations)) {
    return;
  }

  payload.processMutations = payload.processMutations.map((mutation: Record<string, any>) =>
    mutation.op === 'update'
      ? {
          ...mutation,
          version: mutation.version ?? version,
        }
      : mutation,
  );
}

function getLifeCycleModelPayloadVersion(payload: Record<string, any>) {
  return isBundlePayload(payload)
    ? getBundlePayloadVersion(payload)
    : getLegacyPayloadVersion(payload);
}

function getBundlePayloadVersion(payload: Record<string, any>) {
  return (
    payload.version ??
    getNestedValue<string>(payload.parent?.jsonOrdered, LIFECYCLEMODEL_VERSION_PATH)
  );
}

function getLegacyPayloadVersion(payload: Record<string, any>) {
  return (
    payload.administrativeInformation?.publicationAndOwnership?.['common:dataSetVersion'] ??
    getNestedValue<string>(payload, LIFECYCLEMODEL_VERSION_PATH.slice(1))
  );
}

function buildLifeCycleModelPermanentDataSetUri(id: string, version: string) {
  return `${LIFECYCLEMODEL_PERMANENT_URI_BASE}?uuid=${id}&version=${version}`;
}

function getProcessVersion(jsonOrdered: Record<string, any>) {
  return jsonOrdered.processDataSet?.administrativeInformation?.publicationAndOwnership?.[
    'common:dataSetVersion'
  ];
}

function getProcessId(jsonOrdered: Record<string, any>) {
  return (
    jsonOrdered.processDataSet?.processInformation?.dataSetInformation?.['common:UUID'] ??
    randomUUID()
  );
}

function getBaseNameText(payload: Record<string, any>) {
  const baseName = isBundlePayload(payload)
    ? payload.parent.jsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
        ?.dataSetInformation?.name?.baseName
    : payload.lifeCycleModelInformation?.dataSetInformation?.name?.baseName;
  if (Array.isArray(baseName)) {
    return baseName.find((item) => item?.['#text'])?.['#text'];
  }

  return baseName?.['#text'];
}

function jsonToList<T = any>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function getNestedValue<T>(source: Record<string, any> | undefined, keys: readonly string[]) {
  return keys.reduce<any>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return current[key];
  }, source) as T | undefined;
}

function setNestedValue(source: Record<string, any>, keys: readonly string[], value: unknown) {
  let current = source;

  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  });

  current[keys[keys.length - 1]] = value;
}

function isMutationFailure(result: unknown) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  return (result as LifeCycleModelMutationResult).ok === false || 'error' in result;
}

function extractMutationMessage(result: unknown, fallback: string) {
  if (!result || typeof result !== 'object') {
    return fallback;
  }

  return (result as LifeCycleModelMutationResult).message ?? fallback;
}

function generateId(dependencies: LifeCycleModelSmokeDependencies) {
  return dependencies.generateIdFn?.() ?? randomUUID();
}

function toContextKey(label: string) {
  return label.replace(/-([a-z])/gu, (_match, char: string) => char.toUpperCase());
}

function printDetailedResult(
  config: LifeCycleModelWorkflowConfig,
  options: LifeCycleModelCliOptions,
  result: LifeCycleModelSmokeResult,
) {
  console.log(config.helpTitle);
  console.log(`Role: ${result.selectedUser.role}`);
  console.log(`Account: ${result.selectedUser.email}`);
  console.log(`User ID: ${result.selectedUser.userId}`);
  console.log(`Frontend URL: ${options.frontendUrl ?? '(not provided)'}`);
  console.log(`Supabase API URL: ${result.supabaseTarget.apiUrl}`);
  console.log(`Supabase Dashboard URL: ${result.supabaseTarget.dashboardUrl ?? '(not derived)'}`);
  console.log(`Supabase Project ID: ${result.supabaseTarget.projectId ?? '(not derived)'}`);
  console.log(`Fixture file: ${options.dataFile}`);
  console.log(`Runtime model ID: ${result.runtimeFixture.runtimeId}`);
  console.log(`Runtime version: ${result.runtimeFixture.version}`);
  console.log(`Seed process IDs: ${result.seedProcesses.map((seed) => seed.id).join(', ')}`);
  console.log(`Keep created data: ${options.keepData ? 'yes' : 'no'}`);
  console.log(`Write runtime record: ${options.writeRuntime ? 'yes' : 'no'}`);

  if (result.frontendProbe.skipped) {
    console.log('Frontend probe: skipped');
  } else {
    console.log(
      `Frontend probe: ${result.frontendProbe.ok ? 'ok' : 'failed'} (${result.frontendProbe.status ?? 'n/a'} ${result.frontendProbe.statusText ?? ''})`.trim(),
    );
  }

  result.steps.forEach((step) => {
    if (step.record) {
      console.log(
        `Step ${step.label}: ${step.record.id} ${step.record.version} rule_verification=${String(
          step.record.rule_verification,
        )}`,
      );
    } else if (step.search) {
      console.log(
        `Step ${step.label}: pgroonga=${step.search.pgroongaCount} hybrid=${step.search.hybridCount}`,
      );
    }
  });

  result.expectationResults.forEach((expectation) => {
    console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${expectation.label}`);
  });

  if (result.cleanupAttempted) {
    console.log(`Cleanup: ${result.cleanupPassed ? 'ok' : 'failed'}`);
  } else {
    console.log('Cleanup: skipped');
  }

  if (result.runtimeRecordWritten) {
    console.log(`Runtime record: ${result.runtimeRecordFile}`);
  } else {
    console.log('Runtime record: skipped');
  }
}

export function cloneLifeCycleModelPayload<T>(payload: T): T {
  return deepClone(payload);
}
