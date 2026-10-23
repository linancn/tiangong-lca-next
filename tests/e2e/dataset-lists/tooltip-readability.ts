import { expect, type Locator, type Page } from '@playwright/test';

/** One DOM observation, kept unchanged when it becomes persisted evidence. */
export async function observeReadableTooltip(tooltip: Locator, text: string) {
  return tooltip.evaluateAll(async (elements, expectedText) => {
    const sample = () => {
      if (elements.length !== 1) return null;
      const element = elements[0] as HTMLElement;
      const bounds = element.getBoundingClientRect();
      if (
        !element.isConnected ||
        element.textContent !== expectedText ||
        bounds.width <= 0 ||
        bounds.height <= 0 ||
        bounds.left < 0 ||
        bounds.right > innerWidth + 1 ||
        bounds.top < 0 ||
        bounds.bottom > innerHeight + 1 ||
        element.clientWidth <= 0 ||
        element.clientHeight <= 0 ||
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1
      )
        return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      const textBounds = range.getBoundingClientRect();
      if (
        textBounds.width <= 0 ||
        textBounds.height <= 0 ||
        textBounds.left < bounds.left - 1 ||
        textBounds.right > bounds.right + 1 ||
        textBounds.top < bounds.top - 1 ||
        textBounds.bottom > bounds.bottom + 1
      )
        return null;
      for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === 'none' ||
          style.visibility !== 'visible' ||
          Number(style.opacity) !== 1 ||
          node
            .getAnimations()
            .some((animation) => animation.pending || animation.playState === 'running')
        )
          return null;
        const clip = node.getBoundingClientRect();
        if (
          (/(hidden|clip|scroll|auto)/.test(style.overflowX) &&
            (bounds.left < clip.left - 1 || bounds.right > clip.right + 1)) ||
          (/(hidden|clip|scroll|auto)/.test(style.overflowY) &&
            (bounds.top < clip.top - 1 || bounds.bottom > clip.bottom + 1))
        )
          return null;
      }
      if (
        element
          .getAnimations({ subtree: true })
          .some((animation) => animation.pending || animation.playState === 'running')
      )
        return null;
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        textBounds: {
          x: textBounds.x,
          y: textBounds.y,
          width: textBounds.width,
          height: textBounds.height,
        },
        viewport: { width: innerWidth, height: innerHeight },
      };
    };
    const initial = sample();
    if (!initial) return null;
    const started = performance.now();
    // Observe consecutive animation frames through the native leave-delay window.
    // A single positive frame during entry/exit is not readable evidence.
    let current = initial;
    do {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const next = sample();
      if (!next || JSON.stringify(next) !== JSON.stringify(initial)) return null;
      current = next;
    } while (performance.now() - started < 250);
    return { ...current, observedAt: performance.timeOrigin + performance.now() };
  }, text);
}

export async function assertReadableTooltip(page: Page, text: string) {
  const tooltip = page.getByRole('tooltip').filter({ hasText: text });
  let observation: Awaited<ReturnType<typeof observeReadableTooltip>> = null;
  await expect
    .poll(
      async () => {
        observation = await observeReadableTooltip(tooltip, text);
        return observation !== null;
      },
      { message: 'Tooltip must remain visible, positive, unclipped and settled' },
    )
    .toBe(true);
  return { tooltip, observation: observation! };
}

export async function captureReadableTooltip(page: Page, text: string) {
  const { tooltip, observation } = await assertReadableTooltip(page, text);
  const screenshot = await page.screenshot({ fullPage: false });
  const afterScreenshot = await observeReadableTooltip(tooltip, text);
  expect(afterScreenshot, 'Tooltip must remain readable across screenshot capture').not.toBeNull();
  const { observedAt: beforeTime, ...beforeBounds } = observation;
  const { observedAt: afterTime, ...afterBounds } = afterScreenshot!;
  expect(afterBounds).toEqual(beforeBounds);
  expect(afterTime).toBeGreaterThan(beforeTime);
  return { screenshot, observation, afterScreenshot };
}
