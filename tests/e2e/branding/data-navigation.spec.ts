import { test, expect, type Locator, type Page } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { getLocaleMessage, selectAppLocaleThroughUi } from '../i18n/contracts';
import { installDatasetListFixture, TEAM_ID, USER_ID } from '../dataset-lists/fixture';
import { LOCALE_REGISTRY } from '../../../src/services/general/localeRegistry';

const brand = process.env.E2E_BRAND;
const message = (id: string) => getLocaleMessage('en-US', id);
const scopes = ['tgdata', 'codata', 'mydata', 'tedata'] as const;
const supportingKinds = ['flowproperties', 'unitgroups', 'sources', 'contacts'] as const;
const supportingIcons = {
  sources: 'paper-clip',
  contacts: 'team',
  flowproperties: 'control',
  unitgroups: 'retweet',
};

test.skip(
  !brand || process.env.E2E_QUALIFICATION !== 'true',
  'Navigation proof requires an explicitly selected brand and the closed semantic backend.',
);

// Keep the data fixture's records while explicitly controlling this test's system role.
// The shared fixture otherwise always projects a data product manager membership.
async function installNavigationFixture(page: Page, systemRole?: 'admin' | 'data_product_manager') {
  await installDatasetListFixture(page);
  await page.route('**/rest/v1/rpc/qry_membership_get_mine', async (route) => {
    expect(new URL(route.request().url()).origin).toBe('https://semantic-harness.invalid');
    await route.fulfill({
      json: [
        ...(systemRole
          ? [
              {
                role: systemRole,
                user_id: USER_ID,
                team_id: '00000000-0000-0000-0000-000000000000',
              },
            ]
          : []),
        { role: 'member', user_id: USER_ID, team_id: TEAM_ID },
      ],
    });
  });
}

function topHeader(page: Page) {
  return page.getByTestId('pro-layout-top-nav-header');
}

function sideMenu(page: Page) {
  return page.locator('.ant-pro-sider').first();
}

function supportingGroup(menu: Locator) {
  return menu
    .locator('.ant-menu-submenu-title')
    .filter({ hasText: message('menu.supportingData') });
}

function scopeLink(menu: Locator, scope: (typeof scopes)[number]) {
  return menu.locator(`a[href="#/${scope}"], a[href^="#/${scope}/"], a[href^="#/${scope}?"]`);
}

async function expectOriginalSupportingIcons(menu: Locator, scope: string) {
  const orderedLinks = menu.locator(
    supportingKinds.map((kind) => `a[href^="#/${scope}/${kind}"]`).join(', '),
  );
  await expect(orderedLinks).toHaveCount(4);
  for (const [index, kind] of supportingKinds.entries()) {
    await expect(orderedLinks.nth(index)).toHaveAttribute(
      'href',
      new RegExp(`^#/${scope}/${kind}(?:\\?|$)`),
    );
  }
  for (const kind of supportingKinds) {
    const link = menu.locator(`a[href^="#/${scope}/${kind}"]`);
    await expect(link).toBeVisible();
    const icon = link.locator(`svg[data-icon="${supportingIcons[kind]}"]`);
    await expect(icon).toHaveCount(1);
    await expect(icon).toBeVisible();
  }
}

async function clickTopScope(page: Page, scope: (typeof scopes)[number]) {
  // A fresh login toast may cover the native overflow trigger; hovering it also
  // pauses its dismissal. Let the notification finish before interacting below it.
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  const header = topHeader(page);
  const name = message(`menu.${scope}`);
  const link = scopeLink(header, scope);
  // Native icons contribute to the accessible name. Verify the destination and
  // visible label independently instead of assuming an icon-free link name.
  await expect(link).toHaveCount(1);
  await expect(link).toHaveText(name);
  if (await link.isVisible()) {
    await link.click();
    return;
  }
  // Ant Design's native Menu overflow keeps every scope reachable at narrow desktop widths.
  const overflow = header.locator('.ant-menu-overflow-item-rest');
  await expect(overflow).toBeVisible();
  await overflow.hover();
  const popupLink = scopeLink(page.locator('.ant-menu-submenu-popup:visible'), scope);
  await expect(popupLink).toHaveText(name);
  await popupLink.click();
}

async function expectRoute(page: Page, path: string) {
  await expect.poll(() => new URL(page.url()).hash).toBe(`#${path}`);
}

async function expectSelectedObject(page: Page, path: string) {
  const selected = sideMenu(page).locator('.ant-menu-item-selected');
  await expect(selected.locator(`a[href="#${path}"]`)).toBeVisible();
}

async function noPageOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
}

async function expectDesktopNavigationAligned(page: Page, collapsed: boolean) {
  const header = topHeader(page);
  const alignedHeader = page.locator('.tg-data-navigation-header');
  const menu = header.locator('.ant-menu-root');
  const firstItem = menu.locator(':scope > .ant-menu-item:visible').first();
  const content = page.locator('.ant-pro-layout-content');
  const sidebar = sideMenu(page);
  await expect(alignedHeader).toHaveClass(/tg-data-navigation-header-aligned/);
  await expect(alignedHeader).toHaveAttribute('data-collapsed', String(collapsed));
  await expect(firstItem).toBeVisible();
  // Poll the rendered boxes through the native sider/header width transitions.
  // Compare Menu/item edges, rather than text that has native Menu item padding.
  await expect
    .poll(
      async () => {
        const [menuBox, itemBox, contentBox, sidebarBox] = await Promise.all([
          menu.boundingBox(),
          firstItem.boundingBox(),
          content.boundingBox(),
          sidebar.boundingBox(),
        ]);
        if (!menuBox || !itemBox || !contentBox || !sidebarBox) return Number.POSITIVE_INFINITY;
        const boundary = sidebarBox.x + sidebarBox.width;
        return Math.max(
          Math.abs(menuBox.x - boundary),
          Math.abs(itemBox.x - boundary),
          Math.abs(contentBox.x - boundary),
        );
      },
      { message: 'Top data scopes start at the rendered main content / sider boundary' },
    )
    .toBeLessThanOrEqual(2);
  await expect(header.locator('.ant-pro-top-nav-header-logo img')).toBeVisible();
  const title = header.locator('.ant-pro-top-nav-header-logo h1');
  if (collapsed) await expect(title).toBeHidden();
  else await expect(title).toBeVisible();
}

async function expectUnreservedHeader(page: Page) {
  const header = topHeader(page);
  await expect(sideMenu(page)).toHaveCount(0);
  await expect(page.locator('.tg-data-navigation-header')).not.toHaveClass(
    /tg-data-navigation-header-aligned/,
  );
  const logo = header.locator('.ant-pro-top-nav-header-logo');
  await expect(logo.locator('img')).toBeVisible();
  await expect(logo.locator('h1')).toBeVisible();
  await expect
    .poll(
      async () => {
        const [leftBox, logoBox, menuBox] = await Promise.all([
          header.locator('.ant-pro-top-nav-header-main-left').boundingBox(),
          logo.boundingBox(),
          header.locator('.ant-menu-root').boundingBox(),
        ]);
        if (!leftBox || !logoBox || !menuBox) return Number.POSITIVE_INFINITY;
        // With no sider, retain only the native logo/title width and menu gutter.
        return Math.max(
          Math.abs(leftBox.width - logoBox.width),
          Math.abs(menuBox.x - (leftBox.x + leftBox.width)),
        );
      },
      { message: 'Routes without a sider reserve no sidebar-sized header column' },
    )
    .toBeLessThanOrEqual(8);
}

for (const width of [1440, 1024]) {
  test(`${brand} top scopes align with the content boundary through sider collapse at ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await installNavigationFixture(page);
    await signInViaUi(page);
    await page.goto('/#/tgdata/processes');
    const header = topHeader(page);
    const collapse = sideMenu(page).getByRole('button', {
      name: message('app.setting.navigationmode'),
      exact: true,
    });
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await expectDesktopNavigationAligned(page, false);
    const expanded = (await sideMenu(page).boundingBox())!.width;
    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await expectDesktopNavigationAligned(page, true);
    expect((await sideMenu(page).boundingBox())!.width).toBeLessThan(expanded - 2);
    await expect(page.locator('.ant-message-notice')).toHaveCount(0);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`${brand}-${width}-header-alignment-collapsed.png`),
    });
    await clickTopScope(page, 'codata');
    await expectRoute(page, '/codata/processes');
    await expectDesktopNavigationAligned(page, true);
    const help = header.getByRole('button', {
      name: message('component.globalHeader.helpAndAbout'),
      exact: true,
    });
    await help.click();
    await expect(page.locator('.ant-dropdown:visible').getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await expectDesktopNavigationAligned(page, false);
    await expect
      .poll(async () => Math.abs((await sideMenu(page).boundingBox())!.width - expanded))
      .toBeLessThanOrEqual(2);
    await noPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${brand}-${width}-header-alignment.png`) });

    // Native routes without a dataset scope have no sider and use intrinsic header branding.
    for (const route of ['/welcome', '/account']) {
      await page.goto(`/#${route}`);
      await expectRoute(page, route);
      await expectUnreservedHeader(page);
      const avatar = header.locator('.tg-global-header-avatar-trigger');
      await avatar.click();
      await expect(page.locator('.ant-dropdown:visible').getByRole('menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await noPageOverflow(page);
    }
  });

  test(`${brand} native split navigation preserves object and browser history at ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await installNavigationFixture(page);
    await signInViaUi(page);
    await page.goto('/#/tgdata/flows');
    const header = topHeader(page);
    await expect(header.locator('.ant-menu-root')).toHaveClass(/ant-menu-horizontal/);
    await expectSelectedObject(page, '/tgdata/flows');
    // Scope labels belong to the top Menu; the sider contains only the active scope's objects.
    await expect(scopeLink(sideMenu(page), 'mydata')).toHaveCount(0);
    await clickTopScope(page, 'codata');
    await expectRoute(page, '/codata/flows');
    await expectSelectedObject(page, '/codata/flows');
    await clickTopScope(page, 'mydata');
    await expectRoute(page, '/mydata/flows');
    await expectSelectedObject(page, '/mydata/flows');
    await page.goBack();
    await expectRoute(page, '/codata/flows');
    await expectSelectedObject(page, '/codata/flows');
    await page.goForward();
    await expectRoute(page, '/mydata/flows');
    await expectSelectedObject(page, '/mydata/flows');

    await page.goto('/#/tedata/contacts');
    await expectSelectedObject(page, '/tedata/contacts');
    const group = supportingGroup(sideMenu(page));
    await expect(group).toBeVisible();
    await expect(group.locator('a')).toHaveCount(0);
    await expect(group.locator('svg[data-icon="project"]')).toHaveCount(1);
    await expect(group.locator('svg[data-icon="project"]')).toBeVisible();
    await expect(sideMenu(page).locator('.ant-menu-submenu')).toHaveCount(1);
    for (const kind of supportingKinds) {
      await expect(sideMenu(page).locator(`a[href="#/tedata/${kind}"]`)).toBeVisible();
    }
    await expectOriginalSupportingIcons(sideMenu(page), 'tedata');
    await clickTopScope(page, 'tgdata');
    await expectRoute(page, '/tgdata/contacts');
    await expectSelectedObject(page, '/tgdata/contacts');
    await noPageOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${brand}-${width}-split-navigation.png`) });
  });

  test(`${brand} team context restricts top scopes and reaches nested supporting data at ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await installNavigationFixture(page, 'data_product_manager');
    await signInViaUi(page);
    await page.goto(`/#/tgdata/sources?tid=${TEAM_ID}`);
    const header = topHeader(page);
    for (const scope of ['mydata', 'tedata'] as const) {
      await expect(scopeLink(header, scope)).toHaveCount(0);
    }
    await expect(header.locator('a[href="#/data-processing"]')).toHaveCount(0);
    for (const kind of supportingKinds) {
      await expect(
        sideMenu(page).locator(`a[href="#/tgdata/${kind}?tid=${TEAM_ID}"]`),
      ).toBeVisible();
    }
    await clickTopScope(page, 'codata');
    await expectRoute(page, `/codata/sources?tid=${TEAM_ID}`);
    await expectSelectedObject(page, `/codata/sources?tid=${TEAM_ID}`);
    await noPageOverflow(page);
  });
}

test(`${brand} supporting icons remain visible in the native collapsed popup`, async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await installNavigationFixture(page);
  await signInViaUi(page);
  await page.goto('/#/tgdata/processes');
  const group = supportingGroup(sideMenu(page));
  // The group starts open, but a user can close it and navigate a core object.
  await expectOriginalSupportingIcons(sideMenu(page), 'tgdata');
  await group.click();
  await expect(sideMenu(page).locator('a[href="#/tgdata/flowproperties"]')).toBeHidden();
  await sideMenu(page).locator('a[href="#/tgdata/flows"]').click();
  await expectRoute(page, '/tgdata/flows');
  await expect(sideMenu(page).locator('a[href="#/tgdata/flowproperties"]')).toBeHidden();
  await clickTopScope(page, 'codata');
  await expectRoute(page, '/codata/flows');
  await expectOriginalSupportingIcons(sideMenu(page), 'codata');
  await clickTopScope(page, 'tgdata');
  await expectRoute(page, '/tgdata/flows');
  await expectOriginalSupportingIcons(sideMenu(page), 'tgdata');
  const collapse = sideMenu(page).getByRole('button', {
    name: message('app.setting.navigationmode'),
    exact: true,
  });
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-expanded', 'false');
  await expect(group.locator('svg[data-icon="project"]')).toHaveCount(1);
  await expect(group.locator('svg[data-icon="project"]')).toBeVisible();
  await group.hover();
  const popup = page.locator('.ant-menu-submenu-popup:visible');
  await expectOriginalSupportingIcons(popup, 'tgdata');
  await popup.locator('a[href="#/tgdata/sources"]').click();
  await expectRoute(page, '/tgdata/sources');
  await collapse.click();
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expectOriginalSupportingIcons(sideMenu(page), 'tgdata');
  await noPageOverflow(page);
});

test(`${brand} mobile native drawer keeps all scopes and supporting data keyboard reachable`, async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installNavigationFixture(page);
  await signInViaUi(page);
  await page.goto('/#/tgdata/processes');
  const trigger = page.locator('.tg-pro-layout-mobile-menu-action');
  await expect(trigger).toBeVisible();
  await expect(page.getByTestId('pro-layout-top-nav-header')).toHaveCount(0);
  await expect(page.locator('.tg-data-navigation-header-aligned:visible')).toHaveCount(0);
  await trigger.focus();
  await trigger.press('Enter');
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  for (const scope of scopes) {
    await expect(
      drawer
        .locator('.ant-menu-submenu-title')
        .filter({ hasText: message(`menu.${scope}`) })
        .first(),
    ).toBeVisible();
  }
  const personal = drawer
    .locator('.ant-menu-submenu-title')
    .filter({ hasText: message('menu.mydata') })
    .first();
  const personalSources = drawer.locator('a[href="#/mydata/sources"]');
  if (!(await personalSources.isVisible())) {
    await personal.focus();
    await personal.press('Enter');
  }
  if (!(await personalSources.isVisible())) {
    const personalGroup = personal.locator('..');
    await supportingGroup(personalGroup).click();
  }
  await expectOriginalSupportingIcons(drawer, 'mydata');
  const personalGroup = personal.locator('..');
  await expect(supportingGroup(personalGroup).locator('svg[data-icon="project"]')).toHaveCount(1);
  await expect(supportingGroup(personalGroup).locator('svg[data-icon="project"]')).toBeVisible();
  await personalSources.focus();
  await personalSources.press('Enter');
  await expectRoute(page, '/mydata/sources');
  await expect(drawer).toBeHidden();
  await trigger.click();
  await expect(drawer.locator('.ant-menu-item-selected a[href="#/mydata/sources"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  await expect(page.locator('.tg-global-header-avatar-trigger')).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`${brand}-390-mobile-navigation.png`) });

  await page.goto(`/#/tgdata/contacts?tid=${TEAM_ID}`);
  await trigger.click();
  await expect(drawer).toBeVisible();
  for (const scope of ['mydata', 'tedata'] as const) {
    await expect(
      drawer.locator('.ant-menu-submenu-title').filter({ hasText: message(`menu.${scope}`) }),
    ).toHaveCount(0);
  }
  await expect(drawer.locator(`a[href="#/tgdata/contacts?tid=${TEAM_ID}"]`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
});

for (const role of ['standard_user', 'data_product_manager', 'admin'] as const) {
  test(`${brand} navigation retains ${role} permissions and account tools`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await installNavigationFixture(page, role === 'standard_user' ? undefined : role);
    await signInViaUi(page);
    await page.goto('/#/tgdata/processes');
    const header = topHeader(page);
    const processing = header.getByRole('button', {
      name: message('menu.dataProcessing'),
      exact: true,
    });
    const dashboard = header.getByRole('button', {
      name: message('menu.dashboard.nationalCarbon'),
      exact: true,
    });
    await expect(processing).toHaveCount(role === 'data_product_manager' ? 1 : 0);
    await expect(dashboard).toHaveCount(role === 'admin' ? 1 : 0);
    const avatar = header.locator('.tg-global-header-avatar-trigger');
    await avatar.focus();
    await avatar.press('Enter');
    const accountMenu = page.locator('.ant-dropdown:visible').getByRole('menu');
    await expect(
      accountMenu.getByRole('menuitem').filter({ hasText: message('menu.account.profile') }),
    ).toBeVisible();
    await expect(
      accountMenu.getByRole('menuitem').filter({ hasText: message('menu.account.team') }),
    ).toBeVisible();
    await expect(
      accountMenu.getByRole('menuitem').filter({ hasText: message('menu.manageSystem') }),
    ).toHaveCount(role === 'admin' ? 1 : 0);
    await expect(
      accountMenu.getByRole('menuitem').filter({ hasText: message('menu.account.review') }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    if (role !== 'data_product_manager') {
      await page.goto('/#/data-processing');
      await expect(page.getByTestId('access-denied')).toBeVisible();
    }
  });
}

test(`${brand} anonymous data deep links still require login`, async ({ page }) => {
  await page.goto('/#/tgdata/processes');
  await expectRoute(page, '/user/login');
  await expect(page.getByTestId('docs-capture-login-submit')).toBeVisible();
  await expect(page.locator('.tg-global-header-avatar-trigger')).toHaveCount(0);
  await expect(page.getByTestId('pro-layout-top-nav-header')).toHaveCount(0);
});

test(`${brand} split navigation follows the active language without changing the current route`, async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await installNavigationFixture(page);
  await signInViaUi(page);
  await page.goto('/#/tgdata/processes');
  await page.evaluate(() => {
    (window as any).__navigationDocumentMarker = 'retained';
  });
  for (const { canonicalLocale: locale } of LOCALE_REGISTRY) {
    await selectAppLocaleThroughUi(page, locale);
    await expectRoute(page, '/tgdata/processes');
    expect(await page.evaluate(() => (window as any).__navigationDocumentMarker)).toBe('retained');
    for (const scope of scopes) {
      const link = topHeader(page).locator(`a[href^="#/${scope}/"]`);
      await expect(link).toHaveText(getLocaleMessage(locale, `menu.${scope}`));
    }
    const group = sideMenu(page).locator('.ant-menu-submenu-title');
    await expect(group).toHaveText(getLocaleMessage(locale, 'menu.supportingData'));
    const source = sideMenu(page).locator('a[href="#/tgdata/sources"]');
    if (!(await source.isVisible())) await group.click();
    await expect(source).toHaveText(getLocaleMessage(locale, 'menu.tgdata.sources'));
    await noPageOverflow(page);
    await expect(page.locator('.ant-message-notice')).toHaveCount(0);
    await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${brand}-${locale}-navigation.png`) });
  }
});
