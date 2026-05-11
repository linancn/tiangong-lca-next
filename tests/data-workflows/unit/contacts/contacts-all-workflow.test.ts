import { EventEmitter } from 'node:events';
import path from 'node:path';

import {
  CONTACT_DATA_WORKFLOWS,
  formatWorkflowResult,
  runAllContactSmokeTests,
  runContactDataWorkflow,
} from '../../workflows/contacts/contacts-all-workflow';

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

describe('contacts-all-workflow', () => {
  it('shows suite help and skips workflow execution', async () => {
    const log = jest.fn();
    const runWorkflow = jest.fn();

    const result = await runAllContactSmokeTests(['--help'], {
      log,
      runWorkflow,
    });

    expect(result).toEqual({
      helpShown: true,
      passed: true,
      results: [],
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Contacts data workflow suite'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('test:contacts:create-view-copy'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--detail-result'));
  });

  it('runs all workflows in order, forwards argv, and keeps going after failures', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(
      async (workflow: (typeof CONTACT_DATA_WORKFLOWS)[number], forwardedArgv: string[]) => ({
        command: workflow.command,
        durationMs: workflow.command === 'test:contacts:edit' ? 1500 : 250,
        errorMessage:
          workflow.command === 'test:contacts:edit' ? 'edit workflow failed' : undefined,
        exitCode: workflow.command === 'test:contacts:edit' ? 1 : 0,
        passed: workflow.command !== 'test:contacts:edit',
        signal: null,
        argv: forwardedArgv,
      }),
    );

    const result = await runAllContactSmokeTests(
      ['--frontend-url', 'http://127.0.0.1:8000', '--detail-result'],
      {
        log: (message) => {
          logMessages.push(message);
        },
        runWorkflow,
      },
    );

    expect(runWorkflow).toHaveBeenCalledTimes(CONTACT_DATA_WORKFLOWS.length);
    expect(runWorkflow.mock.calls.map((call) => call[0].command)).toEqual(
      CONTACT_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(runWorkflow.mock.calls[0][1]).toEqual([
      '--frontend-url',
      'http://127.0.0.1:8000',
      '--detail-result',
    ]);
    expect(result.helpShown).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.results.map((workflowResult) => workflowResult.command)).toEqual(
      CONTACT_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(logMessages).toContain('Contacts data workflow suite');
    expect(logMessages).toContain('[1/7] test:contacts:create');
    expect(logMessages).toContain(
      'Command result: test:contacts:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('- test:contacts:create: success | duration 250ms | exit code 0');
    expect(logMessages).toContain(
      '- test:contacts:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('Overall result: failure');
  });

  it('converts rejected workflow runs into failure summaries', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(async (workflow: (typeof CONTACT_DATA_WORKFLOWS)[number]) => {
      if (workflow.command === 'test:contacts:check-data') {
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

    const result = await runAllContactSmokeTests([], {
      log: (message) => {
        logMessages.push(message);
      },
      runWorkflow,
    });

    expect(result.passed).toBe(false);
    expect(
      result.results.find(
        (workflowResult) => workflowResult.command === 'test:contacts:check-data',
      ),
    ).toMatchObject({
      command: 'test:contacts:check-data',
      errorMessage: 'check-data crashed',
      passed: false,
    });
    expect(logMessages).toContain(
      'Command result: test:contacts:check-data: failure | duration 0ms | check-data crashed',
    );
  });

  it('spawns workflow scripts through node and marks exit code 0 as success', async () => {
    const child = createChildProcessEmitter();
    const spawnImpl = jest.fn(() => child.process);
    const now = jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(360);

    const promise = runContactDataWorkflow(
      CONTACT_DATA_WORKFLOWS[0],
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
        path.resolve(process.cwd(), CONTACT_DATA_WORKFLOWS[0].scriptPath),
        '--frontend-url',
        'http://127.0.0.1:8000',
      ],
      expect.objectContaining({
        env: process.env,
        stdio: 'inherit',
      }),
    );
    expect(result).toEqual({
      command: 'test:contacts:create',
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

    const exitPromise = runContactDataWorkflow(CONTACT_DATA_WORKFLOWS[1], [], {
      now,
      spawnImpl,
    });
    exitChild.emitExit(2, null);

    const errorPromise = runContactDataWorkflow(CONTACT_DATA_WORKFLOWS[2], [], {
      now,
      spawnImpl,
    });
    errorChild.emitError(new Error('spawn exploded'));

    await expect(exitPromise).resolves.toEqual({
      command: 'test:contacts:check-data',
      durationMs: 25,
      exitCode: 2,
      passed: false,
      signal: null,
    });
    await expect(errorPromise).resolves.toEqual({
      command: 'test:contacts:full-text-search',
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
        command: 'test:contacts:create',
        durationMs: 345,
        exitCode: 0,
        passed: true,
        signal: null,
      }),
    ).toBe('test:contacts:create: success | duration 345ms | exit code 0');

    expect(
      formatWorkflowResult({
        command: 'test:contacts:edit',
        durationMs: 2500,
        errorMessage: 'edit failed',
        exitCode: null,
        passed: false,
        signal: 'SIGTERM',
      }),
    ).toBe('test:contacts:edit: failure | duration 2.50s | signal SIGTERM | edit failed');
  });
});
