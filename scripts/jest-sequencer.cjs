'use strict';

const Sequencer = require('@jest/test-sequencer').default;

const KNOWN_SLOW_TEST_PATHS = Object.freeze([
  'tests/unit/scripts/prepushGateReceipt.test.ts',
  'tests/unit/i18n/localeDeliveryContracts.test.ts',
  'tests/unit/scripts/releaseWorkflow.test.ts',
]);

function normalizeTestPath(testPath) {
  return String(testPath).replaceAll('\\', '/');
}

function slowSuiteRank(testPath) {
  const normalizedPath = normalizeTestPath(testPath);
  const rank = KNOWN_SLOW_TEST_PATHS.findIndex(
    (knownPath) => normalizedPath === knownPath || normalizedPath.endsWith(`/${knownPath}`),
  );
  return rank === -1 ? KNOWN_SLOW_TEST_PATHS.length : rank;
}

function prioritizeSlowSuites(tests) {
  return [...tests].sort((left, right) => slowSuiteRank(left.path) - slowSuiteRank(right.path));
}

class SlowFirstSequencer extends Sequencer {
  sort(tests) {
    // Retain Jest's failure/duration/file-size ordering within each priority group.
    return prioritizeSlowSuites(super.sort(tests));
  }
}

module.exports = SlowFirstSequencer;
module.exports.KNOWN_SLOW_TEST_PATHS = KNOWN_SLOW_TEST_PATHS;
module.exports.prioritizeSlowSuites = prioritizeSlowSuites;
module.exports.slowSuiteRank = slowSuiteRank;
