import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient, FunctionRegion, type SupabaseClient } from '@supabase/supabase-js';

import {
  activateReferenceSeedsForSmoke,
  clearActiveReferenceSeeds,
  getReferenceSeedKeysForTable,
  patchJsonOrderedWithActiveReferenceSeeds,
} from '../reference-seeds';
import {
  buildDataWorkflowHelpText,
  evaluateStructuredExpectations,
  parseBoolean,
  pollUntil,
  requireFlagValue,
  splitFlag,
  type FrontendProbeResult,
  type StructuredExpectation,
  type StructuredExpectationResult,
} from '../workflow-shared';
import {
  computeProcessRuleVerification,
  DEFAULT_PROCESS_EXPECTED_PATH,
  DEFAULT_PROCESS_FIXTURE_PATH,
  DEFAULT_PROCESS_ROLE,
  DEFAULT_USERS_PATH,
  loadProcessFixture,
  loadUsersConfig,
  normalizeSupabaseTarget,
  pickCredentialByRole,
  prepareRuntimeFixture,
  probeFrontendUrl,
  resolveRuntimeRecordFilePath,
  type RuntimeFixture,
  type SupabaseTarget,
} from './processes-create-workflow-lib';

export const DEFAULT_PROCESS_FULL_TEXT_SEARCH_FIXTURE_PATH =
  'tests/data-workflows/fixtures/data/processes/007_full_text_search.json';
export const DEFAULT_PROCESS_FULL_TEXT_SEARCH_EXPECTED_PATH =
  'tests/data-workflows/fixtures/result/processes/007_full_text_search.md';

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

export type ProcessFullTextSearchFixture = {
  queries: FullTextSearchQueryFixture[];
  table: 'processes';
};

export type ProcessFullTextSearchCliOptions = {
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

export type ProcessSearchResultSummary = {
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

export type ProcessFullTextSearchSmokeResult = {
  cleanupAttempted: boolean;
  cleanupPassed: boolean;
  expectationResults: StructuredExpectationResult[];
  frontendProbe: FrontendProbeResult;
  passed: boolean;
  queryResults: ProcessSearchResultSummary[];
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

export type ProcessFullTextSearchDependencies = {
  createClientImpl?: typeof createClient;
  fetchImpl?: typeof fetch;
  generateIdFn?: () => string;
  searchPollOptions?: {
    intervalMs?: number;
    timeoutMs?: number;
  };
};

export const PROCESS_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP = `Process full-text-search data workflow

Usage:
  npm run test:workflows -- --processes:full-text-search --frontend-url http://127.0.0.1:8000 --supabase-url https://fotofiyqnuyvgtotswie.supabase.co
  npm run test:workflows -- --processes:full-text-search --detail-result --no-keep-data

Flags:
  --role <name>                    Role key from .env.users.local / TEST_USERS_JSON / TEST_<ROLE>_* (defaults to "user")
  --frontend-url <url>             Frontend URL to display and optionally probe
  --supabase-url <url>             Supabase API URL or dashboard project URL
  --supabase-project-url <url>     Explicit dashboard project URL
  --supabase-publishable-key <key> Override SUPABASE_PUBLISHABLE_KEY
  --search-data-file <path>        Defaults to tests/data-workflows/fixtures/data/processes/007_full_text_search.json
  --data-file <path>               Alias of --search-data-file
  --seed-data-file <path>          Defaults to tests/data-workflows/fixtures/data/processes/001_create.json
  --users-file <path>              Legacy JSON fallback, defaults to tests/data-workflows/fixtures/data/users.json after checking .env.users.local
  --keep-data                      Keep the created process after validation (default)
  --keep-created                   Alias of --keep-data
  --no-keep-data                   Delete the created process after validation
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

export function parseProcessFullTextSearchCliArgs(
  argv: string[],
  cwd = process.cwd(),
): ProcessFullTextSearchCliOptions {
  let runtimeRecordFileExplicit = false;
  const options: ProcessFullTextSearchCliOptions = {
    dataFile: path.resolve(cwd, DEFAULT_PROCESS_FULL_TEXT_SEARCH_FIXTURE_PATH),
    expectedFile: path.resolve(cwd, DEFAULT_PROCESS_FULL_TEXT_SEARCH_EXPECTED_PATH),
    generateId: true,
    help: false,
    keepData: true,
    role: DEFAULT_PROCESS_ROLE,
    runtimeRecordFile: resolveRuntimeRecordFilePath(
      path.resolve(cwd, DEFAULT_PROCESS_FULL_TEXT_SEARCH_FIXTURE_PATH),
      cwd,
    ),
    seedDataFile: path.resolve(cwd, DEFAULT_PROCESS_FIXTURE_PATH),
    seedExpectedFile: path.resolve(cwd, DEFAULT_PROCESS_EXPECTED_PATH),
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
    options.runtimeRecordFile = resolveRuntimeRecordFilePath(options.dataFile, cwd);
  }

  return options;
}

export function buildProcessFullTextSearchExpectations(): StructuredExpectation[] {
  return [
    {
      expected: 'true',
      label: 'First query contains the runtime process id',
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

export async function loadProcessFullTextSearchFixture(
  filePath: string,
): Promise<ProcessFullTextSearchFixture> {
  const raw = JSON.parse(await readFile(filePath, 'utf8')) as ProcessFullTextSearchFixture;

  if (raw.table !== 'processes') {
    throw new Error(`Full-text search fixture table must be "processes": ${filePath}`);
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

export async function runProcessFullTextSearchSmoke(
  options: ProcessFullTextSearchCliOptions,
  dependencies: ProcessFullTextSearchDependencies = {},
): Promise<ProcessFullTextSearchSmokeResult> {
  const supabaseTarget = normalizeSupabaseTarget(options);
  const searchFixture = await loadProcessFullTextSearchFixture(options.dataFile);
  const runtimeFixture = prepareRuntimeFixture(await loadProcessFixture(options.seedDataFile), {
    generateId: options.generateId,
    generateIdFn: dependencies.generateIdFn,
  });
  const expectations = buildProcessFullTextSearchExpectations();
  const { sourceLabel, users } = await loadUsersConfig(options.usersFile);
  const selectedCredential = pickCredentialByRole(users, options.role, sourceLabel);
  const frontendProbe =
    options.verifyFrontend && options.frontendUrl
      ? await probeFrontendUrl(options.frontendUrl, dependencies.fetchImpl)
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
    requiredSeeds: getReferenceSeedKeysForTable('processes'),
    supabase: supabase as unknown as SupabaseClient,
  });
  patchJsonOrderedWithActiveReferenceSeeds(runtimeFixture.fixture.jsonOrdered, {
    currentDataset: {
      id: runtimeFixture.runtimeId,
      table: 'processes',
    },
  });
  const submittedRuleVerification = await computeProcessRuleVerification(
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
    throw new Error(`Create process search seed failed: ${createResult.error.message}`);
  }

  let queryResults: ProcessSearchResultSummary[] = [];

  try {
    queryResults = [];

    for (const query of searchFixture.queries) {
      const summary = await pollUntil(
        () =>
          runPgroongaProcessSearch({
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

export function buildProcessFullTextSearchHelpText() {
  return buildDataWorkflowHelpText(PROCESS_FULL_TEXT_SEARCH_DATA_WORKFLOW_HELP);
}

async function runPgroongaProcessSearch(input: {
  query: FullTextSearchQueryFixture;
  runtimeId: string;
  supabase: SupabaseLike;
}): Promise<ProcessSearchResultSummary> {
  const requestParams: Record<string, unknown> = {
    data_source: input.query.dataSource ?? 'my',
    filter_condition: input.query.filterCondition ?? {},
    page_current: input.query.pageCurrent ?? 1,
    page_size: input.query.pageSize ?? 10,
    query_text: input.query.keyword,
  };

  if (typeof input.query.stateCode === 'number') {
    requestParams.state_code = input.query.stateCode;
  }

  if (input.query.typeOfDataSet && input.query.typeOfDataSet !== 'all') {
    requestParams.type_of_data_set = input.query.typeOfDataSet;
  }

  const result = await input.supabase.rpc('pgroonga_search_processes_v1', requestParams);
  if (result.error) {
    throw new Error(
      `Process full-text search failed for "${input.query.label}": ${result.error.message}`,
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
