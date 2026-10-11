import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  renderShell,
  createBrandAssets,
  BrandAssetsPlugin,
  createBrandMiddleware,
} = require('./assets.cjs');
const { readProfile, createDesktopConfig } = require('./desktop.cjs');
const { localPackagePlan } = require('./package-local.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

for (const id of ['tiangong', 'atlas']) {
  test(`${id} static assets preserve protocol, crawler and source files`, () => {
    const profile = readProfile(id);
    const original = fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8');
    const assets = createBrandAssets(root, profile);
    const manifest = JSON.parse(assets['manifest.json']);
    assert.equal(manifest.name, profile.displayName);
    assert.equal(manifest.theme_color, profile.assets.manifestThemeColor);
    for (const icon of manifest.icons)
      assert.ok(fs.existsSync(path.join(root, 'public', icon.src)));
    for (const shell of ['404.html', 'maintenance.html', 'oauth-consent-bridge.html']) {
      assert.ok(assets[shell].includes(profile.displayName));
      assert.match(assets[shell], /name="robots" content="noindex"/);
      assert.match(assets[shell], /rel="icon"/);
    }
    assert.match(
      assets['oauth-consent-bridge.html'],
      /script src="\/oauth-consent-bridge.js" defer/,
    );
    assert.match(assets['oauth-consent-bridge.html'], /default-src 'none'; script-src 'self'/);
    assert.equal(fs.readFileSync(path.join(root, 'src/manifest.json'), 'utf8'), original);
    assert.deepEqual(createBrandAssets(root, profile), assets);
  });
}

test('HTML brand text is escaped and injected CSS/URLs fail closed', () => {
  const profile = readProfile('atlas');
  const source = '<head><title>TianGong LCA</title></head>';
  assert.match(
    renderShell(source, { ...profile, displayName: '</title><script>alert(1)</script>' }),
    /&lt;\/title&gt;&lt;script&gt;/,
  );
  assert.throws(() => renderShell(source, { ...profile, favicon: '" onerror="bad' }), /favicon/);
  assert.throws(
    () => renderShell(source, { ...profile, theme: { light: { colorPrimary: 'red;}</style>' } } }),
    /brand color/,
  );
});

test('Static shell supports effective theme and favicon overrides without changing profile metadata', () => {
  const profile = readProfile('atlas');
  const assets = createBrandAssets(root, {
    ...profile,
    theme: { ...profile.theme, light: { ...profile.theme.light, colorPrimary: '#123456' } },
    favicon: '/custom.ico',
  });
  assert.match(assets['404.html'], /background: #123456/);
  assert.match(assets['404.html'], /rgb\(18 52 86/);
  assert.match(assets['404.html'], /href="\/custom.ico"/);
  assert.equal(JSON.parse(assets['manifest.json']).theme_color, profile.assets.manifestThemeColor);
  const remoteShell = renderShell('<head><title>TianGong LCA</title></head>', {
    ...profile,
    favicon: 'https://example.invalid/icon.ico?variant=light&size=32',
    theme: { ...profile.theme, light: { ...profile.theme.light, colorPrimary: '#123' } },
  });
  assert.match(
    remoteShell,
    /href="https:\/\/example.invalid\/icon.ico\?variant=light&amp;size=32"/,
  );
  const rgbShell = renderShell('rgb(92 36 106 / 14%); #5c246a<head></head>', {
    ...profile,
    theme: { ...profile.theme, light: { ...profile.theme.light, colorPrimary: 'rgb(1, 2, 3)' } },
  });
  assert.match(rgbShell, /color-mix\(in srgb, rgb\(1, 2, 3\) 14%, transparent\)/);
});

test('Installed Webpack and CopyPlugin emit selected brand after static copies', async () => {
  const maxRequire = createRequire(require.resolve('@umijs/max/package.json'));
  const umiRequire = createRequire(maxRequire.resolve('umi/package.json'));
  const presetRequire = createRequire(umiRequire.resolve('@umijs/preset-umi/package.json'));
  const bundlerRequire = createRequire(
    presetRequire.resolve('@umijs/bundler-webpack/package.json'),
  );
  const { webpack } = bundlerRequire('@umijs/bundler-webpack/compiled/webpack');
  const CopyPlugin = bundlerRequire('@umijs/bundler-webpack/compiled/copy-webpack-plugin');
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-brand-webpack-'));
  const compiler = webpack({
    mode: 'production',
    entry: {},
    output: { path: output },
    plugins: [
      new CopyPlugin({ patterns: [{ from: path.join(root, 'public/404.html'), to: '404.html' }] }),
      new BrandAssetsPlugin(root, readProfile('atlas')),
    ],
  });
  try {
    const stats = await new Promise((resolve, reject) =>
      compiler.run((error, result) => (error ? reject(error) : resolve(result))),
    );
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
    assert.match(fs.readFileSync(path.join(output, '404.html'), 'utf8'), /Not found · ATLAS/);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(output, 'manifest.json'), 'utf8')).name,
      'ATLAS',
    );
  } finally {
    await new Promise((resolve, reject) =>
      compiler.close((error) => (error ? reject(error) : resolve())),
    );
    fs.rmSync(output, { recursive: true, force: true });
  }
});

test('Dev overlay preserves 404 status, OAuth no-store and passes unrelated requests onward', () => {
  const middleware = createBrandMiddleware(root, readProfile('atlas'));
  for (const url of [
    '/404.html',
    '/oauth-consent-bridge.html?authorization_id=opaque',
    '/manifest.json',
  ]) {
    const headers = {};
    let body;
    const response = {
      setHeader: (key, value) => {
        headers[key] = value;
      },
      end: (value) => {
        body = value;
      },
    };
    middleware({ url, method: 'GET' }, response, () => assert.fail('must serve selected shell'));
    assert.equal(response.statusCode, url === '/404.html' ? 404 : 200);
    assert.equal(headers['X-Robots-Tag'], 'noindex');
    assert.match(body, /ATLAS/);
    if (url.startsWith('/oauth')) assert.equal(headers['Cache-Control'], 'no-store');
  }
  let passed = false;
  middleware({ url: '/oauth-consent-bridge.js', method: 'GET' }, {}, () => {
    passed = true;
  });
  assert.equal(passed, true);
});

test('Desktop brands have separate app identity, icons and artifact paths; default shape is compatible', () => {
  const base = JSON.parse(fs.readFileSync(path.join(root, 'electron-builder.json'), 'utf8'));
  assert.deepEqual(createDesktopConfig(readProfile('tiangong')), { ...base, publish: null });
  const atlas = createDesktopConfig(readProfile('atlas'));
  assert.equal(atlas.appId, 'earth.tiangong.atlas');
  assert.equal(atlas.productName, 'ATLAS');
  assert.equal(atlas.nsis.shortcutName, 'ATLAS');
  assert.equal(atlas.directories.output, 'dist-package/atlas');
  assert.equal(atlas.artifactName, 'atlas-lca-${version}-${os}-${arch}.${ext}');
  assert.equal(atlas.publish, null);
  assert.ok(fs.existsSync(path.join(root, atlas.mac.icon)));
  assert.ok(fs.existsSync(path.join(root, atlas.win.icon)));
});

test('Local package plan always rebuilds selected brand and prevents publishing/config overrides', () => {
  const plan = localPackagePlan(['--dir', '--arm64'], { APP_BRAND: 'atlas' }, 'darwin');
  assert.equal(plan.brand, 'atlas');
  assert.deepEqual(plan.commands.slice(0, 2), [['build'], ['tsc:electron']]);
  assert.ok(plan.commands[2].includes('never'));
  for (const args of [
    ['--publish', 'always'],
    ['-p', 'always'],
    ['--publish=always'],
    ['--config.publish=github'],
    ['--config', 'other.json'],
  ]) {
    assert.throws(() => localPackagePlan(args, {}, 'linux'), /accepts only/);
  }
  assert.throws(() => localPackagePlan(['--mac', '--x64'], {}, 'linux'), /Intel/);
  assert.throws(() => readProfile('invalid'), /Unknown APP_BRAND/);
  assert.equal(readProfile(' ATLAS ').id, 'atlas');
  assert.equal(readProfile('').id, 'tiangong');
});

test('Installed electron-builder validates both brand configurations without packaging or publishing', async () => {
  const builderRequire = createRequire(require.resolve('electron-builder/package.json'));
  const { validateConfiguration } = builderRequire('app-builder-lib/out/util/config/config');
  for (const id of ['tiangong', 'atlas'])
    await validateConfiguration(createDesktopConfig(readProfile(id)));
});
