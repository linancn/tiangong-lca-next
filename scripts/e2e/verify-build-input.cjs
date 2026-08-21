#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function verifyBuildInputs(input) {
  const manifest = JSON.parse(fs.readFileSync(input.manifestPath, 'utf8'));
  const expected = new Map([
    [input.archivePath, manifest.candidate.archiveSha256],
    [input.dependencyLockPath, manifest.candidate.dependencyLockSha256],
    [input.packageJsonPath, manifest.candidate.packageJsonSha256],
    [input.pnpmWorkspacePath, manifest.candidate.pnpmWorkspaceSha256],
    [input.environmentPath, manifest.environment.contractSha256],
  ]);
  for (const [filePath, expectedSha256] of expected) {
    const actualSha256 = sha256File(filePath);
    if (actualSha256 !== expectedSha256) {
      throw new Error(`Candidate build input digest mismatch: ${filePath}`);
    }
  }
}

module.exports = { sha256File, verifyBuildInputs };

if (require.main === module) {
  verifyBuildInputs({
    archivePath: '/tmp/tiangong-candidate.tar',
    dependencyLockPath: '/app/pnpm-lock.yaml',
    environmentPath: '/opt/tiangong-e2e/environment.json',
    manifestPath: '/opt/tiangong-e2e/candidate-manifest.json',
    packageJsonPath: '/app/package.json',
    pnpmWorkspacePath: '/app/pnpm-workspace.yaml',
  });
}
