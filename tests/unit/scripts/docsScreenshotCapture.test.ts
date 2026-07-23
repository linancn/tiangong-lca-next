import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  classifyAccess,
  normalizeOutputPath,
  parseEnvFile,
  redactRoute,
  secretValuesFromEnv,
  validateSecretLocation,
  validateSecretMode,
  validateVisualPlan,
  VISUAL_PLAN_SCHEMA,
  type VisualPlan,
} from '../../../scripts/docs-screenshots/contracts';

function validPlan(): VisualPlan {
  return {
    schemaVersion: VISUAL_PLAN_SCHEMA,
    docsImpactIssue: 'tiangong-lca/workspace#456',
    stage: 'mapped',
    sourceRepo: 'linancn/tiangong-lca-next',
    sourceCommit: 'a'.repeat(40),
    captureMode: 'local-candidate',
    authentication: {
      mode: 'credentials',
      loginPath: '/login',
      emailLocator: { kind: 'label', value: 'Email' },
      passwordLocator: { kind: 'label', value: 'Password' },
      submitLocator: { kind: 'role', role: 'button', name: 'Sign in' },
      authenticatedLocator: {
        kind: 'role',
        role: 'button',
        name: 'Account',
      },
      identityProbe: {
        path: '/api/profile',
        jsonPath: '$.email',
        matchSecret: 'email',
      },
      mutationAllowlist: ['/api/auth/*'],
    },
    authorization: {
      requiredCapability: 'notifications:view',
      probe: { kind: 'http-status', path: '/api/notifications' },
    },
    captures: [
      {
        id: 'grp-notifications-entry',
        groupId: 'grp-notifications',
        action: 'add',
        requiredDoc: 'docs/user-guide/notifications.md',
        mirrorDoc: 'i18n/en/docusaurus-plugin-content-docs/current/user-guide/notifications.md',
        asset: 'docs/user-guide/img/notification-entry.png',
        mirrorAsset:
          'i18n/en/docusaurus-plugin-content-docs/current/user-guide/img/notification-entry.png',
        sourcePullRequests: ['linancn/tiangong-lca-next#123'],
        routePath: '/notifications',
        routePattern: '/notifications',
        uiState: 'notification center open',
        compositionClass: 'full-screen-overview',
        compositionReference: 'docs/user-guide/img/notification.png',
        actions: [
          {
            type: 'waitFor',
            locator: {
              kind: 'role',
              role: 'dialog',
              name: 'Notifications',
            },
          },
        ],
        masks: [{ kind: 'testId', value: 'account-email' }],
        callouts: [
          {
            number: 1,
            target: 'notification entry',
            locator: {
              kind: 'role',
              role: 'button',
              name: 'Notifications',
            },
          },
        ],
        privacyPlan: {
          syntheticOrPublicData: true,
          secretsAbsent: true,
        },
      },
    ],
  };
}

describe('docs screenshot capture contracts', () => {
  test('parses the fixed secret variables without exposing them in the plan', () => {
    const values = parseEnvFile(
      [
        'DOCS_SCREENSHOT_ACCOUNT_ALIAS=docs-screenshot-readonly',
        'DOCS_SCREENSHOT_ACCOUNT_EMAIL="synthetic@example.invalid"',
        "DOCS_SCREENSHOT_ACCOUNT_PASSWORD='not-logged'",
        'DOCS_SCREENSHOT_BASE_URL=http://127.0.0.1:8000',
      ].join('\n'),
    );

    expect(secretValuesFromEnv(values)).toEqual({
      accountAlias: 'docs-screenshot-readonly',
      email: 'synthetic@example.invalid',
      password: 'not-logged',
      baseUrl: 'http://127.0.0.1:8000/',
    });
    expect(() =>
      secretValuesFromEnv({
        ...values,
        UNRELATED_SECRET: 'must-not-be-accepted',
      }),
    ).toThrow('unsupported variables');
  });

  test('accepts 0600 or narrower secret permissions and rejects broad modes', () => {
    expect(() => validateSecretMode(0o100600, true)).not.toThrow();
    expect(() => validateSecretMode(0o100400, true)).not.toThrow();
    expect(() => validateSecretMode(0o100640, true)).toThrow('no broader than 0600');
    expect(() => validateSecretMode(0o120600, false)).toThrow('regular file');
  });

  test('requires an absolute secret path outside Git repositories and worktrees', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-secret-location-'));
    try {
      const initialized = spawnSync('git', ['init', '-b', 'main'], {
        cwd: root,
        encoding: 'utf8',
      });
      expect(initialized.status).toBe(0);
      const inRepo = path.join(root, 'docs-impact-screenshot.env');
      fs.writeFileSync(inRepo, 'not-a-real-secret\n', { mode: 0o600 });
      expect(() => validateSecretLocation(inRepo)).toThrow('outside every Git repository/worktree');
      expect(() => validateSecretLocation('relative-secret.env')).toThrow('must be absolute');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('keeps screenshot outputs inside the explicit next-docs root', () => {
    const root = path.resolve('/tmp/docs-screenshot-target');
    expect(normalizeOutputPath('docs/user-guide/img/example.png', [root])).toBe(
      path.join(root, 'docs/user-guide/img/example.png'),
    );
    expect(() => normalizeOutputPath('../outside.png', [root])).toThrow('escapes allowed roots');
  });

  test('validates the controlled visual plan and rejects write-like fill actions', () => {
    const root = path.resolve('/tmp/docs-screenshot-target');
    expect(() => validateVisualPlan(validPlan(), [root])).not.toThrow();

    const invalid = validPlan();
    invalid.captures[0].actions = [
      {
        type: 'fill',
        locator: { kind: 'label', value: 'Name' },
        value: 'mutation',
        readOnlyFilter: false,
      } as never,
    ];
    expect(() => validateVisualPlan(invalid, [root])).toThrow('readOnlyFilter must be true');
  });

  test('requires all captures in one plan to share the actual browser viewport', () => {
    const root = path.resolve('/tmp/docs-screenshot-target');
    const invalid = validPlan();
    invalid.captures.push({
      ...invalid.captures[0],
      id: 'grp-notifications-second',
      viewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
    });
    expect(() => validateVisualPlan(invalid, [root])).toThrow(
      'must match the shared plan viewport',
    );
  });

  test('allows the Draft exception only for authenticated authoritative denial', () => {
    expect(
      classifyAccess({
        authenticationStatus: 'authenticated',
        identityConfirmed: true,
        authorizationStatus: 'denied',
        signals: [{ kind: 'account-identity' }, { kind: 'http-403' }],
      }),
    ).toBe('verified-access-denied');

    expect(
      classifyAccess({
        authenticationStatus: 'authenticated',
        identityConfirmed: true,
        authorizationStatus: 'denied',
        signals: [{ kind: 'account-identity' }, { kind: 'ui-access-denied' }],
      }),
    ).toBe('environment');

    expect(
      classifyAccess({
        authenticationStatus: 'invalid-authentication',
        identityConfirmed: false,
        authorizationStatus: 'denied',
        signals: [{ kind: 'account-identity' }, { kind: 'http-403' }],
      }),
    ).toBe('invalid-authentication');

    expect(
      classifyAccess({
        authenticationStatus: 'authenticated',
        identityConfirmed: true,
        authorizationStatus: 'denied',
        signals: [{ kind: 'public-session' }, { kind: 'http-403' }],
      }),
    ).toBe('environment');
  });

  test('redacts UUIDs, query values, and email-like identifiers from routes', () => {
    expect(
      redactRoute(
        'https://example.invalid/users/123e4567-e89b-42d3-a456-426614174000?token=secret',
      ),
    ).toBe('/users/<uuid>');
    expect(redactRoute('/users/synthetic@example.invalid')).toBe('/users/<email>');
  });
});
