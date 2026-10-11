const { spawnSync } = require('node:child_process');
const { projectRoot, readProfile } = require('./desktop.cjs');

function localPackagePlan(args = [], environment = process.env, platform = process.platform) {
  const allowed = new Set(['--dir', '--mac', '--win', '--linux', '--x64', '--arm64']);
  if (args.some((arg) => !allowed.has(arg))) {
    throw new Error('Local packaging accepts only --dir, --mac, --win, --linux, --x64 and --arm64');
  }
  if (
    (args.includes('--mac') ||
      (platform === 'darwin' && !args.includes('--win') && !args.includes('--linux'))) &&
    args.includes('--x64')
  ) {
    throw new Error('macOS Intel packaging is retired; use --arm64');
  }
  const profile = readProfile(environment.APP_BRAND);
  return {
    brand: profile.id,
    commands: [
      ['build'],
      ['tsc:electron'],
      [
        'exec',
        'electron-builder',
        '--config',
        'scripts/branding/electron-builder.cjs',
        '--publish',
        'never',
        ...args,
      ],
    ],
  };
}

function main() {
  const plan = localPackagePlan(process.argv.slice(2));
  for (const args of plan.commands) {
    const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, {
      cwd: projectRoot,
      stdio: 'inherit',
      // Windows .cmd launchers need a shell; every argument above is fixed or allowlisted.
      shell: process.platform === 'win32',
      env: { ...process.env, APP_BRAND: plan.brand },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

if (require.main === module) main();
module.exports = { localPackagePlan };
