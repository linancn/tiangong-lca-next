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
  DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH,
  DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH,
  buildValidationExpectationResults,
  getExpectedRuleVerification,
  getFixtureOrderedJson,
  loadSourceCheckDataFixture,
} from './sources-check-data-workflow-lib';
import {
  DEFAULT_SOURCE_EXPECTED_PATH,
  DEFAULT_SOURCE_FIXTURE_PATH,
  DEFAULT_SOURCE_ROLE,
  DEFAULT_USERS_PATH,
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
  type ExpectationResult,
  type FrontendProbeResult,
  type ParsedExpectation,
  type RuntimeFixture,
  type SupabaseTarget,
} from './sources-create-workflow-lib';

export const DEFAULT_SOURCE_EDIT_FAILURE_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/sources/003_edit_data_validate_false.json';
export const DEFAULT_SOURCE_EDIT_FAILURE_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/003_edit_data_validate_false.md';

type SupportedFlag =
  | 'create-data-file'
  | 'data-file'
  | 'edit-data-file'
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
  | 'success-data-file'
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

type ValidationExpectation =
  | {
      expected: boolean;
      kind: 'datasetSdkValidEquals' | 'ruleVerificationEquals';
      label: string;
    }
  | {
      expected: number;
      kind: 'nonExistentRefCountEquals' | 'unRuleVerificationCountEquals';
      label: string;
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

export type SourceEditCliOptions = {
  createDataFile: string;
  createExpectedFile: string;
  editDataFile: string;
  editExpectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  keepData: boolean;
  role: string;
  runtimeRecordFile: string;
  successDataFile: string;
  successExpectedFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  usersFile: string;
  verifyFrontend: boolean;
  writeRuntime: boolean;
};

export type SourceEditResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createStep: WorkflowStepResult;
  failingEditStep: WorkflowStepResult;
  failingValidation: ValidationSummary;
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
  successEditStep: WorkflowStepResult;
  successValidation: ValidationSummary;
  supabaseTarget: SupabaseTarget;
};

export type SourceEditRuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  create: StepRuntimeRecord;
  createdAt: string;
  failingEdit: StepRuntimeRecord;
  frontendProbe: FrontendProbeResult;
  frontendUrl?: string;
  keepData: boolean;
  passed: boolean;
  role: string;
  successEdit: StepRuntimeRecord;
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

type StepRuntimeRecord = {
  expectedFile: string;
  expectationResults: ExpectationResult[];
  fixtureFile: string;
  persistedRecord: Omit<SourceWorkflowRecord, 'json_ordered'>;
  submittedRuleVerification: boolean;
  validation?: ValidationSummary;
};

export type SourceEditDependencies = {
  frontendFetchImpl?: typeof fetch;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedValidationModules>;
};

export const SOURCE_EDIT_DATA_WORKFLOW_HELP = `Source edit data workflow

Usage:
  npm run test:sources:edit -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:sources:edit -- --role admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Workflow:
  1. Create one source from tests/data-workflows/fixtures/data/sources/001_create.json
  2. Edit the same source into a validation-passing record from tests/data-workflows/fixtures/data/sources/002_check_data_success.json
  3. Edit the same source into a validation-failing record from tests/data-workflows/fixtures/data/sources/003_edit_data_validate_false.json

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/sources/001_create.json
  --success-data-file <path>       Defaults to tests/data-workflows/fixtures/data/sources/002_check_data_success.json
  --edit-data-file <path>          Defaults to tests/data-workflows/fixtures/data/sources/003_edit_data_validate_false.json
  --data-file <path>               Alias of --edit-data-file
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

export function parseEditCliArgs(argv: string[], cwd = process.cwd()): SourceEditCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: SourceEditCliOptions = {
    createDataFile: path.resolve(cwd, DEFAULT_SOURCE_FIXTURE_PATH),
    createExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_EXPECTED_PATH),
    editDataFile: path.resolve(cwd, DEFAULT_SOURCE_EDIT_FAILURE_FIXTURE_PATH),
    editExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_EDIT_FAILURE_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_SOURCE_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_SOURCE_EDIT_FAILURE_FIXTURE_PATH),
      cwd,
    ),
    successDataFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_FIXTURE_PATH),
    successExpectedFile: path.resolve(cwd, DEFAULT_SOURCE_CHECK_DATA_EXPECTED_PATH),
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
      case 'success-data-file':
        options.successDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'edit-data-file':
      case 'data-file':
        options.editDataFile = path.resolve(
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
    options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.editDataFile, cwd);
  }

  return options;
}

export function buildValidationExpectations(options: {
  datasetSdkValid: boolean;
  nonExistentRefCount: number;
  unRuleVerificationCount: number;
}): ValidationExpectation[] {
  return [
    {
      expected: options.datasetSdkValid,
      kind: 'datasetSdkValidEquals',
      label: 'validateDatasetRuleVerification.datasetSdkValid matches code expectation',
    },
    {
      expected: options.unRuleVerificationCount,
      kind: 'unRuleVerificationCountEquals',
      label: 'validateDatasetRuleVerification.unRuleVerification.length matches code expectation',
    },
    {
      expected: options.nonExistentRefCount,
      kind: 'nonExistentRefCountEquals',
      label: 'validateDatasetRuleVerification.nonExistentRef.length matches code expectation',
    },
  ];
}

export function buildParsedValidationExpectationResults(
  validation: ValidationSummary,
  expectations: ValidationExpectation[],
): ExpectationResult[] {
  return expectations.map((expectation) => {
    switch (expectation.kind) {
      case 'datasetSdkValidEquals':
        return {
          actual: validation.datasetSdkValid,
          expected: expectation.expected,
          label: expectation.label,
          passed: validation.datasetSdkValid === expectation.expected,
        };
      case 'ruleVerificationEquals':
        return {
          actual: validation.ruleVerification,
          expected: expectation.expected,
          label: expectation.label,
          passed: validation.ruleVerification === expectation.expected,
        };
      case 'unRuleVerificationCountEquals':
        return {
          actual: validation.unRuleVerificationCount,
          expected: expectation.expected,
          label: expectation.label,
          passed: validation.unRuleVerificationCount === expectation.expected,
        };
      case 'nonExistentRefCountEquals':
        return {
          actual: validation.nonExistentRefCount,
          expected: expectation.expected,
          label: expectation.label,
          passed: validation.nonExistentRefCount === expectation.expected,
        };
    }
  });
}

export function buildSourceEditRuntimeRecord(
  options: Pick<
    SourceEditCliOptions,
    | 'createDataFile'
    | 'createExpectedFile'
    | 'editDataFile'
    | 'editExpectedFile'
    | 'frontendUrl'
    | 'keepData'
    | 'successDataFile'
    | 'successExpectedFile'
  >,
  result: Pick<
    SourceEditResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'createStep'
    | 'failingEditStep'
    | 'failingValidation'
    | 'frontendProbe'
    | 'passed'
    | 'selectedUser'
    | 'successEditStep'
    | 'successValidation'
    | 'supabaseTarget'
  >,
): SourceEditRuntimeRecord {
  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    create: buildStepRuntimeRecord(
      result.createStep,
      options.createDataFile,
      options.createExpectedFile,
    ),
    createdAt: new Date().toISOString(),
    failingEdit: buildStepRuntimeRecord(
      result.failingEditStep,
      options.editDataFile,
      options.editExpectedFile,
      result.failingValidation,
    ),
    frontendProbe: result.frontendProbe,
    frontendUrl: options.frontendUrl,
    keepData: options.keepData,
    passed: result.passed,
    role: result.selectedUser.role,
    successEdit: buildStepRuntimeRecord(
      result.successEditStep,
      options.successDataFile,
      options.successExpectedFile,
      result.successValidation,
    ),
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

export async function runSourceEditSmoke(
  options: SourceEditCliOptions,
  dependencies: SourceEditDependencies = {},
): Promise<SourceEditResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadSourceFixture(options.createDataFile), {
    generateId: options.generateId,
  });
  const createExpectations = buildCreateExpectations({ labelPrefix: 'Create' });
  const successExpectations = buildCreateExpectations({
    labelPrefix: 'Success edit',
    ruleVerification: true,
  });
  const editExpectations = buildCreateExpectations({ labelPrefix: 'Failing edit' });
  const successFixture = await loadSourceCheckDataFixture(options.successDataFile);
  const editFixture = await loadSourceCheckDataFixture(options.editDataFile);
  const rawSuccessJsonOrdered = getFixtureOrderedJson(successFixture);
  const rawEditJsonOrdered = getFixtureOrderedJson(editFixture);

  if (!rawSuccessJsonOrdered) {
    throw new Error(`Fixture ${options.successDataFile} does not contain ordered source JSON.`);
  }

  if (!rawEditJsonOrdered) {
    throw new Error(`Fixture ${options.editDataFile} does not contain ordered source JSON.`);
  }

  const expectedSuccessRuleVerification = getExpectedRuleVerification(successExpectations);
  const expectedEditRuleVerification = getExpectedRuleVerification(editExpectations);
  const successValidationExpectations: ValidationExpectation[] = [];
  const editValidationExpectations = buildValidationExpectations({
    datasetSdkValid: false,
    nonExistentRefCount: 0,
    unRuleVerificationCount: 0,
  });
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

    const successStage = await runEditStage({
      accessToken,
      currentUserId: selectedUser.userId,
      expectations: successExpectations,
      explicitValidationExpectations: successValidationExpectations,
      expectedRuleVerification: expectedSuccessRuleVerification,
      modules,
      rawJsonOrdered: rawSuccessJsonOrdered,
      runtimeId: runtimeFixture.runtimeId,
      userTeamId,
      version: createdRecord.version,
    });
    activeRecordVersion = successStage.step.record.version;

    const failingStage = await runEditStage({
      accessToken,
      currentUserId: selectedUser.userId,
      expectations: editExpectations,
      explicitValidationExpectations: editValidationExpectations,
      expectedRuleVerification: expectedEditRuleVerification,
      modules,
      rawJsonOrdered: rawEditJsonOrdered,
      runtimeId: runtimeFixture.runtimeId,
      userTeamId,
      version: successStage.step.record.version,
    });
    activeRecordVersion = failingStage.step.record.version;

    if (!options.keepData) {
      cleanupAttempted = true;
      const deleteResult = await modules.supabase.functions.invoke('app_dataset_delete', {
        body: {
          id: runtimeFixture.runtimeId,
          table: 'sources',
          version: failingStage.step.record.version,
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
      successStage.step.expectationResults.every((expectation) => expectation.passed) &&
      failingStage.step.expectationResults.every((expectation) => expectation.passed) &&
      cleanupPassed;
    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildSourceEditRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        createStep,
        failingEditStep: failingStage.step,
        failingValidation: failingStage.validation,
        frontendProbe,
        passed,
        selectedUser,
        successEditStep: successStage.step,
        successValidation: successStage.validation,
        supabaseTarget,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      createStep,
      failingEditStep: failingStage.step,
      failingValidation: failingStage.validation,
      frontendProbe,
      passed,
      runtimeFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      selectedUser,
      successEditStep: successStage.step,
      successValidation: successStage.validation,
      supabaseTarget,
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

async function runEditStage(input: {
  accessToken: string;
  currentUserId: string;
  expectations: ParsedExpectation[];
  explicitValidationExpectations: ValidationExpectation[];
  expectedRuleVerification?: boolean;
  modules: LoadedValidationModules;
  rawJsonOrdered: Record<string, any>;
  runtimeId: string;
  userTeamId: string;
  version: string;
}): Promise<{ step: WorkflowStepResult; validation: ValidationSummary }> {
  const preparedJsonOrdered = prepareSourceJsonOrderedForRuntime(input.rawJsonOrdered, {
    runtimeId: input.runtimeId,
    version: input.version,
  });

  const validationResult = await input.modules.review.validateDatasetRuleVerification(
    'source data set',
    preparedJsonOrdered.jsonOrdered,
    input.userTeamId,
  );

  const updateResult = await input.modules.supabase.functions.invoke('app_dataset_save_draft', {
    body: {
      id: input.runtimeId,
      jsonOrdered: preparedJsonOrdered.jsonOrdered,
      ruleVerification: validationResult.ruleVerification,
      table: 'sources',
      version: input.version,
    },
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
    region: FunctionRegion.UsEast1,
  });

  if (updateResult.error) {
    throw new Error(`Update source failed: ${updateResult.error.message}.`);
  }

  const record = await querySourceRecord(input.modules.supabase, input.runtimeId, input.version);
  const validation = toValidationSummary(validationResult);
  const baseValidationResults = buildValidationExpectationResults(
    validation,
    input.expectedRuleVerification,
  );
  const explicitValidationResults = buildParsedValidationExpectationResults(
    validation,
    input.explicitValidationExpectations,
  );

  return {
    step: {
      expectationResults: [
        ...evaluateExpectations({
          currentUserId: input.currentUserId,
          expectations: input.expectations,
          record,
          uploadedJsonOrdered: preparedJsonOrdered.jsonOrdered,
        }),
        ...baseValidationResults,
        ...explicitValidationResults,
      ],
      record,
      submittedRuleVerification: validationResult.ruleVerification,
    },
    validation,
  };
}

function buildStepRuntimeRecord(
  step: WorkflowStepResult,
  fixtureFile: string,
  expectedFile: string,
  validation?: ValidationSummary,
): StepRuntimeRecord {
  const { json_ordered: _jsonOrdered, ...persistedRecord } = step.record;

  return {
    expectedFile,
    expectationResults: step.expectationResults,
    fixtureFile,
    persistedRecord,
    submittedRuleVerification: step.submittedRuleVerification,
    validation,
  };
}

function toValidationSummary(validationResult: {
  datasetSdkValid: boolean;
  nonExistentRef: unknown[];
  ruleVerification: boolean;
  unRuleVerification: unknown[];
}): ValidationSummary {
  return {
    datasetSdkValid: validationResult.datasetSdkValid,
    nonExistentRefCount: validationResult.nonExistentRef.length,
    ruleVerification: validationResult.ruleVerification,
    unRuleVerificationCount: validationResult.unRuleVerification.length,
  };
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
