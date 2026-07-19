import { expect, test, type Browser, type Page } from './fixtures';

import {
  DEFAULT_BROWSER_APP_LOCALE,
  LOCALE_REGISTRY,
  type LocaleRegistryEntry,
} from '../../../src/services/general/localeRegistry';
import { LOGIN_PATH } from '../../../src/services/general/publicRoutePolicy';
import { UMI_LOCALE_STORAGE_KEY } from '../../../src/services/general/runtimeLocale';
import {
  annotateEvidence,
  findRouteAssertion,
  flattenExecutableRouteAssertions,
  getLocaleMessage,
  readStoredAppLocale,
  routeToCandidateUrl,
  type ExecutableRouteAssertion,
} from './contracts';
import { installVerifiedProductionReadOnlyGuard } from './production-backend-target';
import { assertNoBlockedProductionRequests } from './production-request-guard';

const LOGIN_ASSERTION = findRouteAssertion(LOGIN_PATH);
const ANONYMOUS_PROTECTED_ASSERTIONS = flattenExecutableRouteAssertions().filter(
  ({ target }) => target.kind !== 'declared-static-fallback' && target.session === 'authenticated',
);

if (ANONYMOUS_PROTECTED_ASSERTIONS.length === 0) {
  throw new Error('The route contract must expose at least one authenticated route.');
}

function assertionMessageIds(assertion: ExecutableRouteAssertion): readonly string[] {
  const { target } = assertion;
  if (target.kind === 'declared-static-fallback') {
    return [];
  }
  return [
    ...new Set([
      ...(target.kind === 'role-boundary' ? target.boundary.messageIds : target.visible.messageIds),
      ...assertion.pageOwnedMessageIds,
    ]),
  ];
}

const [LOGIN_MESSAGE_ID] = assertionMessageIds(LOGIN_ASSERTION);
if (!LOGIN_MESSAGE_ID) {
  throw new Error('The canonical login assertion must own a localized visible message.');
}

function loginUrl(baseURL: string): string {
  const url = new URL(baseURL);
  url.hash = LOGIN_PATH;
  return url.toString();
}

function currentHashPath(page: Page): string {
  return new URL(page.url()).hash.slice(1).split('?')[0];
}

async function expectLocalizedLoginContent(
  page: Page,
  localeDefinition: LocaleRegistryEntry,
): Promise<void> {
  await expect(
    page.getByRole('tab', {
      name: getLocaleMessage(localeDefinition.canonicalLocale, LOGIN_MESSAGE_ID),
      exact: true,
    }),
  ).toHaveAttribute('aria-selected', 'true');
}

async function expectLocalizedLogin(
  page: Page,
  localeDefinition: LocaleRegistryEntry,
): Promise<void> {
  await expect.poll(() => readStoredAppLocale(page)).toBe(localeDefinition.canonicalLocale);
  await expectLocalizedLoginContent(page, localeDefinition);
}

async function selectLoginLocale(page: Page, localeDefinition: LocaleRegistryEntry): Promise<void> {
  await page.getByTestId('login-language-frame').click();
  const menu = page.locator('.ant-dropdown-menu');
  await expect(menu).toBeVisible();
  await menu
    .locator('.ant-dropdown-menu-item')
    .filter({ hasText: localeDefinition.nativeLabel })
    .click();
  await expectLocalizedLogin(page, localeDefinition);
}

function materializeLegacyAlias(localeDefinition: LocaleRegistryEntry): string {
  const aliasPattern = localeDefinition.aliases.find((alias) => /[_@.]/u.test(alias));
  if (!aliasPattern) {
    throw new Error(`${localeDefinition.canonicalLocale} has no registry-declared legacy alias.`);
  }
  const region =
    localeDefinition.canonicalLocale.split('-').slice(1).join('-') || localeDefinition.languageCode;
  return aliasPattern.replace(/\*/gu, region);
}

async function newContextWithStoredLocale(browser: Browser, baseURL: string, storedLocale: string) {
  const context = await browser.newContext({
    baseURL,
    locale: DEFAULT_BROWSER_APP_LOCALE,
    serviceWorkers: 'block',
  });
  await context.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: UMI_LOCALE_STORAGE_KEY,
    value: storedLocale,
  });
  return context;
}

test('anonymous protected routes fail closed to the canonical localized login', async ({
  baseURL,
  browser,
}, testInfo) => {
  test.setTimeout(10 * 60_000);
  for (const assertion of ANONYMOUS_PROTECTED_ASSERTIONS) {
    annotateEvidence(testInfo, assertion, 'anonymous-protection');
  }
  expect(baseURL).toBeTruthy();

  for (const localeDefinition of LOCALE_REGISTRY) {
    const context = await browser.newContext({
      baseURL: baseURL!,
      locale: localeDefinition.canonicalLocale,
      serviceWorkers: 'block',
    });
    const { guard: productionRequestGuard } = await installVerifiedProductionReadOnlyGuard(context);
    const page = await context.newPage();
    try {
      for (const assertion of ANONYMOUS_PROTECTED_ASSERTIONS) {
        await test.step(`${localeDefinition.canonicalLocale}: ${assertion.route} -> ${LOGIN_PATH}`, async () => {
          await page.goto(routeToCandidateUrl(baseURL!, assertion.route), {
            waitUntil: 'domcontentloaded',
          });
          await expect.poll(() => currentHashPath(page)).toBe(LOGIN_PATH);
          await expectLocalizedLogin(page, localeDefinition);
          await expect(page.locator('.tg-global-header-avatar-trigger')).toHaveCount(0);
          await expect(page.locator('.ant-result-403')).toHaveCount(0);

          for (const messageId of assertionMessageIds(assertion)) {
            await expect(
              page.getByText(getLocaleMessage(localeDefinition.canonicalLocale, messageId), {
                exact: true,
              }),
            ).toHaveCount(0);
          }
        });
      }
    } finally {
      await context.close();
      assertNoBlockedProductionRequests(productionRequestGuard);
    }
  }
});

test('browser locale preference selects every registry locale on first render', async ({
  baseURL,
  browser,
}, testInfo) => {
  annotateEvidence(testInfo, LOGIN_ASSERTION, 'locale-fallback-refresh');
  expect(baseURL).toBeTruthy();

  for (const localeDefinition of LOCALE_REGISTRY) {
    const context = await browser.newContext({
      baseURL: baseURL!,
      locale: localeDefinition.canonicalLocale,
      serviceWorkers: 'block',
    });
    const { guard: productionRequestGuard } = await installVerifiedProductionReadOnlyGuard(context);
    const page = await context.newPage();
    try {
      await page.goto(loginUrl(baseURL!), { waitUntil: 'domcontentloaded' });
      await expectLocalizedLogin(page, localeDefinition);
    } finally {
      await context.close();
      assertNoBlockedProductionRequests(productionRequestGuard);
    }
  }
});

test('legacy locale aliases migrate and an invalid stored locale uses the registry default', async ({
  baseURL,
  browser,
}, testInfo) => {
  annotateEvidence(testInfo, LOGIN_ASSERTION, 'locale-fallback-refresh');
  expect(baseURL).toBeTruthy();

  for (const localeDefinition of LOCALE_REGISTRY) {
    const legacyAlias = materializeLegacyAlias(localeDefinition);
    expect(legacyAlias).not.toBe(localeDefinition.canonicalLocale);
    const context = await newContextWithStoredLocale(browser, baseURL!, legacyAlias);
    const { guard: productionRequestGuard } = await installVerifiedProductionReadOnlyGuard(context);
    const page = await context.newPage();
    try {
      await page.goto(loginUrl(baseURL!), { waitUntil: 'domcontentloaded' });
      await expectLocalizedLogin(page, localeDefinition);
    } finally {
      await context.close();
      assertNoBlockedProductionRequests(productionRequestGuard);
    }
  }

  const defaultDefinition = LOCALE_REGISTRY.find(
    ({ canonicalLocale }) => canonicalLocale === DEFAULT_BROWSER_APP_LOCALE,
  );
  expect(defaultDefinition).toBeDefined();
  const invalidLocale = `${LOCALE_REGISTRY.map(({ canonicalLocale }) => canonicalLocale).join('.')}.invalid`;
  const context = await browser.newContext({ baseURL: baseURL!, serviceWorkers: 'block' });
  const { guard: productionRequestGuard } = await installVerifiedProductionReadOnlyGuard(context);
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      Object.defineProperty(window.navigator, 'language', {
        configurable: true,
        get: () => value,
      });
      Object.defineProperty(window.navigator, 'languages', {
        configurable: true,
        get: () => [value],
      });
    },
    { key: UMI_LOCALE_STORAGE_KEY, value: invalidLocale },
  );
  const page = await context.newPage();
  try {
    await page.goto(loginUrl(baseURL!), { waitUntil: 'domcontentloaded' });
    await expect.poll(() => readStoredAppLocale(page)).toBeNull();
    await expectLocalizedLoginContent(page, defaultDefinition!);
  } finally {
    await context.close();
    assertNoBlockedProductionRequests(productionRequestGuard);
  }
});

test('refresh preserves the login URL state and every selected registry locale', async ({
  baseURL,
  page,
}, testInfo) => {
  annotateEvidence(testInfo, LOGIN_ASSERTION, 'locale-fallback-refresh');
  expect(baseURL).toBeTruthy();
  const url = new URL(baseURL!);
  url.searchParams.set('codex-e2e-query', 'preserved');
  url.hash = `${LOGIN_PATH}?codex-e2e-hash=preserved`;
  const expectedSearch = url.search;
  const expectedHash = url.hash;

  await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
  for (const localeDefinition of LOCALE_REGISTRY) {
    await selectLoginLocale(page, localeDefinition);
    expect(new URL(page.url()).search).toBe(expectedSearch);
    expect(new URL(page.url()).hash).toBe(expectedHash);

    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(new URL(page.url()).search).toBe(expectedSearch);
    expect(new URL(page.url()).hash).toBe(expectedHash);
    await expectLocalizedLogin(page, localeDefinition);
  }
});
