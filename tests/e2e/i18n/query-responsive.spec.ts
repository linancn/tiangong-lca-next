import { expect, test } from './fixtures';

import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';
import { annotateEvidence, findRouteAssertion, selectAppLocaleThroughUi } from './contracts';
import { waitForRenderedLoginControl } from './login-route-readiness';

const loginAssertion = findRouteAssertion('/user/login');

test('locale switching preserves hash query at a narrow viewport', async ({ page }, testInfo) => {
  annotateEvidence(testInfo, loginAssertion, 'query-responsive');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/user/login?codex-e2e=query-preserved', { waitUntil: 'domcontentloaded' });
  await waitForRenderedLoginControl(page);

  for (const localeDefinition of LOCALE_REGISTRY) {
    await selectAppLocaleThroughUi(page, localeDefinition.canonicalLocale);
    expect(new URL(page.url()).hash).toContain('codex-e2e=query-preserved');
    await waitForRenderedLoginControl(page);
  }
});
