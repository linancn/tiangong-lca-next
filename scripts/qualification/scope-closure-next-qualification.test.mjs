import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  EXPECTED_TEST_TITLES,
  canonicalJson,
  installCandidateDependencies,
  rejectSensitive,
  validatePlaywrightReport,
  validateQualificationEnvironment,
} from './scope-closure-next-qualification.mjs';

test('accepts only explicit loopback non-production configuration', () => {
  assert.doesNotThrow(() =>
    validateQualificationEnvironment({
      QUALIFICATION_NON_PRODUCTION_CONFIRMATION: 'I_CONFIRM_ISOLATED_NON_PRODUCTION_TARGETS',
      QUALIFICATION_SUPABASE_URL: 'http://127.0.0.1:54321',
    }),
  );
  assert.throws(
    () =>
      validateQualificationEnvironment({
        QUALIFICATION_NON_PRODUCTION_CONFIRMATION: 'I_CONFIRM_ISOLATED_NON_PRODUCTION_TARGETS',
        QUALIFICATION_SUPABASE_URL: 'https://lca.tiangong.earth',
      }),
    /loopback|production fingerprint/u,
  );
});

test('rejects sensitive evidence without echoing the value', () => {
  assert.throws(() => rejectSensitive({ signedUrl: 'private-value' }), /forbidden sensitive/u);
  try {
    rejectSensitive({ note: 'https://private.example.test' });
    assert.fail('expected sensitive string rejection');
  } catch (error) {
    assert.doesNotMatch(String(error), /private\.example/u);
  }
});

test('writes canonical deterministic JSON', () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), '{"a":{"x":3,"y":2},"z":1}\n');
});

test('requires every browser assertion to pass exactly once', () => {
  const report = {
    suites: [
      {
        specs: EXPECTED_TEST_TITLES.map((title) => ({
          tests: [{ results: [{ status: 'passed' }] }],
          title,
        })),
      },
    ],
  };
  assert.equal(validatePlaywrightReport(report), EXPECTED_TEST_TITLES.length);
  report.suites[0].specs[0].tests[0].results[0].status = 'failed';
  assert.throws(() => validatePlaywrightReport(report), /did not pass/u);
});

test('candidate dependency setup fails closed before browser evidence on installer failure', (t) => {
  const candidate = mkdtempSync(path.join(os.tmpdir(), 'scope-closure-install-failed-'));
  t.after(() => rmSync(candidate, { recursive: true, force: true }));
  assert.throws(
    () =>
      installCandidateDependencies(candidate, {}, () => ({
        status: 1,
        stderr: 'offline package missing\n',
      })),
    /dependency installation failed; no evidence was written/u,
  );
});

test('candidate install requires a private modules directory and leaves caller hook settings intact', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'scope-closure-install-isolated-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const candidate = path.join(root, 'candidate');
  const owner = path.join(root, 'owner-modules');
  mkdirSync(candidate);
  mkdirSync(owner);
  const environment = { CI: '1', HUSKY: 'caller-value' };
  const execute = (command, args, options) => {
    assert.equal(command, 'pnpm');
    assert.deepEqual(args, ['install', '--offline', '--frozen-lockfile']);
    assert.equal(options.cwd, candidate);
    assert.equal(options.env.HUSKY, '0');
    assert.equal(options.env.CI, '1');
    return { status: 0 };
  };
  symlinkSync(owner, path.join(candidate, 'node_modules'), 'junction');
  assert.throws(
    () => installCandidateDependencies(candidate, environment, execute),
    /own modules directory/u,
  );
  rmSync(path.join(candidate, 'node_modules'));
  mkdirSync(path.join(candidate, 'node_modules'));
  assert.doesNotThrow(() => installCandidateDependencies(candidate, environment, execute));
  assert.equal(environment.HUSKY, 'caller-value');
});
