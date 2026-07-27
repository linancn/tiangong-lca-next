import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { parseEnv } from 'node:util';

const root = path.resolve(import.meta.dirname, '../..');
const profilePath = path.join(root, 'config/docs-capture/profile.v1.json');
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

function testIdPattern(testId) {
  return new RegExp(`(?:data-testid\\s*=|['"]data-testid['"]\\s*:)\\s*['"]${testId}['"]`);
}

test('the source-bound profile exposes only declarative product facts', () => {
  assert.equal(profile.schemaVersion, 'next-docs-capture-profile.v1');
  assert.equal(profile.productRepo, 'linancn/tiangong-lca-next');
  assert.deepEqual(profile.supportedIntentSchemas, ['docs-impact-capture-intent.v2']);
  assert.deepEqual(profile.runtime.command, ['npm', 'run', 'start:main']);
  assert.equal(profile.runtime.readinessPath, '/');
  assert.equal(profile.authentication.mode, 'credentials');
  const mainEnvironment = parseEnv(fs.readFileSync(path.join(root, '.env'), 'utf8'));
  assert.deepEqual(profile.authentication.mutationAllowlist, [
    `${mainEnvironment.SUPABASE_URL}/auth/v1/*`,
  ]);
  assert.deepEqual(profile.locatorPolicy.allowedKinds, ['role', 'label', 'text', 'testId']);
  assert.equal(profile.locatorPolicy.cssAllowed, false);
});

test('every profile-owned login and identity locator is present in the target source', () => {
  const login = fs.readFileSync(path.join(root, 'src/pages/User/Login/index.tsx'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'src/app.tsx'), 'utf8');
  const accessDenied = fs.readFileSync(
    path.join(root, 'src/components/AccessDenied/index.tsx'),
    'utf8',
  );
  const routes = fs.readFileSync(path.join(root, 'config/routes.ts'), 'utf8');

  for (const testId of [
    profile.authentication.emailLocator.value,
    profile.authentication.passwordLocator.value,
    profile.authentication.submitLocator.value,
  ]) {
    assert.match(login, testIdPattern(testId));
  }
  assert.match(app, testIdPattern(profile.authentication.authenticatedLocator.value));
  assert.match(
    accessDenied,
    testIdPattern(profile.authorization.probes['protected-route-ui'].deniedLocator.value),
  );
  assert.match(app, /unAccessible:\s*<AccessDenied\s*\/>/);
  assert.match(routes, /\baccess:\s*['"][^'"]+['"]/);
  assert.equal(
    fs.existsSync(
      path.join(root, profile.authorization.probes['protected-route-ui'].sourceGuardReference),
    ),
    true,
  );
});

test('Next no longer owns the generic screenshot executor', () => {
  for (const relative of [
    'scripts/docs-screenshots/capture.ts',
    'scripts/docs-screenshots/contracts.ts',
    'playwright.docs-capture.config.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), false, relative);
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['docs:screenshot:capture'], undefined);
  assert.equal(packageJson.scripts['docs:screenshot:test'], undefined);
  assert.equal(
    packageJson.scripts['docs:capture-profile:test'],
    'node --test tests/docs-capture/profile-contract.test.mjs',
  );
});
