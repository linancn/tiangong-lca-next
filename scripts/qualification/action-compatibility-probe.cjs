'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function sha256(file) {
  const digest = crypto.createHash('sha256');
  const descriptor = fs.openSync(file, 'r');
  const buffer = Buffer.alloc(1024 * 1024);
  try {
    let count;
    while ((count = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      digest.update(buffer.subarray(0, count));
    }
    return digest.digest('hex');
  } finally {
    fs.closeSync(descriptor);
  }
}

function collectToolReceipt({
  root,
  stage,
  expectedHead,
  execute = execFileSync,
  nodeVersion = process.versions.node,
}) {
  assert.ok(['setup-node', 'pnpm-setup'].includes(stage), 'Unknown tool probe stage');
  assert.match(expectedHead, /^[a-f0-9]{40}$/u, 'Expected head must be a complete commit SHA');
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const required = { node: packageJson.engines.node };
  assert.match(required.node, /^\d+\.\d+\.\d+$/u, 'Node requirement must be exact');
  assert.equal(nodeVersion, required.node, 'Active Node does not match the pinned runtime');
  const options = { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  const sourceHead = execute('git', ['rev-parse', 'HEAD'], options).trim();
  assert.equal(sourceHead, expectedHead, 'Probe checkout does not match the event head');
  const graphStatus = execute(
    'git',
    [
      'status',
      '--porcelain=v1',
      '--untracked-files=no',
      '--',
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
    ],
    options,
  ).trim();
  assert.equal(graphStatus, '', 'Protected product graph changed during Action setup');
  const actual = { node: nodeVersion };
  if (stage === 'pnpm-setup') {
    required.pnpm = packageJson.engines.pnpm;
    assert.match(required.pnpm, /^\d+\.\d+\.\d+$/u, 'pnpm requirement must be exact');
    assert.equal(packageJson.packageManager, `pnpm@${required.pnpm}`);
    actual.pnpm = execute('pnpm', ['--version'], options).trim();
    assert.equal(actual.pnpm, required.pnpm, 'Active pnpm does not match the pinned manager');
  }
  return {
    schema: 'platform.actions-compatibility.v1',
    stage,
    source_head: sourceHead,
    required,
    actual,
    node_binary: {
      path: process.execPath,
      sha256: sha256(process.execPath),
      platform: process.platform,
      arch: process.arch,
    },
    inputs: Object.fromEntries(
      ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'].map((name) => [
        name,
        sha256(path.join(root, name)),
      ]),
    ),
  };
}

function validateArtifactResult(id, digest) {
  assert.match(id, /^[1-9]\d*$/u, 'Upload must return an artifact ID');
  assert.match(digest, /^[a-f0-9]{64}$/u, 'Upload must return a SHA256 digest');
  return { schema: 'platform.actions-compatibility.v1', stage: 'artifact-upload', id, digest };
}

function main(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(
      ['--stage', '--expected-head', '--output', '--artifact-id', '--artifact-digest'].includes(
        args[i],
      ) && typeof args[i + 1] === 'string',
      'Invalid probe arguments',
    );
    assert.ok(!Object.hasOwn(options, args[i]), 'Duplicate probe argument');
    options[args[i]] = args[i + 1];
  }
  if (options['--stage'] === 'artifact-upload') {
    const result = validateArtifactResult(options['--artifact-id'], options['--artifact-digest']);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  const receipt = collectToolReceipt({
    root: path.resolve(__dirname, '../..'),
    stage: options['--stage'],
    expectedHead: options['--expected-head'],
  });
  assert.ok(path.isAbsolute(options['--output'] || ''), 'Receipt output must be absolute');
  fs.mkdirSync(path.dirname(options['--output']), { recursive: true });
  fs.writeFileSync(options['--output'], `${JSON.stringify(receipt, null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600,
  });
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { collectToolReceipt, validateArtifactResult };
