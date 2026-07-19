import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('process lifecycle semantic locator contract', () => {
  const source = readFileSync(
    path.resolve(process.cwd(), 'tests/e2e/i18n/process-lifecycle.spec.ts'),
    'utf8',
  );
  const authSource = readFileSync(path.resolve(process.cwd(), 'tests/e2e/i18n/auth.ts'), 'utf8');

  it('waits for the final authenticated welcome redirect before returning from sign-in', () => {
    expect(authSource).toContain('expect.poll(() => new URL(page.url()).hash');
    expect(authSource).toContain(".toBe('#/welcome')");
    expect(authSource).toContain("page.locator('.tg-global-header-avatar-trigger')");
    expect(authSource).toContain("page.locator('.tg-global-language-selector')");
    expect(authSource).not.toContain("!window.location.hash.startsWith('#/user/login')");
  });

  it('proves the exact authenticated Process view mount before locale interaction', () => {
    const helperStart = source.indexOf('async function gotoProcessViewReady(');
    const helperEnd = source.indexOf(
      "\n}\n\ntest('codex-e2e process renders every registry-backed content language'",
      helperStart,
    );
    const helper = source.slice(helperStart, helperEnd);
    const readyCall = source.indexOf('await gotoProcessViewReady(');
    const localeLoop = source.indexOf('for (const locale of APP_LOCALES)', readyCall);

    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(helperEnd).toBeGreaterThan(helperStart);
    expect(helper).toContain("browserName === 'firefox'");
    expect(helper).toContain("error.message.includes('NS_ERROR_FAILURE')");
    expect(helper).toContain("error.message.includes('NS_BINDING_ABORTED')");
    expect(helper).toContain('expect.poll(() => page.url(), { timeout: 45_000 }).toBe(targetUrl)');
    expect(helper).toContain("page.locator('.tg-global-header-avatar-trigger')");
    expect(helper).toContain("page.locator('.tg-global-language-selector')");
    expect(helper).toContain("page.locator('.ant-result-403')");
    expect(helper).toContain("page.getByTestId('process-deep-link-state')");
    expect(helper).toContain("toHaveAttribute('data-route-mode', 'view', { timeout: 45_000 })");
    expect(helper).toContain("page.locator('.ant-drawer-content:visible').filter({ has: state })");
    expect(helper.match(/page[.]goto[(]/gu)).toHaveLength(1);
    expect(source).toContain('test.setTimeout(6 * 60_000);');
    expect(readyCall).toBeGreaterThan(helperEnd);
    expect(localeLoop).toBeGreaterThan(readyCall);
  });

  it('scopes localized content to the mounted View process drawer', () => {
    expect(source).toContain(
      "const viewDrawer = page.locator('.ant-drawer-content:visible').filter({",
    );
    expect(source).toContain(
      "has: page.getByText(getLocaleMessage(locale, 'pages.process.drawer.title.view'), {",
    );
    expect(source).toContain('const markerValue = viewDrawer.getByText(marker, { exact: true });');
    expect(source).toContain(
      "viewDrawer.getByText(getLocaleMessage(locale, 'pages.process.view.processInformation'), {",
    );
    expect(source).not.toContain('const markerValue = page.getByText(');
    expect(source).not.toContain('await expectDrawerDescriptionValue(\n      page,');
  });

  it('proves reference labels in the drawer description row rather than the page table', () => {
    expect(source).toContain('const value = drawer.getByText(expectedValue, { exact: true });');
    expect(source).toContain("value.locator('xpath=ancestor::tr[1]')");
    expect(source).toContain("row.locator('.ant-descriptions-item-content')");
    expect(source).toContain('await expectDrawerDescriptionValue(\n      viewDrawer,');
  });
});
