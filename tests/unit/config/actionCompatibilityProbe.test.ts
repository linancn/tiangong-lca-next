import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const probePath = path.join(root, 'scripts/qualification/action-compatibility-probe.cjs');
const { collectToolReceipt, validateArtifactResult } = require(probePath);
const sourceHead = 'a'.repeat(40);

function collect(stage = 'setup-node', overrides = {}) {
  return collectToolReceipt({
    root,
    stage,
    expectedHead: sourceHead,
    execute: (command: string, args: string[]) =>
      command === 'git' ? (args[0] === 'rev-parse' ? sourceHead : '') : '11.24.0',
    ...overrides,
  });
}

describe('non-release Action compatibility evidence', () => {
  it('binds the selected runtime, source and unchanged graph without installing the product', () => {
    const receipt = collect('pnpm-setup');
    expect(receipt).toMatchObject({
      schema: 'platform.actions-compatibility.v1',
      stage: 'pnpm-setup',
      source_head: sourceHead,
      required: { node: '24.19.0', pnpm: '11.24.0' },
      actual: { node: '24.19.0', pnpm: '11.24.0' },
    });
    expect(receipt.node_binary.sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.keys(receipt.inputs)).toEqual([
      'package.json',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
    ]);
    const nodeOnly = collect();
    expect(nodeOnly.required).toEqual({ node: '24.19.0' });
    expect(nodeOnly.actual).toEqual({ node: '24.19.0' });
  });

  it('rejects stale heads, incomplete identities and the wrong installed tool versions', () => {
    expect(() => collect('setup-node', { expectedHead: 'short' })).toThrow('complete commit SHA');
    expect(() => collect('setup-node', { expectedHead: 'b'.repeat(40) })).toThrow('event head');
    expect(() => collect('setup-node', { nodeVersion: '24.18.0' })).toThrow('pinned runtime');
    expect(() =>
      collect('pnpm-setup', {
        execute: (command: string, args: string[]) =>
          command === 'git' ? (args[0] === 'rev-parse' ? sourceHead : '') : '11.25.0',
      }),
    ).toThrow('pinned manager');
    expect(() =>
      collect('setup-node', {
        execute: (_command: string, args: string[]) =>
          args[0] === 'rev-parse' ? sourceHead : ' M pnpm-lock.yaml',
      }),
    ).toThrow('product graph changed');
    expect(() => collect('unknown')).toThrow('Unknown tool probe stage');
  });

  it('requires an actual artifact ID and SHA256 acknowledgement', () => {
    expect(validateArtifactResult('123', 'c'.repeat(64))).toEqual({
      schema: 'platform.actions-compatibility.v1',
      stage: 'artifact-upload',
      id: '123',
      digest: 'c'.repeat(64),
    });
    for (const id of ['', '0', '-1', 'unavailable']) {
      expect(() => validateArtifactResult(id, 'c'.repeat(64))).toThrow('artifact ID');
    }
    for (const digest of ['', 'invalid', 'g'.repeat(64)]) {
      expect(() => validateArtifactResult('123', digest)).toThrow('SHA256 digest');
    }
  });

  it('runs the real CLI and refuses stale or overwritten proof files', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'action-compatibility-'));
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const output = path.join(temporary, 'node.json');
    const staleOutput = path.join(temporary, 'stale.json');
    const invoke = (candidate: string, destination: string) =>
      spawnSync(
        process.execPath,
        [probePath, '--stage', 'setup-node', '--expected-head', candidate, '--output', destination],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, UNRELATED_SECRET: 'synthetic-must-not-enter-proof' },
        },
      );
    try {
      const result = invoke(head, output);
      expect(result.status).toBe(0);
      const bytes = fs.readFileSync(output, 'utf8');
      expect(JSON.parse(bytes)).toMatchObject({ source_head: head, actual: { node: '24.19.0' } });
      expect(bytes).not.toContain('synthetic-must-not-enter-proof');
      expect(invoke(head, output).status).toBe(1);
      expect(fs.readFileSync(output, 'utf8')).toBe(bytes);
      expect(invoke('b'.repeat(40), staleOutput).status).toBe(1);
      expect(fs.existsSync(staleOutput)).toBe(false);
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
});
