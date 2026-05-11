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
  DEFAULT_FLOW_ROLE,
  DEFAULT_USERS_PATH,
  buildPermanentDataSetUri,
  deepSortJson,
  loadFlowFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareFlowJsonOrderedForRuntime,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  writeRuntimeRecord,
  type ExpectationResult,
  type FrontendProbeResult,
  type RuntimeFixture,
  type SupabaseTarget,
} from './flows-create-workflow-lib';

export const DEFAULT_FLOW_CREATE_VERSION_UPDATE_REFERENCE_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/flows/004_create_version_update_reference.json';
export const DEFAULT_FLOW_CREATE_VERSION_UPDATE_REFERENCE_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/flows/004_create_version_update_reference.md';

type SupportedFlag =
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

type FlowWorkflowRecord = {
  id: string;
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type WorkflowStepResult = {
  expectationResults: ExpectationResult[];
  record: FlowWorkflowRecord;
  submittedRuleVerification: boolean;
};

type NormalizedLangTextEntry = {
  lang?: string;
  text: string;
};

type OwnerReferenceSummary = {
  refObjectId?: string;
  shortDescription: NormalizedLangTextEntry[];
  type?: string;
  uri?: string;
  version?: string;
};

export type RefVersionItem = {
  currentVersion: string;
  description?: any[];
  id: string;
  key: string;
  newDescription?: any[];
  newVersion: string;
  type: string;
};

type ExpectationKey =
  | 'create.rowExists'
  | 'create.jsonOrderedMatchesUploaded'
  | 'create.userIdMatchesCurrentUser'
  | 'create.stateCode'
  | 'create.version'
  | 'create.ruleVerification'
  | 'create.teamIdNull'
  | 'create.reviewsNull'
  | 'create.permanentUriMatchesRuntimeIdAndVersion'
  | 'create.ownerRefIdMatchesRuntimeId'
  | 'create.ownerRefUriMatchesRuntimeId'
  | 'create.ownerRefVersionEqualsCreateVersion'
  | 'createVersion.rowExists'
  | 'createVersion.sameIdAsCreate'
  | 'createVersion.version'
  | 'createVersion.ruleVerification'
  | 'createVersion.sameContentExceptVersionTimestampPermanentUri'
  | 'createVersion.permanentUriMatchesRuntimeIdAndVersion'
  | 'createVersion.ownerRefIdMatchesRuntimeId'
  | 'createVersion.ownerRefUriMatchesRuntimeId'
  | 'createVersion.ownerRefVersionStillEqualsCreateVersion'
  | 'updateReference.rowExists'
  | 'updateReference.version'
  | 'updateReference.ruleVerification'
  | 'updateReference.newVersionCandidateFound'
  | 'updateReference.ownerRefIdMatchesRuntimeId'
  | 'updateReference.ownerRefUriMatchesRuntimeId'
  | 'updateReference.ownerRefVersionEqualsCreatedVersion'
  | 'updateReference.ownerRefShortDescriptionMatchesCurrentShortName'
  | 'updateReference.savedVersionUnchanged';

type ParsedWorkflowExpectation = {
  expected: boolean | number | string | null;
  key: ExpectationKey;
  label: string;
};

type WorkflowActuals = Record<ExpectationKey, boolean | number | string | null>;
type ExpectationSection = 'create' | 'createVersion' | 'updateReference';

type LoadedWorkflowModules = {
  flowsUtil: {
    genFlowFromData: (data: any) => any;
    genFlowJsonOrdered: (id: string, data: any) => Record<string, any>;
  };
  generalApi: {
    getTeamIdByUserId: () => Promise<string | null>;
  };
  review: {
    validateDatasetRuleVerification: (
      datasetType: 'flow data set',
      orderedJson: Record<string, any>,
      userTeamId?: string,
    ) => Promise<{
      datasetSdkValid: boolean;
      nonExistentRef: unknown[];
      ruleVerification: boolean;
      unRuleVerification: unknown[];
    }>;
  };
  supabase: SupabaseClient;
  updateReference: {
    getRefsOfCurrentVersion: (initData: any) => Promise<{
      oldRefs: RefVersionItem[];
    }>;
    getRefsOfNewVersion: (initData: any) => Promise<{
      newRefs: RefVersionItem[];
      oldRefs: RefVersionItem[];
    }>;
    updateRefsData: (obj: any, newRefs: RefVersionItem[], updateVersion: boolean) => any;
  };
};

type VersionStageSummary = {
  comparableJsonMatchesCreate: boolean;
  newVersion: string;
  ownerReference: OwnerReferenceSummary;
  permanentDataSetUri?: string;
};

type UpdateReferenceStageSummary = {
  availableNewRefCount: number;
  currentShortName: NormalizedLangTextEntry[];
  ownerReference: OwnerReferenceSummary;
  selectedNewRef?: Pick<RefVersionItem, 'currentVersion' | 'id' | 'newVersion' | 'type'>;
};

export type FlowCreateVersionUpdateReferenceCliOptions = {
  dataFile: string;
  expectedFile: string;
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

export type FlowCreateVersionUpdateReferenceResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createStep: WorkflowStepResult;
  createVersionStep: WorkflowStepResult;
  createdVersions: string[];
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  referenceUpdate: UpdateReferenceStageSummary;
  runtimeFixture: RuntimeFixture;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  supabaseTarget: SupabaseTarget;
  updateReferenceStep: WorkflowStepResult;
  versionCreation: VersionStageSummary;
};

type StepRuntimeRecord = {
  expectationResults: ExpectationResult[];
  persistedRecord: Omit<FlowWorkflowRecord, 'json_ordered'>;
  submittedRuleVerification: boolean;
};

export type FlowCreateVersionUpdateReferenceRuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  create: StepRuntimeRecord & {
    fixtureFile: string;
    runtimeId: string;
    sourceFixtureId: string;
  };
  createVersion: StepRuntimeRecord & {
    expectedFile: string;
    summary: VersionStageSummary;
  };
  createdAt: string;
  createdVersions: string[];
  frontendProbe: FrontendProbeResult;
  frontendUrl?: string;
  keepData: boolean;
  passed: boolean;
  role: string;
  supabase: {
    apiUrl: string;
    dashboardUrl?: string;
    projectId?: string;
  };
  updateReference: StepRuntimeRecord & {
    expectedFile: string;
    summary: UpdateReferenceStageSummary;
  };
  user: {
    email: string;
    userId: string;
  };
};

export type FlowCreateVersionUpdateReferenceDependencies = {
  frontendFetchImpl?: typeof fetch;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedWorkflowModules>;
};

export const FLOW_CREATE_VERSION_UPDATE_REFERENCE_DATA_WORKFLOW_HELP = `Flow create-version-update-reference data workflow

Usage:
  npm run test:flows:create-version-update-reference -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:flows:create-version-update-reference -- --role admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Workflow:
  1. Create one flow from tests/data-workflows/fixtures/data/flows/004_create_version_update_reference.json
  2. Create a new version on the same flow id
  3. Update the self-reference on the new version to the latest version

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/flows/004_create_version_update_reference.json
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep all created versions after the workflow (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the workflow records after validation
  --no-keep-created                Alias of --no-keep-data
  --generate-id                    Replace the fixture UUID with a fresh runtime UUID (default)
  --no-generate-id                 Reuse the fixture UUID from the file as-is
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

const EXPECTATION_KEYS = new Set<ExpectationKey>([
  'create.rowExists',
  'create.jsonOrderedMatchesUploaded',
  'create.userIdMatchesCurrentUser',
  'create.stateCode',
  'create.version',
  'create.ruleVerification',
  'create.teamIdNull',
  'create.reviewsNull',
  'create.permanentUriMatchesRuntimeIdAndVersion',
  'create.ownerRefIdMatchesRuntimeId',
  'create.ownerRefUriMatchesRuntimeId',
  'create.ownerRefVersionEqualsCreateVersion',
  'createVersion.rowExists',
  'createVersion.sameIdAsCreate',
  'createVersion.version',
  'createVersion.ruleVerification',
  'createVersion.sameContentExceptVersionTimestampPermanentUri',
  'createVersion.permanentUriMatchesRuntimeIdAndVersion',
  'createVersion.ownerRefIdMatchesRuntimeId',
  'createVersion.ownerRefUriMatchesRuntimeId',
  'createVersion.ownerRefVersionStillEqualsCreateVersion',
  'updateReference.rowExists',
  'updateReference.version',
  'updateReference.ruleVerification',
  'updateReference.newVersionCandidateFound',
  'updateReference.ownerRefIdMatchesRuntimeId',
  'updateReference.ownerRefUriMatchesRuntimeId',
  'updateReference.ownerRefVersionEqualsCreatedVersion',
  'updateReference.ownerRefShortDescriptionMatchesCurrentShortName',
  'updateReference.savedVersionUnchanged',
]);

const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);
const FLOW_VERSION_PATH = [
  'flowDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:dataSetVersion',
] as const;
const FLOW_TIMESTAMP_PATH = [
  'flowDataSet',
  'administrativeInformation',
  'dataEntryBy',
  'common:timeStamp',
] as const;
const FLOW_PERMANENT_URI_PATH = [
  'flowDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:permanentDataSetURI',
] as const;

export function parseCreateVersionUpdateReferenceCliArgs(
  argv: string[],
  cwd = process.cwd(),
): FlowCreateVersionUpdateReferenceCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: FlowCreateVersionUpdateReferenceCliOptions = {
    dataFile: path.resolve(cwd, DEFAULT_FLOW_CREATE_VERSION_UPDATE_REFERENCE_FIXTURE_PATH),
    expectedFile: path.resolve(cwd, DEFAULT_FLOW_CREATE_VERSION_UPDATE_REFERENCE_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_FLOW_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_FLOW_CREATE_VERSION_UPDATE_REFERENCE_FIXTURE_PATH),
      cwd,
    ),
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
      case 'data-file':
        options.dataFile = path.resolve(
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
    options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.dataFile, cwd);
  }

  return options;
}

export function buildCreateVersionUpdateReferenceExpectations(): ParsedWorkflowExpectation[] {
  return [
    buildExpectation('create.rowExists', true, 'Create row exists'),
    buildExpectation(
      'create.jsonOrderedMatchesUploaded',
      true,
      'Create json_ordered matches submitted jsonOrdered',
    ),
    buildExpectation(
      'create.userIdMatchesCurrentUser',
      true,
      'Create user_id matches current user',
    ),
    buildExpectation('create.stateCode', 0, 'Create state_code is 0'),
    buildExpectation('create.version', '01.01.000', 'Create version is 01.01.000'),
    buildExpectation('create.teamIdNull', true, 'Create team_id is null'),
    buildExpectation('create.ruleVerification', false, 'Create rule_verification is false'),
    buildExpectation('create.reviewsNull', true, 'Create reviews is null'),
    buildExpectation('createVersion.rowExists', true, 'Create-version row exists'),
    buildExpectation(
      'createVersion.sameIdAsCreate',
      true,
      'Create-version id matches created record',
    ),
    buildExpectation('createVersion.version', '01.01.001', 'Create-version version is 01.01.001'),
    buildExpectation(
      'createVersion.sameContentExceptVersionTimestampPermanentUri',
      true,
      'Create-version content matches source except version, timestamp, and permanent URI',
    ),
    buildExpectation(
      'createVersion.ruleVerification',
      false,
      'Create-version rule_verification is false',
    ),
    buildExpectation('updateReference.rowExists', true, 'Update-reference row exists'),
    buildExpectation(
      'updateReference.version',
      '01.01.001',
      'Update-reference version is 01.01.001',
    ),
    buildExpectation(
      'updateReference.ruleVerification',
      false,
      'Update-reference rule_verification is false',
    ),
  ];
}

export function evaluateCreateVersionUpdateReferenceExpectations(
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

export function incrementDatasetVersion(version: string): string {
  const parts = version.split('.').map((part) => Number(part));

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part) || part < 0) ||
    version.split('.').some((part, index) => part.length !== [2, 2, 3][index])
  ) {
    throw new Error(`Invalid dataset version: ${version}`);
  }

  parts[2] += 1;

  if (parts[2] > 999) {
    parts[2] = 0;
    parts[1] += 1;

    if (parts[1] > 99) {
      parts[1] = 0;
      parts[0] += 1;
    }
  }

  return `${String(parts[0]).padStart(2, '0')}.${String(parts[1]).padStart(2, '0')}.${String(parts[2]).padStart(3, '0')}`;
}

export function normalizeJsonForCreateVersionComparison(jsonOrdered: Record<string, unknown>) {
  const clonedJson = deepClone(jsonOrdered);
  deleteNestedValue(clonedJson, FLOW_VERSION_PATH);
  deleteNestedValue(clonedJson, FLOW_TIMESTAMP_PATH);
  deleteNestedValue(clonedJson, FLOW_PERMANENT_URI_PATH);
  return deepSortJson(clonedJson);
}

export function buildFlowCreateVersionUpdateReferenceRuntimeRecord(
  options: Pick<
    FlowCreateVersionUpdateReferenceCliOptions,
    'dataFile' | 'expectedFile' | 'frontendUrl' | 'keepData'
  >,
  result: Pick<
    FlowCreateVersionUpdateReferenceResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'createStep'
    | 'createVersionStep'
    | 'createdVersions'
    | 'frontendProbe'
    | 'referenceUpdate'
    | 'runtimeFixture'
    | 'selectedUser'
    | 'supabaseTarget'
    | 'updateReferenceStep'
    | 'versionCreation'
  > & { passed: boolean },
): FlowCreateVersionUpdateReferenceRuntimeRecord {
  const { json_ordered: _createJsonOrdered, ...createPersistedRecord } = result.createStep.record;
  const { json_ordered: _createVersionJsonOrdered, ...createVersionPersistedRecord } =
    result.createVersionStep.record;
  const { json_ordered: _updateReferenceJsonOrdered, ...updateReferencePersistedRecord } =
    result.updateReferenceStep.record;

  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    create: {
      expectationResults: result.createStep.expectationResults,
      fixtureFile: options.dataFile,
      persistedRecord: createPersistedRecord,
      runtimeId: result.runtimeFixture.runtimeId,
      sourceFixtureId: result.runtimeFixture.sourceFixtureId,
      submittedRuleVerification: result.createStep.submittedRuleVerification,
    },
    createVersion: {
      expectationResults: result.createVersionStep.expectationResults,
      expectedFile: options.expectedFile,
      persistedRecord: createVersionPersistedRecord,
      submittedRuleVerification: result.createVersionStep.submittedRuleVerification,
      summary: result.versionCreation,
    },
    createdAt: new Date().toISOString(),
    createdVersions: result.createdVersions,
    frontendProbe: result.frontendProbe,
    frontendUrl: options.frontendUrl,
    keepData: options.keepData,
    passed: result.passed,
    role: result.selectedUser.role,
    supabase: {
      apiUrl: result.supabaseTarget.apiUrl,
      dashboardUrl: result.supabaseTarget.dashboardUrl,
      projectId: result.supabaseTarget.projectId,
    },
    updateReference: {
      expectationResults: result.updateReferenceStep.expectationResults,
      expectedFile: options.expectedFile,
      persistedRecord: updateReferencePersistedRecord,
      submittedRuleVerification: result.updateReferenceStep.submittedRuleVerification,
      summary: result.referenceUpdate,
    },
    user: {
      email: result.selectedUser.email,
      userId: result.selectedUser.userId,
    },
  };
}

export async function runFlowCreateVersionUpdateReferenceSmoke(
  options: FlowCreateVersionUpdateReferenceCliOptions,
  dependencies: FlowCreateVersionUpdateReferenceDependencies = {},
): Promise<FlowCreateVersionUpdateReferenceResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadFlowFixture(options.dataFile), {
    generateId: options.generateId,
  });
  const expectations = buildCreateVersionUpdateReferenceExpectations();
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
    requiredSeeds: getReferenceSeedKeysForTable('flows'),
    supabase: modules.supabase,
  });
  patchJsonOrderedWithActiveReferenceSeeds(runtimeFixture.fixture.jsonOrdered, {
    currentDataset: {
      id: runtimeFixture.runtimeId,
      table: 'flows',
    },
  });

  let cleanupAttempted = false;
  let cleanupPassed = true;
  const createdVersions: string[] = [];

  try {
    const userTeamId = (await modules.generalApi.getTeamIdByUserId()) ?? '';

    const createValidationResult = await modules.review.validateDatasetRuleVerification(
      'flow data set',
      runtimeFixture.fixture.jsonOrdered,
      userTeamId,
    );

    const createResult = await modules.supabase.functions.invoke('app_dataset_create', {
      body: {
        id: runtimeFixture.runtimeId,
        jsonOrdered: runtimeFixture.fixture.jsonOrdered,
        ruleVerification: createValidationResult.ruleVerification,
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
      throw new Error(`Create flow failed: ${createResult.error.message}.${duplicateHint}`);
    }

    const createdRecord = await queryFlowRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      runtimeFixture.version,
    );
    createdVersions.push(createdRecord.version);

    const createVersion = incrementDatasetVersion(createdRecord.version);
    const createVersionFormData = modules.flowsUtil.genFlowFromData(
      (createdRecord.json_ordered as Record<string, any>)?.flowDataSet ?? {},
    );

    if (!createVersionFormData) {
      throw new Error('Failed to derive flow form data from the created record.');
    }

    if (!createVersionFormData.administrativeInformation) {
      createVersionFormData.administrativeInformation = {};
    }
    if (!createVersionFormData.administrativeInformation.publicationAndOwnership) {
      createVersionFormData.administrativeInformation.publicationAndOwnership = {};
    }
    createVersionFormData.administrativeInformation.publicationAndOwnership[
      'common:dataSetVersion'
    ] = createVersion;

    const createVersionJsonOrdered = prepareFlowJsonOrderedForRuntime(
      modules.flowsUtil.genFlowJsonOrdered(runtimeFixture.runtimeId, createVersionFormData),
      {
        runtimeId: runtimeFixture.runtimeId,
        version: createVersion,
      },
    );

    const createVersionValidationResult = await modules.review.validateDatasetRuleVerification(
      'flow data set',
      createVersionJsonOrdered.jsonOrdered,
      userTeamId,
    );

    const createVersionResult = await modules.supabase.functions.invoke('app_dataset_create', {
      body: {
        id: runtimeFixture.runtimeId,
        jsonOrdered: createVersionJsonOrdered.jsonOrdered,
        ruleVerification: createVersionValidationResult.ruleVerification,
        table: 'flows',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (createVersionResult.error) {
      throw new Error(`Create flow version failed: ${createVersionResult.error.message}.`);
    }

    const createdVersionRecord = await queryFlowRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      createVersion,
    );
    createdVersions.push(createdVersionRecord.version);

    const versionComparableJson = normalizeJsonForCreateVersionComparison(
      createdVersionRecord.json_ordered,
    );
    const createdComparableJson = normalizeJsonForCreateVersionComparison(
      createdRecord.json_ordered,
    );
    const comparableJsonMatchesCreate =
      JSON.stringify(versionComparableJson) === JSON.stringify(createdComparableJson);
    const createOwnerReference = extractOwnerReferenceSummary(createdRecord.json_ordered);
    const createVersionOwnerReference = extractOwnerReferenceSummary(
      createdVersionRecord.json_ordered,
    );

    const updateReferenceFormData = modules.flowsUtil.genFlowFromData(
      (createdVersionRecord.json_ordered as Record<string, any>)?.flowDataSet ?? {},
    );

    if (!updateReferenceFormData) {
      throw new Error('Failed to derive flow form data from the created version record.');
    }

    const { newRefs } = await modules.updateReference.getRefsOfNewVersion(
      deepClone(updateReferenceFormData),
    );
    const expectedUpdatedOwnerVersion =
      expectations.find(
        (expectation) => expectation.key === 'updateReference.ownerRefVersionEqualsCreatedVersion',
      )?.expected ?? null;
    const selectedNewRef = selectCreatedVersionReferenceCandidate(
      newRefs,
      createVersionOwnerReference,
      typeof expectedUpdatedOwnerVersion === 'string' ? expectedUpdatedOwnerVersion : null,
    );

    const updatedReferenceFormData = deepClone(updateReferenceFormData);
    if (selectedNewRef) {
      modules.updateReference.updateRefsData(updatedReferenceFormData, [selectedNewRef], true);
      const { oldRefs: currentVersionRefs } =
        await modules.updateReference.getRefsOfCurrentVersion(updatedReferenceFormData);
      modules.updateReference.updateRefsData(updatedReferenceFormData, currentVersionRefs, false);
    }

    const updatedJsonOrdered = prepareFlowJsonOrderedForRuntime(
      modules.flowsUtil.genFlowJsonOrdered(runtimeFixture.runtimeId, updatedReferenceFormData),
      {
        runtimeId: runtimeFixture.runtimeId,
        version: createdVersionRecord.version,
      },
    );

    const updateReferenceValidationResult = await modules.review.validateDatasetRuleVerification(
      'flow data set',
      updatedJsonOrdered.jsonOrdered,
      userTeamId,
    );

    const updateReferenceResult = await modules.supabase.functions.invoke(
      'app_dataset_save_draft',
      {
        body: {
          id: runtimeFixture.runtimeId,
          jsonOrdered: updatedJsonOrdered.jsonOrdered,
          ruleVerification: updateReferenceValidationResult.ruleVerification,
          table: 'flows',
          version: createdVersionRecord.version,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        region: FunctionRegion.UsEast1,
      },
    );

    if (updateReferenceResult.error) {
      throw new Error(`Update flow reference failed: ${updateReferenceResult.error.message}.`);
    }

    const updatedRecord = await queryFlowRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      createdVersionRecord.version,
    );

    const updatedOwnerReference = extractOwnerReferenceSummary(updatedRecord.json_ordered);
    const expectedOwnerDescription = selectedNewRef
      ? normalizeLangTextValue(selectedNewRef.newDescription)
      : createVersionOwnerReference.shortDescription;
    const uploadedOwnerReference = extractOwnerReferenceSummary(runtimeFixture.fixture.jsonOrdered);

    const actuals: WorkflowActuals = {
      'create.rowExists': Boolean(createdRecord.id),
      'create.jsonOrderedMatchesUploaded':
        JSON.stringify(deepSortJson(createdRecord.json_ordered)) ===
        JSON.stringify(deepSortJson(runtimeFixture.fixture.jsonOrdered)),
      'create.userIdMatchesCurrentUser': createdRecord.user_id === selectedUser.userId,
      'create.stateCode': createdRecord.state_code,
      'create.version': createdRecord.version,
      'create.ruleVerification': createdRecord.rule_verification,
      'create.teamIdNull': createdRecord.team_id === null,
      'create.reviewsNull': createdRecord.reviews === null,
      'create.permanentUriMatchesRuntimeIdAndVersion':
        extractPermanentDataSetUri(createdRecord.json_ordered) ===
        buildPermanentDataSetUri(runtimeFixture.runtimeId, createdRecord.version),
      'create.ownerRefIdMatchesRuntimeId': createOwnerReference.refObjectId ?? null,
      'create.ownerRefUriMatchesRuntimeId': createOwnerReference.uri === uploadedOwnerReference.uri,
      'create.ownerRefVersionEqualsCreateVersion': createOwnerReference.version ?? null,
      'createVersion.rowExists': Boolean(createdVersionRecord.id),
      'createVersion.sameIdAsCreate': createdVersionRecord.id === createdRecord.id,
      'createVersion.version': createdVersionRecord.version,
      'createVersion.ruleVerification': createdVersionRecord.rule_verification,
      'createVersion.sameContentExceptVersionTimestampPermanentUri': comparableJsonMatchesCreate,
      'createVersion.permanentUriMatchesRuntimeIdAndVersion':
        extractPermanentDataSetUri(createdVersionRecord.json_ordered) ===
        buildPermanentDataSetUri(runtimeFixture.runtimeId, createdVersionRecord.version),
      'createVersion.ownerRefIdMatchesRuntimeId':
        createVersionOwnerReference.refObjectId === runtimeFixture.runtimeId,
      'createVersion.ownerRefUriMatchesRuntimeId':
        createVersionOwnerReference.uri === buildFlowReferenceUri(runtimeFixture.runtimeId),
      'createVersion.ownerRefVersionStillEqualsCreateVersion':
        createVersionOwnerReference.version ?? null,
      'updateReference.rowExists': Boolean(updatedRecord.id),
      'updateReference.version': updatedRecord.version,
      'updateReference.ruleVerification': updatedRecord.rule_verification,
      'updateReference.newVersionCandidateFound': Boolean(selectedNewRef),
      'updateReference.ownerRefIdMatchesRuntimeId': updatedOwnerReference.refObjectId ?? null,
      'updateReference.ownerRefUriMatchesRuntimeId':
        updatedOwnerReference.uri === buildFlowReferenceUri(runtimeFixture.runtimeId),
      'updateReference.ownerRefVersionEqualsCreatedVersion': updatedOwnerReference.version ?? null,
      'updateReference.ownerRefShortDescriptionMatchesCurrentShortName':
        normalizedLangTextEntriesEqual(
          updatedOwnerReference.shortDescription,
          expectedOwnerDescription,
        ),
      'updateReference.savedVersionUnchanged':
        updatedRecord.version === createdVersionRecord.version,
    };

    const expectationResults = evaluateCreateVersionUpdateReferenceExpectations(
      actuals,
      expectations,
    );

    const createStep: WorkflowStepResult = {
      expectationResults: filterExpectationResultsBySection(
        expectationResults,
        expectations,
        'create.',
      ),
      record: createdRecord,
      submittedRuleVerification: createValidationResult.ruleVerification,
    };
    const createVersionStep: WorkflowStepResult = {
      expectationResults: filterExpectationResultsBySection(
        expectationResults,
        expectations,
        'createVersion.',
      ),
      record: createdVersionRecord,
      submittedRuleVerification: createVersionValidationResult.ruleVerification,
    };
    const updateReferenceStep: WorkflowStepResult = {
      expectationResults: filterExpectationResultsBySection(
        expectationResults,
        expectations,
        'updateReference.',
      ),
      record: updatedRecord,
      submittedRuleVerification: updateReferenceValidationResult.ruleVerification,
    };

    if (!options.keepData) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedFlowVersions(
        modules.supabase,
        accessToken,
        runtimeFixture.runtimeId,
        createdVersions,
      );
    }

    const versionCreation: VersionStageSummary = {
      comparableJsonMatchesCreate,
      newVersion: createdVersionRecord.version,
      ownerReference: createVersionOwnerReference,
      permanentDataSetUri: extractPermanentDataSetUri(createdVersionRecord.json_ordered),
    };
    const referenceUpdate: UpdateReferenceStageSummary = {
      availableNewRefCount: newRefs.length,
      currentShortName: expectedOwnerDescription,
      ownerReference: updatedOwnerReference,
      selectedNewRef: selectedNewRef
        ? {
            currentVersion: selectedNewRef.currentVersion,
            id: selectedNewRef.id,
            newVersion: selectedNewRef.newVersion,
            type: selectedNewRef.type,
          }
        : undefined,
    };

    const passed = expectationResults.every((expectation) => expectation.passed) && cleanupPassed;
    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildFlowCreateVersionUpdateReferenceRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        createStep,
        createVersionStep,
        createdVersions,
        frontendProbe,
        passed,
        referenceUpdate,
        runtimeFixture,
        selectedUser,
        supabaseTarget,
        updateReferenceStep,
        versionCreation,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      createStep,
      createVersionStep,
      createdVersions,
      frontendProbe,
      passed,
      referenceUpdate,
      runtimeFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      selectedUser,
      supabaseTarget,
      updateReferenceStep,
      versionCreation,
    };
  } catch (error) {
    if (!options.keepData && createdVersions.length > 0) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedFlowVersions(
        modules.supabase,
        accessToken,
        runtimeFixture.runtimeId,
        createdVersions,
      );
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

async function queryFlowRecord(
  supabase: SupabaseClient,
  id: string,
  version: string,
): Promise<FlowWorkflowRecord> {
  const result = await supabase
    .from('flows')
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification,reviews')
    .eq('id', id)
    .eq('version', version)
    .maybeSingle<FlowWorkflowRecord>();

  if (result.error || !result.data) {
    throw new Error(
      `Failed to query flow by id/version: ${result.error?.message ?? 'record not found'}`,
    );
  }

  return result.data;
}

async function loadWorkflowModules(supabaseTarget: SupabaseTarget): Promise<LoadedWorkflowModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const generalApiModule = await import('../../../../src/services/general/api');
  const reviewModule = await import('../../../../src/pages/Utils/review');
  const flowsUtilModule = await import('../../../../src/services/flows/util');
  const updateReferenceModule = await import('../../../../src/pages/Utils/updateReference');

  const supabaseExports = extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule);
  const generalApiExports =
    extractModuleExports<LoadedWorkflowModules['generalApi']>(generalApiModule);
  const reviewExports = extractModuleExports<LoadedWorkflowModules['review']>(reviewModule);
  const flowsUtilExports =
    extractModuleExports<LoadedWorkflowModules['flowsUtil']>(flowsUtilModule);
  const updateReferenceExports =
    extractModuleExports<LoadedWorkflowModules['updateReference']>(updateReferenceModule);

  return {
    flowsUtil: {
      genFlowFromData: flowsUtilExports.genFlowFromData,
      genFlowJsonOrdered: flowsUtilExports.genFlowJsonOrdered,
    },
    generalApi: {
      getTeamIdByUserId: generalApiExports.getTeamIdByUserId,
    },
    review: {
      validateDatasetRuleVerification: reviewExports.validateDatasetRuleVerification,
    },
    supabase: supabaseExports.supabase,
    updateReference: {
      getRefsOfCurrentVersion: updateReferenceExports.getRefsOfCurrentVersion,
      getRefsOfNewVersion: updateReferenceExports.getRefsOfNewVersion,
      updateRefsData: updateReferenceExports.updateRefsData,
    },
  };
}

function extractModuleExports<T>(moduleValue: Record<string, unknown>) {
  return ((moduleValue['module.exports'] as T | undefined) ??
    (moduleValue.default as T | undefined) ??
    (moduleValue as T)) as T;
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

function buildFlowReferenceUri(id: string) {
  return `../flows/${id}.xml`;
}

function extractOwnerReferenceSummary(jsonOrdered: Record<string, unknown>): OwnerReferenceSummary {
  const reference = getNestedValue(jsonOrdered, [
    'flowDataSet',
    'administrativeInformation',
    'publicationAndOwnership',
    'common:referenceToOwnershipOfDataSet',
  ]) as Record<string, unknown> | undefined;

  return {
    refObjectId:
      typeof reference?.['@refObjectId'] === 'string'
        ? String(reference['@refObjectId'])
        : undefined,
    shortDescription: normalizeLangTextValue(reference?.['common:shortDescription']),
    type: typeof reference?.['@type'] === 'string' ? String(reference['@type']) : undefined,
    uri: typeof reference?.['@uri'] === 'string' ? String(reference['@uri']) : undefined,
    version:
      typeof reference?.['@version'] === 'string' ? String(reference['@version']) : undefined,
  };
}

function extractPermanentDataSetUri(jsonOrdered: Record<string, unknown>) {
  const uri = getNestedValue(jsonOrdered, FLOW_PERMANENT_URI_PATH);
  return typeof uri === 'string' ? uri : undefined;
}

function selectCreatedVersionReferenceCandidate(
  newRefs: RefVersionItem[],
  ownerReference: OwnerReferenceSummary,
  expectedNewVersion: string | null,
) {
  return (
    newRefs.find(
      (reference) =>
        reference.id === ownerReference.refObjectId &&
        reference.type === ownerReference.type &&
        reference.currentVersion === ownerReference.version &&
        (expectedNewVersion === null || reference.newVersion === expectedNewVersion),
    ) ?? null
  );
}

async function cleanupCreatedFlowVersions(
  supabase: SupabaseClient,
  accessToken: string,
  runtimeId: string,
  createdVersions: string[],
) {
  const uniqueVersions = Array.from(new Set(createdVersions)).reverse();
  let cleanupPassed = true;

  for (const version of uniqueVersions) {
    const deleteResult = await supabase.functions.invoke('app_dataset_delete', {
      body: {
        id: runtimeId,
        table: 'flows',
        version,
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

function filterExpectationResultsBySection(
  expectationResults: ExpectationResult[],
  expectations: ParsedWorkflowExpectation[],
  prefix: `${ExpectationSection}.`,
) {
  return expectationResults.filter((_expectation, index) =>
    expectations[index]?.key.startsWith(prefix),
  );
}

function normalizedLangTextEntriesEqual(
  left: NormalizedLangTextEntry[],
  right: NormalizedLangTextEntry[],
) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeLangTextValue(value: unknown): NormalizedLangTextEntry[] {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        if (typeof entry === 'string' && entry.trim()) {
          return {
            text: entry.trim(),
          };
        }
        return null;
      }

      const text =
        typeof (entry as Record<string, unknown>)['#text'] === 'string'
          ? String((entry as Record<string, unknown>)['#text']).trim()
          : '';
      const lang =
        typeof (entry as Record<string, unknown>)['@xml:lang'] === 'string'
          ? String((entry as Record<string, unknown>)['@xml:lang']).trim()
          : undefined;

      if (!text) {
        return null;
      }

      return {
        lang: lang || undefined,
        text,
      };
    })
    .filter((entry): entry is NormalizedLangTextEntry => entry !== null)
    .sort((left, right) => {
      const leftKey = `${left.lang ?? ''}:${left.text}`;
      const rightKey = `${right.lang ?? ''}:${right.text}`;
      return leftKey.localeCompare(rightKey);
    });
}

function getNestedValue(source: Record<string, any>, keys: readonly string[]) {
  return keys.reduce<any>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return current[key];
  }, source);
}

function deleteNestedValue(source: Record<string, unknown>, keys: readonly string[]) {
  let current: Record<string, unknown> | undefined = source;

  keys.slice(0, -1).forEach((key) => {
    const next = current?.[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current = undefined;
      return;
    }
    current = next as Record<string, unknown>;
  });

  if (!current) {
    return;
  }

  delete current[keys[keys.length - 1]];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
