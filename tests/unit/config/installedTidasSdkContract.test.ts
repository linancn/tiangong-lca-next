import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../../..');
const contractPath = path.join(
  repositoryRoot,
  'tests/package-contracts/installedTidasSdk.contract.test.mjs',
);

describe('installed TIDAS SDK package contract', () => {
  it('runs against Node package resolution outside the Jest module mapper', () => {
    const result = spawnSync(process.execPath, ['--test', contractPath], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        TIDAS_DEEP_VALIDATION: 'false',
        TIDAS_INCLUDE_WARNINGS: 'false',
        TIDAS_THROW_ON_ERROR: 'false',
        TIDAS_VALIDATION_MODE: 'strict',
      },
    });

    expect({
      error: result.error?.message,
      signal: result.signal,
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
    }).toEqual({
      error: undefined,
      signal: null,
      status: 0,
      stderr: '',
      stdout: expect.stringMatching(/(?:#|ℹ) pass 2/u),
    });
  });
});
