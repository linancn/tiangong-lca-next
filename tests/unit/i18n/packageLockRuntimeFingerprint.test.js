const {
  packageLockRuntimeDigest,
  packageLockRuntimeProjection,
} = require('../../../scripts/i18n/package-lock-runtime-fingerprint.cjs');

function packageLockFixture() {
  return {
    name: 'tiangong-lca-next',
    version: '0.0.58',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: 'tiangong-lca-next',
        version: '0.0.58',
        dependencies: {
          example: '^1.0.0',
        },
      },
      'node_modules/example': {
        version: '1.0.1',
        resolved: 'https://registry.npmjs.org/example/-/example-1.0.1.tgz',
        integrity: 'sha512-example',
      },
    },
  };
}

describe('package-lock runtime fingerprint', () => {
  it('ignores only root release-version metadata', () => {
    const original = packageLockFixture();
    const nextPatch = packageLockFixture();
    nextPatch.version = '0.0.59';
    nextPatch.packages[''].version = '0.0.59';

    expect(packageLockRuntimeDigest(nextPatch)).toBe(packageLockRuntimeDigest(original));
    expect(packageLockRuntimeProjection(nextPatch)).not.toHaveProperty('version');
    expect(packageLockRuntimeProjection(nextPatch).packages['']).not.toHaveProperty('version');
  });

  it.each([
    ['root dependency range', (lock) => (lock.packages[''].dependencies.example = '^2.0.0')],
    [
      'resolved dependency version',
      (lock) => (lock.packages['node_modules/example'].version = '1.0.2'),
    ],
    [
      'resolved dependency integrity',
      (lock) => (lock.packages['node_modules/example'].integrity = 'sha512-changed'),
    ],
  ])('rejects %s drift', (_label, mutate) => {
    const original = packageLockFixture();
    const changed = packageLockFixture();
    mutate(changed);

    expect(packageLockRuntimeDigest(changed)).not.toBe(packageLockRuntimeDigest(original));
  });

  it('rejects non-object package-lock input', () => {
    expect(() => packageLockRuntimeProjection('[]')).toThrow(
      'package-lock input must be a JSON object.',
    );
  });
});
