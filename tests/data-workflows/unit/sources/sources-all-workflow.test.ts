import { EventEmitter } from 'node:events';
import path from 'node:path';

import {
  SOURCE_DATA_WORKFLOWS,
  formatWorkflowResult,
  runAllSourceSmokeTests,
  runSourceDataWorkflow,
} from '../../workflows/sources/sources-all-workflow';

function createChildProcessEmitter() {
  const emitter = new EventEmitter();
  return {
    emitError(error: Error) {
      emitter.emit('error', error);
    },
    emitExit(code: number | null, signal: NodeJS.Signals | null) {
      emitter.emit('exit', code, signal);
    },
    process: {
      once: emitter.once.bind(emitter),
    },
  };
}

describe('sources-all-workflow', () => {
  it('shows suite help and skips workflow execution', async () => {
    const log = jest.fn();
    const runWorkflow = jest.fn();

    const result = await runAllSourceSmokeTests(['--help'], {
      log,
      runWorkflow,
    });

    expect(result).toEqual({
      helpShown: true,
      passed: true,
      results: [],
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Sources data workflow suite'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('test:sources:create-view-copy'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--detail-result'));
  });

  it('runs all workflows in order, forwards argv, and keeps going after failures', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(
      async (workflow: (typeof SOURCE_DATA_WORKFLOWS)[number], forwardedArgv: string[]) => ({
        command: workflow.command,
        durationMs: workflow.command === 'test:sources:edit' ? 1500 : 250,
        errorMessage: workflow.command === 'test:sources:edit' ? 'edit workflow failed' : undefined,
        exitCode: workflow.command === 'test:sources:edit' ? 1 : 0,
        passed: workflow.command !== 'test:sources:edit',
        signal: null,
        argv: forwardedArgv,
      }),
    );

    const result = await runAllSourceSmokeTests(
      ['--frontend-url', 'http://127.0.0.1:8000', '--detail-result'],
      {
        log: (message) => {
          logMessages.push(message);
        },
        runWorkflow,
      },
    );

    expect(runWorkflow).toHaveBeenCalledTimes(SOURCE_DATA_WORKFLOWS.length);
    expect(runWorkflow.mock.calls.map((call) => call[0].command)).toEqual(
      SOURCE_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(runWorkflow.mock.calls[0][1]).toEqual([
      '--frontend-url',
      'http://127.0.0.1:8000',
      '--detail-result',
    ]);
    expect(result.helpShown).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.results.map((workflowResult) => workflowResult.command)).toEqual(
      SOURCE_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(logMessages).toContain('Sources data workflow suite');
    expect(logMessages).toContain('[1/7] test:sources:create');
    expect(logMessages).toContain(
      'Command result: test:sources:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('- test:sources:create: success | duration 250ms | exit code 0');
    expect(logMessages).toContain(
      '- test:sources:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('Overall result: failure');
  });

  it('converts rejected workflow runs into failure summaries', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(async (workflow: (typeof SOURCE_DATA_WORKFLOWS)[number]) => {
      if (workflow.command === 'test:sources:check-data') {
        throw new Error('check-data crashed');
      }

      return {
        command: workflow.command,
        durationMs: 10,
        exitCode: 0,
        passed: true,
        signal: null,
      };
    });

    const result = await runAllSourceSmokeTests([], {
      log: (message) => {
        logMessages.push(message);
      },
      runWorkflow,
    });

    expect(result.passed).toBe(false);
    expect(
      result.results.find((workflowResult) => workflowResult.command === 'test:sources:check-data'),
    ).toMatchObject({
      command: 'test:sources:check-data',
      errorMessage: 'check-data crashed',
      passed: false,
    });
    expect(logMessages).toContain(
      'Command result: test:sources:check-data: failure | duration 0ms | check-data crashed',
    );
  });

  it('spawns workflow scripts through node and marks exit code 0 as success', async () => {
    const child = createChildProcessEmitter();
    const spawnImpl = jest.fn(() => child.process);
    const now = jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(360);

    const promise = runSourceDataWorkflow(
      SOURCE_DATA_WORKFLOWS[0],
      ['--frontend-url', 'http://127.0.0.1:8000'],
      {
        now,
        spawnImpl,
      },
    );

    child.emitExit(0, null);
    const result = await promise;

    expect(spawnImpl).toHaveBeenCalledWith(
      process.execPath,
      [
        '--import',
        'tsx',
        path.resolve(process.cwd(), SOURCE_DATA_WORKFLOWS[0].scriptPath),
        '--frontend-url',
        'http://127.0.0.1:8000',
      ],
      expect.objectContaining({
        env: process.env,
        stdio: 'inherit',
      }),
    );
    expect(result).toEqual({
      command: 'test:sources:create',
      durationMs: 260,
      exitCode: 0,
      passed: true,
      signal: null,
    });
  });

  it('marks non-zero exits and spawn errors as failures', async () => {
    const exitChild = createChildProcessEmitter();
    const errorChild = createChildProcessEmitter();
    const spawnImpl = jest
      .fn()
      .mockImplementationOnce(() => exitChild.process)
      .mockImplementationOnce(() => errorChild.process);
    const now = jest
      .fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(25)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(180);

    const exitPromise = runSourceDataWorkflow(SOURCE_DATA_WORKFLOWS[1], [], {
      now,
      spawnImpl,
    });
    exitChild.emitExit(2, null);

    const errorPromise = runSourceDataWorkflow(SOURCE_DATA_WORKFLOWS[2], [], {
      now,
      spawnImpl,
    });
    errorChild.emitError(new Error('spawn exploded'));

    await expect(exitPromise).resolves.toEqual({
      command: 'test:sources:check-data',
      durationMs: 25,
      exitCode: 2,
      passed: false,
      signal: null,
    });
    await expect(errorPromise).resolves.toEqual({
      command: 'test:sources:full-text-search',
      durationMs: 80,
      errorMessage: 'spawn exploded',
      exitCode: null,
      passed: false,
      signal: null,
    });
  });

  it('formats workflow summaries in english', () => {
    expect(
      formatWorkflowResult({
        command: 'test:sources:create',
        durationMs: 345,
        exitCode: 0,
        passed: true,
        signal: null,
      }),
    ).toBe('test:sources:create: success | duration 345ms | exit code 0');

    expect(
      formatWorkflowResult({
        command: 'test:sources:edit',
        durationMs: 2500,
        errorMessage: 'edit failed',
        exitCode: null,
        passed: false,
        signal: 'SIGTERM',
      }),
    ).toBe('test:sources:edit: failure | duration 2.50s | signal SIGTERM | edit failed');
  });
});
