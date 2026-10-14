import { test, expect } from '@playwright/test';
import { captureReadableTooltip, observeReadableTooltip } from './tooltip-readability';

test('readability rejects hidden, collapsed, clipped and moving tooltip controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.setContent(`
    <style>
      #shell { position: absolute; left: 80px; top: 80px; }
      [role=tooltip] { box-sizing: border-box; width: 240px; height: 80px; padding: 12px; background: white; }
      @keyframes move { to { transform: translateX(20px); } }
    </style>
    <div id="shell"><div role="tooltip"><span>Full classification path</span></div></div>
  `);
  const tooltip = page.getByRole('tooltip', { includeHidden: true });
  const text = 'Full classification path';
  const invalidStyles = [
    'transform: scale(0)',
    'display: none',
    'visibility: hidden',
    'opacity: 0',
    'width: 100px; overflow: hidden',
    'height: 20px; overflow: hidden',
    'left: -100px',
    'animation: move 1s infinite alternate',
  ];
  for (const style of invalidStyles) {
    await page
      .locator('#shell')
      .evaluate((element, css) => element.setAttribute('style', css), style);
    expect(await observeReadableTooltip(tooltip, text), style).toBeNull();
  }
  await page.locator('#shell').evaluate((element) => element.removeAttribute('style'));
  await tooltip
    .locator('span')
    .evaluate((element) => ((element as HTMLElement).style.display = 'none'));
  expect(
    await observeReadableTooltip(tooltip, text),
    'positive panel with no rendered text',
  ).toBeNull();
  await tooltip.locator('span').evaluate((element) => element.removeAttribute('style'));
  // Changes after a positive first frame must invalidate the observation too.
  for (const transform of ['scale(0)', 'translateX(20px)']) {
    await tooltip.evaluate((element, nextTransform) => {
      const nativeBounds = element.getBoundingClientRect.bind(element);
      element.getBoundingClientRect = () => {
        Reflect.deleteProperty(element, 'getBoundingClientRect');
        const initial = nativeBounds();
        element.setAttribute('data-initial-size', `${initial.width}x${initial.height}`);
        requestAnimationFrame(() => ((element as HTMLElement).style.transform = nextTransform));
        return initial;
      };
    }, transform);
    expect(await observeReadableTooltip(tooltip, text), transform).toBeNull();
    await expect(tooltip).toHaveAttribute('data-initial-size', '240x80');
    await tooltip.evaluate((element) => element.removeAttribute('style'));
  }
  const evidence = await captureReadableTooltip(page, text);
  expect(evidence.observation).toMatchObject({ width: 240, height: 80 });
  expect(evidence.screenshot.byteLength).toBeGreaterThan(0);
});
