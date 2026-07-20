import type { Locator, Page } from '@playwright/test';

export const LOGIN_ROUTE_READY_TIMEOUT_MS = 60_000;

export async function waitForRenderedLoginControl(
  page: Pick<Page, 'getByTestId'>,
  timeoutMs = LOGIN_ROUTE_READY_TIMEOUT_MS,
): Promise<Locator> {
  const languageControl = page.getByTestId('login-language-frame');
  await languageControl.waitFor({
    state: 'visible',
    timeout: timeoutMs,
  });
  return languageControl;
}
