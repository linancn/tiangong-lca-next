import { readFile } from 'node:fs/promises';
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
  DEFAULT_SOURCE_FIXTURE_PATH,
  DEFAULT_SOURCE_ROLE,
  DEFAULT_USERS_PATH,
  type ExpectationResult,
  type FrontendProbeResult,
  type ParsedExpectation,
  type RuntimeFixture,
  type SupabaseTarget,
  buildCreateExpectations,
  evaluateExpectations,
  loadSourceFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  prepareSourceJsonOrderedForRuntime,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  writeRuntimeRecord,
} from './sources-create-workflow-lib';

export const DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/sources/002_check_data_success.json';
export const DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/002_check_data_success.md';

type SupportedFlag =
  | 'check-data-file'
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
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type ValidationSummary = {
  datasetSdkValid: boolean;
  nonExistentRefCount: number;
  ruleVerification: boolean;
  unRuleVerificationCount: number;
};

type WorkflowStepResult = {
  expectationResults: ExpectationResult[];
  record: SourceWorkflowRecord;
  submittedRuleVerification: boolean;
};

export type CheckDataCliOptions = {
  checkDataFile: string;
  checkExpectedFile: string;
  createDataFile: string;
  createExpectedFile: string;
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

export type SourceCheckDataFixture = {
  json?: Record<string, any>;
  json_ordered?: Record<string, any>;
  jsonOrdered?: Record<string, any>;
  table?: string;
};

export type SourceCheckDataResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createStep: WorkflowStepResult;
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
  supabaseTarget: SupabaseTarget;
  updateStep: WorkflowStepResult;
  validation: ValidationSummary;
};

export type SourceCheckDataRuntimeRecord = {
  check: {
    expectedFile: string;
    expectationResults: ExpectationResult[];
    fixtureFile: string;
    persistedRecord: Omit<SourceWorkflowRecord, 'json_ordered'>;
    submittedRuleVerification: boolean;
    validation: ValidationSummary;
  };
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  create: {
    expectedFile: string;
    expectationResults: ExpectationResult[];
    fixtureFile: string;
    runtimeId: string;
    sourceFixtureId: string;
    submittedRuleVerification: boolean;
    version: string;
  };
  createdAt: string;
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
  user: {
    email: string;
    userId: string;
  };
};

export type SourceCheckDataDependencies = {
  frontendFetchImpl?: typeof fetch;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedValidationModules>;
};

type LoadedValidationModules = {
  generalApi: {
    getTeamIdByUserId: () => Promise<string | null>;
  };
  review: {
    validateDatasetRuleVerification: (
      datasetType: 'source data set',
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
};

export const SOURCE_CHECK_DATA_WORKFLOW_HELP = `Source check-data data workflow

Usage:
  npm run test:sources:check-data -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:sources:check-data -- --role admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Workflow:
  1. Create one source from tests/data-workflows/fixtures/data/sources/001_create.json
  2. Update the same source with tests/data-workflows/fixtures/data/sources/002_check_data_success.json
  3. Validate the updated record against code-owned expectations

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/sources/001_create.json
  --check-data-file <path>         Defaults to tests/data-workflows/fixtures/data/sources/002_check_data_success.json
  --data-file <path>               Alias of --check-data-file
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the workflow source after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the workflow source after validation
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

const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);

export function parseCheckDataCliArgs(argv: string[], cwd = process.cwd()): CheckDataCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: CheckDataCliOptions = {
    checkDataFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH),
    checkExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH),
    createDataFile: path.resolve(cwd, DEFAULT_SOURCE_FIXTURE_PATH),
    createExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_SOURCE_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH),
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
      case 'create-data-file':
        options.createDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'check-data-file':
      case 'data-file':
        options.checkDataFile = path.resolve(
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
    options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.checkDataFile, cwd);
  }

  return options;
}

export async function loadSourceCheckDataFixture(
  filePath: string,
): Promise<SourceCheckDataFixture> {
  const fixture = (await importJsonFile<SourceCheckDataFixture>(
    filePath,
  )) as SourceCheckDataFixture | null;

  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    throw new Error(`Invalid source check-data fixture: ${filePath}`);
  }

  if (fixture.table && fixture.table !== 'sources') {
    throw new Error(`Check-data fixture table must be "sources": ${filePath}`);
  }

  const orderedJson = getFixtureOrderedJson(fixture);
  if (!orderedJson) {
    throw new Error(
      `Fixture is missing a valid "jsonOrdered", "json_ordered", or "json": ${filePath}`,
    );
  }

  return fixture;
}

export function getFixtureOrderedJson(fixture: SourceCheckDataFixture) {
  if (fixture.jsonOrdered && typeof fixture.jsonOrdered === 'object') {
    return fixture.jsonOrdered;
  }

  if (fixture.json_ordered && typeof fixture.json_ordered === 'object') {
    return fixture.json_ordered;
  }

  if (fixture.json && typeof fixture.json === 'object') {
    return fixture.json;
  }

  return null;
}

export function getExpectedRuleVerification(expectations: ParsedExpectation[]) {
  const matchedExpectation = expectations.find(
    (expectation) => expectation.kind === 'ruleVerificationEquals',
  );

  return matchedExpectation?.kind === 'ruleVerificationEquals' &&
    typeof matchedExpectation.expected === 'boolean'
    ? matchedExpectation.expected
    : undefined;
}

export function buildValidationExpectationResults(
  validation: ValidationSummary,
  expectedRuleVerification?: boolean,
): ExpectationResult[] {
  const results: ExpectationResult[] = [];

  if (typeof expectedRuleVerification === 'boolean') {
    results.push({
      actual: validation.ruleVerification,
      expected: expectedRuleVerification,
      label: 'validateDatasetRuleVerification.ruleVerification matches expected rule_verification',
      passed: validation.ruleVerification === expectedRuleVerification,
    });

    if (expectedRuleVerification) {
      results.push({
        actual: validation.datasetSdkValid,
        expected: true,
        label: 'validateDatasetRuleVerification.datasetSdkValid remains true for success cases',
        passed: validation.datasetSdkValid === true,
      });
      results.push({
        actual: validation.unRuleVerificationCount,
        expected: 0,
        label: 'validateDatasetRuleVerification.unRuleVerification stays empty for success cases',
        passed: validation.unRuleVerificationCount === 0,
      });
      results.push({
        actual: validation.nonExistentRefCount,
        expected: 0,
        label: 'validateDatasetRuleVerification.nonExistentRef stays empty for success cases',
        passed: validation.nonExistentRefCount === 0,
      });
    }
  }

  return results;
}

export function buildSourceCheckDataRuntimeRecord(
  options: Pick<
    CheckDataCliOptions,
    | 'checkDataFile'
    | 'checkExpectedFile'
    | 'createDataFile'
    | 'createExpectedFile'
    | 'frontendUrl'
    | 'keepData'
  >,
  result: Pick<
    SourceCheckDataResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'createStep'
    | 'frontendProbe'
    | 'runtimeFixture'
    | 'selectedUser'
    | 'supabaseTarget'
    | 'updateStep'
    | 'validation'
  > & { passed: boolean },
): SourceCheckDataRuntimeRecord {
  const { json_ordered: _jsonOrdered, ...persistedRecord } = result.updateStep.record;

  return {
    check: {
      expectedFile: options.checkExpectedFile,
      expectationResults: result.updateStep.expectationResults,
      fixtureFile: options.checkDataFile,
      persistedRecord,
      submittedRuleVerification: result.updateStep.submittedRuleVerification,
      validation: result.validation,
    },
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    create: {
      expectedFile: options.createExpectedFile,
      expectationResults: result.createStep.expectationResults,
      fixtureFile: options.createDataFile,
      runtimeId: result.runtimeFixture.runtimeId,
      sourceFixtureId: result.runtimeFixture.sourceFixtureId,
      submittedRuleVerification: result.createStep.submittedRuleVerification,
      version: result.runtimeFixture.version,
    },
    createdAt: new Date().toISOString(),
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
    user: {
      email: result.selectedUser.email,
      userId: result.selectedUser.userId,
    },
  };
}

export async function runSourceCheckDataSmoke(
  options: CheckDataCliOptions,
  dependencies: SourceCheckDataDependencies = {},
): Promise<SourceCheckDataResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadSourceFixture(options.createDataFile), {
    generateId: options.generateId,
  });
  const createExpectations = buildCreateExpectations({ labelPrefix: 'Create' });
  const checkFixture = await loadSourceCheckDataFixture(options.checkDataFile);
  const rawCheckOrderedJson = getFixtureOrderedJson(checkFixture);

  if (!rawCheckOrderedJson) {
    throw new Error(`Fixture ${options.checkDataFile} does not contain ordered source JSON.`);
  }

  const checkExpectations = buildCreateExpectations({
    labelPrefix: 'Check data',
    ruleVerification: true,
  });
  const expectedRuleVerification = getExpectedRuleVerification(checkExpectations);
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);

  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.frontendFetchImpl)
      : { ok: true, skipped: true };

  const modules = await (dependencies.modulesLoader ?? loadValidationModules)(supabaseTarget);

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
  let dataCreated = false;
  let activeRecordVersion: string | undefined;

  try {
    const userTeamId = (await modules.generalApi.getTeamIdByUserId()) ?? '';
    const createValidationResult = await modules.review.validateDatasetRuleVerification(
      'source data set',
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
      throw new Error(`Create source failed: ${createResult.error.message}.${duplicateHint}`);
    }

    dataCreated = true;
    activeRecordVersion = runtimeFixture.version;

    const createdRecord = await querySourceRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      runtimeFixture.version,
    );
    activeRecordVersion = createdRecord.version;

    const createStep: WorkflowStepResult = {
      expectationResults: evaluateExpectations({
        currentUserId: selectedUser.userId,
        expectations: createExpectations,
        record: createdRecord,
        uploadedJsonOrdered: runtimeFixture.fixture.jsonOrdered,
      }),
      record: createdRecord,
      submittedRuleVerification: createValidationResult.ruleVerification,
    };

    const preparedCheckJsonOrdered = prepareSourceJsonOrderedForRuntime(rawCheckOrderedJson, {
      runtimeId: runtimeFixture.runtimeId,
      version: createdRecord.version,
    });

    const updateValidationResult = await modules.review.validateDatasetRuleVerification(
      'source data set',
      preparedCheckJsonOrdered.jsonOrdered,
      userTeamId,
    );

    const updateResult = await modules.supabase.functions.invoke('app_dataset_save_draft', {
      body: {
        id: runtimeFixture.runtimeId,
        jsonOrdered: preparedCheckJsonOrdered.jsonOrdered,
        ruleVerification: updateValidationResult.ruleVerification,
        table: 'sources',
        version: createdRecord.version,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      region: FunctionRegion.UsEast1,
    });

    if (updateResult.error) {
      throw new Error(`Update source failed: ${updateResult.error.message}.`);
    }

    const updatedRecord = await querySourceRecord(
      modules.supabase,
      runtimeFixture.runtimeId,
      createdRecord.version,
    );
    activeRecordVersion = updatedRecord.version;

    const validation: ValidationSummary = {
      datasetSdkValid: updateValidationResult.datasetSdkValid,
      nonExistentRefCount: updateValidationResult.nonExistentRef.length,
      ruleVerification: updateValidationResult.ruleVerification,
      unRuleVerificationCount: updateValidationResult.unRuleVerification.length,
    };

    const updateExpectationResults = evaluateExpectations({
      currentUserId: selectedUser.userId,
      expectations: checkExpectations,
      record: updatedRecord,
      uploadedJsonOrdered: preparedCheckJsonOrdered.jsonOrdered,
    });
    const validationExpectationResults = buildValidationExpectationResults(
      validation,
      expectedRuleVerification,
    );

    const updateStep: WorkflowStepResult = {
      expectationResults: [...updateExpectationResults, ...validationExpectationResults],
      record: updatedRecord,
      submittedRuleVerification: updateValidationResult.ruleVerification,
    };

    if (!options.keepData) {
      cleanupAttempted = true;
      const deleteResult = await modules.supabase.functions.invoke('app_dataset_delete', {
        body: {
          id: runtimeFixture.runtimeId,
          table: 'sources',
          version: updatedRecord.version,
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

    const passed =
      createStep.expectationResults.every((expectation) => expectation.passed) &&
      updateStep.expectationResults.every((expectation) => expectation.passed) &&
      cleanupPassed;
    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildSourceCheckDataRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        createStep,
        frontendProbe,
        passed,
        runtimeFixture,
        selectedUser,
        supabaseTarget,
        updateStep,
        validation,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      createStep,
      frontendProbe,
      passed,
      runtimeFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      selectedUser,
      supabaseTarget,
      updateStep,
      validation,
    };
  } catch (error) {
    if (!options.keepData && dataCreated && activeRecordVersion) {
      cleanupAttempted = true;
      const cleanupResult = await modules.supabase.functions.invoke('app_dataset_delete', {
        body: {
          id: runtimeFixture.runtimeId,
          table: 'sources',
          version: activeRecordVersion,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        region: FunctionRegion.UsEast1,
      });

      if (cleanupResult.error) {
        cleanupPassed = false;
      }
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

async function querySourceRecord(
  supabase: SupabaseClient,
  id: string,
  version: string,
): Promise<SourceWorkflowRecord> {
  const result = await supabase
    .from('sources')
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification,reviews')
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

async function loadValidationModules(
  supabaseTarget: SupabaseTarget,
): Promise<LoadedValidationModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const generalApiModule = await import('../../../../src/services/general/api');
  const reviewModule = await import('../../../../src/pages/Utils/review');

  const supabaseExports = extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule);
  const generalApiExports =
    extractModuleExports<LoadedValidationModules['generalApi']>(generalApiModule);
  const reviewExports = extractModuleExports<LoadedValidationModules['review']>(reviewModule);

  return {
    generalApi: {
      getTeamIdByUserId: generalApiExports.getTeamIdByUserId,
    },
    review: {
      validateDatasetRuleVerification: reviewExports.validateDatasetRuleVerification,
    },
    supabase: supabaseExports.supabase,
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

async function importJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}
