import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const {
  CANDIDATE,
  createManager,
  dependencyLabels,
  expectedImageTag,
  validateContainer,
  validateImage,
  sameProcess,
  stopObserver,
  canonicalDigestReference,
} = require('../../../scripts/qualification/supabase-browser-resources.cjs');

const digest = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
const id = (letter: string) => letter.repeat(64);
const prefix = 'org.tiangong.lca.next.';
const directories: string[] = [];
afterEach(() => {
  directories
    .splice(0)
    .forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-browser-resource-test-'));
  directories.push(directory);
  const root = path.join(directory, 'checkout');
  const runnerTemp = path.join(directory, 'runner');
  fs.mkdirSync(root);
  fs.mkdirSync(runnerTemp);
  const state = path.join(runnerTemp, 'owned');
  const source = {
    root,
    head: 'a'.repeat(40),
    tree: 'b'.repeat(40),
    files: {
      'package.json': id('1'),
      'pnpm-lock.yaml': id('2'),
      'pnpm-workspace.yaml': id('3'),
      'docker/e2e/environment.json': id('4'),
      'docker/e2e/Dockerfile': id('5'),
    },
    baseImages: [`public/playwright@sha256:${id('6')}`, `public/node@sha256:${id('7')}`],
  };
  const containers = new Map();
  const images = new Map();
  const volumes = new Set(['preexisting-volume']);
  const networks = new Set(['preexisting-network']);
  const commands: string[][] = [];
  let serverId = 'owned-daemon';
  let ignoreRemoval = false;
  const invoke = (program: string, args: string[]) => {
    if (program === 'pnpm') return '11.24.0\n';
    expect(program).toBe('docker');
    expect(args.slice(0, 4)).toEqual([
      '--config',
      path.join(state, 'docker-config'),
      '--context',
      'default',
    ]);
    const actual = args.slice(4);
    commands.push(actual);
    if (actual[0] === 'version')
      return JSON.stringify({ Client: { Version: '28.0.0' }, Server: { Version: '28.0.0' } });
    if (actual[0] === 'info')
      return JSON.stringify({
        ID: serverId,
        OSType: 'linux',
        Architecture: 'x86_64',
        ServerVersion: '28.0.0',
        MemTotal: 8e9,
        NCPU: 4,
      });
    if (actual[0] === 'context')
      return JSON.stringify({
        Name: 'default',
        Endpoints: { docker: { Host: 'unix:///var/run/docker.sock' } },
      });
    if (actual[1] === 'ls') {
      const keys =
        actual[0] === 'container'
          ? containers.keys()
          : actual[0] === 'image'
            ? images.keys()
            : actual[0] === 'volume'
              ? volumes.keys()
              : networks.keys();
      return [...keys].join('\n');
    }
    const store = actual[0] === 'container' ? containers : images;
    if (actual[1] === 'inspect') {
      assert.ok(store.has(actual[2]), 'fake Docker inspect requires an existing exact ID');
      return JSON.stringify([store.get(actual[2])]);
    }
    if (actual[1] === 'rm') {
      const selected = actual[actual.length - 1];
      assert.ok(
        ['container', 'image'].includes(actual[0]),
        'fake Docker only removes image/container IDs',
      );
      if (!ignoreRemoval) store.delete(selected);
      return selected;
    }
    throw new Error('Unexpected fake Docker command');
  };
  const options = {
    root,
    state,
    runnerTemp,
    head: source.head,
    source: () => JSON.parse(JSON.stringify(source)),
    command: invoke,
    processInfo: () => null,
    capacity: () => ({ bavail: 100, bsize: 4096 }),
  };
  const manager = createManager(options);
  const runId = `2026-10-19T01-02-03-004Z-${source.head.slice(0, 12)}`;
  function candidate() {
    const folder = path.join(root, '.local/e2e-release/build', runId);
    fs.mkdirSync(folder, { recursive: true });
    fs.mkdirSync(path.join(root, '.local/e2e-release/runs', runId), { recursive: true });
    const manifest = {
      kind: 'tiangong-next-release-e2e-candidate',
      schemaVersion: 5,
      repository: { canonical: 'tiangong-lca/platform' },
      candidate: {
        commit: source.head,
        tree: source.tree,
        dependencyLockSha256: source.files['pnpm-lock.yaml'],
        packageJsonSha256: source.files['package.json'],
        pnpmWorkspaceSha256: source.files['pnpm-workspace.yaml'],
      },
      environment: {
        frontendTarget: 'qualification',
        contractSha256: source.files['docker/e2e/environment.json'],
        dockerfileSha256: source.files['docker/e2e/Dockerfile'],
      },
    };
    const text = JSON.stringify(manifest);
    fs.writeFileSync(path.join(folder, 'candidate-manifest.json'), text);
    const image = {
      Id: `sha256:${id('c')}`,
      Config: {
        Labels: {
          [CANDIDATE]: 'true',
          [`${prefix}candidate-tree`]: source.tree,
          [`${prefix}manifest-sha256`]: digest(text),
        },
      },
      RepoTags: [expectedImageTag(source, 'candidate')],
      RepoDigests: [],
    };
    const dependency = {
      Id: `sha256:${id('d')}`,
      Config: { Labels: dependencyLabels(source) },
      RepoTags: [expectedImageTag(source, 'dependency')],
      RepoDigests: [],
    };
    const container = {
      Id: id('e'),
      Image: image.Id,
      Config: { Labels: { [CANDIDATE]: 'true' }, Env: ['SYNTHETIC_SECRET=must-not-appear'] },
      Mounts: [
        {
          Type: 'bind',
          Source: path.join(root, '.local/e2e-release/runs', runId),
          Destination: '/e2e-output',
          RW: true,
        },
      ],
    };
    images.set(image.Id, image);
    images.set(dependency.Id, dependency);
    containers.set(container.Id, container);
    return { image, dependency, container, folder, manifest, text };
  }
  return {
    root,
    state,
    source,
    options,
    manager,
    candidate,
    images,
    containers,
    commands,
    volumes,
    networks,
    driftContext: () => {
      serverId = 'another-daemon';
    },
    ignoreRemoval: () => {
      ignoreRemoval = true;
    },
  };
}

it('captures identities early, removes only exact fresh IDs, preserves baseline/cache and emits no environment', () => {
  const f = fixture();
  const shared = {
    Id: `sha256:${id('f')}`,
    Config: { Labels: {} },
    RepoTags: ['shared:keep'],
    RepoDigests: [],
  };
  f.images.set(shared.Id, shared);
  f.manager.start();
  const owned = f.candidate();
  const observed = f.manager.observe();
  expect(observed.containers[0]).toMatchObject({ id: owned.container.Id, imageId: owned.image.Id });
  expect(JSON.stringify(observed)).not.toContain('must-not-appear');
  expect(f.manager.finish().complete).toBe(true);
  expect(f.manager.verify().retained.buildkitCache).toContain('retained');
  expect(f.images.has(shared.Id)).toBe(true);
  expect(f.commands.filter((args) => args[1] === 'rm')).toEqual([
    ['container', 'rm', '-f', owned.container.Id],
    ['image', 'rm', owned.image.Id],
    ['image', 'rm', owned.dependency.Id],
  ]);
  expect(f.commands.flat().join(' ')).not.toMatch(/prune|purge|builder|volume rm|network rm/u);
});

it('preserves preexisting dependency images with valid identical inputs', () => {
  const f = fixture();
  const dependency = {
    Id: `sha256:${id('d')}`,
    Config: { Labels: dependencyLabels(f.source) },
    RepoTags: [expectedImageTag(f.source, 'dependency')],
    RepoDigests: [],
  };
  f.images.set(dependency.Id, dependency);
  f.manager.start();
  f.candidate();
  f.manager.observe();
  expect(f.manager.finish().complete).toBe(true);
  expect(f.manager.verify().complete).toBe(true);
  expect(f.images.has(dependency.Id)).toBe(true);
});

it('binds tagged public inputs to actual repository digests without confusing mirrors or registry ports', () => {
  const f = fixture();
  const reference = `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:${id('6')}`;
  const actual = `mcr.microsoft.com/playwright@sha256:${id('6')}`;
  f.source.baseImages[0] = reference;
  const image = {
    Id: `sha256:${id('8')}`,
    Config: { Labels: {} },
    RepoTags: ['mcr.microsoft.com/playwright:v1.62.1-noble'],
    RepoDigests: [actual],
  };
  f.images.set(image.Id, image);
  f.manager.start();
  f.candidate();
  expect(f.manager.observe().baseImages).toEqual([
    { reference, canonicalReference: actual, id: image.Id, digests: [actual] },
  ]);
  expect(canonicalDigestReference(`node:24.19.0@sha256:${id('7')}`)).toBe(
    `docker.io/library/node@sha256:${id('7')}`,
  );
  expect(canonicalDigestReference(`localhost:5000/team/node:v1@sha256:${id('7')}`)).toBe(
    `localhost:5000/team/node@sha256:${id('7')}`,
  );
  expect(canonicalDigestReference(actual)).not.toBe(
    canonicalDigestReference(`other.example/playwright@sha256:${id('6')}`),
  );
  expect(canonicalDigestReference('not-a-digest')).toBeNull();
});

it('refuses ambiguous preexisting candidate resources before starting qualification', () => {
  const f = fixture();
  f.containers.set(id('f'), { Id: id('f'), Config: { Labels: { [CANDIDATE]: 'true' } } });
  expect(() => f.manager.start()).toThrow('PREEXISTING_CONTROLLER_CONTAINER');
  expect(f.commands.some((args) => args[1] === 'rm')).toBe(false);
});

it.each(['Id', 'label', 'image', 'mount', 'tree', 'manifest', 'context', 'head', 'lock'])(
  'refuses %s drift without deleting foreign resources',
  (field) => {
    const f = fixture();
    f.manager.start();
    const owned = f.candidate();
    f.manager.observe();
    if (field === 'Id') owned.container.Id = id('f');
    if (field === 'label') owned.container.Config.Labels[CANDIDATE] = 'false';
    if (field === 'image') owned.container.Image = `sha256:${id('f')}`;
    if (field === 'mount') owned.container.Mounts[0].Source = path.join(f.root, 'foreign');
    if (field === 'tree') owned.image.Config.Labels[`${prefix}candidate-tree`] = 'c'.repeat(40);
    if (field === 'manifest') owned.image.Config.Labels[`${prefix}manifest-sha256`] = id('f');
    if (field === 'context') f.driftContext();
    if (field === 'head') f.source.head = 'c'.repeat(40);
    if (field === 'lock') f.source.files['pnpm-lock.yaml'] = id('f');
    expect(f.manager.finish().complete).toBe(false);
    expect(f.containers.size).toBe(1);
    expect(f.commands.some((args) => args[1] === 'rm')).toBe(false);
    expect(() => f.manager.verify()).toThrow();
  },
);

it('retains an unlabeled interrupted browser-smoke container and fails verification', () => {
  const f = fixture();
  f.manager.start();
  const owned = f.candidate();
  f.containers.set(id('f'), {
    Id: id('f'),
    Image: owned.dependency.Id,
    Config: { Labels: {}, Env: [] },
    Mounts: [],
  });
  expect(f.manager.observe().ambiguousContainers).toEqual([id('f')]);
  expect(f.manager.finish().complete).toBe(false);
  expect(f.containers.has(id('f'))).toBe(true);
  expect(f.commands.some((args) => args[1] === 'rm')).toBe(false);
  expect(() => f.manager.verify()).toThrow('CLEANUP_NOT_VERIFIED');
});

it('requires preflight and actual runtime observation, rejects leaked containers and volume/network drift', () => {
  const absent = fixture();
  expect(() => absent.manager.verify()).toThrow();
  const empty = fixture();
  empty.manager.start();
  empty.manager.finish();
  expect(() => empty.manager.verify()).toThrow('ACTUAL_RUNTIME_OBSERVATION_MISSING');
  const leaked = fixture();
  leaked.manager.start();
  leaked.candidate();
  leaked.manager.observe();
  leaked.ignoreRemoval();
  expect(leaked.manager.finish().complete).toBe(false);
  expect(() => leaked.manager.verify()).toThrow();
  const volume = fixture();
  volume.manager.start();
  volume.candidate();
  volume.manager.observe();
  volume.volumes.add('unattributed');
  expect(volume.manager.finish().complete).toBe(false);
  expect(volume.volumes.has('unattributed')).toBe(true);
});

it('does not signal reused observer PIDs or accept foreign mount/label ownership', () => {
  const process = { pid: 42, start: '100', cwd: '/owned', argvSha256: id('1') };
  expect(sameProcess(process, { ...process })).toBe(true);
  expect(sameProcess(process, { ...process, start: '101' })).toBe(false);
  expect(sameProcess(process, { ...process, cwd: '/foreign' })).toBe(false);
  expect(sameProcess(process, { ...process, argvSha256: id('2') })).toBe(false);
  const f = fixture();
  const before = f.manager.start();
  const owned = f.candidate();
  const observed = f.manager.observe();
  expect(() =>
    validateContainer(owned.container, f.source, observed.manifests, [owned.image], {
      ...before.baseline,
      containers: [owned.container.Id],
    }),
  ).toThrow('CONTAINER_NOT_FRESH');
  owned.dependency.Config.Labels[`${prefix}environment-sha256`] = id('f');
  expect(() => validateImage(owned.dependency, f.source, observed.manifests)).toThrow(
    'DEPENDENCY_IMAGE_INPUT_MISMATCH',
  );
});

it('stops an exact observer with bounded escalation and waits for its subprocess group', async () => {
  const expected = { pid: 42, start: '100', cwd: '/owned', argvSha256: id('1') };
  let live = true;
  let children = 2;
  const signals: string[] = [];
  await stopObserver(expected, {
    processInfo: () => (live ? expected : null),
    processGroup: () => (children > 0 ? [expected] : []),
    signal: (_pid: number, signal: string) => {
      signals.push(signal);
      if (signal === 'SIGKILL') live = false;
    },
    delay: async () => {
      if (!live) children -= 1;
    },
  });
  expect(signals).toEqual(['SIGTERM', 'SIGKILL']);
  expect(children).toBe(0);
});

it('refuses a reused observer PID and bounds an observer or child that never exits', async () => {
  const expected = { pid: 42, start: '100', cwd: '/owned', argvSha256: id('1') };
  const signal = jest.fn();
  await expect(
    stopObserver(expected, {
      processInfo: () => ({ ...expected, cwd: '/foreign' }),
      signal,
      delay: async () => {},
    }),
  ).rejects.toThrow('OBSERVER_PROCESS_IDENTITY_DRIFT');
  expect(signal).not.toHaveBeenCalled();
  await expect(
    stopObserver(expected, {
      processInfo: () => expected,
      processGroup: () => [],
      signal,
      delay: async () => {},
    }),
  ).rejects.toThrow('OBSERVER_NOT_STOPPED');
  await expect(
    stopObserver(expected, {
      processInfo: () => null,
      processGroup: () => [expected],
      signal,
      delay: async () => {},
    }),
  ).rejects.toThrow('OBSERVER_CHILD_GROUP_RETAINED');
});
