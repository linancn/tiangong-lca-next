import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

import { signInViaUi } from './auth';
import {
  APP_LOCALES,
  E2E_EVIDENCE_PATH,
  flattenExecutableRouteAssertions,
  PLAYWRIGHT_BROWSER_PROJECTS,
  PRODUCTION_DATA_MARKER_PREFIX,
  REPOSITORY_ROOT,
  ROUTE_COVERAGE_PATH,
  sha256,
  type EvidenceAnnotation,
} from './contracts';
import { installVerifiedProductionReadOnlyGuard } from './production-backend-target';
import { readProductionDataResult } from './production-data-ledger';
import { assertNoBlockedProductionRequests } from './production-request-guard';

export type AssertionRun = {
  annotation: EvidenceAnnotation;
  browser: string;
  status: TestResult['status'];
};

export type ScenarioCoverage = {
  scenario: string;
  locales: readonly string[];
  browsers: readonly string[];
};

type RouteCoverageDigestInput = {
  assertionSemantics?: unknown;
  evidenceContract?: unknown;
  executableTargets: Record<string, unknown>;
  executableViewVariants: unknown;
  policy: unknown;
  routeFamilies: unknown;
  rows: unknown;
  schemaVersion: string;
  sourceRouteConfig: string;
  supportedLocales: string[];
  viewStateRegistry: unknown;
};

export function summarizeScenarioCoverage(runs: readonly AssertionRun[]): ScenarioCoverage[] {
  const scenarios = [...new Set(runs.map(({ annotation }) => annotation.scenario))].sort();
  return scenarios.map((scenario) => {
    const scenarioRuns = runs.filter(({ annotation }) => annotation.scenario === scenario);
    const localeSet = new Set(scenarioRuns.flatMap(({ annotation }) => [...annotation.locales]));
    const browserSet = new Set(scenarioRuns.map(({ browser }) => browser));
    return {
      scenario,
      locales: APP_LOCALES.filter((locale) => localeSet.has(locale)),
      browsers: PLAYWRIGHT_BROWSER_PROJECTS.filter((browser) => browserSet.has(browser)),
    };
  });
}

export function hasCompleteScenarioCoverage(
  requiredScenarios: readonly string[],
  scenarioCoverage: readonly ScenarioCoverage[],
): boolean {
  return (
    JSON.stringify(scenarioCoverage.map(({ scenario }) => scenario)) ===
      JSON.stringify([...requiredScenarios].sort()) &&
    scenarioCoverage.every(
      (coverageEntry) =>
        JSON.stringify(coverageEntry.locales) === JSON.stringify(APP_LOCALES) &&
        coverageEntry.browsers.includes(PLAYWRIGHT_BROWSER_PROJECTS[0]),
    )
  );
}

export function hasExactProductionDataClosure(
  productionData: { cleaned: number; created: number; leaked: number },
  exactCreated = 1,
): boolean {
  return (
    productionData.created === exactCreated &&
    productionData.cleaned === exactCreated &&
    productionData.leaked === 0
  );
}

export type BackendTargetObservation = {
  origin: string;
  publishableKey: string;
};

export function hasExactBackendTargetClosure(
  observations: readonly BackendTargetObservation[],
  expected: BackendTargetObservation,
): boolean {
  if (observations.length === 0 || !expected.origin || !expected.publishableKey) {
    return false;
  }
  const observedOrigins = new Set(observations.map(({ origin }) => origin));
  const observedPublishableKeys = new Set(observations.map(({ publishableKey }) => publishableKey));
  return (
    observedOrigins.size === 1 &&
    observedPublishableKeys.size === 1 &&
    observedOrigins.has(expected.origin) &&
    observedPublishableKeys.has(expected.publishableKey) &&
    observations.every(
      ({ origin, publishableKey }) =>
        origin === expected.origin && publishableKey === expected.publishableKey,
    )
  );
}

type CandidateIdentity = {
  configTreeDigest: string;
  observedHeadCommit: string;
  packageManifestDigest: string;
  sourceTreeDigest: string;
  unitTestTreeDigest: string;
};

type TargetProof = {
  backendObservedOriginSha256: string;
  backendObservedPublishableKeySha256: string;
  backendTrackedOriginSha256: string;
  backendTrackedPublishableKeySha256: string;
  candidateEnvironmentSha256: string;
  frontendOriginSha256: string;
  freshPlaywrightServer: true;
  observer: 'chromium-auth-request';
  trackedMainEnvironmentSha256: string;
};

type TargetProbeResult = { ok: true; proof: TargetProof } | { ok: false; reason: string };

const VERIFIED_EVIDENCE_OPT_IN = 'E2E_WRITE_VERIFIED_EVIDENCE';
const BACKEND_API_PATH = /^\/(?:auth|functions|realtime|rest|storage)\/v1(?:\/|$)/u;
const RUNTIME_ASSET_MANIFESTS = [
  'src/services/referenceResources/generatedManifest.ts',
  'src/services/referenceResources/manifest.ts',
  'src/services/referenceResources/reference-resource-manifest.json',
] as const;
const CRITICAL_SOURCE_PATHS = [
  'src/components/LocationTextItem/description.tsx',
  'src/components/RightContent/index.tsx',
] as const;
const CRITICAL_TEST_PATHS = [
  'docs/plans/i18n/semantic-e2e-evidence.schema.json',
  'scripts/i18n/locale-delivery.mjs',
  'tests/unit/components/LocationTextItemDescription.test.tsx',
  'tests/unit/components/RightContent.test.tsx',
  'tests/unit/e2e/evidenceReporter.test.ts',
  'tests/unit/e2e/productionDataLedger.test.ts',
  'tests/unit/e2e/productionRequestGuard.test.ts',
  'tests/unit/services/general/routeViewStateRegistry.test.ts',
] as const;

function listFiles(
  directory: string,
  include: (absolutePath: string) => boolean = () => true,
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(entryPath, include);
    }
    return entry.isFile() && include(entryPath) ? [entryPath] : [];
  });
}

function listEvidenceFiles(directory: string): string[] {
  return listFiles(directory);
}

function digestFiles(paths: readonly string[]) {
  return [...new Set(paths)].sort().map((relativePath) => {
    const absolutePath = path.join(REPOSITORY_ROOT, relativePath);
    if (!statSync(absolutePath).isFile()) {
      throw new Error(`Evidence digest path is not a file: ${relativePath}`);
    }
    return {
      path: relativePath,
      sha256: sha256(readFileSync(absolutePath)),
    };
  });
}

function digestTree(relativeDirectory: string): string {
  const entries = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '--', relativeDirectory],
    { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .filter((relativePath) => {
      try {
        return statSync(path.join(REPOSITORY_ROOT, relativePath)).isFile();
      } catch {
        return false;
      }
    })
    .sort()
    .map((relativePath) => ({
      path: relativePath,
      sha256: sha256(readFileSync(path.join(REPOSITORY_ROOT, relativePath))),
    }));
  if (entries.length === 0) {
    throw new Error(`Candidate snapshot directory is empty: ${relativeDirectory}`);
  }
  return sha256(`${JSON.stringify(entries)}\n`);
}

function readCandidateIdentity(): CandidateIdentity {
  const observedHeadCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  }).trim();
  if (!/^[0-9a-f]{40}$/u.test(observedHeadCommit)) {
    throw new Error('Candidate HEAD is not a full Git commit identity.');
  }
  return {
    configTreeDigest: digestTree('config'),
    observedHeadCommit,
    packageManifestDigest: sha256(readFileSync(path.join(REPOSITORY_ROOT, 'package.json'))),
    sourceTreeDigest: digestTree('src'),
    unitTestTreeDigest: digestTree('tests/unit'),
  };
}

function runtimeAssetPaths(): string[] {
  const gzipAssets = ['public/classifications', 'public/locations'].flatMap((relativeDirectory) =>
    listFiles(path.join(REPOSITORY_ROOT, relativeDirectory), (absolutePath) =>
      absolutePath.endsWith('.gz'),
    ).map((absolutePath) => path.relative(REPOSITORY_ROOT, absolutePath).split(path.sep).join('/')),
  );
  return [...RUNTIME_ASSET_MANIFESTS, ...gzipAssets].sort();
}

function executionInputDigest(): string {
  const e2eTestPaths = listEvidenceFiles(path.join(REPOSITORY_ROOT, 'tests/e2e/i18n')).map(
    (absolutePath) => path.relative(REPOSITORY_ROOT, absolutePath).split(path.sep).join('/'),
  );
  return sha256(
    `${JSON.stringify(
      digestFiles([
        ...e2eTestPaths,
        ...CRITICAL_TEST_PATHS,
        ...runtimeAssetPaths(),
        'docs/plans/i18n/route-view-coverage.json',
        'package-lock.json',
        'playwright.config.ts',
      ]),
    )}\n`,
  );
}

async function waitForBackendObservationStability(
  observations: readonly BackendTargetObservation[],
  pendingObservations: ReadonlySet<Promise<void>>,
): Promise<void> {
  const timeoutMs = 30_000;
  const quietPeriodMs = 2_000;
  const pollIntervalMs = 100;
  const deadline = Date.now() + timeoutMs;
  let previousCount = -1;
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    await Promise.all([...pendingObservations]);
    const currentCount = observations.length;
    if (currentCount === 0 || currentCount !== previousCount) {
      previousCount = currentCount;
      stableSince = Date.now();
    } else if (pendingObservations.size === 0 && Date.now() - stableSince >= quietPeriodMs) {
      return;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, pollIntervalMs);
    });
  }
  throw new Error('backend request observation did not reach a stable authenticated state');
}

async function probeBrowserTarget(baseURL: string): Promise<TargetProbeResult> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    if (
      process.env.E2E_AUTHENTICATED !== 'true' ||
      process.env.E2E_ALLOW_PRODUCTION_DATA !== 'true' ||
      process.env.E2E_BACKEND_TARGET !== 'production'
    ) {
      return { ok: false, reason: 'verified target flags are incomplete' };
    }

    const frontendOrigin = new URL(baseURL).origin;
    browser = await chromium.launch();
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block' });
    const { backendTarget: trackedBackend, guard: productionRequestGuard } =
      await installVerifiedProductionReadOnlyGuard(context);
    const runtimeBackendUrl = process.env.SUPABASE_URL?.trim();
    const runtimePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
    if (
      (runtimeBackendUrl && new URL(runtimeBackendUrl).origin !== trackedBackend.origin) ||
      (runtimePublishableKey && runtimePublishableKey !== trackedBackend.publishableKey)
    ) {
      return { ok: false, reason: 'runtime backend differs from tracked production' };
    }

    const page = await context.newPage();
    const observations: BackendTargetObservation[] = [];
    const pendingObservations = new Set<Promise<void>>();
    context.on('request', (request) => {
      try {
        const requestUrl = new URL(request.url());
        if (!BACKEND_API_PATH.test(requestUrl.pathname)) {
          return;
        }
        const pendingObservation = request
          .allHeaders()
          .then((headers) => {
            observations.push({
              origin: requestUrl.origin,
              publishableKey: headers.apikey ?? '',
            });
          })
          .catch(() => {
            observations.push({ origin: requestUrl.origin, publishableKey: '' });
          });
        pendingObservations.add(pendingObservation);
        void pendingObservation.finally(() => pendingObservations.delete(pendingObservation));
      } catch {
        // Browser-internal URLs do not participate in backend target proof.
      }
    });

    await signInViaUi(page);
    await waitForBackendObservationStability(observations, pendingObservations);
    assertNoBlockedProductionRequests(productionRequestGuard);
    if (!hasExactBackendTargetClosure(observations, trackedBackend)) {
      return { ok: false, reason: 'browser backend differs from tracked production' };
    }
    const observedTarget = observations[0];
    await context.close();
    return {
      ok: true,
      proof: {
        backendObservedOriginSha256: sha256(observedTarget.origin),
        backendObservedPublishableKeySha256: sha256(observedTarget.publishableKey),
        backendTrackedOriginSha256: trackedBackend.originSha256,
        backendTrackedPublishableKeySha256: trackedBackend.publishableKeySha256,
        candidateEnvironmentSha256: trackedBackend.candidateEnvironmentSha256,
        frontendOriginSha256: sha256(frontendOrigin),
        freshPlaywrightServer: true,
        observer: 'chromium-auth-request',
        trackedMainEnvironmentSha256: trackedBackend.trackedMainEnvironmentSha256,
      },
    };
  } catch {
    return { ok: false, reason: 'browser target probe failed' };
  } finally {
    await browser?.close();
  }
}

function parseEvidenceAnnotations(
  annotations: readonly { description?: string; type: string }[],
): EvidenceAnnotation[] {
  return annotations
    .filter(({ description, type }) => type === 'i18n-evidence' && Boolean(description))
    .map(({ description }) => JSON.parse(description!) as EvidenceAnnotation);
}

function stableKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableKeys);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableKeys(child)]),
  );
}

export function routeCoverageContractProjection(
  coverage: RouteCoverageDigestInput,
): Record<string, unknown> {
  return {
    schemaVersion: coverage.schemaVersion,
    supportedLocales: coverage.supportedLocales,
    sourceRouteConfig: coverage.sourceRouteConfig,
    policy: coverage.policy,
    executableTargets: coverage.executableTargets,
    executableViewVariants: coverage.executableViewVariants,
    viewStateRegistry: coverage.viewStateRegistry,
    assertionSemantics: coverage.assertionSemantics,
    evidenceContract: coverage.evidenceContract,
    routeFamilies: coverage.routeFamilies,
    rows: coverage.rows,
  };
}

export function routeCoverageContractDigest(coverage: RouteCoverageDigestInput): string {
  return sha256(`${JSON.stringify(stableKeys(routeCoverageContractProjection(coverage)))}\n`);
}

export default class I18nEvidenceReporter implements Reporter {
  private finalStatus: FullResult['status'] = 'failed';
  private initialCandidate?: CandidateIdentity;
  private initialExecutionInputDigest?: string;
  private readonly runs = new Map<string, AssertionRun[]>();
  private targetProbe?: Promise<TargetProbeResult>;

  onBegin(config: FullConfig): void {
    if (process.env[VERIFIED_EVIDENCE_OPT_IN] !== 'true') {
      return;
    }
    const baseURL = config.projects[0]?.use.baseURL;
    if (typeof baseURL !== 'string') {
      this.targetProbe = Promise.resolve({
        ok: false,
        reason: 'candidate frontend base URL is unavailable',
      });
      return;
    }
    try {
      this.initialCandidate = readCandidateIdentity();
      this.initialExecutionInputDigest = executionInputDigest();
      this.targetProbe = probeBrowserTarget(baseURL);
    } catch {
      this.targetProbe = Promise.resolve({
        ok: false,
        reason: 'candidate identity could not be captured',
      });
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const browser = test.parent.project()?.name ?? 'unknown';
    for (const annotation of parseEvidenceAnnotations(result.annotations)) {
      const assertionRuns = this.runs.get(annotation.assertionId) ?? [];
      assertionRuns.push({ annotation, browser, status: result.status });
      this.runs.set(annotation.assertionId, assertionRuns);
    }
  }

  onEnd(result: FullResult): void {
    this.finalStatus = result.status;
  }

  async onExit(): Promise<void> {
    if (process.env[VERIFIED_EVIDENCE_OPT_IN] !== 'true') {
      return;
    }
    if (!this.initialCandidate || !this.initialExecutionInputDigest || !this.targetProbe) {
      throw new Error('Verified i18n evidence requires a captured candidate and target probe.');
    }
    const finalCandidate = readCandidateIdentity();
    if (JSON.stringify(finalCandidate) !== JSON.stringify(this.initialCandidate)) {
      throw new Error('Candidate source or unit-test snapshot changed during the evidence run.');
    }
    if (executionInputDigest() !== this.initialExecutionInputDigest) {
      throw new Error('Evidence tests, lock, contract, or runtime assets changed during the run.');
    }
    const targetProbe = await this.targetProbe;
    if (!targetProbe.ok) {
      throw new Error(`Verified i18n evidence target proof failed: ${targetProbe.reason}.`);
    }

    const coverage = JSON.parse(
      readFileSync(path.join(REPOSITORY_ROOT, ROUTE_COVERAGE_PATH), 'utf8'),
    ) as {
      schemaVersion: string;
      supportedLocales: string[];
      sourceRouteConfig: string;
      policy: unknown;
      executableTargets: Record<string, unknown>;
      executableViewVariants: unknown;
      viewStateRegistry: unknown;
      proofPolicy: {
        assertionSemantics: unknown;
        evidenceContract: {
          browserCoverage: { criticalAssertionIds: string[] };
          productionData: { exactCreated: number };
        };
      };
      routeFamilies: Array<{
        copySources?: { sourcePaths?: string[] };
        proof?: { focusedTests?: string[] };
      }>;
      rows: Array<{
        copySources?: { sourcePaths?: string[] };
        proof?: { focusedTests?: string[] };
      }>;
    };
    const criticalAssertionIds = new Set(
      coverage.proofPolicy.evidenceContract.browserCoverage.criticalAssertionIds,
    );
    const expectedAssertions = flattenExecutableRouteAssertions();
    const expectedIds = new Set(expectedAssertions.map(({ assertionId }) => assertionId));
    const unexpectedIds = [...this.runs.keys()].filter(
      (assertionId) => !expectedIds.has(assertionId),
    );
    if (unexpectedIds.length > 0) {
      throw new Error(`Unexpected i18n evidence assertion IDs: ${unexpectedIds.join(', ')}`);
    }

    const assertions = expectedAssertions.map((expected) => {
      const runs = this.runs.get(expected.assertionId) ?? [];
      const passedRuns = runs.filter(({ status }) => status === 'passed');
      const failedRuns = runs.filter(({ status }) => !['passed', 'skipped'].includes(status));
      const annotationMismatch = runs.some(({ annotation }) => {
        const canonicalLocales = APP_LOCALES.filter((locale) =>
          annotation.locales.includes(locale),
        );
        return (
          annotation.route !== expected.route ||
          annotation.viewState !== expected.viewState ||
          annotation.proofScope !== expected.proofScope ||
          annotation.locales.length === 0 ||
          JSON.stringify(annotation.locales) !== JSON.stringify(canonicalLocales)
        );
      });
      const scenarioCoverage = summarizeScenarioCoverage(passedRuns);
      const scenarios = scenarioCoverage.map(({ scenario }) => scenario);
      const observedBrowserSet = new Set(passedRuns.map(({ browser }) => browser));
      const browsers = PLAYWRIGHT_BROWSER_PROJECTS.filter((browser) =>
        observedBrowserSet.has(browser),
      );
      const requiredBrowsers = criticalAssertionIds.has(expected.assertionId)
        ? PLAYWRIGHT_BROWSER_PROJECTS
        : [PLAYWRIGHT_BROWSER_PROJECTS[0]];
      const requiredScenarios = [...expected.requiredScenarios].sort();
      const passed =
        passedRuns.length > 0 &&
        failedRuns.length === 0 &&
        !annotationMismatch &&
        hasCompleteScenarioCoverage(requiredScenarios, scenarioCoverage) &&
        requiredBrowsers.every((browser) => browsers.includes(browser));
      return {
        assertionId: expected.assertionId,
        route: expected.route,
        viewState: expected.viewState,
        result: passed ? 'passed' : 'failed',
        proofScope: expected.proofScope,
        locales: APP_LOCALES,
        browsers,
        scenarios,
        scenarioCoverage,
      };
    });
    const focusedTests = [...coverage.routeFamilies, ...coverage.rows].flatMap(
      ({ proof }) => proof?.focusedTests ?? [],
    );
    const copySources = [...coverage.routeFamilies, ...coverage.rows].flatMap(
      ({ copySources: sources }) => sources?.sourcePaths ?? [],
    );
    const e2eTestPaths = listEvidenceFiles(path.join(REPOSITORY_ROOT, 'tests/e2e/i18n')).map(
      (absolutePath) => path.relative(REPOSITORY_ROOT, absolutePath).split(path.sep).join('/'),
    );
    const productionData = await readProductionDataResult();
    const productionDataPassed =
      process.env.E2E_ALLOW_PRODUCTION_DATA === 'true' &&
      hasExactProductionDataClosure(
        productionData,
        coverage.proofPolicy.evidenceContract.productionData.exactCreated,
      );
    const assertionClosurePassed = assertions.every(({ result }) => result === 'passed');
    const observedBrowserSet = new Set(assertions.flatMap(({ browsers }) => browsers));
    const observedBrowsers = PLAYWRIGHT_BROWSER_PROJECTS.filter((browser) =>
      observedBrowserSet.has(browser),
    );
    const verified =
      this.finalStatus === 'passed' && assertionClosurePassed && productionDataPassed;
    if (!verified) {
      throw new Error(
        'Verified i18n evidence was not written because execution, assertion closure, or cleanup failed.',
      );
    }
    const routeCoverageDigestInput = {
      ...coverage,
      assertionSemantics: coverage.proofPolicy.assertionSemantics,
      evidenceContract: coverage.proofPolicy.evidenceContract,
    };

    const evidence = {
      schemaVersion: 'tiangong.i18n-semantic-e2e-evidence.v1',
      status: 'verified',
      generatedAt: new Date().toISOString(),
      runId: process.env.GITHUB_RUN_ID
        ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`
        : `local-${randomUUID()}`,
      candidate: finalCandidate,
      target: {
        frontend: 'candidate-local',
        backend: 'production',
        proof: targetProbe.proof,
      },
      locales: APP_LOCALES,
      browsers: observedBrowsers,
      routeCoverage: {
        path: ROUTE_COVERAGE_PATH,
        contractDigest: routeCoverageContractDigest(routeCoverageDigestInput),
      },
      digests: {
        packageLock: digestFiles(['package-lock.json'])[0],
        runtimeAssets: digestFiles(runtimeAssetPaths()),
        tests: digestFiles([
          ...focusedTests,
          ...e2eTestPaths,
          ...CRITICAL_TEST_PATHS,
          'playwright.config.ts',
        ]),
        sources: digestFiles([
          ...copySources,
          ...CRITICAL_SOURCE_PATHS,
          'src/services/general/contentLanguageRegistry.ts',
          'src/services/general/localeRegistry.ts',
        ]),
      },
      assertions,
      productionData: {
        markerPrefix: PRODUCTION_DATA_MARKER_PREFIX,
        created: productionData.created,
        cleaned: productionData.cleaned,
        leaked: productionData.leaked,
      },
    };

    await mkdir(path.dirname(E2E_EVIDENCE_PATH), { recursive: true });
    await writeFile(E2E_EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  }
}
