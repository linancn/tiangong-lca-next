import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import {
  DEFAULT_USERS_PATH,
  loadUsersConfig,
  pickCredentialByRole,
} from '../../data-workflows/workflows/workflow-shared';
import { getLocaleMessage } from './contracts';

const LOGIN_FORM_LOCALE = 'en-US' as const;

export function getLoginFormControls(page: Page) {
  return {
    email: page.getByPlaceholder(
      getLocaleMessage(LOGIN_FORM_LOCALE, 'pages.login.email.placeholder'),
      { exact: true },
    ),
    password: page.getByPlaceholder(
      getLocaleMessage(LOGIN_FORM_LOCALE, 'pages.login.password.placeholder'),
      { exact: true },
    ),
    submit: page.getByRole('button', {
      name: getLocaleMessage(LOGIN_FORM_LOCALE, 'pages.login.login.tab'),
      exact: true,
    }),
  };
}

export async function loadE2ECredential() {
  const usersPath = path.resolve(process.cwd(), DEFAULT_USERS_PATH);
  const { sourceLabel, users } = await loadUsersConfig(usersPath);
  return pickCredentialByRole(users, process.env.E2E_AUTH_ROLE ?? 'user', sourceLabel);
}

export async function signInViaUi(page: Page): Promise<void> {
  const credential = await loadE2ECredential();
  await page.goto('/#/user/login', { waitUntil: 'domcontentloaded' });
  const loginForm = getLoginFormControls(page);
  await expect(loginForm.email).toBeVisible();
  await loginForm.email.fill(credential.email);
  await loginForm.password.fill(credential.password);
  await loginForm.submit.click();
  await page.waitForFunction(() => !window.location.hash.startsWith('#/user/login'), undefined, {
    timeout: 45_000,
  });
  await expect(page.locator('.tg-global-header-avatar-trigger')).toBeAttached({ timeout: 45_000 });
  await expect(page.locator('.tg-global-language-selector')).toBeAttached({ timeout: 45_000 });
}
