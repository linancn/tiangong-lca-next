import path from 'node:path';

const { agentLogDirectory, failedItems, parseRunnerArgs, safeStageName, stageSummary } =
  require('../../../scripts/test-runner.cjs') as {
    agentLogDirectory: () => string;
    failedItems: (
      summary: Record<string, any>,
      root?: string,
    ) => Array<{ assertions: string[]; suite: string }>;
    parseRunnerArgs: (args: string[]) => { args: string[]; stage?: string };
    safeStageName: (value: string) => string;
    stageSummary: (
      stage: string,
      summary: Record<string, number>,
      exitCode: number,
      durationMs: number,
      logPath: string,
    ) => string;
  };

describe('agent-aware Jest runner', () => {
  it('removes runner-only stage arguments before invoking Jest', () => {
    expect(parseRunnerArgs(['--stage', 'coverage gate', '--runInBand'])).toEqual({
      args: ['--runInBand'],
      stage: 'coverage gate',
    });
    expect(safeStageName('coverage gate / retry')).toBe('coverage-gate-retry');
    expect(agentLogDirectory()).toBe(agentLogDirectory());
  });

  it('reports only failed suites and assertions from structured Jest output', () => {
    const root = path.join(path.sep, 'repo');
    expect(
      failedItems(
        {
          testResults: [
            {
              assertionResults: [
                { fullName: 'passes', status: 'passed' },
                { fullName: 'explains the exact failure', status: 'failed' },
              ],
              name: path.join(root, 'tests/unit/example.test.ts'),
              status: 'failed',
            },
            {
              assertionResults: [],
              name: path.join(root, 'tests/unit/passing.test.ts'),
              status: 'passed',
            },
          ],
        },
        root,
      ),
    ).toEqual([
      {
        assertions: ['explains the exact failure'],
        suite: 'tests/unit/example.test.ts',
      },
    ]);
  });

  it('prints a bounded final stage summary with the full-log location', () => {
    expect(
      stageSummary(
        'coverage',
        {
          numFailedTestSuites: 1,
          numFailedTests: 2,
          numTotalTestSuites: 10,
          numTotalTests: 100,
        },
        1,
        1234,
        '.local/test-logs/coverage.log',
      ),
    ).toBe(
      'Summary coverage: failed; suites=10; failedSuites=1; tests=100; failedTests=2; durationMs=1234; log=.local/test-logs/coverage.log',
    );
  });
});
