import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('process lifecycle semantic locator contract', () => {
  const source = readFileSync(
    path.resolve(process.cwd(), 'tests/e2e/i18n/process-lifecycle.spec.ts'),
    'utf8',
  );

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
