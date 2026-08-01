#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts/supabase-consumer-manifest.cjs');
const SCHEMA = path.join(REPO, 'contracts/supabase-consumer-manifest.v3.schema.json');

function run(cwd, command, args, expected = 0) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_PATH: [path.join(REPO, 'node_modules'), process.env.NODE_PATH]
        .filter(Boolean)
        .join(path.delimiter),
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    expected,
    `${command} ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result;
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function git(root, ...args) {
  return run(root, 'git', args).stdout.trim();
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-supabase-manifest-'));
  write(path.join(root, 'scripts/supabase-consumer-manifest.cjs'), fs.readFileSync(SCRIPT));
  write(
    path.join(root, 'scripts/supabase-consumer-manifest.test.cjs'),
    '// exact audit-tool exemption fixture\n',
  );
  write(
    path.join(root, 'contracts/supabase-consumer-manifest.v3.schema.json'),
    fs.readFileSync(SCHEMA),
  );
  write(
    path.join(root, 'src/services/supabase/index.ts'),
    `
    import { createClient } from '@supabase/supabase-js';
    const supabase = createClient('https://example.invalid', 'publishable', { auth: { persistSession: true } });
    export async function exercise(table: string, routine: string, fn: string, bucket: string, signedUrl: string) {
      await supabase.from('processes').select('*');
      await supabase.from(table).select('*');
      await supabase.rpc(routine, {});
      await supabase.functions.invoke(fn, {});
      await supabase.auth.getSession();
      await supabase.storage.from(bucket).download('fixture');
      return fetch(signedUrl, { credentials: 'omit' });
    }
  `,
  );
  write(
    path.join(root, 'config/docs-capture/profile.v1.json'),
    JSON.stringify({ mutationAllowlist: ['https://qgzvkongdjqiiamzbbts.supabase.co/auth/v1/*'] }),
  );
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'manifest-test@example.invalid');
  git(root, 'config', 'user.name', 'Manifest Test');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'source');
  const sourceTreeCommit = git(root, 'rev-parse', 'HEAD');
  run(root, 'node', [
    'scripts/supabase-consumer-manifest.cjs',
    '--write',
    '--source-commit',
    sourceTreeCommit,
  ]);
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'delivery');
  return {
    root,
    sourceTreeCommit,
    manifest: path.join(root, 'contracts/supabase-consumer-manifest.v3.json'),
  };
}

function cleanup(fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

function verify(fixture, manifest = fixture.manifest, expected = 0) {
  return run(
    fixture.root,
    'node',
    ['scripts/supabase-consumer-manifest.cjs', '--manifest', manifest],
    expected,
  );
}

function mutateManifest(fixture, name, mutate) {
  const value = JSON.parse(fs.readFileSync(fixture.manifest, 'utf8'));
  mutate(value);
  const output = path.join(fixture.root, `${name}.json`);
  write(output, `${JSON.stringify(value, null, 2)}\n`);
  return output;
}

test('positive: exact AST occurrence set, schema, and source/delivery trees verify', () => {
  const fixture = createFixture();
  try {
    const result = verify(fixture);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.sourceTreeCommit, fixture.sourceTreeCommit);
    assert.equal(receipt.residue.consumerZero, false);
    assert.ok(receipt.summary.occurrences >= 10);
  } finally {
    cleanup(fixture);
  }
});

for (const [name, mutate] of [
  ['missing', (value) => value.occurrences.pop()],
  ['duplicate', (value) => value.occurrences.push(value.occurrences[0])],
  [
    'swapped',
    (value) =>
      ([value.occurrences[0], value.occurrences[1]] = [value.occurrences[1], value.occurrences[0]]),
  ],
  [
    'path-line-op-forgery',
    (value) => {
      value.occurrences[0].file = 'src/forged.ts';
      value.occurrences[0].span.start.line += 1;
      value.occurrences[0].operation = 'forged';
    },
  ],
  [
    'surface-substitution',
    (value) => {
      const first = value.occurrences[0].object;
      value.occurrences[0].object = value.occurrences[1].object;
      value.occurrences[1].object = first;
    },
  ],
  [
    'false-authorization',
    (value) => {
      value.authority.authorizesConsumerZero = true;
      value.residue.consumerZero = true;
    },
  ],
  [
    'commit-forgery',
    (value) => {
      value.baseCommit = '0000000000000000000000000000000000000000';
      value.sourceTreeCommit = value.baseCommit;
    },
  ],
]) {
  test(`negative: rejects ${name}`, () => {
    const fixture = createFixture();
    try {
      verify(fixture, mutateManifest(fixture, name, mutate), 1);
    } finally {
      cleanup(fixture);
    }
  });
}

test('negative: rejects schema byte drift', () => {
  const fixture = createFixture();
  try {
    fs.appendFileSync(
      path.join(fixture.root, 'contracts/supabase-consumer-manifest.v3.schema.json'),
      '\n',
    );
    verify(fixture, fixture.manifest, 1);
  } finally {
    cleanup(fixture);
  }
});

test('negative: rejects manifest symlink and non-regular path', () => {
  const fixture = createFixture();
  try {
    const link = path.join(fixture.root, 'manifest-link.json');
    fs.symlinkSync(fixture.manifest, link);
    verify(fixture, link, 1);
    verify(fixture, fixture.root, 1);
  } finally {
    cleanup(fixture);
  }
});

test('negative: rejects governed delivery drift and new dynamic bypass', () => {
  const fixture = createFixture();
  try {
    fs.appendFileSync(
      path.join(fixture.root, 'src/services/supabase/index.ts'),
      '\nexport const bypass = () => supabase["from"](window.name).select("*");\n',
    );
    git(fixture.root, 'add', 'src/services/supabase/index.ts');
    git(fixture.root, 'commit', '-qm', 'drift');
    verify(fixture, fixture.manifest, 1);
  } finally {
    cleanup(fixture);
  }
});

test('negative: rejects detached helper, service role, and unapproved origin host', () => {
  for (const source of [
    'const { rpc } = supabase; rpc("x");',
    'const serviceRoleKey = "forbidden";',
    'const endpoint = "https://evil-project.supabase.co/rest/v1/users";',
  ]) {
    const fixture = createFixture();
    try {
      write(path.join(fixture.root, 'src/services/supabase/bypass.ts'), `${source}\n`);
      git(fixture.root, 'add', 'src/services/supabase/bypass.ts');
      git(fixture.root, 'commit', '-qm', 'bypass');
      run(
        fixture.root,
        'node',
        [
          'scripts/supabase-consumer-manifest.cjs',
          '--write',
          '--source-commit',
          git(fixture.root, 'rev-parse', 'HEAD'),
        ],
        1,
      );
    } finally {
      cleanup(fixture);
    }
  }
});
