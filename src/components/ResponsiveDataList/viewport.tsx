import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { getDataListScrollX, type DataListSizingColumn } from './columnSizing';

type ViewportDimensions = { height?: number; bodyHeight?: number };

const elementSpacing = (element: Element) => {
  const style = window.getComputedStyle(element);
  return (Number.parseFloat(style.marginTop) || 0) + (Number.parseFloat(style.marginBottom) || 0);
};

const elementHeight = (element: Element | null) =>
  element ? element.getBoundingClientRect().height + elementSpacing(element) : 0;

/** Derive the body budget from rendered chrome rather than a resolution-specific row count. */
export function measureDataListViewport(element: HTMLDivElement): ViewportDimensions {
  const fullscreen = document.fullscreenElement;
  const fullscreenRoot =
    fullscreen?.contains(element) || element.contains(fullscreen) ? fullscreen : null;
  const boundary = element.closest('.ant-drawer-body, .ant-modal-body');
  const root = fullscreenRoot ?? element;
  const rootTop = root.getBoundingClientRect().top;
  const boundaryStyle = boundary ? window.getComputedStyle(boundary) : null;
  const bottomPadding = Number.parseFloat(boundaryStyle?.paddingBottom ?? '') || 0;
  let bottom = fullscreenRoot
    ? window.innerHeight
    : boundary
      ? Math.min(boundary.getBoundingClientRect().bottom, window.innerHeight) - bottomPadding
      : window.innerHeight;

  if (!fullscreenRoot && !boundary) {
    // The app footer remains in normal layout; reserve its actual height and margins.
    const footer = document.querySelector('.ant-pro-global-footer');
    bottom -= elementHeight(footer);
    const pageContent = element.closest('.ant-pro-page-container-children-container');
    if (pageContent) {
      bottom -= Number.parseFloat(window.getComputedStyle(pageContent).paddingBottom) || 0;
    }
  }

  if (boundary && !fullscreenRoot) {
    // A selector may have a confirmation row below its table in the same drawer.
    let current: Element | null = element;
    while (current && current !== boundary) {
      let sibling = current.nextElementSibling;
      while (sibling) {
        bottom -= elementHeight(sibling);
        sibling = sibling.nextElementSibling;
      }
      current = current.parentElement;
    }
  }

  const body = root.querySelector<HTMLElement>('.ant-table-body');
  const pagination = root.querySelector('.ant-pagination');
  const cardBody = root.querySelector('.responsive-data-list-card-body');
  const cardBottomPadding = cardBody
    ? Number.parseFloat(window.getComputedStyle(cardBody).paddingBottom) || 0
    : 0;
  const tableSummary = root.querySelector('.ant-table-summary');
  const bodyTop = body?.getBoundingClientRect().top ?? rootTop;
  const scrollbarHeight = body ? Math.max(0, body.offsetHeight - body.clientHeight) : 0;
  const height = Math.max(0, Math.floor(bottom - rootTop));
  const bodyHeight = Math.max(
    0,
    Math.floor(
      bottom -
        bodyTop -
        elementHeight(pagination) -
        elementHeight(tableSummary) -
        cardBottomPadding -
        scrollbarHeight,
    ),
  );
  return { height, bodyHeight };
}

/** Native ProTable scroll, with a measured viewport that also keeps short-page pagination below. */
export function ResponsiveDataListViewport({
  children,
  enabled = true,
  columns,
}: {
  children: (props: { scroll: { x: number | 'max-content'; y?: number } }) => ReactNode;
  /** Explicit presentation columns; no DOM inspection or hidden child-prop replacement. */
  columns?: readonly DataListSizingColumn[];
  /** Disable for inline business tables whose surrounding content owns vertical scrolling. */
  enabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ViewportDimensions>({ bodyHeight: 240 });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!enabled || !element) {
      return;
    }
    let animationFrame: number | undefined;
    const measure = () => {
      animationFrame = undefined;
      const next = measureDataListViewport(element);
      setDimensions((previous) =>
        previous.height === next.height && previous.bodyHeight === next.bodyHeight
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (animationFrame === undefined) {
        animationFrame = window.requestAnimationFrame(measure);
      }
    };
    const resizeObserver = new ResizeObserver(schedule);
    const observeChrome = () => {
      resizeObserver.observe(element);
      resizeObserver.observe(document.documentElement);
      element
        .querySelectorAll('.responsive-data-list-toolbar, .ant-table-header, .ant-pagination')
        .forEach((node) => resizeObserver.observe(node));
      const boundary = element.closest('.ant-drawer-body, .ant-modal-body');
      if (boundary) {
        resizeObserver.observe(boundary);
      }
      schedule();
    };
    const mutationObserver = new MutationObserver(observeChrome);
    mutationObserver.observe(element, { childList: true, subtree: true });
    observeChrome();
    window.addEventListener('resize', schedule);
    document.addEventListener('fullscreenchange', schedule);
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', schedule);
      document.removeEventListener('fullscreenchange', schedule);
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [enabled]);

  return (
    <div
      ref={containerRef}
      className={enabled ? 'responsive-data-list-viewport' : undefined}
      style={
        enabled
          ? ({
              height: dimensions.height,
              '--data-list-body-height': `${dimensions.bodyHeight}px`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {children({
        scroll: {
          x: columns ? getDataListScrollX(columns) : 'max-content',
          ...(enabled ? { y: dimensions.bodyHeight } : {}),
        },
      })}
    </div>
  );
}
