import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const DELIVERY_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/locale-delivery.mjs');

const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8'));

describe('shared locale delivery contracts', () => {
  it('covers every registry locale and mandatory public/static route view', () => {
    const coverage = readJson('docs/plans/i18n/route-view-coverage.json');
    expect(coverage.supportedLocales).toEqual(SUPPORTED_APP_LOCALES);

    expect(coverage.schemaVersion).toBe('tiangong.i18n-route-view-coverage.v2');
    const routeViews = coverage.rows.map(({ route, viewState }: any) => `${route}::${viewState}`);
    expect(routeViews).toEqual(
      expect.arrayContaining([
        '/::redirect-to-welcome',
        '/welcome::overview',
        '/welcome?view=carbon-footprint::carbon-footprint-guide',
        '/user/login::login-and-register',
        '/user/login/password_forgot::password-forgot',
        '/user/login/password_reset::password-reset',
        '/dashboard/national-carbon::national-carbon-dashboard',
        '/terms_of_use.html::static-legal-English-fallback',
        '/privacy_notice.html::static-legal-English-fallback',
        '*::not-found',
      ]),
    );
    expect(
      coverage.rows.every(
        ({
          blockedContext,
          component,
          copySources,
          proof,
          targetCoverage,
          trigger,
          unownedStaticContent,
          visibleStates,
        }: any) =>
          blockedContext === 0 &&
          unownedStaticContent === 0 &&
          Boolean(component) &&
          Boolean(trigger) &&
          copySources.sourcePaths.length > 0 &&
          visibleStates.length > 0 &&
          Boolean(targetCoverage) &&
          Boolean(proof),
      ),
    ).toBe(true);

    const forgotPassword = coverage.rows.find(
      ({ route }: any) => route === '/user/login/password_forgot',
    );
    const resetPassword = coverage.rows.find(
      ({ route }: any) => route === '/user/login/password_reset',
    );
    expect(forgotPassword.visibleStates).toEqual(
      expect.arrayContaining(['prefill-loading', 'prefill-unavailable-form-fallback']),
    );
    expect(resetPassword.visibleStates).toEqual(
      expect.arrayContaining(['session-loading', 'session-unavailable', 'request-new-link-action']),
    );
  });

  it.each(['de-DE', 'fr-FR'])(
    '%s has complete generated dossiers, derived route evidence, and digest-bound review',
    (locale) => {
      const context = readJson(`docs/plans/i18n-${locale}/context-manifest.json`);
      const quality = readJson(`docs/plans/i18n-${locale}/quality-manifest.json`);

      expect(context.schemaVersion).toBe('tiangong.i18n-locale-context.v2');
      expect(context.messageDossiers).toEqual(
        expect.objectContaining({
          messageCount: 3026,
          completeCount: 3026,
          blockedCount: 0,
          highRiskMessageCount: expect.any(Number),
          highRiskMessageDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      );
      expect(context.typedContentDossiers).toEqual(
        expect.objectContaining({
          registryLocaleCount: SUPPORTED_APP_LOCALES.length,
          targetContentUnitCount: 2,
          blockedContextCount: 0,
        }),
      );
      expect(context.routeViewCoverage.derivedEvidence).toEqual(
        expect.objectContaining({
          configuredRouteCount: expect.any(Number),
          blockedDerivedStateCount: 0,
          unownedVisibleLiteralCount: 0,
        }),
      );
      expect(context.routeViewCoverage.derivedEvidence.publicPolicy.exactPublicPaths).toEqual([
        '/',
        '/welcome',
        '/user/login',
        '/user/login/password_forgot',
        '/user/login/password_reset',
      ]);
      expect(quality.automatedChecks).toEqual(
        expect.objectContaining({
          everyMessageDossierComplete: true,
          typedContentTopologyComplete: true,
          allHighRiskMessagesIndependentlyReviewed: true,
          humanTranslationReviewRequired: false,
        }),
      );
      expect(quality.independentReview).toEqual(
        expect.objectContaining({
          reviewedMessageCount: 3026,
          reviewedModuleCount: 31,
          blockedItems: 0,
          humanTranslationReviewRequired: false,
        }),
      );
    },
  );

  it('reconstructs an individual French dossier on demand', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        DELIVERY_SCRIPT,
        'dossier',
        '--locale',
        'fr-FR',
        '--message',
        'pages.login.passwordReset.sessionUnavailable',
        '--check',
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.dossier).toEqual(
      expect.objectContaining({
        messageId: 'pages.login.passwordReset.sessionUnavailable',
        ownerModule: 'pages',
        canonicalEnglish: 'This password reset link is invalid or has expired. Request a new link.',
        candidateDecision: expect.objectContaining({ risk: 'high' }),
      }),
    );
    expect(output.dossier.translations).toEqual(
      expect.objectContaining({
        'zh-CN': expect.any(String),
        'en-US': expect.any(String),
        'de-DE': expect.any(String),
        'fr-FR': expect.any(String),
      }),
    );
  });

  it('declares docs, legal, data, service, report, and environment fallbacks for every locale', () => {
    const contract = readJson('docs/plans/i18n/fallback-contract.json');
    const mandatorySurfaces = [
      'documentation',
      'legal',
      'dataset-language-parameter',
      'service-errors',
      'TIDAS-import-report',
      'environment-branding',
    ];

    SUPPORTED_APP_LOCALES.forEach((locale) => {
      expect(
        contract.rows
          .filter(({ requestedLocale }: any) => requestedLocale === locale)
          .map(({ surface }: any) => surface),
      ).toEqual(mandatorySurfaces);
    });

    const frenchReport = contract.rows.find(
      ({ requestedLocale, surface }: any) =>
        requestedLocale === 'fr-FR' && surface === 'TIDAS-import-report',
    );
    expect(frenchReport).toEqual(
      expect.objectContaining({
        resolvedLocale: 'fr_FR',
        urlOrPayload: 'human_summary.fr_FR and readme_markdown.fr_FR',
      }),
    );
  });

  it.each(['de-DE', 'fr-FR'])(
    '%s active activation check is CI-safe and confirmation-free',
    (locale) => {
      const result = spawnSync(
        process.execPath,
        ['--import', 'tsx', DELIVERY_SCRIPT, 'activation', '--locale', locale, '--check'],
        {
          cwd: REPOSITORY_ROOT,
          encoding: 'utf8',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
          maxBuffer: 20 * 1024 * 1024,
        },
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual(
        expect.objectContaining({
          action: 'activation',
          locale,
          privateConfirmationDependencies: [],
        }),
      );
      expect(`${result.stdout}\n${result.stderr}`).not.toContain('.local/');
    },
  );
});
