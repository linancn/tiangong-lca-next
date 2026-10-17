import { test, expect, type Locator, type Page, type TestInfo } from '../i18n/fixtures';
import { signInViaUi } from '../i18n/auth';
import { getLocaleMessage } from '../i18n/contracts';
import { installDatasetListFixture } from '../dataset-lists/fixture';
import { captureReadableTooltip } from '../dataset-lists/tooltip-readability';

test.use({ semanticPersona: 'data_product_manager' });
test.skip(
  process.env.E2E_BRAND !== 'atlas' || process.env.E2E_QUALIFICATION !== 'true',
  'Atlas navigation proof requires the compiled Atlas bundle and closed semantic backend.',
);

const palettes = {
  light: {
    background: 'rgb(0, 21, 41)',
    text: 'rgba(255, 255, 255, 0.65)',
    headerText: 'rgb(83, 103, 119)',
    title: 'rgb(255, 255, 255)',
    selected: 'rgb(255, 255, 255)',
    selectedBackground: 'rgb(47, 107, 154)',
    hover: 'rgb(255, 255, 255)',
    hoverBackground: 'rgba(0, 0, 0, 0)',
    collapseBackground: 'rgb(0, 33, 64)',
    popup: 'rgb(0, 21, 41)',
    contentBackground: 'rgb(242, 244, 244)',
    containerBackground: 'rgb(255, 255, 255)',
    focus: 'rgb(78, 131, 166)',
  },
  dark: {
    background: 'rgb(0, 21, 41)',
    text: 'rgba(255, 255, 255, 0.65)',
    headerText: 'rgb(173, 188, 201)',
    title: 'rgb(255, 255, 255)',
    selected: 'rgb(255, 255, 255)',
    selectedBackground: 'rgb(85, 121, 162)',
    hover: 'rgb(255, 255, 255)',
    hoverBackground: 'rgba(0, 0, 0, 0)',
    collapseBackground: 'rgb(0, 33, 64)',
    popup: 'rgb(0, 21, 41)',
    contentBackground: 'rgb(8, 21, 34)',
    containerBackground: 'rgb(16, 35, 55)',
    // The primary-text-hover token retains contrast on hovered dark surfaces.
    focus: 'rgb(124, 152, 181)',
  },
} as const;
type Mode = keyof typeof palettes;
const message = (id: string) => getLocaleMessage('en-US', id);

async function insideViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.width > 0 &&
          box.height > 0 &&
          box.left >= -1 &&
          box.top >= -1 &&
          box.right <= innerWidth + 1 &&
          box.bottom <= innerHeight + 1
        );
      }),
    )
    .toBe(true);
}

async function noOverflow(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
}

async function settled(locator: Locator) {
  await expect
    .poll(() =>
      locator.evaluate((element) =>
        element
          .getAnimations({ subtree: true })
          .every((animation) => !animation.pending && animation.playState !== 'running'),
      ),
    )
    .toBe(true);
}

// Measure the rendered foreground against composited ancestor backgrounds, including
// icon opacity. A nominal CSS color alone cannot prove that a tool remains readable.
async function readable(locator: Locator, minimum = 4.5, foregroundProperty = 'color') {
  // Popups and drawers fade through low-opacity frames. Measure their settled
  // presentation, including animation on ancestors of the text/icon itself.
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        for (let node: Element | null = element; node; node = node.parentElement) {
          if (
            node
              .getAnimations()
              .some((animation) => animation.pending || animation.playState === 'running')
          )
            return false;
        }
        return true;
      }),
    )
    .toBe(true);
  const measure = () =>
    locator.evaluate((element, property) => {
      const parse = (color: string) => {
        const values = color.match(/[\d.]+/g)?.map(Number) ?? [];
        return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0, values[3] ?? 1];
      };
      const over = (front: number[], back: number[]) => {
        const alpha = front[3] + back[3] * (1 - front[3]);
        return [
          ...front
            .slice(0, 3)
            .map((value, index) =>
              alpha ? (value * front[3] + back[index] * back[3] * (1 - front[3])) / alpha : 0,
            ),
          alpha,
        ];
      };
      let background = [0, 0, 0, 0];
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        background = over(background, parse(style.backgroundColor));
        opacity *= Number(style.opacity);
      }
      background = over(background, [255, 255, 255, 1]);
      const foreground = parse(getComputedStyle(element).getPropertyValue(property));
      foreground[3] *= opacity;
      const rendered = over(foreground, background);
      const luminance = (color: number[]) =>
        color.slice(0, 3).reduce((sum, value, index) => {
          const normalized = value / 255;
          const linear =
            normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
          return sum + linear * [0.2126, 0.7152, 0.0722][index];
        }, 0);
      const values = [luminance(rendered), luminance(background)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    }, foregroundProperty);
  await expect
    .poll(measure, { message: `Rendered contrast for ${await locator.getAttribute('aria-label')}` })
    .toBeGreaterThanOrEqual(minimum);
}

async function capture(page: Page, panel: Locator, testInfo: TestInfo, name: string) {
  await settled(panel);
  await expect(page.getByText('Login successful!', { exact: true })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: false });
}

function themeToggle(scope: Page | Locator) {
  return scope.getByRole('button', { name: message('pages.theme.toggleDarkMode'), exact: true });
}

async function expectGlobalContentMode(page: Page, mode: Mode) {
  await expect(page.locator('.atlas-app-shell .ant-pro-layout-container')).toHaveCSS(
    'background-color',
    palettes[mode].contentBackground,
  );
  await expect(page.locator('.ant-table').first()).toHaveCSS(
    'background-color',
    palettes[mode].containerBackground,
  );
}

async function expectNativeDarkMenu(sidebar: Locator) {
  await expect(sidebar.locator('.ant-pro-sider-menu.ant-menu-root')).toHaveClass(/ant-menu-dark/);
}

function supportingGroup(sidebar: Locator) {
  return sidebar
    .locator('.ant-menu-submenu-title')
    .filter({ hasText: message('menu.supportingData') });
}

async function applyMode(page: Page, mode: Mode) {
  const toggle = themeToggle(page);
  if (mode === 'dark') await toggle.click();
  await expect(
    toggle.locator(`svg[data-icon="${mode === 'dark' ? 'sun' : 'moon'}"]`),
  ).toBeVisible();
  if (mode === 'dark') {
    await expect.poll(() => page.evaluate(() => localStorage.getItem('isDarkMode'))).toBe('true');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(themeToggle(page).locator('svg[data-icon="sun"]')).toBeVisible();
  }
}

async function focusVisible(page: Page, control: Locator, mode: Mode) {
  // Establish keyboard modality before focus; mouse focus must not masquerade as
  // keyboard focus proof for :focus-visible styles.
  await page.keyboard.press('Tab');
  await control.focus();
  await expect(control).toBeFocused();
  await expect
    .poll(() => control.evaluate((element) => element.matches(':focus-visible')))
    .toBe(true);
  await expect(control).toHaveCSS('outline-style', 'solid');
  await expect(control).toHaveCSS('outline-width', '2px');
  await expect(control).toHaveCSS('outline-color', palettes[mode].focus);
  await readable(control, 3, 'outline-color');
}

for (const mode of ['light', 'dark'] as const) {
  for (const width of [1440, 1024]) {
    test(`Atlas ${mode} split navigation preserves menus and header controls at ${width}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 960 });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await installDatasetListFixture(page);
      await signInViaUi(page);
      await applyMode(page, mode);
      await page.goto('/#/tgdata/processes');
      const palette = palettes[mode];
      const sidebar = page.locator('.ant-pro-sider').first();
      const header = page.getByTestId('pro-layout-top-nav-header');
      const collapse = sidebar.getByRole('button', {
        name: message('app.setting.navigationmode'),
        exact: true,
      });
      const table = page.locator('.responsive-data-list-viewport').first();
      await expect(table.locator('.ant-table-tbody > tr[data-row-key]')).toHaveCount(50);
      await expect(sidebar).toHaveCSS('background-color', palette.background);
      // The native TopNavHeader is transparent; its Layout.Header owns the surface.
      await expect(page.getByTestId('pro-layout-header')).toHaveCSS(
        'background-color',
        palette.background,
      );
      await expect(header.locator('.ant-menu-root')).toHaveClass(/ant-menu-horizontal/);
      await expect(header.locator('.ant-menu-root')).toHaveClass(/ant-menu-dark/);
      await expectGlobalContentMode(page, mode);
      await expectNativeDarkMenu(sidebar);
      await expect(sidebar.locator('a[href="#/mydata/models"]')).toHaveCount(0);
      const selected = sidebar.locator('.ant-menu-item:has(a[href="#/tgdata/processes"])');
      const flow = sidebar.locator('.ant-menu-item:has(a[href="#/tgdata/flows"])');
      await expect(selected).toHaveClass(/ant-menu-item-selected/);
      await expect(selected).toHaveCSS('background-color', palette.selectedBackground);
      await readable(selected.locator('a'));
      await expect(flow.locator('a')).toHaveCSS('color', palette.text);
      await readable(flow.locator('a'));
      await flow.hover();
      await expect(flow.locator('a')).toHaveCSS('color', palette.hover);
      await readable(flow.locator('a'));
      await capture(page, sidebar, testInfo, `${mode}-${width}-object-hover`);
      await page.mouse.move(width - 2, 2);

      const avatar = header.locator('.tg-global-header-avatar-trigger');
      await insideViewport(avatar);
      await readable(avatar.locator('.tg-global-header-avatar-name-text'));
      const tools = header
        .locator('.ant-pro-global-header-header-actions-item')
        .getByRole('button');
      expect(await tools.count()).toBeGreaterThanOrEqual(5);
      for (const tool of await tools.all()) {
        await insideViewport(tool);
        await expect(tool.locator('svg').first()).toBeVisible();
        await readable(tool.locator('.anticon').first(), 3);
        await focusVisible(page, tool, mode);
      }
      await page.mouse.move(width - 2, 2);
      await focusVisible(page, avatar, mode);
      await capture(page, header, testInfo, `${mode}-${width}-header-account-focus`);
      await avatar.blur();
      // Supporting data is the sole submenu below the active scope on desktop.
      const supporting = supportingGroup(sidebar);
      await expect(sidebar.locator('a[href="#/tgdata/sources"]')).toBeVisible();
      await expect(sidebar.locator('.ant-menu-sub.ant-menu-inline')).toHaveCSS(
        'background-color',
        'rgb(0, 12, 23)',
      );
      await sidebar.locator('a[href="#/tgdata/sources"]').click();
      await expect(page).toHaveURL(/#\/tgdata\/sources$/);
      await expect(table).toBeVisible();
      const expandedWidth = (await table.boundingBox())!.width;
      await expect(collapse).toHaveCSS('background-color', palette.collapseBackground);
      await focusVisible(page, collapse, mode);
      await collapse.press('Enter');
      await expect(collapse).toHaveAttribute('aria-expanded', 'false');
      await expect(collapse).toBeFocused();
      await expect
        .poll(async () => (await table.boundingBox())!.width - expandedWidth)
        .toBeGreaterThan(100);
      // Account/tools remain in the native header when only the sider collapses.
      await insideViewport(avatar);
      await expect(avatar.locator('.tg-global-header-avatar-name-text')).toBeVisible();
      await supporting.hover();
      const popup = page.locator('.ant-menu-submenu-popup:visible').first();
      await insideViewport(popup);
      await expect(popup).toHaveClass(/ant-menu-dark/);
      await expect(popup.locator('.ant-menu').first()).toHaveCSS('background-color', palette.popup);
      const popupSelected = popup.locator('.ant-menu-item-selected');
      await expect(popupSelected).toHaveCSS('background-color', palette.selectedBackground);
      await readable(popupSelected.locator('a'));
      await capture(page, popup, testInfo, `${mode}-${width}-supporting-popup`);
      await page.mouse.move(width - 2, 2);
      await expect(popup).toBeHidden();
      await collapse.focus();
      await collapse.press('Space');
      await expect(collapse).toHaveAttribute('aria-expanded', 'true');
      await expect
        .poll(async () => Math.abs((await table.boundingBox())!.width - expandedWidth))
        .toBeLessThanOrEqual(1);

      if (width === 1440) {
        const toggle = themeToggle(header);
        const help = header.getByRole('button', {
          name: message('component.globalHeader.helpAndAbout'),
          exact: true,
        });
        await help.hover();
        await expect(help).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.12)');
        await page.mouse.down();
        await expect.poll(() => help.evaluate((element) => element.matches(':active'))).toBe(true);
        await expect(help).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.18)');
        await capture(page, header, testInfo, `${mode}-header-tool-active`);
        await page.mouse.move(width - 2, 2);
        await page.mouse.up();
        await toggle.hover();
        const tooltip = await captureReadableTooltip(page, message('pages.theme.toggleDarkMode'));
        await testInfo.attach(`${mode}-header-tool-tooltip`, {
          body: tooltip.screenshot,
          contentType: 'image/png',
        });
        await page.mouse.move(width - 2, 2);
        for (const [name, trigger] of [
          ['help', help],
          [
            'language',
            header.getByRole('button', { name: message('pages.lang.select'), exact: true }),
          ],
          ['account', avatar],
        ] as const) {
          if (name === 'account') await trigger.hover();
          else await trigger.click();
          const menu = page.locator('.ant-dropdown:visible').getByRole('menu').first();
          await insideViewport(menu);
          await readable(menu.getByRole('menuitem').first());
          await capture(page, menu, testInfo, `${mode}-${name}-dropdown`);
          await page.keyboard.press('Escape');
          await page.mouse.move(width - 2, 2);
          await expect(menu).toBeHidden();
        }
        await toggle.click();
        await expect
          .poll(() => page.evaluate(() => localStorage.getItem('isDarkMode')))
          .toBe(String(mode !== 'dark'));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectGlobalContentMode(page, mode === 'dark' ? 'light' : 'dark');
        await expectNativeDarkMenu(sidebar);
        await themeToggle(header).click();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expectGlobalContentMode(page, mode);
        await expectNativeDarkMenu(sidebar);
      }
      expect(errors).toEqual([]);
    });
  }

  test(`Atlas ${mode} mobile drawer keeps theme, navigation and tools readable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await installDatasetListFixture(page);
    await signInViaUi(page);
    await applyMode(page, mode);
    await page.goto('/#/tgdata/processes');
    await page.setViewportSize({ width: 390, height: 844 });
    await expectGlobalContentMode(page, mode);
    const mobileTrigger = page.locator('.tg-pro-layout-mobile-menu-action');
    await insideViewport(mobileTrigger);
    const header = page.getByTestId('pro-layout-global-header');
    await expect(page.getByTestId('pro-layout-header')).toHaveCSS(
      'background-color',
      palettes[mode].background,
    );
    const avatar = header.locator('.tg-global-header-avatar-trigger');
    await insideViewport(avatar);
    await readable(avatar.locator('.tg-global-header-avatar-name-text'));
    const controls = header
      .locator('.ant-pro-global-header-header-actions-item')
      .getByRole('button');
    expect(await controls.count()).toBeGreaterThanOrEqual(6);
    for (const control of await controls.all()) {
      await insideViewport(control);
      await readable(control.locator('.anticon').first(), 3);
      await focusVisible(page, control, mode);
    }
    await page.mouse.move(389, 1);
    await capture(page, header, testInfo, `${mode}-390-mobile-header`);
    await focusVisible(page, mobileTrigger, mode);
    await mobileTrigger.press('Enter');
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    const sidebar = drawer.locator('.ant-pro-sider');
    await expect(sidebar).toHaveCSS('background-color', palettes[mode].background);
    await expectNativeDarkMenu(sidebar);
    const selected = drawer.locator('.ant-menu-item-selected:has(a[href="#/tgdata/processes"])');
    await readable(selected.locator('a'));
    await expect(selected).toHaveCSS('background-color', palettes[mode].selectedBackground);
    await page.mouse.move(389, 1);
    await capture(page, drawer, testInfo, `${mode}-390-mobile-drawer`);
    await drawer.locator('a[href="#/tgdata/flows"]').click();
    await expect(page).toHaveURL(/#\/tgdata\/flows$/);
    await expect(drawer).toBeHidden();
    await mobileTrigger.click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.ant-menu-item-selected a[href="#/tgdata/flows"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await insideViewport(mobileTrigger);
    await noOverflow(page);
  });
}
