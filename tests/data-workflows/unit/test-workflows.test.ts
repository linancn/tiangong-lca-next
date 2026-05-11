import { EventEmitter } from 'node:events';
import path from 'node:path';

import {
  buildWorkflowCommandRegistry,
  formatWorkflowRunnerHelp,
  parseWorkflowInvocation,
  runWorkflowCommand,
  type WorkflowCommand,
} from '../test-workflows';

const WORKFLOW_FILE_FIXTURE = [
  'tests/data-workflows/test-api-smoke.cjs',
  'tests/data-workflows/workflows/processes/processes-all-workflow.ts',
  'tests/data-workflows/workflows/processes/processes-create-workflow.ts',
  'tests/data-workflows/workflows/teams/teams-all-workflow.ts',
  'tests/data-workflows/workflows/teams/teams-create-workflow.ts',
  'tests/data-workflows/workflows/unitgroups/unitgroups-create-workflow.ts',
];

describe('test-workflows runner', () => {
  it('builds workflow instructions from workflow files without npm script entries', () => {
    const registry = buildWorkflowCommandRegistry(WORKFLOW_FILE_FIXTURE);

    expect(registry.get('processes:create')).toEqual({
      command: 'test:processes:create',
      scriptPath: 'tests/data-workflows/workflows/processes/processes-create-workflow.ts',
      selector: 'processes:create',
    });
    expect(registry.get('teams:all')).toEqual({
      command: 'test:teams:all',
      scriptPath: 'tests/data-workflows/workflows/teams/teams-all-workflow.ts',
      selector: 'teams:all',
    });
    expect(registry.has('api:smoke')).toBe(false);
  });

  it('routes --processes:create and forwards remaining args unchanged', () => {
    const registry = buildWorkflowCommandRegistry(WORKFLOW_FILE_FIXTURE);

    expect(
      parseWorkflowInvocation(
        [
          '--processes:create',
          '--frontend-url',
          'http://127.0.0.1:8000',
          '--supabase-url',
          'https://example.supabase.co',
          '--supabase-publishable-key',
          'test-key',
        ],
        registry,
      ),
    ).toEqual({
      command: registry.get('processes:create'),
      forwardedArgv: [
        '--frontend-url',
        'http://127.0.0.1:8000',
        '--supabase-url',
        'https://example.supabase.co',
        '--supabase-publishable-key',
        'test-key',
      ],
      kind: 'run',
    });
  });

  it('routes --teams:all to the team workflow suite', () => {
    const registry = buildWorkflowCommandRegistry(WORKFLOW_FILE_FIXTURE);

    expect(parseWorkflowInvocation(['--teams:all', '--detail-result'], registry)).toEqual({
      command: registry.get('teams:all'),
      forwardedArgv: ['--detail-result'],
      kind: 'run',
    });
  });

  it('prints help and list output from the unified command', () => {
    const registry = buildWorkflowCommandRegistry(WORKFLOW_FILE_FIXTURE);

    expect(parseWorkflowInvocation(['--help'], registry)).toEqual({
      kind: 'help',
    });
    expect(parseWorkflowInvocation(['--list'], registry)).toEqual({
      kind: 'list',
    });
    expect(formatWorkflowRunnerHelp(registry)).toContain(
      '--processes:create (tests/data-workflows/workflows/processes/processes-create-workflow.ts)',
    );
    expect(formatWorkflowRunnerHelp(registry)).toContain('npm run test:workflows -- --teams:all');
  });

  it('rejects missing, unknown, or multiple workflow instructions', () => {
    const registry = buildWorkflowCommandRegistry(WORKFLOW_FILE_FIXTURE);

    expect(() =>
      parseWorkflowInvocation(['--frontend-url', 'http://127.0.0.1:8000'], registry),
    ).toThrow('Missing workflow instruction');
    expect(() => parseWorkflowInvocation(['--bad:workflow'], registry)).toThrow(
      'Unknown workflow instruction: --bad:workflow',
    );
    expect(() => parseWorkflowInvocation(['--processes:create', '--teams:all'], registry)).toThrow(
      'Expected exactly one workflow instruction',
    );
  });

  it('runs the resolved workflow file directly and forwards args', async () => {
    const command: WorkflowCommand = {
      command: 'test:teams:all',
      scriptPath: 'tests/data-workflows/workflows/teams/teams-all-workflow.ts',
      selector: 'teams:all',
    };
    const childProcess = new EventEmitter();
    const spawnImpl = jest.fn(() => {
      process.nextTick(() => {
        childProcess.emit('exit', 0, null);
      });

      return childProcess;
    });

    await expect(
      runWorkflowCommand(command, ['--frontend-url', 'http://127.0.0.1:8000'], { spawnImpl }),
    ).resolves.toBe(0);

    expect(spawnImpl).toHaveBeenCalledWith(
      process.execPath,
      [
        '--import',
        'tsx',
        path.resolve(process.cwd(), 'tests/data-workflows/workflows/teams/teams-all-workflow.ts'),
        '--frontend-url',
        'http://127.0.0.1:8000',
      ],
      {
        env: process.env,
        stdio: 'inherit',
      },
    );
  });
});
