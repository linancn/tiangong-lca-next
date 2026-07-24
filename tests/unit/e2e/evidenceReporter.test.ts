import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { REPOSITORY_ROOT } from '../../e2e/i18n/contracts';
import I18nEvidenceReporter, {
  hasCompleteScenarioCoverage,
  hasExactBackendTargetClosure,
  hasExactProductionDataClosure,
  isIgnoredSemanticEvidenceDirectory,
  readManifestCandidateIdentity,
  routeCoverageContractDigest,
  semanticEvidenceSourcePaths,
  summarizeScenarioCoverage,
  verifiedTargetBrowserContextOptions,
} from '../../e2e/i18n/evidence-reporter';

jest.mock('@playwright/test', () => ({
  chromium: { launch: jest.fn() },
  expect: jest.fn(),
}));

type ReporterRuns = Map<
  string,
  Array<{
    annotation: EvidenceRecord;
    browser: string;
    status: string;
  }>
>;

type EvidenceRecord = {
  assertionId: string;
  locales: readonly string[];
  proofScope: string;
  route: string;
  scenario: string;
  viewState: string;
};

describe('i18n evidence reporter', () => {
  it('renders checked-in evidence in the repository canonical format', () => {
    const reporterSource = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/evidence-reporter.ts'),
      'utf8',
    );
    expect(reporterSource).toContain('prettier.format(JSON.stringify(value, null, 2)');
    expect(reporterSource).toContain(
      'await formatCanonicalEvidenceJson(E2E_EVIDENCE_PATH, evidence)',
    );
    expect(
      execFileSync(
        process.execPath,
        ['--import', 'tsx', 'scripts/i18n/check-semantic-evidence-format.mjs'],
        {
          cwd: REPOSITORY_ROOT,
          encoding: 'utf8',
        },
      ),
    ).toBe('Semantic E2E evidence is canonical.\n');
  });

  it('reads exact candidate identity from the host manifest when container Git is absent', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'e2e-evidence-manifest-'));
    const manifestPath = path.join(directory, 'candidate-manifest.json');
    const identity = {
      configTreeDigest: 'a'.repeat(64),
      observedHeadCommit: 'b'.repeat(40),
      packageManifestDigest: 'c'.repeat(64),
      sourceTreeDigest: 'd'.repeat(64),
      unitTestTreeDigest: 'e'.repeat(64),
    };
    writeFileSync(
      manifestPath,
      `${JSON.stringify({
        candidate: { evidenceIdentity: identity },
        kind: 'tiangong-next-release-e2e-candidate',
        schemaVersion: 3,
      })}\n`,
    );
    const originalManifestPath = process.env.E2E_CANDIDATE_MANIFEST_PATH;
    process.env.E2E_CANDIDATE_MANIFEST_PATH = manifestPath;
    try {
      expect(readManifestCandidateIdentity()).toEqual(identity);
    } finally {
      if (originalManifestPath === undefined) delete process.env.E2E_CANDIDATE_MANIFEST_PATH;
      else process.env.E2E_CANDIDATE_MANIFEST_PATH = originalManifestPath;
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it('invalidates old evidence when any executable target, view marker, or registry changes', () => {
    const coverage = JSON.parse(
      readFileSync(path.join(REPOSITORY_ROOT, 'docs/plans/i18n/route-view-coverage.json'), 'utf8'),
    );
    const digestInput = (value: typeof coverage) => ({
      ...value,
      assertionSemantics: value.proofPolicy.assertionSemantics,
      evidenceContract: value.proofPolicy.evidenceContract,
    });
    const cloneCoverage = () => JSON.parse(JSON.stringify(coverage));
    const originalDigest = routeCoverageContractDigest(digestInput(coverage));

    const targetMutation = cloneCoverage();
    const firstTarget = Object.values(targetMutation.executableTargets)[0] as any;
    firstTarget.expected.hashPath = '/codex-mutated-target';
    expect(routeCoverageContractDigest(digestInput(targetMutation))).not.toBe(originalDigest);

    const visibleMarkerMutation = cloneCoverage();
    visibleMarkerMutation.executableViewVariants[0].target.visibleMessageIds[0] =
      'codex.mutated.visible.marker';
    expect(routeCoverageContractDigest(digestInput(visibleMarkerMutation))).not.toBe(
      originalDigest,
    );

    const registryMutation = cloneCoverage();
    registryMutation.viewStateRegistry.usages[0].variantIds = ['codex-mutated-variant'];
    expect(routeCoverageContractDigest(digestInput(registryMutation))).not.toBe(originalDigest);
  });

  it('records every runtime evidence annotation when the test case has no static annotations', () => {
    const reporter = new I18nEvidenceReporter();
    const annotations: EvidenceRecord[] = [
      {
        assertionId: 'route-one',
        locales: ['en-US', 'zh-CN', 'de-DE', 'fr-FR'],
        proofScope: 'localized-view',
        route: '/one',
        scenario: 'route',
        viewState: 'first view',
      },
      {
        assertionId: 'route-two',
        locales: ['en-US', 'zh-CN', 'de-DE', 'fr-FR'],
        proofScope: 'localized-view',
        route: '/two',
        scenario: 'modal-state-machine',
        viewState: 'second view',
      },
    ];
    const test = {
      annotations: [],
      parent: {
        project: () => ({ name: 'chromium' }),
      },
    };
    const result = {
      annotations: annotations.map((annotation) => ({
        description: JSON.stringify(annotation),
        type: 'i18n-evidence',
      })),
      status: 'passed',
    };

    reporter.onTestEnd(test as never, result as never);

    const runs = (reporter as unknown as { runs: ReporterRuns }).runs;
    expect([...runs.keys()]).toEqual(['route-one', 'route-two']);
    expect(runs.get('route-one')).toEqual([
      { annotation: annotations[0], browser: 'chromium', status: 'passed' },
    ]);
    expect(runs.get('route-two')).toEqual([
      { annotation: annotations[1], browser: 'chromium', status: 'passed' },
    ]);
  });

  it('requires exact scenario names, every registry locale, and Chromium per scenario', () => {
    const annotation = (scenario: string, locales: readonly string[]): EvidenceRecord => ({
      assertionId: 'route-one',
      locales,
      proofScope: 'internal-localization',
      route: '/one',
      scenario,
      viewState: 'first view',
    });
    const allLocales = ['zh-CN', 'en-US', 'de-DE', 'fr-FR'] as const;
    const completeRuns = [
      {
        annotation: annotation('route', allLocales),
        browser: 'chromium',
        status: 'passed',
      },
      {
        annotation: annotation('modal-state-machine', allLocales),
        browser: 'chromium',
        status: 'passed',
      },
    ] as any;
    const completeCoverage = summarizeScenarioCoverage(completeRuns);
    expect(hasCompleteScenarioCoverage(['route', 'modal-state-machine'], completeCoverage)).toBe(
      true,
    );
    expect(hasCompleteScenarioCoverage(['route'], completeCoverage)).toBe(false);

    const partialLocaleCoverage = summarizeScenarioCoverage([
      {
        annotation: annotation('route', ['de-DE', 'fr-FR']),
        browser: 'chromium',
        status: 'passed',
      },
    ] as any);
    expect(hasCompleteScenarioCoverage(['route'], partialLocaleCoverage)).toBe(false);

    const wrongBrowserCoverage = summarizeScenarioCoverage([
      {
        annotation: annotation('route', allLocales),
        browser: 'firefox',
        status: 'passed',
      },
    ] as any);
    expect(hasCompleteScenarioCoverage(['route'], wrongBrowserCoverage)).toBe(false);
  });

  it('accepts exactly one created and cleaned production fixture', () => {
    expect(hasExactProductionDataClosure({ created: 1, cleaned: 1, leaked: 0 })).toBe(true);
    expect(hasExactProductionDataClosure({ created: 2, cleaned: 2, leaked: 0 })).toBe(false);
    expect(hasExactProductionDataClosure({ created: 1, cleaned: 0, leaked: 1 })).toBe(false);
  });

  it('requires every stable context observation to use one exact backend origin and key', () => {
    const expected = {
      origin: 'https://tracked.supabase.co',
      publishableKey: 'tracked-public-key',
    };
    expect(hasExactBackendTargetClosure([expected, expected], expected)).toBe(true);
    expect(hasExactBackendTargetClosure([], expected)).toBe(false);
    expect(
      hasExactBackendTargetClosure(
        [expected, { ...expected, origin: 'https://other.supabase.co' }],
        expected,
      ),
    ).toBe(false);
    expect(
      hasExactBackendTargetClosure(
        [expected, { ...expected, publishableKey: 'other-public-key' }],
        expected,
      ),
    ).toBe(false);
    expect(hasExactBackendTargetClosure([{ ...expected, publishableKey: '' }], expected)).toBe(
      false,
    );
  });

  it('probes the full authenticated context through a stable observation window', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/evidence-reporter.ts'),
      'utf8',
    );
    expect(source).toContain("context.on('request'");
    expect(source).toContain('await signInViaUi(page)');
    expect(source).toContain('browser.newContext(verifiedTargetBrowserContextOptions(baseURL))');
    expect(source).toContain('await waitForBackendObservationStability(');
    expect(source).toContain('hasExactBackendTargetClosure(observations, trackedBackend)');
    expect(source).not.toContain("page.on('request'");
    expect(source).not.toContain('waitForTimeout(250)');
  });

  it('binds the independent target probe to the candidate base URL', () => {
    expect(verifiedTargetBrowserContextOptions('http://127.0.0.1:8000')).toEqual({
      baseURL: 'http://127.0.0.1:8000',
      locale: 'en-US',
      serviceWorkers: 'block',
    });
  });

  it('derives semantic source digests from the route contract without duplicate paths', () => {
    const coverage = JSON.parse(
      readFileSync(path.join(REPOSITORY_ROOT, 'docs/plans/i18n/route-view-coverage.json'), 'utf8'),
    );
    const copySources = [...coverage.routeFamilies, ...coverage.rows].flatMap(
      ({ copySources: sources }: any) => sources?.sourcePaths ?? [],
    );
    const paths = semanticEvidenceSourcePaths(
      copySources,
      coverage.proofPolicy.evidenceContract.digestPolicy.criticalSourcePaths,
    );
    expect(paths).toEqual([...new Set(paths)].sort());
    expect(paths).toEqual(
      expect.arrayContaining([
        'public/privacy_notice.html',
        'public/terms_of_use.html',
        'src/components/LocationTextItem/description.tsx',
        'src/components/RightContent/index.tsx',
        'src/services/general/contentLanguageRegistry.ts',
        'src/services/general/localeRegistry.ts',
        'src/services/general/routeViewState.ts',
        'src/services/general/routeViewStateRegistry.json',
      ]),
    );
  });

  it('keeps runtime output directories outside semantic evidence test inputs', () => {
    expect(
      ['.auth', 'playwright-report', 'runtime', 'test-results'].every((directory) =>
        isIgnoredSemanticEvidenceDirectory(directory),
      ),
    ).toBe(true);
    expect(isIgnoredSemanticEvidenceDirectory('i18n')).toBe(false);
  });

  it('binds the external credential-selection helpers used by the semantic E2E login', () => {
    const reporterSource = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/evidence-reporter.ts'),
      'utf8',
    );
    expect(reporterSource).toContain("'tests/data-workflows/data-workflow-paths.ts'");
    expect(reporterSource).toContain("'tests/data-workflows/workflows/workflow-shared.ts'");
  });

  it('captures final evidence inputs after the target probe and reuses that snapshot', () => {
    const source = readFileSync(
      path.join(REPOSITORY_ROOT, 'tests/e2e/i18n/evidence-reporter.ts'),
      'utf8',
    );
    const targetProbeIndex = source.indexOf('const targetProbe = await this.targetProbe');
    const finalCaptureIndex = source.indexOf(
      'const finalExecutionInputs = captureExecutionInputs(this.playwrightTestRoot)',
    );
    expect(targetProbeIndex).toBeGreaterThan(-1);
    expect(finalCaptureIndex).toBeGreaterThan(targetProbeIndex);
    expect(source).toContain('packageLock: finalExecutionInputs.packageLock');
    expect(source).toContain('runtimeAssets: finalExecutionInputs.runtimeAssets');
    expect(source).toContain('tests: finalExecutionInputs.tests');
    expect(source).toContain('sources: finalExecutionInputs.sources');
    expect(source).toContain('captureExecutionInputs(config.rootDir)');
    expect(source).toContain('semanticE2ERoot !== path.resolve(playwrightTestRoot)');
  });
});
