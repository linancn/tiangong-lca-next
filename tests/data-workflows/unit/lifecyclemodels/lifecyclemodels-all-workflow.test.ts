import { EventEmitter } from 'node:events';
import path from 'node:path';

import {
  LIFECYCLEMODEL_DATA_WORKFLOWS,
  runAllLifeCycleModelSmokeTests,
  runLifeCycleModelDataWorkflow,
} from '../../workflows/lifecyclemodels/lifecyclemodels-all-workflow';

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

describe('lifecyclemodels-all-workflow', () => {
  it('shows suite help and skips workflow execution', async () => {
    const log = jest.fn();
    const runWorkflow = jest.fn();

    const result = await runAllLifeCycleModelSmokeTests(['--help'], {
      log,
      runWorkflow,
    });

    expect(result).toEqual({
      helpShown: true,
      passed: true,
      results: [],
    });
    expect(runWorkflow).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Lifecycle models data workflow suite'),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('test:lifecyclemodels:create-version-update-reference'),
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining('--detail-result'));
  });

  it('runs all lifecycle model workflows in order and summarizes failures', async () => {
    const logMessages: string[] = [];
    const runWorkflow = jest.fn(
      async (workflow: (typeof LIFECYCLEMODEL_DATA_WORKFLOWS)[number]) => ({
        command: workflow.command,
        durationMs: workflow.command === 'test:lifecyclemodels:edit' ? 1500 : 100,
        errorMessage:
          workflow.command === 'test:lifecyclemodels:edit' ? 'edit workflow failed' : undefined,
        exitCode: workflow.command === 'test:lifecyclemodels:edit' ? 1 : 0,
        passed: workflow.command !== 'test:lifecyclemodels:edit',
        signal: null,
      }),
    );

    const result = await runAllLifeCycleModelSmokeTests(['--no-keep-data'], {
      log: (message) => logMessages.push(message),
      runWorkflow,
    });

    expect(runWorkflow).toHaveBeenCalledTimes(LIFECYCLEMODEL_DATA_WORKFLOWS.length);
    expect(runWorkflow.mock.calls.map((call) => call[0].command)).toEqual(
      LIFECYCLEMODEL_DATA_WORKFLOWS.map((workflow) => workflow.command),
    );
    expect(result.passed).toBe(false);
    expect(logMessages).toContain('Lifecycle models data workflow suite');
    expect(logMessages).toContain('[1/7] test:lifecyclemodels:create');
    expect(logMessages).toContain(
      'Command result: test:lifecyclemodels:edit: failure | duration 1.50s | exit code 1 | edit workflow failed',
    );
    expect(logMessages).toContain('Overall result: failure');
  });

  it('spawns workflow scripts through node and marks exit code 0 as success', async () => {
    const child = createChildProcessEmitter();
    const spawnImpl = jest.fn(() => child.process);
    const now = jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(225);

    const promise = runLifeCycleModelDataWorkflow(
      LIFECYCLEMODEL_DATA_WORKFLOWS[0],
      ['--no-keep-data'],
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
        path.resolve(process.cwd(), LIFECYCLEMODEL_DATA_WORKFLOWS[0].scriptPath),
        '--no-keep-data',
      ],
      expect.objectContaining({
        env: process.env,
        stdio: 'inherit',
      }),
    );
    expect(result).toEqual({
      command: 'test:lifecyclemodels:create',
      durationMs: 125,
      exitCode: 0,
      passed: true,
      signal: null,
    });
  });
});
