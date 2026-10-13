'use strict';

const fs = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');

const BROWSERS = ['chromium', 'firefox', 'webkit'];
// Reviewed complete discovery: 28 canonical cases and four harness controls per browser.
// Fifteen canonical scenarios explicitly run in Chromium only. Process allocation runs in all
// three browsers (66d8f7092); route identity comes from the current governed coverage contract.
const CANONICAL_BROWSERS = {
  chromium: { executed: 28, skipped: 0 },
  firefox: { executed: 13, skipped: 15 },
  webkit: { executed: 13, skipped: 15 },
};
const HARNESS_BROWSERS = Object.fromEntries(
  BROWSERS.map((browser) => [browser, { executed: 4, skipped: 0 }]),
);
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameSet = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  new Set(actual).size === actual.length &&
  expected.every((value) => actual.includes(value));

function readQualificationReportReceipt(reportPath) {
  const raw = fs.readFileSync(reportPath);
  let qualification;
  try {
    qualification = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new Error('Semantic qualification report is not valid JSON.');
  }
  return {
    qualification,
    qualificationReportSha256: createHash('sha256').update(raw).digest('hex'),
  };
}
const totals = (counts) =>
  Object.values(counts).reduce(
    (result, count) => ({
      executed: result.executed + count.executed,
      skipped: result.skipped + count.skipped,
    }),
    { executed: 0, skipped: 0 },
  );

function qualificationClosureContract(coverage) {
  const evidence = coverage?.proofPolicy?.evidenceContract;
  const applicability = evidence?.browserCoverage;
  const assertionIds = isRecord(coverage?.executableTargets)
    ? Object.keys(coverage.executableTargets).sort()
    : [];
  if (
    assertionIds.length === 0 ||
    evidence?.requiredAssertionCount !== assertionIds.length ||
    !sameSet(evidence?.requiredBrowsers, BROWSERS) ||
    applicability?.fullRouteViewBrowser !== 'chromium' ||
    !sameSet(applicability?.criticalBrowsers, BROWSERS) ||
    !Array.isArray(applicability?.criticalAssertionIds) ||
    applicability.criticalAssertionIds.length === 0 ||
    new Set(applicability.criticalAssertionIds).size !==
      applicability.criticalAssertionIds.length ||
    applicability.criticalAssertionIds.some((id) => !assertionIds.includes(id))
  ) {
    throw new Error('The governed semantic qualification closure contract is inconsistent.');
  }
  const canonical = totals(CANONICAL_BROWSERS);
  const harness = totals(HARNESS_BROWSERS);
  return {
    assertionIds,
    browsers: BROWSERS,
    canonicalBrowsers: CANONICAL_BROWSERS,
    criticalAssertionIds: applicability.criticalAssertionIds,
    harnessBrowsers: HARNESS_BROWSERS,
    coverage: {
      contractAssertionCount: assertionIds.length,
      discoveredCases: canonical.executed + canonical.skipped,
      executedCases: canonical.executed,
      harnessControlCases: harness.executed,
      liveAssertionCount: assertionIds.length,
      qualificationDiscoveredCases:
        canonical.executed + canonical.skipped + harness.executed + harness.skipped,
      skippedCases: canonical.skipped,
    },
  };
}

function loadQualificationClosureContract(repositoryRoot) {
  return qualificationClosureContract(
    JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, 'docs/plans/i18n/route-view-coverage.json'),
        'utf8',
      ),
    ),
  );
}

function qualificationAssertionFailures(value, contract) {
  const failures = [];
  if (!sameSet(value?.assertionIds, contract.assertionIds)) failures.push('assertion-id-set');
  const applicability = value?.assertionBrowsers;
  if (!isRecord(applicability) || !sameSet(Object.keys(applicability), contract.assertionIds)) {
    failures.push('assertion-browser-id-set');
  }
  if (
    contract.assertionIds.some((id) => {
      const actual = applicability?.[id];
      return (
        !Array.isArray(actual) ||
        actual.length === 0 ||
        new Set(actual).size !== actual.length ||
        !actual.includes('chromium') ||
        actual.some((browser) => !contract.browsers.includes(browser)) ||
        (contract.criticalAssertionIds.includes(id) && !sameSet(actual, contract.browsers))
      );
    })
  ) {
    failures.push('assertion-browser-applicability');
  }
  return failures;
}

function qualificationReportFailures(value, contract) {
  const failures = qualificationAssertionFailures(value, contract);
  if (
    !isRecord(value) ||
    !sameSet(Object.keys(value), [
      'assertionIds',
      'assertionBrowsers',
      'browsers',
      'canonicalBrowsers',
      'harnessBrowsers',
      'externalRequests',
      'productionWrites',
      'status',
    ])
  ) {
    failures.push('report-shape');
  }
  if (value?.status !== 'passed') failures.push('report-status');
  for (const [field, expected] of [
    ['canonicalBrowsers', contract.canonicalBrowsers],
    ['harnessBrowsers', contract.harnessBrowsers],
    [
      'browsers',
      Object.fromEntries(
        contract.browsers.map((browser) => [
          browser,
          {
            executed:
              contract.canonicalBrowsers[browser].executed +
              contract.harnessBrowsers[browser].executed,
            skipped:
              contract.canonicalBrowsers[browser].skipped +
              contract.harnessBrowsers[browser].skipped,
          },
        ]),
      ),
    ],
  ]) {
    const actual = value?.[field];
    if (!isRecord(actual) || !sameSet(Object.keys(actual), contract.browsers)) {
      failures.push(`${field}-projects`);
      continue;
    }
    for (const browser of contract.browsers) {
      if (
        !isRecord(actual[browser]) ||
        !sameSet(Object.keys(actual[browser]), ['executed', 'skipped']) ||
        actual[browser].executed !== expected[browser].executed ||
        actual[browser].skipped !== expected[browser].skipped
      ) {
        failures.push(`${field}-${browser}-counts`);
      }
    }
  }
  if (value?.externalRequests !== 0) failures.push('external-requests');
  if (value?.productionWrites !== 0) failures.push('production-writes');
  return failures;
}

function qualificationCoverageFailures(value, contract) {
  return Object.entries(contract.coverage)
    .filter(([key, expected]) => value?.[key] !== expected)
    .map(([key]) => `coverage-${key}`);
}

function qualificationCleanupFailures(value) {
  return ['created', 'cleaned', 'leaked']
    .filter((key) => value?.[key] !== 0)
    .map((key) => `cleanup-${key}`);
}

module.exports = {
  loadQualificationClosureContract,
  qualificationAssertionFailures,
  qualificationCleanupFailures,
  qualificationClosureContract,
  qualificationCoverageFailures,
  qualificationReportFailures,
  readQualificationReportReceipt,
};
