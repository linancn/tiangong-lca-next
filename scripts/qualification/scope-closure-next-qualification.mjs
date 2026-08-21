#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 'lcia.scope-closure-provider-owned-result.v1';
export const EXPECTED_TEST_TITLES = [
  'anonymous redirects to login',
  'standard_user is denied',
  'admin is denied',
  'owner is denied',
  'data_product_manager is allowed',
  'preparing state is explicit',
  'available metadata and direct downloads are explicit',
  'expired state has rerun guidance',
  'unavailable state is explicit',
  '410 has localized rerun guidance for de-DE',
  '410 has localized rerun guidance for en-US',
  '410 has localized rerun guidance for fr-FR',
  '410 has localized rerun guidance for zh-CN',
];

const productionFingerprints = [
  'qgzvkongdjqiiamzbbts',
  'lca.tiangong.earth',
  '/prod/',
  '-prod-',
  '_prod_',
  '.prod.',
];
const sensitiveKeys = new Set([
  'authorization',
  'credential',
  'credentials',
  'locator',
  'objectpath',
  'password',
  'payload',
  'secret',
  'signedurl',
  'token',
  'url',
]);

function fail(message) {
  throw new Error(`scope-closure Next qualification: ${message}`);
}

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function isLoopback(value) {
  try {
    return ['127.0.0.1', '::1', 'localhost'].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function validateQualificationEnvironment(environment) {
  if (
    environment.QUALIFICATION_NON_PRODUCTION_CONFIRMATION !==
    'I_CONFIRM_ISOLATED_NON_PRODUCTION_TARGETS'
  ) {
    fail('isolated non-production confirmation is required');
  }
  if (!isLoopback(environment.QUALIFICATION_SUPABASE_URL ?? '')) {
    fail('qualification Supabase target must be loopback');
  }
  for (const [key, value] of Object.entries(environment)) {
    if (
      key.startsWith('QUALIFICATION_') &&
      typeof value === 'string' &&
      productionFingerprints.some((fingerprint) => value.toLowerCase().includes(fingerprint))
    ) {
      fail('qualification configuration contains a production fingerprint');
    }
  }
}

export function rejectSensitive(value, label = 'result') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => rejectSensitive(child, `${label}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/gu, '');
      if (sensitiveKeys.has(normalized)) fail(`${label} contains a forbidden sensitive field`);
      rejectSensitive(child, `${label}.${key}`);
    }
    return;
  }
  if (
    typeof value === 'string' &&
    (value.includes('://') ||
      value.toLowerCase().includes('service_role') ||
      value.includes('-----BEGIN '))
  ) {
    fail(`${label} contains forbidden locator or credential material`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function collectSpecs(suites, target = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) target.push(spec);
    collectSpecs(suite.suites, target);
  }
  return target;
}

export function validatePlaywrightReport(report) {
  const specs = collectSpecs(report.suites);
  const titles = specs.map((spec) => spec.title).sort();
  const expected = [...EXPECTED_TEST_TITLES].sort();
  if (JSON.stringify(titles) !== JSON.stringify(expected))
    fail('browser assertion inventory drifted');
  for (const spec of specs) {
    if (
      spec.tests?.length !== 1 ||
      spec.tests[0].results?.length !== 1 ||
      spec.tests[0].results[0].status !== 'passed'
    ) {
      fail('browser assertion did not pass exactly once');
    }
  }
  return specs.length;
}

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : undefined;
      server.close(() => (port ? resolve(port) : reject(new Error('port allocation failed'))));
    });
  });
}

function controlledChildEnvironment(port, supabaseUrl, reportPath) {
  const environment = {};
  for (const key of ['HOME', 'LANG', 'LC_ALL', 'PATH', 'TMPDIR']) {
    if (process.env[key]) environment[key] = process.env[key];
  }
  environment.CI = '1';
  environment.PLAYWRIGHT_JSON_OUTPUT_NAME = reportPath;
  environment.QUALIFICATION_APP_PORT = String(port);
  environment.QUALIFICATION_BASE_URL = `http://127.0.0.1:${port}`;
  environment.QUALIFICATION_SUPABASE_URL = supabaseUrl;
  return environment;
}

async function runBrowserQualification(repo, componentSha, supabaseUrl) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'next-scope-closure-'));
  const candidate = path.join(root, 'candidate');
  const reportPath = path.join(root, 'playwright-report.json');
  let worktreeAdded = false;
  try {
    execFileSync('git', ['-C', repo, 'worktree', 'add', '--detach', candidate, componentSha], {
      stdio: 'ignore',
    });
    worktreeAdded = true;
    symlinkSync(path.join(repo, 'node_modules'), path.join(candidate, 'node_modules'), 'dir');
    writeFileSync(
      path.join(candidate, '.env.local'),
      `SUPABASE_URL=${supabaseUrl}\nSUPABASE_PUBLISHABLE_KEY=qualification-public-placeholder\n`,
      { mode: 0o600 },
    );
    const port = await availablePort();
    const playwright = path.join(candidate, 'node_modules', '.bin', 'playwright');
    const completed = spawnSync(
      playwright,
      ['test', '--config=playwright.closure-download.config.ts', '--reporter=json'],
      {
        cwd: candidate,
        encoding: 'utf8',
        env: controlledChildEnvironment(port, supabaseUrl, reportPath),
        maxBuffer: 16 * 1024 * 1024,
      },
    );
    if (completed.status !== 0) {
      process.stderr.write(completed.stderr || 'browser qualification failed\n');
      fail('browser qualification failed; no evidence was written');
    }
    const report = JSON.parse(
      existsSync(reportPath) ? readFileSync(reportPath, 'utf8') : completed.stdout,
    );
    return validatePlaywrightReport(report);
  } finally {
    if (worktreeAdded) {
      spawnSync('git', ['-C', repo, 'worktree', 'remove', '--force', candidate], {
        stdio: 'ignore',
      });
    }
    rmSync(root, { force: true, recursive: true });
  }
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--output', '--run-id'].includes(key) || !value) fail('expected --output and --run-id');
    values[key.slice(2)] = value;
  }
  if (!values.output || !values['run-id'] || Object.keys(values).length !== 2) {
    fail('expected --output and --run-id exactly once');
  }
  return { output: values.output, runId: values['run-id'] };
}

export async function run(argv = process.argv.slice(2)) {
  const { output, runId } = parseArguments(argv);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) {
    fail('--run-id must be a UUID');
  }
  validateQualificationEnvironment(process.env);
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  if (!existsSync(path.join(repo, 'node_modules', '.bin', 'playwright'))) {
    fail('exact pnpm dependencies are not installed');
  }
  if (git(repo, 'status', '--porcelain', '--untracked-files=no')) {
    fail('qualification requires a clean tracked checkout');
  }
  const componentSha = git(repo, 'rev-parse', 'HEAD');
  if (!/^[0-9a-f]{40}$/u.test(componentSha)) fail('component SHA is invalid');
  const outputPath = path.resolve(output);
  if (existsSync(outputPath)) fail('--output must not already exist');
  const assertions = await runBrowserQualification(
    repo,
    componentSha,
    process.env.QUALIFICATION_SUPABASE_URL,
  );
  const result = {
    assertions,
    component: 'next',
    componentSha,
    evidence: {
      consumers: {
        deletedStatePassed: true,
        expiredStatePassed: true,
        nextContractPassed: true,
        readyStatePassed: true,
      },
    },
    owner: 'next',
    productionMutation: false,
    runId,
    schemaVersion: SCHEMA_VERSION,
    targetClass: 'isolated-production-equivalent',
  };
  rejectSensitive(result.evidence, 'next.evidence');
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, canonicalJson(result), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'qualification failed'}\n`);
    process.exitCode = 2;
  });
}
