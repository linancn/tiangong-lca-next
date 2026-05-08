#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function parseArgs(argv) {
  const args = {
    base: process.env.DOCPACT_BASE_REF || 'origin/dev',
    head: process.env.DOCPACT_HEAD_REF || 'HEAD',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base') {
      args.base = argv[index + 1];
      index += 1;
    } else if (arg === '--head') {
      args.head = argv[index + 1];
      index += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(2);
    }
  }

  return args;
}

function spawn(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    ...options,
  });
}

function findDocpact() {
  const candidates = [];
  if (process.env.DOCPACT_BIN) {
    candidates.push(process.env.DOCPACT_BIN);
  }
  candidates.push(path.join(os.homedir(), '.cargo', 'bin', 'docpact'));
  candidates.push('docpact');

  for (const candidate of candidates) {
    if (candidate !== 'docpact' && !fs.existsSync(candidate)) {
      continue;
    }
    const result = spawn(candidate, ['--version'], { stdio: 'ignore' });
    if (result.status === 0) {
      return candidate;
    }
  }

  console.error(
    'docpact was not found. Install it with `cargo install docpact --version 0.1.4 --force` or set DOCPACT_BIN.',
  );
  process.exit(127);
}

function git(args) {
  const result = spawn('git', args);
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim();
    throw new Error(`git ${args.join(' ')} failed${message ? `: ${message}` : ''}`);
  }
  return result.stdout.trim();
}

function resolveBase(baseRef, headRef) {
  const result = spawn('git', ['merge-base', headRef, baseRef]);
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  throw new Error(
    `Could not resolve merge-base for ${headRef} and ${baseRef}. Fetch the base ref or rerun with DOCPACT_BASE_REF=<ref>.`,
  );
}

function runDocpact(docpact, args) {
  const result = spawn(docpact, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

const args = parseArgs(process.argv.slice(2));
const docpact = findDocpact();
const base = resolveBase(args.base, args.head);
const head = git(['rev-parse', args.head]);

console.log(`Running docpact gate: base=${base} head=${head}`);
runDocpact(docpact, ['validate-config', '--root', '.', '--strict']);
runDocpact(docpact, ['lint', '--root', '.', '--base', base, '--head', head, '--mode', 'enforce']);
