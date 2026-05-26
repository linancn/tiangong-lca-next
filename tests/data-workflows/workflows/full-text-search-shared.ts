import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient, FunctionRegion, type SupabaseClient } from '@supabase/supabase-js';

import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  patchJsonOrderedWithActiveReferenceSeeds,
  type ReferenceSeedTable,
} from './reference-seeds';
import {
  evaluateStructuredExpectations,
  parseBoolean,
  pollUntil,
  requireFlagValue,
  splitFlag,
  type FrontendProbeResult,
  type StructuredExpectation,
  type StructuredExpectationResult,
} from './workflow-shared';

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
  | 'search-data-file'
  | 'seed-data-file'
  | 'supabase-project-url'
  | 'supabase-publishable-key'
  | 'supabase-url'
  | 'users-file'
  | 'verify-frontend'
  | 'write-runtime';

export type FullTextSearchQueryFixture = {
  dataSource?: string;
  expectedContainsRuntimeId?: boolean;
  expectedCount?: number;
  expectedMinCount?: number;
  filterCondition?: unknown;
  keyword: string;
  label: string;
  pageCurrent?: number;
  pageSize?: number;
  stateCode?: number;
  typeOfDataSet?: string;
};

export type FullTextSearchFixture = {
  queries: FullTextSearchQueryFixture[];
  table: string;
};

export type FullTextSearchCliOptions = {
  dataFile: string;
  expectedFile: string;
  frontendUrl?: string;
  generateId: boolean;
  help: boolean;
  keepData: boolean;
  role: string;
  runtimeRecordFile: string;
  seedDataFile: string;
  seedExpectedFile: string;
  supabaseProjectUrl?: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
  usersFile: string;
  verifyFrontend: boolean;
  writeRuntime: boolean;
};

export type FullTextSearchResultSummary = {
  containsRuntimeId: boolean;
  count: number;
  countPassed: boolean;
  dataSource: string;
  keyword: string;
  label: string;
  matchedIds: string[];
  minCountPassed: boolean;
  success: boolean;
  totalCount: number;
};

export type FullTextSearchSmokeResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  expectationResults: StructuredExpectationResult[];
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  queryResults: FullTextSearchResultSummary[];
  runtimeFixture: any;
  runtimeRecordFile?: string;
  runtimeRecordWritten: boolean;
  selectedUser: {
    email: string;
    role: string;
    userId: string;
  };
  supabaseTarget: any;
};

type SupabaseLike = {
  auth: {
    signInWithPassword(input: { email: string; password: string }): Promise<any>;
    signOut(): Promise<unknown>;
  };
  functions: {
    invoke(
      name: string,
      options: unknown,
    ): Promise<{ data?: unknown; error?: { message: string } }>;
  };
  rpc(
    name: string,
    params: Record<string, unknown>,
  ): Promise<{ data?: any[]; error?: { message: string } }>;
};

export type FullTextSearchDependencies = {
  createClientImpl?: typeof createClient;
  fetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  searchPollOptions?: {
    intervalMs?: number;
    timeoutMs?: number;
  };
};

export type FullTextSearchWorkflowConfig = {
  computeRuleVerification: (jsonOrdered: Record<string, any>) => Promise<boolean>;
  dataType: string;
  defaultExpectedPath: string;
  defaultRole: string;
  defaultSearchFixturePath: string;
  defaultSeedExpectedPath: string;
  defaultSeedFixturePath: string;
  defaultUsersPath: string;
  includeUserIdInSearch?: boolean;
  loadSeedFixture: (filePath: string) => Promise<any>;
  normalizeSupabaseTarget: (options: {
    supabaseProjectUrl?: string;
    supabasePublishableKey?: string;
    supabaseUrl?: string;
  }) => any;
  prepareRuntimeFixture: (
    fixture: any,
    options: { generateId: boolean; generateIdFn?: () => string },
  ) => any;
  probeFrontendUrl: (frontendUrl: string | undefined, fetchImpl?: typeof fetch) => Promise<any>;
  resolveRuntimeRecordFilePath: (dataFile: string, cwd?: string) => string;
  rpcName: string;
  table: string;
  workflowName: string;
  loadUsersConfig: (filePath: string) => Promise<any>;
  pickCredentialByRole: (users: any, role: string, sourceLabel?: any) => any;
};

export function buildFullTextSearchHelpText(input: {
  defaultExpectedPath: string;
  defaultSearchFixturePath: string;
  defaultSeedExpectedPath: string;
  defaultSeedFixturePath: string;
  npmCommand: string;
  title: string;
}) {
  return `${input.title}

Usage:
  npm run ${input.npmCommand} -- --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run ${input.npmCommand} -- --detail-result --no-keep-data

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --search-data-file <path>        Defaults to ${input.defaultSearchFixturePath}
  --data-file <path>               Alias of --search-data-file
  --seed-data-file <path>          Defaults to ${input.defaultSeedFixturePath}
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the created dataset after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the created dataset after validation
  --no-keep-created                Alias of --no-keep-data
  --generate-id                    Replace the seed fixture UUID with a fresh runtime UUID (default)
  --no-generate-id                 Reuse the seed fixture UUID from the file as-is
  --write-runtime                  Write this run's runtime record to a file (default)
  --no-write-runtime               Skip writing the runtime record file
  --runtime-record-file <path>     Override the runtime record output path
  --verify-frontend                Fetch the frontend URL before run (default)
  --no-verify-frontend             Skip the frontend fetch probe
  --help                           Show this help text
`;
}

export function parseFullTextSearchCliArgs(
  argv: string[],
  config: FullTextSearchWorkflowConfig,
  cwd = process.cwd(),
): FullTextSearchCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: FullTextSearchCliOptions = {
    dataFile: path.resolve(cwd, config.defaultSearchFixturePath),
    expectedFile: path.resolve(cwd, config.defaultExpectedPath),
    generateId: true,
    help: false,
    keepData: true,
    role: config.defaultRole,
    runtimeRecordFile: config.resolveRuntimeRecordFilePath(
      path.resolve(cwd, config.defaultSearchFixturePath),
      cwd,
    ),
    seedDataFile: path.resolve(cwd, config.defaultSeedFixturePath),
    seedExpectedFile: path.resolve(cwd, config.defaultSeedExpectedPath),
    usersFile: path.resolve(cwd, config.defaultUsersPath),
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
    const readNextValue = () => {
      index += 1;
      return argv[index];
    };

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
        options.role = requireFlagValue(flag, inlineValue, readNextValue);
        break;
      case 'frontend-url':
        options.frontendUrl = requireFlagValue(flag, inlineValue, readNextValue);
        break;
      case 'supabase-url':
        options.supabaseUrl = requireFlagValue(flag, inlineValue, readNextValue);
        break;
      case 'supabase-project-url':
        options.supabaseProjectUrl = requireFlagValue(flag, inlineValue, readNextValue);
        break;
      case 'supabase-publishable-key':
        options.supabasePublishableKey = requireFlagValue(flag, inlineValue, readNextValue);
        break;
      case 'data-file':
      case 'search-data-file':
        options.dataFile = path.resolve(cwd, requireFlagValue(flag, inlineValue, readNextValue));
        break;
      case 'seed-data-file':
        options.seedDataFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, readNextValue),
        );
        break;
      case 'users-file':
        options.usersFile = path.resolve(cwd, requireFlagValue(flag, inlineValue, readNextValue));
        break;
      case 'runtime-record-file':
        options.runtimeRecordFile = path.resolve(
          cwd,
          requireFlagValue(flag, inlineValue, readNextValue),
        );
        runtimeRecordFileExplicit = true;
        options.writeRuntime = true;
        break;
      default:
        throw new Error(`Unknown flag: --${flag}`);
    }
  }

  if (!runtimeRecordFileExplicit) {
    options.runtimeRecordFile = config.resolveRuntimeRecordFilePath(options.dataFile, cwd);
  }

  return options;
}

export function buildFullTextSearchExpectations(): StructuredExpectation[] {
  return [
    {
      expected: 'true',
      label: 'First query contains the runtime dataset id',
      path: 'queries.0.containsRuntimeId',
    },
    {
      expected: 'true',
      label: 'First query satisfies its minimum result count',
      path: 'queries.0.minCountPassed',
    },
    {
      expected: '0',
      label: 'Negative query returns no rows',
      path: 'queries.1.count',
    },
    {
      expected: 'true',
      label: 'Negative query count matches expectation',
      path: 'queries.1.countPassed',
    },
  ];
}

export async function loadFullTextSearchFixture(
  filePath: string,
  table: string,
): Promise<FullTextSearchFixture> {
  const raw = JSON.parse(await readFile(filePath, 'utf8')) as FullTextSearchFixture;

  if (raw.table !== table) {
    throw new Error(`Full-text search fixture table must be "${table}": ${filePath}`);
  }

  if (!Array.isArray(raw.queries) || raw.queries.length === 0) {
    throw new Error(`Full-text search fixture must include at least one query: ${filePath}`);
  }

  raw.queries.forEach((query, index) => {
    if (!query.label || !query.keyword) {
      throw new Error(`Full-text search query ${index + 1} is missing label or keyword.`);
    }
  });

  return raw;
}

export async function runFullTextSearchSmoke(
  options: FullTextSearchCliOptions,
  config: FullTextSearchWorkflowConfig,
  dependencies: FullTextSearchDependencies = {},
): Promise<FullTextSearchSmokeResult> {
  const supabaseTarget = config.normalizeSupabaseTarget(options);
  const searchFixture = await loadFullTextSearchFixture(options.dataFile, config.table);
  const runtimeFixture = config.prepareRuntimeFixture(
    await config.loadSeedFixture(options.seedDataFile),
    {
      generateId: options.generateId,
      generateIdFn: dependencies.generateIdFn,
    },
  );
  const expectations = buildFullTextSearchExpectations();
  const { sourceLabel, users } = await config.loadUsersConfig(options.usersFile);
  const selectedCredential = config.pickCredentialByRole(users, options.role, sourceLabel);
  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await config.probeFrontendUrl(options.frontendUrl, dependencies.fetchImpl)
      : { ok: true, skipped: true };
  const createClientImpl = dependencies.createClientImpl ?? createClient;
  const supabase = createClientImpl(supabaseTarget.apiUrl, supabaseTarget.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }) as unknown as SupabaseLike;
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
    requiredSeeds: getReferenceSeedKeysForTable(config.table as ReferenceSeedTable),
    supabase: supabase as unknown as SupabaseClient,
  });
  patchJsonOrderedWithActiveReferenceSeeds(runtimeFixture.fixture.jsonOrdered, {
    currentDataset: {
      id: runtimeFixture.runtimeId,
      table: config.table as ReferenceSeedTable,
    },
  });
  const submittedRuleVerification = await config.computeRuleVerification(
    runtimeFixture.fixture.jsonOrdered,
  );
  let cleanupAttempted = false;
  let cleanupPassed = true;

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
    throw new Error(`Create ${config.dataType} search seed failed: ${createResult.error.message}`);
  }

  const queryResults: FullTextSearchResultSummary[] = [];

  try {
    for (const query of searchFixture.queries) {
      const summary = await pollUntil(
        () =>
          runFullTextSearchQuery({
            config,
            currentUserId: signInResult.data.user.id,
            query,
            runtimeId: runtimeFixture.runtimeId,
            supabase,
          }),
        (value) => value.success,
        dependencies.searchPollOptions,
      );
      queryResults.push(summary);
    }
  } finally {
    if (!options.keepData) {
      cleanupAttempted = true;
      const deleteResult = await supabase.functions.invoke('app_dataset_delete', {
        body: {
          id: runtimeFixture.runtimeId,
          table: runtimeFixture.fixture.table,
          version: runtimeFixture.version,
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
  }

  const expectationResults = evaluateStructuredExpectations({
    context: {
      cleanupAttempted,
      cleanupPassed,
      queries: queryResults,
    },
    expectations,
  });
  const passed =
    cleanupPassed &&
    queryResults.every((query) => query.success && query.countPassed && query.minCountPassed) &&
    expectationResults.every((expectation) => expectation.passed);
  let runtimeRecordFile: string | undefined;
  let runtimeRecordWritten = false;

  if (options.writeRuntime) {
    runtimeRecordFile = options.runtimeRecordFile;
    await writeRuntimeRecord(runtimeRecordFile, {
      cleanupAttempted,
      cleanupPassed,
      createdAt: new Date().toISOString(),
      expectedFile: options.expectedFile,
      fixtureFile: options.dataFile,
      frontendProbe,
      keepData: options.keepData,
      passed,
      queries: queryResults,
      role: selectedCredential.role,
      runtimeId: runtimeFixture.runtimeId,
      seedDataFile: options.seedDataFile,
      seedExpectedFile: options.seedExpectedFile,
      supabase: {
        apiUrl: supabaseTarget.apiUrl,
        dashboardUrl: supabaseTarget.dashboardUrl,
        projectId: supabaseTarget.projectId,
      },
      user: {
        email: selectedCredential.email,
        userId: signInResult.data.user.id,
      },
      version: runtimeFixture.version,
    });
    runtimeRecordWritten = true;
  }

  return {
    cleanupAttempted,
    cleanupPassed,
    expectationResults,
    frontendProbe,
    passed,
    queryResults,
    runtimeFixture,
    runtimeRecordFile,
    runtimeRecordWritten,
    selectedUser: {
      email: selectedCredential.email,
      role: selectedCredential.role,
      userId: signInResult.data.user.id,
    },
    supabaseTarget,
  };
}

async function runFullTextSearchQuery(input: {
  config: FullTextSearchWorkflowConfig;
  currentUserId: string;
  query: FullTextSearchQueryFixture;
  runtimeId: string;
  supabase: SupabaseLike;
}): Promise<FullTextSearchResultSummary> {
  const requestParams: Record<string, unknown> = {
    data_source: input.query.dataSource ?? 'my',
    filter_condition: input.query.filterCondition ?? {},
    page_current: input.query.pageCurrent ?? 1,
    page_size: input.query.pageSize ?? 10,
    query_text: input.query.keyword,
  };

  if (input.config.includeUserIdInSearch) {
    requestParams.this_user_id = input.currentUserId;
  }

  if (typeof input.query.stateCode === 'number') {
    requestParams.state_code_filter = input.query.stateCode;
  }

  if (input.query.typeOfDataSet && input.query.typeOfDataSet !== 'all') {
    requestParams.type_of_data_set_filter = input.query.typeOfDataSet;
  }

  const result = await input.supabase.rpc(input.config.rpcName, requestParams);
  if (result.error) {
    throw new Error(
      `${input.config.workflowName} failed for "${input.query.label}": ${result.error.message}`,
    );
  }

  const rows = result.data ?? [];
  const matchedIds = rows.map((row) => String(row.id ?? row.json?.id ?? '')).filter(Boolean);
  const totalCount = Number(rows[0]?.total_count ?? rows.length);
  const count = rows.length;
  const containsRuntimeId = matchedIds.includes(input.runtimeId);
  const expectedCount = input.query.expectedCount;
  const expectedMinCount = input.query.expectedMinCount ?? 0;

  return {
    containsRuntimeId,
    count,
    countPassed: expectedCount === undefined ? true : count === expectedCount,
    dataSource: input.query.dataSource ?? 'my',
    keyword: input.query.keyword,
    label: input.query.label,
    matchedIds,
    minCountPassed: count >= expectedMinCount,
    success:
      (input.query.expectedContainsRuntimeId === undefined ||
        containsRuntimeId === input.query.expectedContainsRuntimeId) &&
      (expectedCount === undefined || count === expectedCount) &&
      count >= expectedMinCount,
    totalCount,
  };
}

async function writeRuntimeRecord<T extends object>(filePath: string, record: T) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}
