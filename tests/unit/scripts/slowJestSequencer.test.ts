import fs from 'node:fs';
import path from 'node:path';

const Sequencer = require('../../../scripts/jest-sequencer.cjs') as {
  KNOWN_SLOW_TEST_PATHS: readonly string[];
  prioritizeSlowSuites: <Test extends { path: string }>(tests: readonly Test[]) => Test[];
  slowSuiteRank: (testPath: string) => number;
};

describe('slow-first Jest sequencer', () => {
  it('is selected by the repository Jest configuration', () => {
    const configSource = fs.readFileSync(path.join(process.cwd(), 'jest.config.cjs'), 'utf8');

    expect(configSource).toContain("testSequencer: '<rootDir>/scripts/jest-sequencer.cjs'");
  });

  it('starts the three known slow suites first and preserves Jest order for every other suite', () => {
    const originalOrder = [
      { path: '/repo/tests/unit/ordinary-first.test.ts' },
      { path: '/repo/tests/unit/scripts/releaseWorkflow.test.ts' },
      { path: '/repo/tests/unit/ordinary-second.test.ts' },
      { path: '/repo/tests/unit/scripts/prepushGateReceipt.test.ts' },
      { path: '/repo/tests/unit/i18n/localeDeliveryContracts.test.ts' },
      { path: '/repo/tests/unit/ordinary-third.test.ts' },
    ];

    expect(
      Sequencer.prioritizeSlowSuites(originalOrder).map(({ path: testPath }) => testPath),
    ).toEqual([
      '/repo/tests/unit/scripts/prepushGateReceipt.test.ts',
      '/repo/tests/unit/i18n/localeDeliveryContracts.test.ts',
      '/repo/tests/unit/scripts/releaseWorkflow.test.ts',
      '/repo/tests/unit/ordinary-first.test.ts',
      '/repo/tests/unit/ordinary-second.test.ts',
      '/repo/tests/unit/ordinary-third.test.ts',
    ]);
    expect(originalOrder[0].path).toBe('/repo/tests/unit/ordinary-first.test.ts');
  });

  it('matches exact repository-relative suffixes on POSIX and Windows paths only', () => {
    expect(Sequencer.KNOWN_SLOW_TEST_PATHS).toEqual([
      'tests/unit/scripts/prepushGateReceipt.test.ts',
      'tests/unit/i18n/localeDeliveryContracts.test.ts',
      'tests/unit/scripts/releaseWorkflow.test.ts',
    ]);
    expect(Sequencer.slowSuiteRank('C:\\repo\\tests\\unit\\scripts\\releaseWorkflow.test.ts')).toBe(
      2,
    );
    expect(Sequencer.slowSuiteRank('/repo/tests/unit/scripts/not-releaseWorkflow.test.ts')).toBe(3);
  });
});
