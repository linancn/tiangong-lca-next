import { readFileSync } from 'node:fs';

import { expect, test, type Route } from '@playwright/test';

const closureCheckId = 'closure-browser';
const userId = '11111111-1111-4111-8111-111111111111';
const signedDownloadUrl = 'https://storage.example.test/scope-closure.xlsx';

function mainEnvironment(): Record<string, string> {
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/u)
      .flatMap((line) => {
        const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u);
        return match ? [[match[1], match[2].replace(/^['"]|['"]$/gu, '')]] : [];
      }),
  );
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function fakeAccessToken(): string {
  return [
    base64Url({ alg: 'HS256', typ: 'JWT' }),
    base64Url({
      aud: 'authenticated',
      email: 'browser@example.test',
      exp: 2_000_000_000,
      role: 'authenticated',
      sub: userId,
      user_metadata: { display_name: 'Browser contract test' },
    }),
    'browser-contract-signature',
  ].join('.');
}

function readyArtifacts() {
  return [
    {
      artifactRole: 'closure_report_xlsx',
      artifactState: 'ready',
      filename: 'scope-closure.xlsx',
      format: 'xlsx',
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 128,
      checksumSha256: 'a'.repeat(64),
      artifactExpiresAt: '2030-01-01T00:00:00Z',
    },
    {
      artifactRole: 'closure_issue_manifest',
      artifactState: 'ready',
      filename: 'scope-closure-manifest.json',
      format: 'json',
      mediaType: 'application/vnd.tiangong.scope-closure-manifest+json',
      size: 512,
      checksumSha256: 'b'.repeat(64),
      artifactExpiresAt: '2030-01-01T00:00:00Z',
    },
  ];
}

test('delayed signing downloads in the same page context and keeps failures opaque', async ({
  context,
  page,
}) => {
  const environment = mainEnvironment();
  const supabaseUrl = environment.SUPABASE_URL;
  expect(supabaseUrl).toBeTruthy();
  const supabaseOrigin = new URL(supabaseUrl).origin;
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  const accessToken = fakeAccessToken();
  const session = {
    access_token: accessToken,
    expires_at: 2_000_000_000,
    expires_in: 3600,
    refresh_token: 'browser-contract-refresh',
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'browser@example.test',
      app_metadata: {},
      user_metadata: { display_name: 'Browser contract test' },
    },
  };
  await context.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.open = () => {
        throw new Error('Artifact download must not depend on window.open');
      };
    },
    { key: storageKey, value: session },
  );

  const downloadRequests: Array<Record<string, unknown>> = [];
  let signedArtifactRequests = 0;
  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin === 'http://127.0.0.1:8011') {
      await route.continue();
      return;
    }
    if (target.href === signedDownloadUrl) {
      signedArtifactRequests += 1;
      await route.fulfill({
        body: 'browser-download-bytes',
        contentType: 'application/octet-stream',
        headers: { 'content-disposition': 'attachment; filename="scope-closure.xlsx"' },
        status: 200,
      });
      return;
    }
    if (target.origin !== supabaseOrigin) {
      await route.abort('blockedbyclient');
      return;
    }
    if (target.pathname === '/auth/v1/user') {
      await route.fulfill({
        body: JSON.stringify(session.user),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    if (target.pathname === '/rest/v1/roles') {
      await route.fulfill({
        body: JSON.stringify({ role: 'data_product_manager', user_id: userId }),
        contentType: 'application/vnd.pgrst.object+json',
        status: 200,
      });
      return;
    }
    if (target.pathname === '/functions/v1/app_data_product_commands') {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (body.action === 'get_closure_check') {
        await route.fulfill({
          body: JSON.stringify({
            data: {
              schemaVersion: 'lcia.scope-closure-check.v1',
              closureCheckId,
              runStatus: 'passed',
              certificateValidity: 'valid',
              scanCompleteness: 'complete',
              requestedScopeHash: 'scope-hash-browser',
              policyFingerprint: 'policy-browser',
              artifacts: readyArtifacts(),
            },
            ok: true,
          }),
          contentType: 'application/json',
          status: 200,
        });
        return;
      }
      if (body.action === 'create_closure_report_download') {
        downloadRequests.push(body);
        await new Promise((resolve) => {
          setTimeout(resolve, 500);
        });
        if (body.artifactRole === 'closure_issue_manifest') {
          await route.fulfill({
            body: JSON.stringify({
              code: 'edge_upstream_failed',
              message: 'private upstream detail',
              ok: false,
              status: 502,
            }),
            contentType: 'application/json',
            status: 502,
          });
          return;
        }
        await route.fulfill({
          body: JSON.stringify({
            data: {
              signedDownloadUrl,
              artifactId: '22222222-2222-4222-8222-222222222222',
              artifactRole: 'closure_report_xlsx',
              artifactState: 'ready',
              format: 'xlsx',
              filename: 'scope-closure.xlsx',
              mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              size: 128,
              checksumSha256: 'a'.repeat(64),
              artifactExpiresAt: '2030-01-01T00:00:00Z',
              signedUrlExpiresAt: '2029-12-31T23:59:00Z',
              expiresInSeconds: 60,
            },
            ok: true,
          }),
          contentType: 'application/json',
          status: 200,
        });
        return;
      }
      const data =
        body.action === 'list_task_feed'
          ? { items: [] }
          : body.action === 'list_closure_issues'
            ? {
                closureCheckId,
                issues: [],
                schemaVersion: 'lcia.scope-closure-issues-page.v1',
                totalCount: 0,
              }
            : [];
      await route.fulfill({
        body: JSON.stringify({ data, ok: true }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    if (target.pathname.startsWith('/functions/v1/')) {
      await route.fulfill({
        body: JSON.stringify({ data: [], ok: true }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    await route.fulfill({ body: '[]', contentType: 'application/json', status: 200 });
  });

  await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
  const reportButton = page.getByRole('button', { name: 'Download issue report' });
  await expect(reportButton).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), reportButton.click()]);
  expect(download.suggestedFilename()).toBe('scope-closure.xlsx');
  expect(signedArtifactRequests).toBe(1);

  await page.getByRole('button', { name: 'Download machine result manifest' }).click();
  await expect(
    page.getByText('This download is currently unavailable. Please try again later.'),
  ).toBeVisible();
  await expect(page.getByText('private upstream detail')).toHaveCount(0);
  expect(downloadRequests).toEqual([
    {
      action: 'create_closure_report_download',
      artifactRole: 'closure_report_xlsx',
      closureCheckId,
    },
    {
      action: 'create_closure_report_download',
      artifactRole: 'closure_issue_manifest',
      closureCheckId,
    },
  ]);
  expect(signedArtifactRequests).toBe(1);
});
