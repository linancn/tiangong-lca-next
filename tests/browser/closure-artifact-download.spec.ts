import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const closureCheckId = 'closure-browser';
const userId = '11111111-1111-4111-8111-111111111111';
const baseURL = process.env.QUALIFICATION_BASE_URL ?? 'http://127.0.0.1:8011';
const supabaseUrl = process.env.QUALIFICATION_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseOrigin = new URL(supabaseUrl).origin;
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

type ArtifactState = 'pending' | 'ready' | 'expired' | 'deleted';
type Persona = 'anonymous' | 'standard_user' | 'admin' | 'owner' | 'data_product_manager';

const localizedExpiryGuidance = {
  'de-DE':
    'Dieses Artefakt ist abgelaufen. Führen Sie die Datenvollständigkeitsprüfung erneut aus, um einen neuen Download vorzubereiten.',
  'en-US':
    'This artifact has expired. Run the data completeness check again to prepare a new download.',
  'fr-FR':
    'Cet artefact a expiré. Relancez la vérification de l’exhaustivité des données pour préparer un nouveau téléchargement.',
  'zh-CN': '此产物已过期。请重新运行数据完整性检查以准备新的下载。',
} as const;

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

function session() {
  return {
    access_token: fakeAccessToken(),
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
}

function artifacts(state: ArtifactState) {
  return [
    {
      artifactRole: 'closure_report_xlsx',
      artifactState: state,
      filename: state === 'ready' ? 'scope-closure.xlsx' : null,
      format: state === 'ready' ? 'xlsx' : null,
      mediaType:
        state === 'ready'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : null,
      size: state === 'ready' ? 128 : null,
      checksumSha256: state === 'ready' ? 'a'.repeat(64) : null,
      artifactExpiresAt: state === 'ready' ? '2099-01-01T00:00:00Z' : null,
    },
    {
      artifactRole: 'closure_issue_manifest',
      artifactState: state,
      filename: state === 'ready' ? 'scope-closure-manifest.json' : null,
      format: state === 'ready' ? 'json' : null,
      mediaType: state === 'ready' ? 'application/vnd.tiangong.scope-closure-manifest+json' : null,
      size: state === 'ready' ? 512 : null,
      checksumSha256: state === 'ready' ? 'b'.repeat(64) : null,
      artifactExpiresAt: state === 'ready' ? '2099-01-01T00:00:00Z' : null,
    },
  ];
}

function closureSummary(state: ArtifactState) {
  return {
    schemaVersion: 'lcia.scope-closure-check.v1',
    closureCheckId,
    runStatus: state === 'pending' ? 'running' : 'passed',
    certificateValidity: state === 'pending' ? 'unavailable' : 'valid',
    scanCompleteness: state === 'pending' ? 'unknown' : 'complete',
    requestedScopeHash: 'scope-hash-browser',
    policyFingerprint: 'policy-browser',
    artifacts: artifacts(state),
  };
}

async function configureBrowser(
  context: BrowserContext,
  page: Page,
  options: {
    artifactState?: ArtifactState;
    downloadStatus?: number;
    locale?: keyof typeof localizedExpiryGuidance;
    persona: Persona;
  },
) {
  const currentSession = session();
  if (options.persona !== 'anonymous') {
    await context.addInitScript(
      ({ key, locale, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
        if (locale) localStorage.setItem('umi_locale', locale);
        window.open = () => {
          throw new Error('Artifact download must not depend on window.open');
        };
      },
      { key: storageKey, locale: options.locale, value: currentSession },
    );
  }

  const commandRequests: Array<Record<string, unknown>> = [];
  const bufferedDownloadRequests: Array<{ resourceType: string; role: string }> = [];
  const unexpectedOrigins = new Set<string>();

  await page.route('**/*', async (route: Route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (target.origin === baseURL && target.pathname.startsWith('/qualification-download/')) {
      const pathSegments = target.pathname.split('/');
      const role = pathSegments[pathSegments.length - 1] ?? '';
      bufferedDownloadRequests.push({ resourceType: request.resourceType(), role });
      await route.abort('blockedbyclient');
      return;
    }
    if (target.origin === baseURL) {
      await route.continue();
      return;
    }
    if (target.origin !== supabaseOrigin) {
      unexpectedOrigins.add(target.origin);
      await route.abort('blockedbyclient');
      return;
    }
    if (target.pathname === '/auth/v1/user') {
      await route.fulfill({
        body: JSON.stringify(
          options.persona === 'anonymous' ? { message: 'not authenticated' } : currentSession.user,
        ),
        contentType: 'application/json',
        status: options.persona === 'anonymous' ? 401 : 200,
      });
      return;
    }
    if (target.pathname === '/rest/v1/roles') {
      await route.fulfill({
        body: JSON.stringify({ role: options.persona, user_id: userId }),
        contentType: 'application/vnd.pgrst.object+json',
        status: 200,
      });
      return;
    }
    if (target.pathname === '/functions/v1/app_data_product_commands') {
      const body = request.postDataJSON() as Record<string, unknown>;
      commandRequests.push(body);
      if (body.action === 'get_closure_check') {
        await route.fulfill({
          body: JSON.stringify({
            data: closureSummary(options.artifactState ?? 'ready'),
            ok: true,
          }),
          contentType: 'application/json',
          status: 200,
        });
        return;
      }
      if (body.action === 'create_closure_report_download') {
        const status = options.downloadStatus ?? 200;
        if (status === 410) {
          await route.fulfill({
            body: JSON.stringify({ code: 'closure_report_expired', ok: false, status }),
            contentType: 'application/json',
            status,
          });
          return;
        }
        const role = String(body.artifactRole);
        await route.fulfill({
          body: JSON.stringify({
            data: {
              artifactExpiresAt: '2099-01-01T00:00:00Z',
              artifactId: '22222222-2222-4222-8222-222222222222',
              artifactRole: role,
              artifactState: 'ready',
              checksumSha256: role === 'closure_report_xlsx' ? 'a'.repeat(64) : 'b'.repeat(64),
              expiresInSeconds: 60,
              filename:
                role === 'closure_report_xlsx'
                  ? 'scope-closure.xlsx'
                  : 'scope-closure-manifest.json',
              format: role === 'closure_report_xlsx' ? 'xlsx' : 'json',
              mediaType:
                role === 'closure_report_xlsx'
                  ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                  : 'application/vnd.tiangong.scope-closure-manifest+json',
              signedDownloadUrl: `${baseURL}/qualification-download/${role}`,
              signedUrlExpiresAt: '2098-12-31T23:59:00Z',
              size: role === 'closure_report_xlsx' ? 128 : 512,
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

  return { bufferedDownloadRequests, commandRequests, unexpectedOrigins };
}

test.describe('role routing', () => {
  test('anonymous redirects to login', async ({ context, page }) => {
    const observed = await configureBrowser(context, page, { persona: 'anonymous' });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    await expect(page).toHaveURL(/#\/user\/login/u);
    expect(observed.commandRequests).toHaveLength(0);
    expect([...observed.unexpectedOrigins]).toEqual([]);
  });

  for (const persona of ['standard_user', 'admin', 'owner'] as const) {
    test(`${persona} is denied`, async ({ context, page }) => {
      const observed = await configureBrowser(context, page, { persona });
      await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
      await expect(page.getByTestId('access-denied')).toBeVisible();
      expect(
        observed.commandRequests.filter((request) =>
          ['create_closure_report_download', 'get_closure_check'].includes(String(request.action)),
        ),
      ).toHaveLength(0);
      expect([...observed.unexpectedOrigins]).toEqual([]);
    });
  }

  test('data_product_manager is allowed', async ({ context, page }) => {
    const observed = await configureBrowser(context, page, { persona: 'data_product_manager' });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    await expect(page.getByTestId('closure-artifacts')).toBeVisible();
    await expect(page.getByTestId('access-denied')).toHaveCount(0);
    expect([...observed.unexpectedOrigins]).toEqual([]);
  });
});

test.describe('artifact lifecycle', () => {
  test('preparing state is explicit', async ({ context, page }) => {
    await configureBrowser(context, page, {
      artifactState: 'pending',
      persona: 'data_product_manager',
    });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    await expect(page.getByText('Preparing this artifact.')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Download/u })).toHaveCount(0);
  });

  test('available metadata and direct downloads are explicit', async ({ context, page }) => {
    const observed = await configureBrowser(context, page, {
      artifactState: 'ready',
      persona: 'data_product_manager',
    });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    const report = page.getByTestId('closure-artifact-closure_report_xlsx');
    const manifest = page.getByTestId('closure-artifact-closure_issue_manifest');
    await expect(report).toContainText('Human issue report (XLSX)');
    await expect(report).toContainText('scope-closure.xlsx');
    await expect(report).toContainText('application/vnd.openxmlformats');
    await expect(report).toContainText('128 B');
    await expect(report).toContainText('a'.repeat(64));
    await expect(report).toContainText('Available until');
    await expect(manifest).toContainText('Machine result manifest');
    await expect(manifest).toContainText('scope-closure-manifest.json');
    await expect(manifest).toContainText('application/vnd.tiangong.scope-closure-manifest+json');
    await expect(manifest).toContainText('512 B');
    await expect(manifest).toContainText('b'.repeat(64));

    const downloadNames = [
      ['Download issue report', 'scope-closure.xlsx'],
      ['Download machine result manifest', 'scope-closure-manifest.json'],
    ] as const;
    for (const [name, filename] of downloadNames) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name }).click(),
      ]);
      expect(download.suggestedFilename()).toBe(filename);
    }
    expect(observed.bufferedDownloadRequests).toEqual([]);
    expect(
      observed.commandRequests.filter(
        (request) => request.action === 'create_closure_report_download',
      ),
    ).toEqual([
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
  });

  test('expired state has rerun guidance', async ({ context, page }) => {
    await configureBrowser(context, page, {
      artifactState: 'expired',
      persona: 'data_product_manager',
    });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    await expect(page.getByText(localizedExpiryGuidance['en-US'])).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Run check again' })).toHaveCount(2);
  });

  test('unavailable state is explicit', async ({ context, page }) => {
    await configureBrowser(context, page, {
      artifactState: 'deleted',
      persona: 'data_product_manager',
    });
    await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
    await expect(page.getByText('This artifact is unavailable.')).toHaveCount(2);
    await expect(page.getByRole('button', { name: /Download/u })).toHaveCount(0);
  });

  for (const [locale, guidance] of Object.entries(localizedExpiryGuidance)) {
    test(`410 has localized rerun guidance for ${locale}`, async ({ context, page }) => {
      const observed = await configureBrowser(context, page, {
        artifactState: 'ready',
        downloadStatus: 410,
        locale: locale as keyof typeof localizedExpiryGuidance,
        persona: 'data_product_manager',
      });
      await page.goto(`/#/data-processing?closureCheckId=${closureCheckId}`);
      await page.getByTestId('closure-artifact-closure_report_xlsx').getByRole('button').click();
      await expect(page.getByRole('alert').getByText(guidance)).toBeVisible();
      await expect(page.getByTestId('closure-artifact-state-closure_report_xlsx')).toContainText(
        guidance,
      );
      await expect(
        page
          .getByTestId('closure-artifact-closure_report_xlsx')
          .getByRole('button', { name: /Run|重新|Prüfung|Relancer/u }),
      ).toBeVisible();
      expect(observed.bufferedDownloadRequests).toEqual([]);
      expect([...observed.unexpectedOrigins]).toEqual([]);
    });
  }
});
