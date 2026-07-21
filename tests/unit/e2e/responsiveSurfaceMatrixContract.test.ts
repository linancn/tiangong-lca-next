import { readFileSync } from 'node:fs';
import path from 'node:path';

import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';
import { findRouteAssertion } from '../../e2e/i18n/contracts';
import {
  assertResponsiveSurfaceClosure,
  RESPONSIVE_SURFACE_LOCALES,
  RESPONSIVE_SURFACE_MATRIX,
  RESPONSIVE_SURFACE_SCENARIO,
  RESPONSIVE_THEMES,
  RESPONSIVE_VIEWPORTS,
  responsiveSurfaceIdsForRoute,
} from '../../e2e/i18n/responsive-surface-registry';

describe('responsive surface evidence contract', () => {
  it('binds the exact required surfaces to owning specs and route assertions', () => {
    expect(RESPONSIVE_SURFACE_MATRIX).toEqual([
      expect.objectContaining({
        assertionRoute: '/team',
        driver: 'responsive-layout.spec.ts',
        id: 'authoring-language-dropdown',
      }),
      expect.objectContaining({
        assertionRoute: '/mydata/processes',
        driver: 'responsive-surfaces.spec.ts',
        id: 'process-data-table',
      }),
      expect.objectContaining({
        assertionRoute: '/welcome',
        driver: 'responsive-surfaces.spec.ts',
        id: 'welcome-data-ecosystem-modal',
      }),
      expect.objectContaining({
        assertionRoute: '/mydata/models',
        driver: 'responsive-surfaces.spec.ts',
        id: 'life-cycle-model-drawer',
      }),
      expect.objectContaining({
        assertionRoute: '/mydata/models',
        driver: 'responsive-surfaces.spec.ts',
        id: 'life-cycle-model-graph-node',
      }),
    ]);

    for (const route of new Set(
      RESPONSIVE_SURFACE_MATRIX.map(({ assertionRoute }) => assertionRoute),
    )) {
      expect(findRouteAssertion(route).requiredScenarios).toContain(RESPONSIVE_SURFACE_SCENARIO);
    }
  });

  it('derives locales from the product registry and closes desktop/narrow by light/dark', () => {
    expect(RESPONSIVE_SURFACE_LOCALES).toEqual(
      LOCALE_REGISTRY.map(({ canonicalLocale }) => canonicalLocale),
    );
    expect(RESPONSIVE_VIEWPORTS.map(({ id }) => id)).toEqual(['desktop', 'narrow']);
    expect(RESPONSIVE_THEMES.map(({ id }) => id)).toEqual(['light', 'dark']);
  });

  it('fails closed when a route surface is missing or over-claimed', () => {
    const expected = responsiveSurfaceIdsForRoute('/mydata/models');
    expect(() => assertResponsiveSurfaceClosure('/mydata/models', expected)).not.toThrow();
    expect(() =>
      assertResponsiveSurfaceClosure('/mydata/models', ['life-cycle-model-drawer']),
    ).toThrow(/closure failed/u);
    expect(() =>
      assertResponsiveSurfaceClosure('/welcome', [
        'welcome-data-ecosystem-modal',
        'life-cycle-model-drawer',
      ]),
    ).toThrow(/closure failed/u);
  });

  it('keeps every synthetic responsive API response behind one exact audited read helper', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/i18n/responsive-surfaces.spec.ts'),
      'utf8',
    );
    const rawFulfillCalls = source.match(/await route[.]fulfill[(]/gu) ?? [];
    const auditedFixtureCalls = source.match(/await fulfillAuditedJson[(]/gu) ?? [];
    expect(rawFulfillCalls).toHaveLength(1);
    expect(auditedFixtureCalls).toHaveLength(6);

    const auditedAssertionOffset = source.indexOf('assertAuditedSyntheticReadRequest(');
    const rawFulfillOffset = source.indexOf('await route.fulfill(');
    expect(auditedAssertionOffset).toBeGreaterThan(-1);
    expect(rawFulfillOffset).toBeGreaterThan(auditedAssertionOffset);
    expect(source).not.toContain('isExactBackendRequest');
    expect(source).not.toMatch(/searchParams[.]get[(][^)]*[)][.]includes/gu);
  });

  it('waits for the fullscreen loader before locale short-circuiting or opening the menu', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'tests/e2e/i18n/contracts.ts'), 'utf8');
    const helperStart = source.indexOf('export async function selectAppLocaleThroughUi(');
    const helperEnd = source.indexOf('\n}\n\nexport function sha256', helperStart);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helperSource = source.slice(helperStart, helperEnd);
    const spinnerWait =
      /await waitForLocatorCount\(\s*page,\s*page\s*[.]locator\('[.]ant-spin-fullscreen'\)/u.exec(
        helperSource,
      );
    const storedLocaleEarlyReturn = helperSource.indexOf(
      'if ((await readStoredAppLocale(page)) === locale)',
    );
    const programmaticTriggerClick = helperSource.indexOf('(element as HTMLElement).click()');
    const triggerClick = helperSource.indexOf('await trigger.click();');
    const activeMenuScope = helperSource.indexOf(".getByRole('menu')");
    const targetMenuFilter = helperSource.indexOf('.filter({ has: targetIcon })');
    const scopedMenuItem = helperSource.indexOf("activeMenu.getByRole('menuitem')");
    const keyboardActivation = helperSource.indexOf("await target.press('Enter')");
    const firstEscape = helperSource.indexOf("await page.keyboard.press('Escape')");
    const atomicVisibleMenuCheck = helperSource.indexOf(
      'document.querySelectorAll<HTMLElement>(\'[role="menu"]\')',
    );
    const atomicTriggerToggle = helperSource.indexOf(
      "document.querySelector<HTMLElement>('.tg-global-language-selector')?.click()",
    );
    const secondEscape = helperSource.indexOf(
      "await page.keyboard.press('Escape')",
      firstEscape + 1,
    );
    expect(spinnerWait?.index).toBeGreaterThan(-1);
    expect(storedLocaleEarlyReturn).toBeGreaterThan(spinnerWait!.index);
    expect(programmaticTriggerClick).toBeGreaterThan(storedLocaleEarlyReturn);
    expect(triggerClick).toBeGreaterThan(storedLocaleEarlyReturn);
    expect(activeMenuScope).toBeGreaterThan(triggerClick);
    expect(targetMenuFilter).toBeGreaterThan(activeMenuScope);
    expect(scopedMenuItem).toBeGreaterThan(activeMenuScope);
    expect(keyboardActivation).toBeGreaterThan(scopedMenuItem);
    expect(firstEscape).toBeGreaterThan(keyboardActivation);
    expect(atomicVisibleMenuCheck).toBeGreaterThan(firstEscape);
    expect(atomicTriggerToggle).toBeGreaterThan(atomicVisibleMenuCheck);
    expect(secondEscape).toBeGreaterThan(atomicTriggerToggle);
    expect(helperSource).not.toContain('trigger.click({ force:');
    expect(helperSource).not.toContain('await target.click(');
  });

  it('uses programmatic locale activation only for mounted drawer contracts', () => {
    const processLifecycleSource = readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/i18n/process-lifecycle.spec.ts'),
      'utf8',
    );
    expect(processLifecycleSource).toContain(
      'selectAppLocaleThroughUi(page, locale, { forceTrigger: true })',
    );
  });

  it('scopes persisted authoring rows to an exact Ant Card class token', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/i18n/process-persisted-authoring.spec.ts'),
      'utf8',
    );
    expect(source).toContain(".locator('.ant-card-head-title')");
    expect(source).toContain('.getByText(getLocaleMessage(locale,');
    expect(source).toContain('contains(concat(" ", normalize-space(@class), " "), " ant-card ")');
    expect(source).not.toContain('contains(@class, "ant-card")');
  });
});
