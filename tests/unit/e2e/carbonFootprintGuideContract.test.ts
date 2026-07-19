import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_APP_LOCALES } from '@/services/general/localeRegistry';
import { APP_LOCALES, findRouteAssertion } from '../../e2e/i18n/contracts';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SPEC_PATH = 'tests/e2e/i18n/carbon-footprint-guide.spec.ts';

describe('Carbon Footprint Guide semantic E2E contract', () => {
  it('requires an exact all-locale Chromium state-machine scenario', () => {
    const assertion = findRouteAssertion('/welcome?view=carbon-footprint');
    expect(assertion.assertionId).toBe('rv.welcome.carbon-footprint-guide');
    expect(assertion.requiredScenarios).toEqual([
      'route',
      'anonymous-protection',
      'carbon-guide-state-machine',
      'typed-view-variants',
    ]);
    expect(APP_LOCALES).toEqual(SUPPORTED_APP_LOCALES);
    expect(assertion.focusedTests).toContain('tests/unit/e2e/carbonFootprintGuideContract.test.ts');
  });

  it('binds exact storage mocks, state transitions, query persistence, and the safe fixture', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');
    expect(source).toContain("from './fixtures'");
    expect(source).toContain("const CARBON_GUIDE_SCENARIO = 'carbon-guide-state-machine'");
    expect(source).toContain('for (const locale of APP_LOCALES)');
    expect(source).toContain('/storage/v1/object/sign/sys-files/video/');
    expect(source).toContain('readVerifiedProductionBackendTarget()');
    expect(source).toContain('requestUrl.origin).toBe(productionBackendTarget.origin)');
    expect(source).toContain(
      'request.headers().apikey).toBe(productionBackendTarget.publishableKey)',
    );
    expect(source).toContain('expect(signBodies).toEqual([{ expiresIn: 3600 }])');
    expect(source).toContain('selectAppLocaleThroughUi(page, locale)');
    expect(source).toContain("page.reload({ waitUntil: 'domcontentloaded' })");
    expect(source).toContain('readStoredAppLocale(page)');
    expect(source).toContain("getByRole('alert')");
    expect(source).toContain("screenshot: 'off'");
    expect(source).toContain("trace: 'off'");
    expect(source).toContain("video: 'off'");
    expect(source).not.toMatch(/page\.screenshot|ariaSnapshot|context\.tracing|recordVideo/gu);
  });
});
