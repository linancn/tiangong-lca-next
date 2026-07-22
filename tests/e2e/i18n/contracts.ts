import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Locator, Page, TestInfo } from '@playwright/test';

import {
  CONTENT_LANGUAGE_REGISTRY,
  type SupportedContentLanguage,
} from '../../../src/services/general/contentLanguageRegistry';
import {
  getLocaleDefinition,
  type SupportedAppLocale,
} from '../../../src/services/general/localeRegistry';
import { UMI_LOCALE_STORAGE_KEY } from '../../../src/services/general/runtimeLocale';
import { E2E_LOCALE_CATALOG_ADAPTER } from './locale-catalog-adapter';

export const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
export const E2E_RUNTIME_DIR = path.join(REPOSITORY_ROOT, 'tests/e2e/runtime');
export const E2E_AUTH_STATE_PATH = path.join(E2E_RUNTIME_DIR, 'auth-state.json');
export const E2E_LEDGER_PATH = path.join(E2E_RUNTIME_DIR, 'production-data-ledger.json');
export const E2E_LEDGER_RESULT_PATH = path.join(E2E_RUNTIME_DIR, 'production-data-result.json');
export const E2E_EVIDENCE_PATH =
  process.env.E2E_EVIDENCE_PATH ??
  path.join(REPOSITORY_ROOT, 'docs/plans/i18n/semantic-e2e-evidence.json');
export const ROUTE_COVERAGE_PATH = 'docs/plans/i18n/route-view-coverage.json';

export const APP_LOCALES: readonly SupportedAppLocale[] = E2E_LOCALE_CATALOG_ADAPTER.locales;
export const AUTHORING_LANGUAGES: readonly SupportedContentLanguage[] =
  CONTENT_LANGUAGE_REGISTRY.filter(({ authoring }) => authoring.enabled).map(
    ({ languageCode }) => languageCode,
  );
export const AUTHORING_LANGUAGE_LABELS: readonly string[] = CONTENT_LANGUAGE_REGISTRY.filter(
  ({ authoring }) => authoring.enabled,
).map(({ nativeLabel }) => nativeLabel);

export const PLAYWRIGHT_BROWSER_PROJECTS = ['chromium', 'firefox', 'webkit'] as const;
export const PRODUCTION_DATA_MARKER_PREFIX = 'codex-e2e';

type CoverageProof = {
  focusedTests?: string[];
  requiredEvidenceScope: string;
};

type CoverageCopySources = {
  sourcePaths?: string[];
};

type CoverageFamily = {
  accessContext: string;
  copySources?: CoverageCopySources;
  executableAssertionIds: Record<string, string>;
  id: string;
  pageOwnedMessageIds?: string[];
  proof: CoverageProof;
  routes: string[];
  viewState: string;
};

type CoverageRow = {
  accessContext: string;
  copySources?: CoverageCopySources;
  executableAssertionId: string;
  pageOwnedMessageIds?: string[];
  proof: CoverageProof;
  route: string;
  viewState: string;
};

export type SpaLocationTarget = {
  hashPath: string;
  hashQuery: Record<string, string>;
};

type LocalizedVisibleTarget = {
  kind: 'locale-messages';
  messageIds: string[];
};

export type LocalizedRouteTarget = {
  expected: SpaLocationTarget;
  kind: 'localized-view' | 'configured-redirect';
  navigate: SpaLocationTarget;
  session: 'authenticated' | 'anonymous';
  visible: LocalizedVisibleTarget;
};

export type RoleBoundaryRouteTarget = {
  boundary: {
    messageIds: string[];
    selector: string;
  };
  expected: SpaLocationTarget;
  kind: 'role-boundary';
  navigate: SpaLocationTarget;
  session: 'authenticated';
};

export type StaticFallbackRouteTarget = {
  exactVisibleText: string;
  expectedPathname: string;
  kind: 'declared-static-fallback';
};

export type ExecutableRouteTarget = (
  LocalizedRouteTarget | RoleBoundaryRouteTarget | StaticFallbackRouteTarget
) & {
  localeTransition?: 'header-selector' | 'storage-reload';
  requiredScenarios?: string[];
};

type ExecutableViewVariantTarget = {
  expected: SpaLocationTarget;
  navigate: SpaLocationTarget;
  runtimeFixture?: {
    hashQuery: Record<string, string>;
    kind: 'production-process-ledger';
  };
  visibleMessageIds: string[];
};

export type ExecutableViewVariant = {
  assertionId: string;
  execution?: { kind: 'route-inventory' } | { kind: 'dedicated-spec'; specPath: string };
  registryId: string;
  routeAssertionId: string;
  scenario: string;
  target: ExecutableViewVariantTarget;
  variantId: string;
};

type ViewStateRegistryUsage = {
  proof:
    | { kind: 'browser'; variantAssertionIds: string[] }
    | { kind: 'focused-tests'; testPaths: string[] };
  registryId: string;
  sourcePaths: string[];
  variantIds: string[];
};

export function requiredScenariosForTarget(target: ExecutableRouteTarget): readonly string[] {
  const declared = target.requiredScenarios ?? ['route'];
  const required = [
    'route',
    ...(target.kind !== 'declared-static-fallback' && target.session === 'authenticated'
      ? ['anonymous-protection']
      : []),
    ...declared.filter((scenario) => scenario !== 'route' && scenario !== 'anonymous-protection'),
  ];
  return [...new Set(required)];
}

export type RouteCoverageContract = {
  executableViewVariants: ExecutableViewVariant[];
  executableTargets: Record<string, ExecutableRouteTarget>;
  routeFamilies: CoverageFamily[];
  rows: CoverageRow[];
  viewStateRegistry: {
    schemaVersion: string;
    sourcePath: string;
    usages: ViewStateRegistryUsage[];
  };
};

export type ExecutableRouteAssertion = {
  accessContext: string;
  assertionId: string;
  copySourcePaths: readonly string[];
  focusedTests: readonly string[];
  pageOwnedMessageIds: readonly string[];
  proofScope: string;
  requiredScenarios: readonly string[];
  route: string;
  target: ExecutableRouteTarget;
  viewState: string;
};

export type EvidenceAnnotation = Pick<
  ExecutableRouteAssertion,
  'assertionId' | 'proofScope' | 'route' | 'viewState'
> & {
  locales: readonly SupportedAppLocale[];
  scenario: string;
};

export function readRouteCoverageContract(): RouteCoverageContract {
  const absolutePath = path.join(REPOSITORY_ROOT, ROUTE_COVERAGE_PATH);
  return JSON.parse(readFileSync(absolutePath, 'utf8')) as RouteCoverageContract;
}

export function flattenExecutableRouteAssertions(
  coverage: RouteCoverageContract = readRouteCoverageContract(),
): ExecutableRouteAssertion[] {
  const viewScenariosByRouteAssertion = new Map<string, Set<string>>();
  for (const variant of coverage.executableViewVariants ?? []) {
    const scenarios = viewScenariosByRouteAssertion.get(variant.routeAssertionId) ?? new Set();
    scenarios.add(variant.scenario);
    viewScenariosByRouteAssertion.set(variant.routeAssertionId, scenarios);
  }
  const requiredScenarios = (
    assertionId: string,
    target: ExecutableRouteTarget,
  ): readonly string[] => [
    ...new Set([
      ...requiredScenariosForTarget(target),
      ...(viewScenariosByRouteAssertion.get(assertionId) ?? []),
    ]),
  ];
  const resolveTarget = (assertionId: string): ExecutableRouteTarget => {
    const target = coverage.executableTargets?.[assertionId];
    if (!target) {
      throw new Error(`Missing executable target for ${assertionId}`);
    }
    return target;
  };
  const defaultPageOwnedMessageIds = (target: ExecutableRouteTarget): string[] => {
    if (target.kind === 'declared-static-fallback') return [];
    if (target.kind === 'role-boundary') return [...target.boundary.messageIds];
    return target.visible.messageIds.filter((messageId) => !messageId.startsWith('menu.'));
  };
  const familyAssertions = coverage.routeFamilies.flatMap((family) =>
    family.routes.map((route) => {
      const assertionId = family.executableAssertionIds?.[route];
      if (!assertionId) {
        throw new Error(
          `Missing executableAssertionIds[${JSON.stringify(route)}] for ${family.id}`,
        );
      }
      if (!family.proof?.requiredEvidenceScope) {
        throw new Error(`Missing proof.requiredEvidenceScope for ${family.id}`);
      }
      const target = resolveTarget(assertionId);
      const pageOwnedMessageIds = family.pageOwnedMessageIds ?? defaultPageOwnedMessageIds(target);
      if (
        family.proof.requiredEvidenceScope === 'internal-localization' &&
        pageOwnedMessageIds.length === 0
      ) {
        throw new Error(`${assertionId} has no page-owned visible marker.`);
      }
      return {
        accessContext: family.accessContext,
        assertionId,
        copySourcePaths: family.copySources?.sourcePaths ?? [],
        focusedTests: family.proof.focusedTests ?? [],
        pageOwnedMessageIds,
        proofScope: family.proof.requiredEvidenceScope,
        requiredScenarios: requiredScenarios(assertionId, target),
        route,
        target,
        viewState: family.viewState,
      };
    }),
  );

  const independentAssertions = coverage.rows.map((row) => {
    if (!row.executableAssertionId) {
      throw new Error(`Missing executableAssertionId for route ${row.route}`);
    }
    if (!row.proof?.requiredEvidenceScope) {
      throw new Error(`Missing proof.requiredEvidenceScope for route ${row.route}`);
    }
    const target = resolveTarget(row.executableAssertionId);
    const pageOwnedMessageIds = row.pageOwnedMessageIds ?? defaultPageOwnedMessageIds(target);
    if (
      row.proof.requiredEvidenceScope === 'internal-localization' &&
      pageOwnedMessageIds.length === 0
    ) {
      throw new Error(`${row.executableAssertionId} has no page-owned visible marker.`);
    }
    return {
      accessContext: row.accessContext,
      assertionId: row.executableAssertionId,
      copySourcePaths: row.copySources?.sourcePaths ?? [],
      focusedTests: row.proof.focusedTests ?? [],
      pageOwnedMessageIds,
      proofScope: row.proof.requiredEvidenceScope,
      requiredScenarios: requiredScenarios(row.executableAssertionId, target),
      route: row.route,
      target,
      viewState: row.viewState,
    };
  });

  const assertions = [...familyAssertions, ...independentAssertions];
  const assertionIds = new Set(assertions.map(({ assertionId }) => assertionId));
  if (assertionIds.size !== assertions.length) {
    throw new Error('Route coverage executable assertion IDs must be unique.');
  }
  const targetAssertionIds = Object.keys(coverage.executableTargets ?? {});
  if (
    targetAssertionIds.length !== assertions.length ||
    targetAssertionIds.some((assertionId) => !assertionIds.has(assertionId))
  ) {
    throw new Error('Route coverage executable targets must exactly match its assertion IDs.');
  }
  return assertions;
}

export function flattenExecutableViewVariants(
  coverage: RouteCoverageContract = readRouteCoverageContract(),
): ExecutableViewVariant[] {
  const variants = coverage.executableViewVariants ?? [];
  const routeAssertionIds = new Set(
    flattenExecutableRouteAssertions(coverage).map(({ assertionId }) => assertionId),
  );
  const assertionIds = variants.map(({ assertionId }) => assertionId);
  if (
    new Set(assertionIds).size !== assertionIds.length ||
    assertionIds.some((assertionId) => !/^vv\.[a-z0-9][a-z0-9.-]+$/u.test(assertionId))
  ) {
    throw new Error('Executable view variants must have unique stable assertion IDs.');
  }
  for (const variant of variants) {
    if (!routeAssertionIds.has(variant.routeAssertionId)) {
      throw new Error(`${variant.assertionId} references an unknown route assertion.`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(variant.scenario)) {
      throw new Error(`${variant.assertionId} has an invalid semantic scenario.`);
    }
  }
  return variants;
}

export function findRouteAssertion(route: string): ExecutableRouteAssertion {
  const assertion = flattenExecutableRouteAssertions().find(
    (candidate) => candidate.route === route,
  );
  if (!assertion) {
    throw new Error(`No executable route assertion declared for ${route}`);
  }
  return assertion;
}

export function evidenceAnnotation(
  assertion: ExecutableRouteAssertion,
  scenario = 'route',
): EvidenceAnnotation {
  return {
    assertionId: assertion.assertionId,
    locales: APP_LOCALES,
    proofScope: assertion.proofScope,
    route: assertion.route,
    scenario,
    viewState: assertion.viewState,
  };
}

export function annotateEvidence(
  testInfo: TestInfo,
  assertion: ExecutableRouteAssertion,
  scenario = 'route',
): void {
  testInfo.annotations.push({
    type: 'i18n-evidence',
    description: JSON.stringify(evidenceAnnotation(assertion, scenario)),
  });
}

export function assertCandidateFrontendTarget(baseURL: string): void {
  const parsed = new URL(baseURL);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)) {
    throw new Error(
      `E2E_BASE_URL must target the local candidate frontend, received host ${parsed.hostname}`,
    );
  }
}

export function isAuthenticatedRun(): boolean {
  return process.env.E2E_AUTHENTICATED === 'true';
}

export function isProductionDataRun(): boolean {
  return process.env.E2E_ALLOW_PRODUCTION_DATA === 'true';
}

export function routeToCandidateUrl(baseURL: string, route: string): string {
  if (route.endsWith('.html')) {
    return new URL(route, baseURL).toString();
  }
  const executableRoute = route === '*' ? '/codex-e2e-not-found' : route;
  const url = new URL(baseURL);
  url.hash = executableRoute;
  return url.toString();
}

export function spaLocationToCandidateUrl(baseURL: string, target: SpaLocationTarget): string {
  const hashQuery = new URLSearchParams(target.hashQuery).toString();
  const url = new URL(baseURL);
  url.hash = `${target.hashPath}${hashQuery ? `?${hashQuery}` : ''}`;
  return url.toString();
}

export function getLocaleMessage(locale: SupportedAppLocale, messageId: string): string {
  const catalog = E2E_LOCALE_CATALOG_ADAPTER.catalogs[locale];
  if (!catalog) {
    throw new Error(`Missing E2E locale catalog for registry locale ${locale}.`);
  }
  const message = catalog[messageId];
  if (typeof message !== 'string' || message.length === 0) {
    throw new Error(`Missing ${messageId} in the ${locale} locale catalog.`);
  }
  return message;
}

export async function setStoredAppLocale(page: Page, locale: SupportedAppLocale): Promise<void> {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: UMI_LOCALE_STORAGE_KEY,
    value: locale,
  });
}

export async function readStoredAppLocale(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), UMI_LOCALE_STORAGE_KEY);
}

async function waitForLocatorCount(
  page: Page,
  locator: Locator,
  expectedCount: number,
  description: string,
): Promise<void> {
  const deadline = Date.now() + 15_000;
  while ((await locator.count()) !== expectedCount) {
    if (Date.now() >= deadline) {
      throw new Error(description);
    }
    await page.waitForTimeout(50);
  }
}

export async function selectAppLocaleThroughUi(
  page: Page,
  locale: SupportedAppLocale,
  options: { forceTrigger?: boolean } = {},
): Promise<void> {
  const localeDefinition = getLocaleDefinition(locale);
  const trigger = page.locator('.tg-global-language-selector');
  await trigger.waitFor({ state: 'visible' });
  await waitForLocatorCount(
    page,
    page.locator('.ant-spin-fullscreen').filter({ visible: true }),
    0,
    `Expected the fullscreen loading overlay to clear before selecting ${localeDefinition.nativeLabel}.`,
  );
  await trigger.waitFor({ state: 'visible' });
  if ((await readStoredAppLocale(page)) === locale) {
    return;
  }
  if (options.forceTrigger) {
    // These scenarios intentionally keep a modal drawer mounted while proving that locale
    // changes preserve the same document and deep-link state. A forced pointer click still
    // targets the drawer mask by coordinates, so activate the real dropdown trigger directly.
    await trigger.evaluate((element) => (element as HTMLElement).click());
  } else {
    await trigger.click();
  }
  const targetIcon = page.getByRole('img', {
    name: localeDefinition.nativeLabel,
    exact: true,
  });
  const activeMenu = page.getByRole('menu').filter({ has: targetIcon }).filter({ visible: true });
  await waitForLocatorCount(
    page,
    activeMenu,
    1,
    `Expected one visible locale menu after opening ${localeDefinition.nativeLabel}.`,
  );
  const target = activeMenu.getByRole('menuitem').filter({ has: targetIcon });
  await waitForLocatorCount(
    page,
    target,
    1,
    `Expected one ${localeDefinition.nativeLabel} item in the visible locale menu.`,
  );
  await target.waitFor({ state: 'visible' });
  // Keyboard activation follows the menu's accessible interaction contract and avoids an
  // unrelated header tooltip intercepting pointer events in Firefox after locale changes.
  await target.press('Enter');
  await page.waitForFunction(({ key, value }) => localStorage.getItem(key) === value, {
    key: UMI_LOCALE_STORAGE_KEY,
    value: locale,
  });
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    const visibleMenuExists = [...document.querySelectorAll<HTMLElement>('[role="menu"]')].some(
      (menu) => menu.getClientRects().length > 0 && getComputedStyle(menu).visibility !== 'hidden',
    );
    if (visibleMenuExists) {
      document.querySelector<HTMLElement>('.tg-global-language-selector')?.click();
    }
  });
  await page.keyboard.press('Escape');
  await waitForLocatorCount(
    page,
    activeMenu,
    0,
    `Expected the locale menu to close after selecting ${localeDefinition.nativeLabel}.`,
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

export function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
