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

  it('waits for the fullscreen loader and verifies locale-menu closure without dismissing other surfaces', () => {
    const source = readFileSync(path.resolve(process.cwd(), 'tests/e2e/i18n/contracts.ts'), 'utf8');
    const helperStart = source.indexOf('export async function selectAppLocaleThroughUi(');
    const helperEnd = source.indexOf('\n}\n\nexport function sha256', helperStart);
    expect(helperStart).toBeGreaterThan(-1);
    expect(helperEnd).toBeGreaterThan(helperStart);
    const helperSource = source.slice(helperStart, helperEnd);
    const spinnerWait = helperSource.indexOf(
      `page.locator('.tg-fullscreen-spin[aria-busy="true"]')`,
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
    const localeWriteWait = helperSource.indexOf('await page.waitForFunction(');
    const scopedTriggerToggle = helperSource.indexOf('await trigger.evaluate(', localeWriteWait);
    const nativeOpenCheck = helperSource.indexOf(
      "localeTrigger.classList.contains('ant-dropdown-open')",
      scopedTriggerToggle,
    );
    const scopedTriggerClick = helperSource.indexOf('localeTrigger.click()', nativeOpenCheck);
    const scopedMenuClosedWait = helperSource.indexOf('    activeMenu,\n    0,');
    expect(spinnerWait).toBeGreaterThan(-1);
    expect(storedLocaleEarlyReturn).toBeGreaterThan(spinnerWait);
    expect(programmaticTriggerClick).toBeGreaterThan(storedLocaleEarlyReturn);
    expect(triggerClick).toBeGreaterThan(storedLocaleEarlyReturn);
    expect(activeMenuScope).toBeGreaterThan(triggerClick);
    expect(targetMenuFilter).toBeGreaterThan(activeMenuScope);
    expect(scopedMenuItem).toBeGreaterThan(activeMenuScope);
    expect(keyboardActivation).toBeGreaterThan(scopedMenuItem);
    expect(localeWriteWait).toBeGreaterThan(keyboardActivation);
    expect(scopedTriggerToggle).toBeGreaterThan(localeWriteWait);
    expect(nativeOpenCheck).toBeGreaterThan(scopedTriggerToggle);
    expect(scopedTriggerClick).toBeGreaterThan(nativeOpenCheck);
    expect(scopedMenuClosedWait).toBeGreaterThan(scopedTriggerClick);
    expect(helperSource).not.toContain('if ((await activeMenu.count())');
    expect(helperSource).not.toContain('page.keyboard.press(');
    expect(helperSource).not.toContain('document.querySelectorAll');
    expect(helperSource).not.toContain('document.querySelector<HTMLElement>');
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

  it('scopes persisted authoring rows to the project-owned synonyms card marker', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'tests/e2e/i18n/process-persisted-authoring.spec.ts'),
      'utf8',
    );
    expect(source).toContain("drawer.getByTestId('process-synonyms-card')");
    expect(source).toContain('card.getByText(');
    expect(source).not.toContain('ant-card');
  });
});
