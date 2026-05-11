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
  DEFAULT_SOURCE_CONTRIBUTE_TEAM_ROLE,
  DEFAULT_USERS_PATH,
  buildCreateExpectations,
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

export const DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/sources/005_create_contribute_team.json';
export const DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/005_create_contribute_team.md';
export const DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_CREATE_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/sources/005_create_contribute_team_create.md';

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
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type CreateStepResult = {
  expectationResults: ExpectationResult[];
  record: SourceWorkflowRecord;
  submittedRuleVerification: boolean;
};

type ContributeStepResult = {
  expectationResults: ExpectationResult[];
  record: SourceWorkflowRecord;
};

type LoadedWorkflowModules = {
  generalApi: {
    contributeSource: (
      tableName: string,
      id: string,
      version: string,
    ) => Promise<{
      count: number | null;
      data: unknown;
      error: unknown;
      status: number;
      statusText: string;
    }>;
    getTeamIdByUserId: () => Promise<string | null>;
  };
  supabase: SupabaseClient;
};

type ExpectationSection = 'contribute';

type ExpectationKey =
  | 'contribute.commandSucceeded'
  | 'contribute.rowExists'
  | 'contribute.teamIdMatchesCurrentTeam'
  | 'contribute.idMatchesCreate'
  | 'contribute.version'
  | 'contribute.userIdMatchesCreate'
  | 'contribute.stateCodeMatchesCreate'
  | 'contribute.ruleVerificationMatchesCreate'
  | 'contribute.reviewsMatchCreate'
  | 'contribute.jsonOrderedMatchesCreate';

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

type ContributeSummary = {
  commandSucceeded: boolean;
  currentTeamId: string;
  jsonOrderedMatchesCreate: boolean;
  reviewsMatchCreate: boolean;
  ruleVerificationMatchesCreate: boolean;
  stateCodeMatchesCreate: boolean;
  teamIdMatchesCurrentTeam: boolean;
  userIdMatchesCreate: boolean;
};

export type SourceCreateContributeTeamCliOptions = {
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

export type SourceCreateContributeTeamResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  contribute: ContributeSummary;
  contributeStep: ContributeStepResult;
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
  supabaseTarget: SupabaseTarget;
};

type StepRuntimeRecord = {
  expectationResults: ExpectationResult[];
  persistedRecord: Omit<SourceWorkflowRecord, 'json_ordered'>;
  submittedRuleVerification?: boolean;
};

export type SourceCreateContributeTeamRuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  contribute: StepRuntimeRecord & {
    expectedFile: string;
    summary: ContributeSummary;
  };
  create: StepRuntimeRecord & {
    expectedFile: string;
    fixtureFile: string;
    runtimeId: string;
    sourceFixtureId: string;
    submittedRuleVerification: boolean;
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

export type SourceCreateContributeTeamDependencies = {
  computeCreateRuleVerificationFn?: (jsonOrdered: Record<string, any>) => Promise<boolean>;
  frontendFetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  modulesLoader?: (supabaseTarget: SupabaseTarget) => Promise<LoadedWorkflowModules>;
};

const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);
const EXPECTATION_KEYS = new Set<ExpectationKey>([
  'contribute.commandSucceeded',
  'contribute.rowExists',
  'contribute.teamIdMatchesCurrentTeam',
  'contribute.idMatchesCreate',
  'contribute.version',
  'contribute.userIdMatchesCreate',
  'contribute.stateCodeMatchesCreate',
  'contribute.ruleVerificationMatchesCreate',
  'contribute.reviewsMatchCreate',
  'contribute.jsonOrderedMatchesCreate',
]);

export const SOURCE_CREATE_CONTRIBUTE_TEAM_DATA_WORKFLOW_HELP = `Source create-contribute-team data workflow

Usage:
  npm run test:workflows -- --sources:create-contribute-team --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:workflows -- --sources:create-contribute-team --role user --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie

Workflow:
  1. Create one source from tests/data-workflows/fixtures/data/sources/005_create_contribute_team.json
  2. Verify the created row against code-owned expectations
  3. Contribute that source through the real contributeSource('sources', id, version) flow
  4. Verify the contributed row against code-owned expectations

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "team-member")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --create-data-file <path>        Defaults to tests/data-workflows/fixtures/data/sources/005_create_contribute_team.json
  --data-file <path>               Alias of --create-data-file
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the contributed source after validation (default)
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

export function parseCreateContributeTeamCliArgs(
  argv: string[],
  cwd = process.cwd(),
): SourceCreateContributeTeamCliOptions {
  let runtimeRecordFileExplicit = false;
  const defaultFollowUpExpectedFile = path.resolve(
    cwd,
    DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_EXPECTED_PATH,
  );
  const options: SourceCreateContributeTeamCliOptions = {
    createDataFile: path.resolve(cwd, DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_FIXTURE_PATH),
    createExpectedFile: path.resolve(
      cwd,
      DEFAULT_SOURCE_CREATE_CONTRIBUTE_TEAM_CREATE_EXPECTED_PATH,
    ),
    followUpExpectedFile: defaultFollowUpExpectedFile,
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_SOURCE_CONTRIBUTE_TEAM_ROLE,
    runtimeRecordFile: resolveCreateContributeTeamRuntimeRecordFilePath(
      defaultFollowUpExpectedFile,
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
    options.runtimeRecordFile = resolveCreateContributeTeamRuntimeRecordFilePath(
      options.followUpExpectedFile,
      cwd,
    );
  }

  return options;
}

export function resolveCreateContributeTeamRuntimeRecordFilePath(
  seedFile: string,
  cwd = process.cwd(),
) {
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

export function buildCreateContributeTeamExpectations(): ParsedWorkflowExpectation[] {
  return [
    buildExpectation('contribute.commandSucceeded', true, 'Contribute command succeeds'),
    buildExpectation('contribute.rowExists', true, 'Contributed row exists'),
    buildExpectation(
      'contribute.teamIdMatchesCurrentTeam',
      true,
      'Contributed team_id matches current team',
    ),
    buildExpectation('contribute.idMatchesCreate', true, 'Contributed id matches created record'),
    buildExpectation('contribute.version', '01.01.000', 'Contributed version is 01.01.000'),
    buildExpectation(
      'contribute.userIdMatchesCreate',
      true,
      'Contributed user_id matches created record',
    ),
    buildExpectation(
      'contribute.stateCodeMatchesCreate',
      true,
      'Contributed state_code matches created record',
    ),
    buildExpectation(
      'contribute.ruleVerificationMatchesCreate',
      true,
      'Contributed rule_verification matches created record',
    ),
    buildExpectation(
      'contribute.reviewsMatchCreate',
      true,
      'Contributed reviews matches created record',
    ),
    buildExpectation(
      'contribute.jsonOrderedMatchesCreate',
      true,
      'Contributed json_ordered matches created record',
    ),
  ];
}

export function evaluateCreateContributeTeamExpectations(
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

export function buildSourceCreateContributeTeamRuntimeRecord(
  options: Pick<
    SourceCreateContributeTeamCliOptions,
    'createDataFile' | 'createExpectedFile' | 'followUpExpectedFile' | 'frontendUrl' | 'keepData'
  >,
  result: Pick<
    SourceCreateContributeTeamResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'contribute'
    | 'contributeStep'
    | 'createStep'
    | 'frontendProbe'
    | 'runtimeFixture'
    | 'selectedUser'
    | 'supabaseTarget'
  > & { passed: boolean },
): SourceCreateContributeTeamRuntimeRecord {
  const { json_ordered: _createJsonOrdered, ...createPersistedRecord } = result.createStep.record;
  const { json_ordered: _contributeJsonOrdered, ...contributePersistedRecord } =
    result.contributeStep.record;

  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    contribute: {
      expectationResults: result.contributeStep.expectationResults,
      expectedFile: options.followUpExpectedFile,
      persistedRecord: contributePersistedRecord,
      summary: result.contribute,
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

export async function runSourceCreateContributeTeamSmoke(
  options: SourceCreateContributeTeamCliOptions,
  dependencies: SourceCreateContributeTeamDependencies = {},
): Promise<SourceCreateContributeTeamResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadSourceFixture(options.createDataFile), {
    generateId: options.generateId,
    generateIdFn: dependencies.generateIdFn,
  });
  const followUpExpectations = buildCreateContributeTeamExpectations();
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);

  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.frontendFetchImpl)
      : { ok: true, skipped: true };

  let submittedCreateRuleVerification = await (
    dependencies.computeCreateRuleVerificationFn ?? computeSourceRuleVerification
  )(runtimeFixture.fixture.jsonOrdered);

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
  submittedCreateRuleVerification = await (
    dependencies.computeCreateRuleVerificationFn ?? computeSourceRuleVerification
  )(runtimeFixture.fixture.jsonOrdered);
  const createExpectations = buildCreateExpectations({
    labelPrefix: 'Create before contribute',
    ruleVerification: submittedCreateRuleVerification,
  });

  let cleanupAttempted = false;
  let cleanupPassed = true;
  const createdRecords: CreatedRecordRef[] = [];

  try {
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

    const currentTeamId = await modules.generalApi.getTeamIdByUserId();
    if (!currentTeamId) {
      throw new Error(
        `Role "${selectedCredential.role}" is not a member of any team in the target environment. This workflow requires a team-backed user.`,
      );
    }

    const contributeResponse = await modules.generalApi.contributeSource(
      'sources',
      createdRecord.id,
      createdRecord.version,
    );
    const contributeError = extractContributeError(contributeResponse);

    if (contributeError) {
      throw new Error(`Contribute source failed: ${extractErrorMessage(contributeError)}`);
    }

    const contributedRecord = await querySourceRecord(
      modules.supabase,
      createdRecord.id,
      createdRecord.version,
    );

    const actuals: WorkflowActuals = {
      'contribute.commandSucceeded': true,
      'contribute.rowExists': Boolean(contributedRecord.id),
      'contribute.teamIdMatchesCurrentTeam': contributedRecord.team_id === currentTeamId,
      'contribute.idMatchesCreate': contributedRecord.id === createdRecord.id,
      'contribute.version': contributedRecord.version,
      'contribute.userIdMatchesCreate': contributedRecord.user_id === createdRecord.user_id,
      'contribute.stateCodeMatchesCreate':
        contributedRecord.state_code === createdRecord.state_code,
      'contribute.ruleVerificationMatchesCreate':
        contributedRecord.rule_verification === createdRecord.rule_verification,
      'contribute.reviewsMatchCreate': valuesMatch(
        contributedRecord.reviews,
        createdRecord.reviews,
      ),
      'contribute.jsonOrderedMatchesCreate': valuesMatch(
        contributedRecord.json_ordered,
        createdRecord.json_ordered,
      ),
    };

    const followUpExpectationResults = evaluateCreateContributeTeamExpectations(
      actuals,
      followUpExpectations,
    );

    const createStep: CreateStepResult = {
      expectationResults: createExpectationResults,
      record: createdRecord,
      submittedRuleVerification: submittedCreateRuleVerification,
    };
    const contributeStep: ContributeStepResult = {
      expectationResults: followUpExpectationResults,
      record: contributedRecord,
    };

    if (!options.keepData) {
      cleanupAttempted = true;
      cleanupPassed = await cleanupCreatedSources(modules.supabase, accessToken, createdRecords);
    }

    const contribute: ContributeSummary = {
      commandSucceeded: true,
      currentTeamId,
      jsonOrderedMatchesCreate: Boolean(actuals['contribute.jsonOrderedMatchesCreate']),
      reviewsMatchCreate: Boolean(actuals['contribute.reviewsMatchCreate']),
      ruleVerificationMatchesCreate: Boolean(actuals['contribute.ruleVerificationMatchesCreate']),
      stateCodeMatchesCreate: Boolean(actuals['contribute.stateCodeMatchesCreate']),
      teamIdMatchesCurrentTeam: Boolean(actuals['contribute.teamIdMatchesCurrentTeam']),
      userIdMatchesCreate: Boolean(actuals['contribute.userIdMatchesCreate']),
    };

    const passed =
      createExpectationResults.every((expectation) => expectation.passed) &&
      followUpExpectationResults.every((expectation) => expectation.passed) &&
      cleanupPassed;

    let runtimeRecordFile: string | undefined;
    let runtimeRecordWritten = false;

    if (options.writeRuntime) {
      runtimeRecordFile = options.runtimeRecordFile;
      const runtimeRecord = buildSourceCreateContributeTeamRuntimeRecord(options, {
        cleanupAttempted,
        cleanupPassed,
        contribute,
        contributeStep,
        createStep,
        frontendProbe,
        passed,
        runtimeFixture,
        selectedUser,
        supabaseTarget,
      });
      await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
      runtimeRecordWritten = true;
    }

    return {
      cleanupAttempted,
      cleanupPassed,
      contribute,
      contributeStep,
      createStep,
      frontendProbe,
      passed,
      runtimeFixture,
      runtimeRecordFile,
      runtimeRecordWritten,
      selectedUser,
      supabaseTarget,
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

async function loadWorkflowModules(supabaseTarget: SupabaseTarget): Promise<LoadedWorkflowModules> {
  process.env.SUPABASE_URL = supabaseTarget.apiUrl;
  process.env.SUPABASE_PUBLISHABLE_KEY = supabaseTarget.publishableKey;

  const supabaseModule = await import('../../../../src/services/supabase/index');
  const generalApiModule = await import('../../../../src/services/general/api');

  const supabaseExports = extractModuleExports<{ supabase: SupabaseClient }>(supabaseModule);
  const generalApiExports =
    extractModuleExports<LoadedWorkflowModules['generalApi']>(generalApiModule);

  return {
    generalApi: {
      contributeSource: generalApiExports.contributeSource,
      getTeamIdByUserId: generalApiExports.getTeamIdByUserId,
    },
    supabase: supabaseExports.supabase,
  };
}

function extractModuleExports<T>(moduleValue: Record<string, unknown>) {
  return ((moduleValue['module.exports'] as T | undefined) ??
    (moduleValue.default as T | undefined) ??
    (moduleValue as T)) as T;
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

function extractContributeError(result: unknown) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return null;
  }

  return 'error' in result ? ((result as { error?: unknown }).error ?? null) : null;
}

function extractErrorMessage(error: unknown) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const message =
      'message' in error && typeof error.message === 'string' ? error.message.trim() : '';
    if (message) {
      return message;
    }
  }

  return 'unknown error';
}

function valuesMatch(left: unknown, right: unknown) {
  return JSON.stringify(deepSortJson(left ?? null)) === JSON.stringify(deepSortJson(right ?? null));
}
