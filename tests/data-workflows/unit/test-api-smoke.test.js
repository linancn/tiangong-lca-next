const { API_SMOKE_WORKFLOWS, HELP_TEXT, main, runApiSmokeSuite } = require('../test-api-smoke.cjs');

describe('test-api-smoke runner', () => {
  it('shows help without running workflows', async () => {
    const log = jest.fn();
    const runWorkflow = jest.fn();

    const result = await runApiSmokeSuite(['--help'], {
      log,
      runWorkflow,
    });

    expect(result).toEqual({
      helpShown: true,
      passed: true,
      results: [],
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(HELP_TEXT);
  });

  it('keeps running remaining workflows and returns a failed suite result', async () => {
    const logMessages = [];
    const runWorkflow = jest.fn(async (workflow) => ({
      command: workflow.command,
      durationMs: workflow.command === API_SMOKE_WORKFLOWS[0].command ? 1200 : 25,
      exitCode: workflow.command === API_SMOKE_WORKFLOWS[0].command ? 1 : 0,
      failureReason:
        workflow.command === API_SMOKE_WORKFLOWS[0].command ? 'missing credentials' : undefined,
      passed: workflow.command !== API_SMOKE_WORKFLOWS[0].command,
      signal: null,
    }));

    const result = await runApiSmokeSuite(['--detail-result'], {
      log: (message) => {
        logMessages.push(message);
      },
      runWorkflow,
    });

    expect(runWorkflow).toHaveBeenCalledTimes(API_SMOKE_WORKFLOWS.length);
    expect(result.helpShown).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.results).toHaveLength(API_SMOKE_WORKFLOWS.length);
    expect(logMessages).toContain(
      `Command result: ${API_SMOKE_WORKFLOWS[0].command}: failure | duration 1.20s | exit code 1 | reason: missing credentials`,
    );
    expect(logMessages).toContain('Overall success: no');
    expect(logMessages).toContain(
      'Exit behavior: child workflow failures are reported after all workflows run, then this command exits non-zero.',
    );
  });

  it('makes main reject after the full suite reports child workflow failures', async () => {
    const runWorkflow = jest.fn(async (workflow) => ({
      command: workflow.command,
      durationMs: 10,
      exitCode: 1,
      failureReason: 'child failed',
      passed: false,
      signal: null,
    }));

    await expect(
      main([], {
        log: jest.fn(),
        runWorkflow,
      }),
    ).rejects.toThrow('API smoke workflow suite failed.');

    expect(runWorkflow).toHaveBeenCalledTimes(API_SMOKE_WORKFLOWS.length);
  });
});
