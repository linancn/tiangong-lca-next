import { LOCALE_CAPABILITY_MATRIX } from '@/services/general/localeCapabilities';
import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import { REFERENCE_RESOURCE_MANIFEST } from '@/services/referenceResources/manifest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const DELIVERY_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/locale-delivery.mjs');

const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, relativePath), 'utf8'));

describe('shared locale delivery contracts', () => {
  it('covers every registry locale and mandatory route view without granting anonymous access', () => {
    const coverage = readJson('docs/plans/i18n/route-view-coverage.json');
    expect(coverage.supportedLocales).toEqual(SUPPORTED_APP_LOCALES);

    expect(coverage.schemaVersion).toBe('tiangong.i18n-route-view-coverage.v3');
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
          accessContext,
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
          Boolean(accessContext) &&
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

  it.each(SUPPORTED_APP_LOCALES)(
    '%s has complete generated dossiers, derived route evidence, and digest-bound structural validation',
    (locale) => {
      const context = readJson(`docs/plans/i18n-${locale}/context-manifest.json`);
      const structuralValidation = readJson(`docs/plans/i18n-${locale}/structural-validation.json`);
      const quality = readJson(`docs/plans/i18n-${locale}/quality-manifest.json`);
      const activation = readJson(`docs/plans/i18n-${locale}/locale-activation-manifest.json`);

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
      expect(context.routeViewCoverage.requiredRouteViews).toEqual([
        '/',
        '/welcome',
        '/welcome?view=carbon-footprint',
      ]);
      expect(context.routeViewCoverage.derivedEvidence.anonymousRoutePolicy).toEqual(
        expect.objectContaining({
          allowedPaths: [
            '/user/login',
            '/user/login/password_forgot',
            '/user/login/password_reset',
          ],
          defaultAccess: 'authenticated-session-required',
          unknownPathAccess: 'authenticated-session-required',
        }),
      );
      expect(quality.automatedChecks).toEqual(
        expect.objectContaining({
          everyMessageDossierComplete: true,
          typedContentTopologyComplete: true,
          allHighRiskMessageStructuresValidated: true,
          semanticRouteAndE2EReady: false,
          semanticRouteAndE2EOwnerIssue: '#635',
          humanTranslationReviewRequired: false,
        }),
      );
      expect(structuralValidation.schemaVersion).toBe('tiangong.i18n-structural-validation.v1');
      expect(structuralValidation.validationLanes).toHaveLength(1);
      expect(
        structuralValidation.validationLanes.every(
          ({ executionEvidence, findings, result }: any) =>
            result === 'passed' &&
            findings.length === 0 &&
            executionEvidence.findingCount === 0 &&
            executionEvidence.executor ===
              'scripts/i18n/locale-delivery.mjs#executeStructuralValidationLane' &&
            Object.values(executionEvidence.checks).every(Boolean),
        ),
      ).toBe(true);
      expect(quality.structuralValidation).toEqual(
        expect.objectContaining({
          validatedMessageCount: 3026,
          validatedModuleCount: 31,
          blockedItems: 0,
          semanticReviewPerformed: false,
        }),
      );
      expect(activation).toEqual(
        expect.objectContaining({
          schemaVersion: 'tiangong.i18n-locale-activation.v2',
          locale,
          checks: expect.objectContaining({
            platformContractValid: true,
            languageHardcodingPassed: true,
            fallbackContractPassed: true,
            referenceResourcesReady: false,
            semanticRouteAndE2EReady: false,
            productionActivationReady: false,
          }),
          referenceResourceBlockers: expect.any(Array),
        }),
      );
      expect(activation.referenceResourceBlockers).toHaveLength(
        REFERENCE_RESOURCE_MANIFEST.filter(({ required }) => required).length,
      );
      expect(
        activation.referenceResourceBlockers.every(({ ownerIssue }: any) => ownerIssue === '#634'),
      ).toBe(true);
      expect(activation.productionActivationBlockers).toHaveLength(
        activation.referenceResourceBlockers.length + 1,
      );
      expect(activation.productionActivationBlockers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            blockerId: 'semantic-route-and-e2e-proof',
            ownerIssue: '#635',
          }),
        ]),
      );
    },
  );

  it.each(SUPPORTED_APP_LOCALES)('%s reconstructs an individual dossier on demand', (locale) => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        DELIVERY_SCRIPT,
        'dossier',
        '--locale',
        locale,
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
      expect.objectContaining(
        Object.fromEntries(
          SUPPORTED_APP_LOCALES.map((supportedLocale) => [supportedLocale, expect.any(String)]),
        ),
      ),
    );
  });

  it('declares independent UI, content, service-query, reference-data, and boundary fallbacks for every registry locale', () => {
    const contract = readJson('docs/plans/i18n/fallback-contract.json');
    const mandatorySurfaces = [
      'ui-locale',
      'documentation',
      'legal',
      'content-language',
      'service-query-language',
      'classification-reference-data',
      'location-reference-data',
      'service-errors',
      'TIDAS-import-report',
      'environment-branding',
    ];

    expect(contract.schemaVersion).toBe('tiangong.i18n-fallback-contract.v3');
    expect(contract.rows).toHaveLength(SUPPORTED_APP_LOCALES.length * mandatorySurfaces.length);

    SUPPORTED_APP_LOCALES.forEach((locale) => {
      const localeRows = contract.rows.filter(
        ({ requestedLocale }: any) => requestedLocale === locale,
      );
      expect(localeRows.map(({ surface }: any) => surface)).toEqual(mandatorySurfaces);

      const capability = LOCALE_CAPABILITY_MATRIX.find(({ appLocale }) => appLocale === locale);
      expect(capability).toBeDefined();

      const uiLocale = localeRows.find(({ surface }: any) => surface === 'ui-locale');
      expect(uiLocale).toEqual(
        expect.objectContaining({
          resolvedLocale: locale,
          capabilityStatus: 'native',
          disclosure: 'none',
        }),
      );

      const contentLanguage = localeRows.find(({ surface }: any) => surface === 'content-language');
      expect(contentLanguage).toEqual(
        expect.objectContaining({
          resolvedLocale: capability?.contentLanguage,
          capabilityStatus: capability?.contentReading,
          disclosure: 'none',
        }),
      );

      const serviceQuery = localeRows.find(
        ({ surface }: any) => surface === 'service-query-language',
      );
      const serviceUsesFallback = capability?.serviceQuery.status === 'declared-fallback';
      expect(serviceQuery).toEqual(
        expect.objectContaining({
          resolvedLocale: capability?.serviceQuery.resolvedLanguage,
          capabilityStatus: capability?.serviceQuery.status,
          usedFallback: serviceUsesFallback,
          disclosure: capability?.serviceQuery.disclosure,
          userDisclosure: capability?.serviceQuery.disclosure === 'user-visible',
        }),
      );

      const assertReferenceSurface = (
        surface: 'classification-reference-data' | 'location-reference-data',
        scope: 'classification' | 'location',
      ) => {
        const referenceRow = localeRows.find(
          ({ surface: rowSurface }: any) => rowSurface === surface,
        );
        const resourceIds = REFERENCE_RESOURCE_MANIFEST.filter(
          ({ scope: resourceScope }) => resourceScope === scope,
        ).map(({ resourceId }) => resourceId);
        const resourceCapabilities = capability?.referenceResources.filter(({ resourceId }) =>
          resourceIds.includes(resourceId),
        );

        expect(resourceCapabilities).not.toHaveLength(0);
        expect(referenceRow).toEqual(
          expect.objectContaining({
            userDisclosure: false,
            resources: resourceCapabilities?.map((resourceCapability) => ({
              resourceId: resourceCapability.resourceId,
              resolvedLocale: resourceCapability.resolvedLanguage ?? null,
              capabilityStatus: resourceCapability.status,
              deliveryStatus: resourceCapability.deliveryStatus ?? null,
              usedFallback: resourceCapability.status === 'development-base',
              disclosure: resourceCapability.status === 'development-base' ? 'diagnostic' : 'none',
              ownerIssue: resourceCapability.ownerIssue ?? null,
            })),
          }),
        );
        expect(referenceRow).not.toHaveProperty('capabilityStatus');
        expect(referenceRow).not.toHaveProperty('deliveryStatus');
      };

      assertReferenceSurface('classification-reference-data', 'classification');
      assertReferenceSurface('location-reference-data', 'location');

      const reportLocale = locale.replace('-', '_');
      const report = localeRows.find(({ surface }: any) => surface === 'TIDAS-import-report');
      expect(report).toEqual(
        expect.objectContaining({
          resolvedLocale: reportLocale,
          urlOrPayload: `human_summary.${reportLocale} and readme_markdown.${reportLocale}`,
        }),
      );
    });
  });

  it.each(SUPPORTED_APP_LOCALES)(
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

  it('fails the explicit production-readiness gate while #634 and #635 blockers remain', () => {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        DELIVERY_SCRIPT,
        'activation',
        '--locale',
        'en-US',
        '--check',
        '--require-production-ready',
      ],
      {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        env: { ...process.env, NODE_NO_WARNINGS: '1' },
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('is not production-ready');
    expect(result.stderr).toContain('#634');
    expect(result.stderr).toContain('#635');
  });

  it('wires the production-readiness command into every production-effective workflow', () => {
    for (const workflow of ['.github/workflows/build.yml', '.github/workflows/ci.yml']) {
      const source = fs.readFileSync(path.join(REPOSITORY_ROOT, workflow), 'utf8');
      expect(source).toContain('npm run i18n:locale:all:production:check');
    }
  });
});
