import { EventEmitter } from 'node:events';
import path from 'node:path';

import {
  PROCESS_DATA_WORKFLOWS,
  formatWorkflowResult,
  runAllProcessSmokeTests,
  runProcessDataWorkflow,
} from '../../workflows/processes/processes-all-workflow';

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

describe('processes-all-workflow', () => {
  it('shows suite help and skips workflow execution', async () => {
    const log = jest.fn();
    const runWorkflow = jest.fn();

    const result = await runAllProcessSmokeTests(['--help'], {
      log,
      runWorkflow,
    });

    expect(result).toEqual({
      helpShown: true,
      passed: true,
      results: [],
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Processes data workflow suite'));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('test:processes:check-data-runtime-references'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('test:processes:full-text-search'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--detail-result'));
  });

  it('runs all workflows in order, forwards argv, and keeps going after failures', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(
      async (workflow: (typeof PROCESS_DATA_WORKFLOWS)[number], forwardedArgv: string[]) => ({
        command: workflow.command,
        durationMs: workflow.command === 'test:processes:edit' ? 1500 : 250,
        errorMessage:
          workflow.command === 'test:processes:edit' ? 'edit workflow failed' : undefined,
        exitCode: workflow.command === 'test:processes:edit' ? 1 : 0,
        passed: workflow.command !== 'test:processes:edit',
        signal: null,
        argv: forwardedArgv,
      }),
    );

    const result = await runAllProcessSmokeTests(
      ['--frontend-url', 'http://127.0.0.1:8000', '--detail-result'],
      {
        log: (message) => {
          logMessages.push(message);
        },
        runWorkflow,
      },
    );

    expect(runWorkflow).toHaveBeenCalledTimes(PROCESS_DATA_WORKFLOWS.length);
    expect(runWorkflow.mock.calls.map((call) => call[0].command)).toEqual(
      PROCESS_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(runWorkflow.mock.calls[0][1]).toEqual([
      '--frontend-url',
      'http://127.0.0.1:8000',
      '--detail-result',
    ]);
    expect(result.helpShown).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.results.map((workflowResult) => workflowResult.command)).toEqual(
      PROCESS_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(logMessages).toContain('Processes data workflow suite');
    expect(logMessages).toContain('[1/8] test:processes:create');
    expect(logMessages).toContain(
      'Command result: test:processes:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain(
      '- test:processes:create: success | duration 250ms | exit code 0',
    );
    expect(logMessages).toContain(
      '- test:processes:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('Overall result: failure');
  });

  it('converts rejected workflow runs into failure summaries', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(async (workflow: (typeof PROCESS_DATA_WORKFLOWS)[number]) => {
      if (workflow.command === 'test:processes:check-data') {
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

    const result = await runAllProcessSmokeTests([], {
      log: (message) => {
        logMessages.push(message);
      },
      runWorkflow,
    });

    expect(result.passed).toBe(false);
    expect(
      result.results.find(
        (workflowResult) => workflowResult.command === 'test:processes:check-data',
      ),
    ).toMatchObject({
      command: 'test:processes:check-data',
      errorMessage: 'check-data crashed',
      passed: false,
    });
    expect(logMessages).toContain(
      'Command result: test:processes:check-data: failure | duration 0ms | check-data crashed',
    );
  });

  it('spawns workflow scripts through node and marks exit code 0 as success', async () => {
    const child = createChildProcessEmitter();
    const spawnImpl = jest.fn(() => child.process);
    const now = jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(360);

    const promise = runProcessDataWorkflow(
      PROCESS_DATA_WORKFLOWS[0],
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
        path.resolve(process.cwd(), PROCESS_DATA_WORKFLOWS[0].scriptPath),
        '--frontend-url',
        'http://127.0.0.1:8000',
      ],
      expect.objectContaining({
        env: process.env,
        stdio: 'inherit',
      }),
    );
    expect(result).toEqual({
      command: 'test:processes:create',
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

    const exitPromise = runProcessDataWorkflow(PROCESS_DATA_WORKFLOWS[1], [], {
      now,
      spawnImpl,
    });
    exitChild.emitExit(2, null);

    const errorPromise = runProcessDataWorkflow(PROCESS_DATA_WORKFLOWS[2], [], {
      now,
      spawnImpl,
    });
    errorChild.emitError(new Error('spawn exploded'));

    await expect(exitPromise).resolves.toEqual({
      command: 'test:processes:check-data',
      durationMs: 25,
      exitCode: 2,
      passed: false,
      signal: null,
    });
    await expect(errorPromise).resolves.toEqual({
      command: 'test:processes:check-data-runtime-references',
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
        command: 'test:processes:create',
        durationMs: 345,
        exitCode: 0,
        passed: true,
        signal: null,
      }),
    ).toBe('test:processes:create: success | duration 345ms | exit code 0');

    expect(
      formatWorkflowResult({
        command: 'test:processes:edit',
        durationMs: 2500,
        errorMessage: 'edit failed',
        exitCode: null,
        passed: false,
        signal: 'SIGTERM',
      }),
    ).toBe('test:processes:edit: failure | duration 2.50s | signal SIGTERM | edit failed');
  });
});
