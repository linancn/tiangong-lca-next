import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnv } from 'node:util';

import { createClient } from '@supabase/supabase-js';

import {
  DATA_WORKFLOW_USERS_FIXTURE_PATH,
  resolveDataWorkflowRuntimeRecordFilePath,
} from '../data-workflow-paths';

export const DEFAULT_USERS_PATH = DATA_WORKFLOW_USERS_FIXTURE_PATH;
export const DEFAULT_USERS_ENV_FILE = '.env.users.local';
export const TEST_USERS_JSON_ENV = 'TEST_USERS_JSON';

const DEFAULT_FRONTEND_PROBE_TIMEOUT_MS = 5000;
const TRUE_LITERALS = new Set(['1', 'true', 'yes', 'y']);
const FALSE_LITERALS = new Set(['0', 'false', 'no', 'n']);
const DETAIL_RESULT_HELP_TEXT =
  'Output control:\n' +
  '  --detail-result                 Show full detailed output. Default successful output prints only Data type, Data ID, Version, and Result.';

export type FrontendProbeResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  statusText?: string;
  url?: string;
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

export type ResolvedCredential = {
  email: string;
  password: string;
  requestedRole: string;
  resolvedRole: string;
};

export type SignedInUserSession = {
  accessToken: string;
  client: any;
  credential: ResolvedCredential;
  user: {
    id: string;
  };
};

export type StructuredExpectation = {
  expected: string;
  label: string;
  path: string;
};

export type StructuredExpectationResult = {
  actual: unknown;
  expected: unknown;
  label: string;
  path: string;
  passed: boolean;
};

export type DetailResultFlagState = {
  argv: string[];
  detailResult: boolean;
};

export function splitFlag(arg: string): [string, string | undefined] {
  const withoutPrefix = arg.slice(2);
  const equalsIndex = withoutPrefix.indexOf('=');

  if (equalsIndex === -1) {
    return [withoutPrefix, undefined];
  }

  return [withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1)];
}

export function requireFlagValue(
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

export function parseBoolean(value: string, flag: string) {
  const normalized = value.trim().toLowerCase();

  if (TRUE_LITERALS.has(normalized)) {
    return true;
  }

  if (FALSE_LITERALS.has(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value for --${flag}: ${value}`);
}

export function extractDetailResultFlag(argv: string[]): DetailResultFlagState {
  const filteredArgv: string[] = [];
  let detailResult = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith('--')) {
      filteredArgv.push(arg);
      continue;
    }

    const [rawFlag, inlineValue] = splitFlag(arg);

    if (rawFlag === 'no-detail-result') {
      detailResult = false;
      continue;
    }

    if (rawFlag !== 'detail-result') {
      filteredArgv.push(arg);
      continue;
    }

    if (inlineValue !== undefined) {
      detailResult = parseBoolean(inlineValue, 'detail-result');
      continue;
    }

    const nextValue = argv[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      detailResult = parseBoolean(nextValue, 'detail-result');
      index += 1;
      continue;
    }

    detailResult = true;
  }

  return {
    argv: filteredArgv,
    detailResult,
  };
}

export function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildDataWorkflowHelpText(helpText: string) {
  return `${helpText}\n\n${DETAIL_RESULT_HELP_TEXT}`;
}

export function printDataWorkflowHelp(helpText: string) {
  console.log(buildDataWorkflowHelpText(helpText));
}

export function shouldPrintDetailedResult(detailResult: boolean, passed: boolean) {
  return detailResult || !passed;
}

export function printCompactSmokeSummary(input: {
  dataId?: string | null;
  dataType: string;
  passed: boolean;
  version?: string | null;
}) {
  console.log(`Data type: ${input.dataType}`);
  console.log(`Data ID: ${normalizeOptionalString(input.dataId) ?? '-'}`);
  console.log(`Version: ${normalizeOptionalString(input.version) ?? '-'}`);
  console.log(`Result: ${input.passed ? 'success' : 'failure'}`);
}

export function printExpectationResults(
  expectationResults: Array<{ passed: boolean }>,
  labelPrefix = 'Expectation',
) {
  expectationResults.forEach((expectation, index) => {
    console.log(`[${expectation.passed ? 'PASS' : 'FAIL'}] ${labelPrefix} ${index + 1}`);
  });
}

export function resolveRuntimeRecordFilePath(dataFile: string, cwd = process.cwd()) {
  return resolveDataWorkflowRuntimeRecordFilePath(dataFile, {
    cwd,
    fixtureKinds: ['data'],
  });
}

export function normalizeSupabaseTarget(
  options: {
    supabaseProjectUrl?: string;
    supabasePublishableKey?: string;
    supabaseUrl?: string;
  },
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

export async function loadUsersFile(filePath: string): Promise<UsersFile> {
  const users = await readJsonFile<UsersFile>(filePath);
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

export function resolveDefaultUsersEnvFilePath(cwd = process.cwd()) {
  return path.resolve(cwd, DEFAULT_USERS_ENV_FILE);
}

export async function loadUsersEnvFile(filePath: string): Promise<NodeJS.ProcessEnv> {
  const raw = await readFile(filePath, 'utf8');
  return parseEnv(raw) as NodeJS.ProcessEnv;
}

export function pickCredentialByRole(
  users: UsersFile,
  requestedRole: string,
  sourceLabel: 'environment variables' | 'users file' = 'users file',
  roleAliases: Record<string, string> = {},
): ResolvedCredential {
  const resolvedRole = roleAliases[requestedRole] ?? requestedRole;
  const availableRoles = Object.keys(users).sort();
  const credential = users[resolvedRole];

  if (!credential) {
    const availableRolesText = availableRoles.length > 0 ? availableRoles.join(', ') : '(none)';
    const emailEnvVar = buildRoleCredentialEnvVarName(resolvedRole, 'email');
    const passwordEnvVar = buildRoleCredentialEnvVarName(resolvedRole, 'password');

    if (sourceLabel === 'environment variables') {
      throw new Error(
        `Requested role "${requestedRole}" resolves to "${resolvedRole}", but that role was not found in environment variables. Available roles: ${availableRolesText}. Set ${TEST_USERS_JSON_ENV} or ${emailEnvVar} / ${passwordEnvVar}, or add them to ${DEFAULT_USERS_ENV_FILE}.`,
      );
    }

    throw new Error(
      `Requested role "${requestedRole}" resolves to "${resolvedRole}", but that role was not found in users file. Available roles: ${availableRolesText}.`,
    );
  }

  const email = normalizeOptionalString(credential.email);
  const password = normalizeOptionalString(credential.password);

  if (!email || !password) {
    const emailEnvVar = buildRoleCredentialEnvVarName(resolvedRole, 'email');
    const passwordEnvVar = buildRoleCredentialEnvVarName(resolvedRole, 'password');

    if (sourceLabel === 'environment variables') {
      throw new Error(
        `Resolved role "${resolvedRole}" is missing email or password in environment variables. Set ${TEST_USERS_JSON_ENV} or both ${emailEnvVar} and ${passwordEnvVar}, or complete ${DEFAULT_USERS_ENV_FILE}.`,
      );
    }

    throw new Error(
      `Resolved role "${resolvedRole}" is missing email or password in the configured users file. Complete ${DEFAULT_USERS_ENV_FILE} or the file passed by --users-file before running the data workflow script.`,
    );
  }

  return {
    email,
    password,
    requestedRole,
    resolvedRole,
  };
}

export async function createSignedInUserSession(
  supabaseTarget: SupabaseTarget,
  credential: ResolvedCredential,
): Promise<SignedInUserSession> {
  const client = createClient(supabaseTarget.apiUrl, supabaseTarget.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  const signInResult = await client.auth.signInWithPassword({
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
    client,
    credential,
    user: {
      id: signInResult.data.user.id,
    },
  };
}

export async function signOutUserSession(session: SignedInUserSession) {
  await session.client.auth.signOut();
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

export async function writeRuntimeRecord<T extends object>(filePath: string, record: T) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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

export function evaluateStructuredExpectations(input: {
  context: Record<string, unknown>;
  expectations: StructuredExpectation[];
  placeholders?: Record<string, unknown>;
}): StructuredExpectationResult[] {
  const placeholderMap = input.placeholders ?? {};

  return input.expectations.map((expectation) => {
    const actual = getValueByPath(input.context, expectation.path);
    const expected =
      expectation.expected in placeholderMap
        ? placeholderMap[expectation.expected]
        : parseExpectedLiteral(expectation.expected);

    return {
      actual,
      expected,
      label: expectation.label,
      path: expectation.path,
      passed: areComparableValuesEqual(actual, expected),
    };
  });
}

export async function pollUntil<T>(
  query: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const intervalMs = options.intervalMs ?? 250;
  const startedAt = Date.now();

  let lastValue = await query();
  while (!predicate(lastValue)) {
    if (Date.now() - startedAt >= timeoutMs) {
      return lastValue;
    }

    await sleep(intervalMs);
    lastValue = await query();
  }

  return lastValue;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
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

function parseExpectedLiteral(rawExpected: string): unknown {
  if (rawExpected === 'true') {
    return true;
  }

  if (rawExpected === 'false') {
    return false;
  }

  if (rawExpected === 'null') {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/u.test(rawExpected)) {
    return Number(rawExpected);
  }

  return rawExpected;
}

function getValueByPath(input: Record<string, unknown>, rawPath: string): unknown {
  const segments = rawPath.split('.');

  return segments.reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const numericIndex = Number(segment);
      if (Number.isInteger(numericIndex)) {
        return current[numericIndex];
      }
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, input);
}

function areComparableValuesEqual(actual: unknown, expected: unknown) {
  const normalizedActual = deepSortJson(actual);
  const normalizedExpected = deepSortJson(expected);
  return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
}
