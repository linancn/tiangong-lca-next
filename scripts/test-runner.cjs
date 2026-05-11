#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const jestBin = require.resolve('jest/bin/jest');

const isCI = process.env.CI === 'true' || process.env.CI === '1';

function runJest(args) {
  const result = spawnSync(process.execPath, [jestBin, ...args], {
    stdio: 'inherit',
    env: {
      ...process.env,
      TZ: process.env.TZ || 'UTC',
    },
  });

  if (result.error) {
    // eslint-disable-next-line no-console
    console.error(result.error);
    process.exit(1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.signal) {
    process.exit(1);
  }
}

const passthroughArgs = process.argv.slice(2);
if (passthroughArgs.length > 0) {
  runJest(passthroughArgs);
  process.exit(0);
}

const ciArgs = isCI ? ['--ci'] : [];
const unitWorkerArgs =
  process.platform === 'darwin'
    ? ['--maxWorkers=25%']
    : ['--maxWorkers=50%'];

// The full unit/src phase can intermittently crash worker subprocesses on macOS
// when Jest fans out too aggressively, so keep parallelism bounded here.
runJest([...ciArgs, 'tests/unit', 'src', ...unitWorkerArgs, '--testTimeout=20000']);
runJest([...ciArgs, 'tests/integration', '--runInBand', '--testTimeout=20000']);
