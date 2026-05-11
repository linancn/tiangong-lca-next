import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient, FunctionRegion } from '@supabase/supabase-js';
import { createFlowProperty as createTidasFlowProperty } from '@tiangong-lca/tidas-sdk/core';

import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  patchJsonOrderedWithActiveReferenceSeeds,
} from '../reference-seeds';
import {
  loadUsersEnvFile,
  resolveDefaultUsersEnvFilePath,
  DEFAULT_USERS_ENV_FILE as SHARED_DEFAULT_USERS_ENV_FILE,
  DEFAULT_USERS_PATH as SHARED_DEFAULT_USERS_PATH,
  TEST_USERS_JSON_ENV as SHARED_TEST_USERS_JSON_ENV,
} from '../workflow-shared';

export const DEFAULT_FLOWPROPERTY_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/flowProperties/001_create.json';
export const DEFAULT_FLOWPROPERTY_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/flowProperties/001_create.md';
export const DEFAULT_USERS_PATH = SHARED_DEFAULT_USERS_PATH;
export const DEFAULT_USERS_ENV_FILE = SHARED_DEFAULT_USERS_ENV_FILE;
export const DEFAULT_FLOWPROPERTY_ROLE = 'user';
export const DEFAULT_FLOWPROPERTY_CONTRIBUTE_TEAM_ROLE = 'team-member';
export const TEST_USERS_JSON_ENV = SHARED_TEST_USERS_JSON_ENV;
export const RUNTIME_FLOWPROPERTY_ID_PLACEHOLDER = '__RUNTIME_FLOWPROPERTY_ID__';

const FLOWPROPERTY_PERMANENT_URI_BASE =
  'https://lcdn.tiangong.earth/datasetdetail/flowproperty.xhtml';
const DEFAULT_FRONTEND_PROBE_TIMEOUT_MS = 5000;

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

type SmokeRecord = {
  id: string;
  json_ordered: Record<string, unknown>;
  reviews: unknown;
  rule_verification: boolean | null;
  state_code: number | null;
  team_id: string | null;
  user_id: string | null;
  version: string;
};

type BoolExpectation = {
  kind: 'jsonOrderedMatches' | 'rowExists' | 'reviewsNull' | 'teamIdNull' | 'userIdMatches';
  label: string;
};

type ScalarExpectation = {
  kind: 'ruleVerificationEquals' | 'stateCodeEquals' | 'versionEquals';
  label: string;
  expected: boolean | number | string;
};

export type ParsedExpectation = BoolExpectation | ScalarExpectation;

export type CliOptions = {
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

export type SupabaseTarget = {
  apiUrl: string;
  dashboardUrl?: string;
  projectId?: string;
  publishableKey: string;
};

export type CredentialEntry = {
  email?: string;
  password?: string;
};

export type UsersFile = Record<string, CredentialEntry>;
export type LoadedUsersConfig = {
  sourceLabel: 'environment variables' | 'users file';
  users: UsersFile;
};

export type LoadUsersConfigOptions = {
  cwd?: string;
  usersEnvFilePath?: string | null;
};

export type FlowpropertyCreateFixture = {
  id: string;
  jsonOrdered: Record<string, any>;
  table: string;
};

export type RuntimeFixture = {
  fixture: FlowpropertyCreateFixture;
  sourceFixtureId: string;
  runtimeId: string;
  version: string;
};

export type PreparedFlowpropertyJsonOrdered = {
  jsonOrdered: Record<string, any>;
  version: string;
};

export type FrontendProbeResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  statusText?: string;
  url?: string;
};

export type ExpectationResult = {
  actual: unknown;
  expected?: unknown;
  label: string;
  passed: boolean;
};

export type SmokeTestResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createResponse: unknown;
  expectationResults: ExpectationResult[];
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  record: SmokeRecord;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  runtimeFixture: RuntimeFixture;
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  submittedRuleVerification: boolean;
  supabaseTarget: SupabaseTarget;
};

export type SmokeDependencies = {
  fetchImpl?: typeof fetch;
  generateIdFn?: () => string;
};

export type RuntimeRecord = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  createdAt: string;
  expectationResults: ExpectationResult[];
  expectedFile: string;
  fixtureFile: string;
  frontendProbe: FrontendProbeResult;
  frontendUrl?: string;
  keepData: boolean;
  passed: boolean;
  persistedRecord: Omit<SmokeRecord, 'json_ordered'>;
  role: string;
  runtimeId: string;
  sourceFixtureId: string;
  submittedRuleVerification: boolean;
  supabase: {
    apiUrl: string;
    dashboardUrl?: string;
    projectId?: string;
  };
  user: {
    email: string;
    userId: string;
  };
  version: string;
};

export const FLOWPROPERTY_CREATE_DATA_WORKFLOW_HELP = `Flowproperty create data workflow

Usage:
  npm run test:flowproperties:create -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:flowproperties:create -- --role admin --frontend-url https://lca.tiangong.earth --supabase-url https://supabase.com/dashboard/project/fotofiyqnuyvgtotswie --no-keep-data

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --data-file <path>               Defaults to tests/data-workflows/fixtures/data/flowProperties/001_create.json
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the created flowproperty after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the created flowproperty after validation
  --no-keep-created                Alias of --no-keep-data
  --generate-id                    Replace the fixture UUID with a fresh runtime UUID (default)
  --no-generate-id                 Reuse the fixture UUID from the file as-is
  --write-runtime                  Write this run's runtime record to a file (default; ids, environment, validation, and persisted row summary)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before create (default)
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

const FLOWPROPERTY_UUID_PATH = [
  'flowPropertyDataSet',
  'flowPropertiesInformation',
  'dataSetInformation',
  'common:UUID',
] as const;
const FLOWPROPERTY_VERSION_PATH = [
  'flowPropertyDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:dataSetVersion',
] as const;
const FLOWPROPERTY_PERMANENT_URI_PATH = [
  'flowPropertyDataSet',
  'administrativeInformation',
  'publicationAndOwnership',
  'common:permanentDataSetURI',
] as const;

export function parseCliArgs(argv: string[], cwd = process.cwd()): CliOptions {
  let runtimeRecordFileExplicit = false;
  const options: CliOptions = {
    dataFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_FIXTURE_PATH),
    expectedFile: path.resolve(cwd, DEFAULT_FLOWPROPERTY_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_FLOWPROPERTY_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_FLOWPROPERTY_FIXTURE_PATH),
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
        options.role = requireFlagValue(flag, inlineValue, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'frontend-url':
        options.frontendUrl = requireFlagValue(flag, inlineValue, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-url':
        options.supabaseUrl = requireFlagValue(flag, inlineValue, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = requireFlagValue(flag, inlineValue, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = requireFlagValue(flag, inlineValue, argv, () => {
          index += 1;
          return argv[index];
        });
        break;
      case 'data-file':
        options.dataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, argv, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'users-file':
        options.usersFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, argv, () => {
            index += 1;
            return argv[index];
          }),
        );
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, argv, () => {
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

export function resolveRuntimeRecordFilePath(dataFile: string, cwd = process.cwd()) {
  const absoluteDataFile = path.resolve(cwd, dataFile);
  const relativeDataFile = path.relative(cwd, absoluteDataFile);
  const relativeSegments = relativeDataFile.split(path.sep);
  const parsed = path.parse(absoluteDataFile);
  const recordFilename = `${parsed.name}.last-run.json`;
  const dataFixtureIndex = relativeSegments.findIndex(
    (segment, index) =>
      segment === 'tests' &&
      relativeSegments[index + 1] === 'data-workflows' &&
      relativeSegments[index + 2] === 'fixtures' &&
      relativeSegments[index + 3] === 'data',
  );

  if (dataFixtureIndex !== -1) {
    return path.resolve(
      cwd,
      ...relativeSegments.slice(0, dataFixtureIndex),
      'tests',
      'data-workflows',
      'runtime',
      ...relativeSegments.slice(dataFixtureIndex + 4, -1),
      recordFilename,
    );
  }

  return path.join(parsed.dir, recordFilename);
}

export function normalizeSupabaseTarget(
  options: Pick<CliOptions, 'supabaseProjectUrl' | 'supabasePublishableKey' | 'supabaseUrl'>,
  env: NodeJS.ProcessEnv = process.env,
): SupabaseTarget {
  const rawSupabaseInput =
    normalizeOptionalString(options.supabaseUrl) ?? normalizeOptionalString(env.SUPABASE_URL);
  const rawProjectUrl = normalizeOptionalString(options.supabaseProjectUrl) ?? undefined;
  const publishableKey =
    normalizeOptionalString(options.supabasePublishableKey) ??
    normalizeOptionalString(env.SUPABASE_PUBLISHABLE_KEY);

  if (!publishableKey) {
    throw new Error(
      'Supabase publishable key is required. Pass --supabase-publishable-key or set SUPABASE_PUBLISHABLE_KEY.',
    );
  }

  let apiUrl: string | undefined;
  let dashboardUrl: string | undefined;
  let projectId: string | undefined;

  if (rawSupabaseInput) {
    const parsedInput = new URL(rawSupabaseInput);
    if (isSupabaseDashboardUrl(parsedInput)) {
      dashboardUrl = normalizeUrl(rawSupabaseInput);
      projectId = extractProjectIdFromDashboardUrl(parsedInput) ?? undefined;
    } else {
      apiUrl = normalizeUrl(rawSupabaseInput);
      projectId = extractProjectIdFromApiUrl(parsedInput) ?? undefined;
    }
  }

  if (rawProjectUrl) {
    const parsedProjectUrl = new URL(rawProjectUrl);
    dashboardUrl = normalizeUrl(rawProjectUrl);
    projectId = extractProjectIdFromDashboardUrl(parsedProjectUrl) ?? projectId;
  }

  if (!apiUrl && projectId) {
    apiUrl = `https://${projectId}.supabase.co`;
  }

  if (!dashboardUrl && projectId) {
    dashboardUrl = `https://supabase.com/dashboard/project/${projectId}`;
  }

  if (!apiUrl) {
    throw new Error(
      'Supabase URL is required. Pass --supabase-url or set SUPABASE_URL. Dashboard project URLs are also supported.',
    );
  }

  return {
    apiUrl,
    dashboardUrl,
    projectId,
    publishableKey,
  };
}

export async function loadFlowpropertyFixture(
  filePath: string,
): Promise<FlowpropertyCreateFixture> {
  const fixture = await loadJsonFile<FlowpropertyCreateFixture>(filePath);

  if (!fixture || typeof fixture !== 'object') {
    throw new Error(`Invalid flowproperty fixture: ${filePath}`);
  }

  if (!fixture.id || typeof fixture.id !== 'string') {
    throw new Error(`Fixture is missing a valid "id": ${filePath}`);
  }

  if (fixture.table !== 'flowproperties') {
    throw new Error(`Fixture table must be "flowproperties": ${filePath}`);
  }

  if (!fixture.jsonOrdered || typeof fixture.jsonOrdered !== 'object') {
    throw new Error(`Fixture is missing a valid "jsonOrdered": ${filePath}`);
  }

  return fixture;
}

export async function loadUsersFile(filePath: string): Promise<UsersFile> {
  const users = await loadJsonFile<UsersFile>(filePath);
  if (!users || typeof users !== 'object' || Array.isArray(users)) {
    throw new Error(`Invalid users file: ${filePath}`);
  }
  return users;
}

export async function loadUsersConfig(
  filePath: string,
  env: NodeJS.ProcessEnv = process.env,
  options: LoadUsersConfigOptions = {},
): Promise<LoadedUsersConfig> {
  const effectiveEnv = await buildEffectiveUsersEnv(env, options);
  const envUsers = loadUsersFromEnv(effectiveEnv);
  if (Object.keys(envUsers).length > 0) {
    return {
      sourceLabel: 'environment variables',
      users: envUsers,
    };
  }

  try {
    return {
      sourceLabel: 'users file',
      users: await loadUsersFile(filePath),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `No user credentials were found. Add role credentials to ${DEFAULT_USERS_ENV_FILE}, export ${TEST_USERS_JSON_ENV} / TEST_<ROLE>_EMAIL / TEST_<ROLE>_PASSWORD, or pass --users-file <path>. Missing fallback users file: ${filePath}`,
      );
    }

    throw error;
  }
}

export function loadUsersFromEnv(env: NodeJS.ProcessEnv = process.env): UsersFile {
  const usersFromJson = parseUsersJsonEnv(env);
  const usersFromDirectEnv = parseUsersDirectEnv(env);
  const mergedUsers: UsersFile = { ...usersFromJson };

  Object.entries(usersFromDirectEnv).forEach(([role, credential]) => {
    mergedUsers[role] = {
      ...(mergedUsers[role] ?? {}),
      ...credential,
    };
  });

  return mergedUsers;
}

export function pickCredentialByRole(
  users: UsersFile,
  role: string,
  sourceLabel: 'environment variables' | 'users file' = 'users file',
) {
  const availableRoles = Object.keys(users).sort();
  const credential = users[role];

  if (!credential) {
    const availableRolesText = availableRoles.length > 0 ? availableRoles.join(', ') : '(none)';

    if (sourceLabel === 'environment variables') {
      const emailEnvVar = buildRoleCredentialEnvVarName(role, 'email');
      const passwordEnvVar = buildRoleCredentialEnvVarName(role, 'password');
      throw new Error(
        `Role "${role}" was not found in environment variables. Available roles: ${availableRolesText}. Set ${TEST_USERS_JSON_ENV} or ${emailEnvVar} / ${passwordEnvVar}, or add them to ${DEFAULT_USERS_ENV_FILE}.`,
      );
    }

    throw new Error(
      `Role "${role}" was not found in users file. Available roles: ${availableRolesText}`,
    );
  }

  const email = normalizeOptionalString(credential.email);
  const password = normalizeOptionalString(credential.password);

  if (!email || !password) {
    if (sourceLabel === 'environment variables') {
      const emailEnvVar = buildRoleCredentialEnvVarName(role, 'email');
      const passwordEnvVar = buildRoleCredentialEnvVarName(role, 'password');
      throw new Error(
        `Role "${role}" is missing email or password in environment variables. Set ${TEST_USERS_JSON_ENV} or both ${emailEnvVar} and ${passwordEnvVar}, or complete ${DEFAULT_USERS_ENV_FILE}, before running the data workflow script.`,
      );
    }

    throw new Error(
      `Role "${role}" is missing email or password in the configured users file. Complete ${DEFAULT_USERS_ENV_FILE} or the file passed by --users-file before running the data workflow script.`,
    );
  }

  return {
    email,
    password,
    role,
  };
}

export function prepareRuntimeFixture(
  fixture: FlowpropertyCreateFixture,
  options: {
    generateId: boolean;
    generateIdFn?: () => string;
  },
): RuntimeFixture {
  const clonedFixture = deepClone(fixture);
  const sourceFixtureId = clonedFixture.id;
  const runtimeId = options.generateId ? (options.generateIdFn ?? randomUUID)() : clonedFixture.id;
  clonedFixture.id = runtimeId;
  const preparedJsonOrdered = prepareFlowpropertyJsonOrderedForRuntime(clonedFixture.jsonOrdered, {
    runtimeId,
  });
  clonedFixture.jsonOrdered = preparedJsonOrdered.jsonOrdered;

  return {
    fixture: clonedFixture,
    sourceFixtureId,
    runtimeId,
    version: preparedJsonOrdered.version,
  };
}

export function prepareFlowpropertyJsonOrderedForRuntime(
  jsonOrdered: Record<string, any>,
  options: {
    runtimeId: string;
    version?: string;
  },
): PreparedFlowpropertyJsonOrdered {
  const clonedJsonOrdered = replaceRuntimeFlowpropertyIdPlaceholder(
    deepClone(jsonOrdered),
    options.runtimeId,
  );
  setNestedValue(clonedJsonOrdered, FLOWPROPERTY_UUID_PATH, options.runtimeId);

  const version = options.version ?? getFlowpropertyVersion(clonedJsonOrdered);
  if (!version) {
    throw new Error('Unable to resolve flowproperty dataset version from jsonOrdered.');
  }

  setNestedValue(clonedJsonOrdered, FLOWPROPERTY_VERSION_PATH, version);
  setNestedValue(
    clonedJsonOrdered,
    FLOWPROPERTY_PERMANENT_URI_PATH,
    buildPermanentDataSetUri(options.runtimeId, version),
  );
  patchJsonOrderedWithActiveReferenceSeeds(clonedJsonOrdered, {
    currentDataset: {
      id: options.runtimeId,
      table: 'flowproperties',
    },
  });

  return {
    jsonOrdered: clonedJsonOrdered,
    version,
  };
}

export async function computeFlowpropertyRuleVerification(
  jsonOrdered: Record<string, any>,
): Promise<boolean> {
  const sdkValidation = createTidasFlowProperty(jsonOrdered).validateEnhanced();
  return sdkValidation.success;
}

export async function probeFrontendUrl(
  frontendUrl: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<FrontendProbeResult> {
  const normalizedUrl = normalizeOptionalString(frontendUrl);

  if (!normalizedUrl) {
    return {
      ok: true,
      skipped: true,
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort();
  }, DEFAULT_FRONTEND_PROBE_TIMEOUT_MS);

  try {
    const response = await fetchImpl(normalizedUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      url: normalizedUrl,
    };
  } catch (error) {
    return {
      ok: false,
      statusText: error instanceof Error ? error.message : 'Frontend probe failed',
      url: normalizedUrl,
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export function buildCreateExpectations(
  options: { labelPrefix?: string; ruleVerification?: boolean } = {},
): ParsedExpectation[] {
  const labelPrefix = options.labelPrefix ?? 'Create';
  const ruleVerification = options.ruleVerification ?? false;

  return [
    { kind: 'rowExists', label: labelPrefix + ' row exists' },
    {
      kind: 'jsonOrderedMatches',
      label: labelPrefix + ' json_ordered matches submitted jsonOrdered',
    },
    { kind: 'userIdMatches', label: labelPrefix + ' user_id matches current user' },
    { kind: 'stateCodeEquals', label: labelPrefix + ' state_code is 0', expected: 0 },
    {
      kind: 'versionEquals',
      label: labelPrefix + ' version is 01.01.000',
      expected: '01.01.000',
    },
    { kind: 'teamIdNull', label: labelPrefix + ' team_id is null' },
    {
      kind: 'ruleVerificationEquals',
      label: labelPrefix + ' rule_verification matches code expectation',
      expected: ruleVerification,
    },
    { kind: 'reviewsNull', label: labelPrefix + ' reviews is null' },
  ];
}

export function evaluateExpectations(input: {
  currentUserId: string;
  expectations: ParsedExpectation[];
  record: SmokeRecord;
  uploadedJsonOrdered: Record<string, unknown>;
}): ExpectationResult[] {
  const { currentUserId, expectations, record, uploadedJsonOrdered } = input;

  return expectations.map((expectation) => {
    switch (expectation.kind) {
      case 'rowExists':
        return {
          actual: Boolean(record?.id),
          label: expectation.label,
          passed: Boolean(record?.id),
        };
      case 'jsonOrderedMatches': {
        const actual = deepSortJson(record?.json_ordered ?? null);
        const expected = deepSortJson(uploadedJsonOrdered);
        return {
          actual,
          expected,
          label: expectation.label,
          passed: JSON.stringify(actual) === JSON.stringify(expected),
        };
      }
      case 'userIdMatches':
        return {
          actual: record.user_id,
          expected: currentUserId,
          label: expectation.label,
          passed: record.user_id === currentUserId,
        };
      case 'stateCodeEquals':
        return {
          actual: record.state_code,
          expected: expectation.expected,
          label: expectation.label,
          passed: record.state_code === expectation.expected,
        };
      case 'versionEquals':
        return {
          actual: record.version,
          expected: expectation.expected,
          label: expectation.label,
          passed: record.version === expectation.expected,
        };
      case 'teamIdNull':
        return {
          actual: record.team_id,
          expected: null,
          label: expectation.label,
          passed: record.team_id === null,
        };
      case 'ruleVerificationEquals':
        return {
          actual: record.rule_verification,
          expected: expectation.expected,
          label: expectation.label,
          passed: record.rule_verification === expectation.expected,
        };
      case 'reviewsNull':
        return {
          actual: record.reviews,
          expected: null,
          label: expectation.label,
          passed: record.reviews === null,
        };
    }

    return assertNever(expectation);
  });
}

export async function runFlowpropertyCreateSmoke(
  options: CliOptions,
  dependencies: SmokeDependencies = {},
): Promise<SmokeTestResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const runtimeFixture = prepareRuntimeFixture(await loadFlowpropertyFixture(options.dataFile), {
    generateId: options.generateId,
    generateIdFn: dependencies.generateIdFn,
  });
  const expectations = buildCreateExpectations();
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);

  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.fetchImpl)
      : { ok: true, skipped: true };

  let submittedRuleVerification = await computeFlowpropertyRuleVerification(
    runtimeFixture.fixture.jsonOrdered,
  );

  const supabase = createClient(supabaseTarget.apiUrl, supabaseTarget.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const signInResult = await supabase.auth.signInWithPassword({
    email: selectedCredential.email,
    password: selectedCredential.password,
  });

  if (signInResult.error || !signInResult.data.session || !signInResult.data.user) {
    throw new Error(
      `Failed to sign in with role "${selectedCredential.role}": ${signInResult.error?.message ?? 'missing session'}`,
    );
  }

  const accessToken = signInResult.data.session.access_token;
  await activateReferenceSeedsForSmoke({
    accessToken,
    currentUserId: signInResult.data.user.id,
    requiredSeeds: getReferenceSeedKeysForTable('flowproperties'),
    supabase,
  });
  patchJsonOrderedWithActiveReferenceSeeds(runtimeFixture.fixture.jsonOrdered, {
    currentDataset: {
      id: runtimeFixture.runtimeId,
      table: 'flowproperties',
    },
  });
  submittedRuleVerification = await computeFlowpropertyRuleVerification(
    runtimeFixture.fixture.jsonOrdered,
  );

  const createResult = await supabase.functions.invoke('app_dataset_create', {
    body: {
      id: runtimeFixture.runtimeId,
      jsonOrdered: runtimeFixture.fixture.jsonOrdered,
      ruleVerification: submittedRuleVerification,
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
    throw new Error(`Create flowproperty failed: ${createResult.error.message}.${duplicateHint}`);
  }

  const recordResult = await supabase
    .from(runtimeFixture.fixture.table)
    .select('id,json_ordered,user_id,state_code,version,team_id,rule_verification,reviews')
    .eq('id', runtimeFixture.runtimeId)
    .eq('version', runtimeFixture.version)
    .maybeSingle<SmokeRecord>();

  if (recordResult.error || !recordResult.data) {
    throw new Error(
      `Failed to query created flowproperty: ${recordResult.error?.message ?? 'record not found'}`,
    );
  }

  const record = recordResult.data;
  const expectationResults = evaluateExpectations({
    currentUserId: signInResult.data.user.id,
    expectations,
    record,
    uploadedJsonOrdered: runtimeFixture.fixture.jsonOrdered,
  });

  let cleanupAttempted = false;
  let cleanupPassed = true;

  if (!options.keepData) {
    cleanupAttempted = true;
    const deleteResult = await supabase.functions.invoke('app_dataset_delete', {
      body: {
        id: runtimeFixture.runtimeId,
        table: runtimeFixture.fixture.table,
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

  clearActiveReferenceSeeds();
  await supabase.auth.signOut();

  const passed = expectationResults.every((expectation) => expectation.passed) && cleanupPassed;
  let runtimeRecordFile: string | undefined;
  let runtimeRecordWritten = false;

  if (options.writeRuntime) {
    runtimeRecordFile = options.runtimeRecordFile;
    const runtimeRecord = buildRuntimeRecord(options, {
      cleanupAttempted,
      cleanupPassed,
      expectationResults,
      frontendProbe,
      passed,
      record,
      runtimeFixture,
      selectedUser: {
        email: selectedCredential.email,
        role: selectedCredential.role,
        userId: signInResult.data.user.id,
      },
      submittedRuleVerification,
      supabaseTarget,
    });
    await writeRuntimeRecord(runtimeRecordFile, runtimeRecord);
    runtimeRecordWritten = true;
  }

  return {
    cleanupAttempted,
    cleanupPassed,
    createResponse: createResult.data,
    expectationResults,
    frontendProbe,
    passed,
    record,
    runtimeRecordFile,
    runtimeRecordWritten,
    runtimeFixture,
    selectedUser: {
      email: selectedCredential.email,
      role: selectedCredential.role,
      userId: signInResult.data.user.id,
    },
    submittedRuleVerification,
    supabaseTarget,
  };
}

export function buildRuntimeRecord(
  options: Pick<CliOptions, 'dataFile' | 'expectedFile' | 'frontendUrl' | 'keepData'>,
  result: Pick<
    SmokeTestResult,
    | 'cleanupAttempted'
    | 'cleanupPassed'
    | 'expectationResults'
    | 'frontendProbe'
    | 'passed'
    | 'record'
    | 'runtimeFixture'
    | 'selectedUser'
    | 'submittedRuleVerification'
    | 'supabaseTarget'
  >,
): RuntimeRecord {
  const { json_ordered: _jsonOrdered, ...persistedRecord } = result.record;

  return {
    cleanupAttempted: result.cleanupAttempted,
    cleanupPassed: result.cleanupPassed,
    createdAt: new Date().toISOString(),
    expectationResults: result.expectationResults,
    expectedFile: options.expectedFile,
    fixtureFile: options.dataFile,
    frontendProbe: result.frontendProbe,
    frontendUrl: options.frontendUrl,
    keepData: options.keepData,
    passed: result.passed,
    persistedRecord,
    role: result.selectedUser.role,
    runtimeId: result.runtimeFixture.runtimeId,
    sourceFixtureId: result.runtimeFixture.sourceFixtureId,
    submittedRuleVerification: result.submittedRuleVerification,
    supabase: {
      apiUrl: result.supabaseTarget.apiUrl,
      dashboardUrl: result.supabaseTarget.dashboardUrl,
      projectId: result.supabaseTarget.projectId,
    },
    user: {
      email: result.selectedUser.email,
      userId: result.selectedUser.userId,
    },
    version: result.runtimeFixture.version,
  };
}

export async function writeRuntimeRecord<T extends object>(filePath: string, record: T) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
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
  argv: string[],
  readNextValue: () => string | undefined,
) {
  if (inlineValue !== undefined) {
    return inlineValue;
  }

  const nextValue = readNextValue();
  if (!nextValue || nextValue.startsWith('--')) {
    throw new Error(`Missing value for --${flag}`);
  }
  void argv;
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

function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseUsersJsonEnv(env: NodeJS.ProcessEnv): UsersFile {
  const rawUsersJson = normalizeOptionalString(env[TEST_USERS_JSON_ENV]);

  if (!rawUsersJson) {
    return {};
  }

  let parsedUsers: unknown;
  try {
    parsedUsers = JSON.parse(rawUsersJson);
  } catch (error) {
    throw new Error(
      `Invalid ${TEST_USERS_JSON_ENV}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return normalizeUsersShape(parsedUsers, TEST_USERS_JSON_ENV);
}

async function buildEffectiveUsersEnv(
  env: NodeJS.ProcessEnv,
  options: LoadUsersConfigOptions,
): Promise<NodeJS.ProcessEnv> {
  const usersEnvFilePath = resolveUsersEnvFilePathOption(env, options);

  if (!usersEnvFilePath) {
    return env;
  }

  const envFromFile = await loadOptionalUsersEnvFile(usersEnvFilePath);
  return {
    ...envFromFile,
    ...env,
  };
}

function resolveUsersEnvFilePathOption(env: NodeJS.ProcessEnv, options: LoadUsersConfigOptions) {
  if (options.usersEnvFilePath === null) {
    return null;
  }

  if (typeof options.usersEnvFilePath === 'string') {
    return path.resolve(options.cwd ?? process.cwd(), options.usersEnvFilePath);
  }

  if (env === process.env && shouldAutoLoadUsersEnvFile(env)) {
    return resolveDefaultUsersEnvFilePath(options.cwd);
  }

  return null;
}

async function loadOptionalUsersEnvFile(filePath: string): Promise<NodeJS.ProcessEnv> {
  try {
    return await loadUsersEnvFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

function shouldAutoLoadUsersEnvFile(env: NodeJS.ProcessEnv) {
  return normalizeOptionalString(env.JEST_WORKER_ID) === undefined;
}

function parseUsersDirectEnv(env: NodeJS.ProcessEnv): UsersFile {
  const users: UsersFile = {};

  Object.entries(env).forEach(([key, value]) => {
    if (typeof value !== 'string') {
      return;
    }

    const matched = key.match(/^TEST_(.+)_(EMAIL|PASSWORD)$/u);
    if (!matched) {
      return;
    }

    const role = matched[1].toLowerCase().replace(/_+/gu, '-');
    const field = matched[2].toLowerCase() as keyof CredentialEntry;
    users[role] = {
      ...(users[role] ?? {}),
      [field]: value,
    };
  });

  return users;
}

function normalizeUsersShape(usersValue: unknown, sourceLabel: string): UsersFile {
  if (!usersValue || typeof usersValue !== 'object' || Array.isArray(usersValue)) {
    throw new Error(`Invalid ${sourceLabel}: expected an object keyed by role.`);
  }

  return Object.entries(usersValue as Record<string, unknown>).reduce<UsersFile>(
    (users, [role, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(
          `Invalid ${sourceLabel}: role "${role}" must be an object with optional email/password fields.`,
        );
      }

      const credential = value as Record<string, unknown>;
      users[role] = {
        email: typeof credential.email === 'string' ? credential.email : undefined,
        password: typeof credential.password === 'string' ? credential.password : undefined,
      };

      return users;
    },
    {},
  );
}

function buildRoleCredentialEnvVarName(role: string, field: keyof CredentialEntry) {
  const normalizedRole = role
    .trim()
    .replace(/[^a-zA-Z0-9]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
    .toUpperCase();

  return `TEST_${normalizedRole}_${field.toUpperCase()}`;
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/u, '');
}

function isSupabaseDashboardUrl(url: URL) {
  return url.hostname === 'supabase.com' && /\/dashboard\/project\/[^/]+/u.test(url.pathname);
}

function extractProjectIdFromDashboardUrl(url: URL) {
  const matched = url.pathname.match(/\/dashboard\/project\/([^/]+)/u);
  return matched?.[1] ?? null;
}

function extractProjectIdFromApiUrl(url: URL) {
  if (!url.hostname.endsWith('.supabase.co')) {
    return null;
  }
  return url.hostname.split('.')[0] ?? null;
}

async function loadJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getFlowpropertyVersion(jsonOrdered: Record<string, any>) {
  const version = getNestedValue<string>(jsonOrdered, FLOWPROPERTY_VERSION_PATH);
  return typeof version === 'string' && version.trim() ? version : '';
}

function getNestedValue<T>(source: Record<string, any>, keys: readonly string[]) {
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

export function buildPermanentDataSetUri(id: string, version: string) {
  return `${FLOWPROPERTY_PERMANENT_URI_BASE}?uuid=${id}&version=${version}`;
}

function stripBackticks(value: string) {
  return value.replace(/`/gu, '');
}

export function deepSortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepSortJson(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = deepSortJson((value as Record<string, unknown>)[key]);
      return accumulator;
    }, {});
}

function replaceRuntimeFlowpropertyIdPlaceholder<T>(value: T, runtimeId: string): T {
  if (typeof value === 'string') {
    return value.split(RUNTIME_FLOWPROPERTY_ID_PLACEHOLDER).join(runtimeId) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceRuntimeFlowpropertyIdPlaceholder(item, runtimeId)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (accumulator, [key, nestedValue]) => {
      accumulator[key] = replaceRuntimeFlowpropertyIdPlaceholder(nestedValue, runtimeId);
      return accumulator;
    },
    {},
  ) as T;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected expectation: ${JSON.stringify(value)}`);
}
