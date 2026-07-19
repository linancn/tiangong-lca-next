import type { Browser, BrowserContext, BrowserType } from '@playwright/test';

import { assertCandidateFrontendTarget, PLAYWRIGHT_BROWSER_PROJECTS } from './contracts';
import { installVerifiedProductionReadOnlyGuard } from './production-backend-target';
import {
  assertNoBlockedProductionRequests,
  type ProductionRequestGuard,
} from './production-request-guard';

const CANDIDATE_READINESS_PATH = '/#/user/login?codex-e2e=frontend-readiness';
const DEFAULT_READINESS_TIMEOUT_MS = 180_000;

export type CandidateReadinessBrowserName = (typeof PLAYWRIGHT_BROWSER_PROJECTS)[number];

type CandidateReadinessDependencies = {
  assertNoBlockedRequests: (guard: ProductionRequestGuard) => void;
  installReadOnlyGuard: (context: BrowserContext) => Promise<{ guard: ProductionRequestGuard }>;
  launchBrowser: (browserName: CandidateReadinessBrowserName) => Promise<Browser>;
};

const DEFAULT_DEPENDENCIES: CandidateReadinessDependencies = {
  assertNoBlockedRequests: assertNoBlockedProductionRequests,
  installReadOnlyGuard: installVerifiedProductionReadOnlyGuard,
  launchBrowser: async (browserName) => {
    const { chromium, firefox, webkit } = await import('@playwright/test');
    const browserTypes: Record<CandidateReadinessBrowserName, BrowserType> = {
      chromium,
      firefox,
      webkit,
    };
    return browserTypes[browserName].launch();
  },
};

export function resolveCandidateReadinessBrowserName(
  value: string | undefined,
): CandidateReadinessBrowserName {
  const browserName = value?.trim() || PLAYWRIGHT_BROWSER_PROJECTS[0];
  if (!PLAYWRIGHT_BROWSER_PROJECTS.includes(browserName as CandidateReadinessBrowserName)) {
    throw new Error('E2E_READINESS_BROWSER must name a configured Playwright browser project.');
  }
  return browserName as CandidateReadinessBrowserName;
}

export async function waitForCandidateFrontendReady(
  baseURL: string,
  browserName: CandidateReadinessBrowserName,
  timeoutMs = DEFAULT_READINESS_TIMEOUT_MS,
  dependencies: CandidateReadinessDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  assertCandidateFrontendTarget(baseURL);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    browser = await dependencies.launchBrowser(browserName);
    context = await browser.newContext({
      baseURL,
      locale: 'en-US',
      serviceWorkers: 'block',
    });
    const { guard } = await dependencies.installReadOnlyGuard(context);
    const page = await context.newPage();
    await page.goto(CANDIDATE_READINESS_PATH, {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded',
    });
    await page.getByTestId('login-language-frame').waitFor({
      state: 'visible',
      timeout: timeoutMs,
    });
    dependencies.assertNoBlockedRequests(guard);
  } catch {
    throw new Error(
      `Candidate frontend did not become rendered and interactive in ${browserName}.`,
    );
  } finally {
    await context?.close();
    await browser?.close();
  }
}
