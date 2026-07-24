#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const require = createRequire(import.meta.url);
const installedNodeModules = path.dirname(path.dirname(require.resolve('tsx/package.json')));

function git(root, args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
    ...options,
  });
}

function snapshot(root) {
  return {
    diff: git(root, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--']),
    status: git(root, ['status', '--porcelain=v1', '--untracked-files=all']),
  };
}

function assertSnapshot(actual, expected, generation) {
  if (actual.diff !== expected.diff || actual.status !== expected.status) {
    throw new Error(
      `Locale artifact generation ${generation} changed the repository; run npm run i18n:locale:artifacts:write and commit the canonical outputs.`,
    );
  }
}

function runArtifactGeneration(root) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/i18n/locale-delivery.mjs', 'artifacts', '--write'],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: MAX_BUFFER_BYTES,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ),
  );
}

const sourceRoot = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim();
const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'tiangong-locale-idempotence-'));
const cloneRoot = path.join(temporaryRoot, 'repository');

try {
  execFileSync('git', ['clone', '--shared', '--no-checkout', sourceRoot, cloneRoot], {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  git(cloneRoot, ['checkout', '--detach', 'HEAD']);

  const workingTreePatch = spawnSync('git', ['diff', '--binary', '--no-ext-diff', 'HEAD', '--'], {
    cwd: sourceRoot,
    encoding: 'buffer',
    maxBuffer: MAX_BUFFER_BYTES,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (workingTreePatch.error) throw workingTreePatch.error;
  if (workingTreePatch.status !== 0) {
    throw new Error('Unable to capture the current locale artifact generator state.');
  }
  if (workingTreePatch.stdout.length > 0) {
    const applied = spawnSync('git', ['apply', '--binary', '--whitespace=nowarn', '-'], {
      cwd: cloneRoot,
      input: workingTreePatch.stdout,
      encoding: 'buffer',
      maxBuffer: MAX_BUFFER_BYTES,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (applied.error) throw applied.error;
    if (applied.status !== 0) {
      throw new Error(`Unable to reproduce the working tree: ${applied.stderr.toString().trim()}`);
    }
  }

  symlinkSync(installedNodeModules, path.join(cloneRoot, 'node_modules'), 'dir');
  const baseline = snapshot(cloneRoot);

  const firstGeneration = runArtifactGeneration(cloneRoot);
  assertSnapshot(snapshot(cloneRoot), baseline, 1);
  const secondGeneration = runArtifactGeneration(cloneRoot);
  assertSnapshot(snapshot(cloneRoot), baseline, 2);
  const dependencyOrder = ['context', 'structuralValidation', 'quality', 'activation'];
  if (
    JSON.stringify(firstGeneration.dependencyOrder) !== JSON.stringify(dependencyOrder) ||
    JSON.stringify(secondGeneration.dependencyOrder) !== JSON.stringify(dependencyOrder)
  ) {
    throw new Error('Locale artifact generation did not follow the canonical dependency order.');
  }

  process.stdout.write(
    `${JSON.stringify({
      artifactGenerations: 2,
      canonical: true,
      dependencyOrder,
    })}\n`,
  );
} finally {
  rmSync(temporaryRoot, { force: true, recursive: true });
}
