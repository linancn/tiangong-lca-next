import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXPECTED_TEST_TITLES,
  canonicalJson,
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
