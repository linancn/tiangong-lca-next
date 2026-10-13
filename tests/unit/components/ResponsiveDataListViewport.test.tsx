import {
  ResponsiveDataListViewport,
  measureDataListViewport,
} from '@/components/ResponsiveDataList/viewport';
import { act, render, screen } from '@testing-library/react';

const setRect = (element: Element, values: Partial<DOMRect>) => {
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 1000,
    height: 0,
    top: 0,
    right: 1000,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...values,
  });
};

const makeViewport = () => {
  const viewport = document.createElement('div');
  viewport.innerHTML = `<div class="responsive-data-list-card-body" style="padding-bottom:24px">
    <div class="ant-table-body"></div>
    <ul class="ant-pagination" style="margin-top:16px;margin-bottom:16px"></ul>
  </div>`;
  document.body.appendChild(viewport);
  setRect(viewport, { top: 160 });
  setRect(viewport.querySelector('.ant-table-body')!, { top: 260 });
  setRect(viewport.querySelector('.ant-pagination')!, { height: 32 });
  return viewport;
};

describe('ResponsiveDataList viewport measurement', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
  });

  it('reserves actual footer, page padding, toolbar/header, pagination and scrollbar space', () => {
    const viewport = makeViewport();
    const page = document.createElement('div');
    page.className = 'ant-pro-page-container-children-container';
    page.style.paddingBottom = '20px';
    viewport.replaceWith(page);
    page.append(viewport);
    const footer = document.createElement('footer');
    footer.className = 'ant-pro-global-footer';
    footer.style.margin = '10px 0';
    document.body.append(footer);
    setRect(footer, { height: 40 });
    const body = viewport.querySelector('.ant-table-body')!;
    Object.defineProperty(body, 'offsetHeight', { value: 240 });
    Object.defineProperty(body, 'clientHeight', { value: 225 });
    expect(measureDataListViewport(viewport)).toEqual({ height: 660, bodyHeight: 457 });
    window.innerHeight = 1100;
    expect(measureDataListViewport(viewport)).toEqual({ height: 860, bodyHeight: 657 });
  });

  it('uses the nearest drawer and reserves confirmation controls below the table', () => {
    const viewport = makeViewport();
    const outer = document.createElement('div');
    outer.className = 'ant-drawer-body';
    setRect(outer, { bottom: 900 });
    const drawer = document.createElement('div');
    drawer.className = 'ant-drawer-body';
    drawer.style.paddingBottom = '20px';
    setRect(drawer, { bottom: 800 });
    viewport.replaceWith(outer);
    outer.append(drawer);
    drawer.append(viewport);
    const actions = document.createElement('div');
    actions.style.marginTop = '12px';
    setRect(actions, { height: 36 });
    drawer.append(actions);
    expect(measureDataListViewport(viewport)).toEqual({ height: 572, bodyHeight: 384 });
  });

  it('treats absent page and card padding as zero without losing body space', () => {
    const viewport = makeViewport();
    const page = document.createElement('div');
    page.className = 'ant-pro-page-container-children-container';
    viewport.replaceWith(page);
    page.append(viewport);
    (viewport.querySelector('.responsive-data-list-card-body') as HTMLElement).style.paddingBottom =
      '';
    expect(measureDataListViewport(viewport)).toEqual({ height: 740, bodyHeight: 576 });
  });

  it('uses fullscreen root geometry without reserving the page footer or drawer controls', () => {
    const viewport = makeViewport();
    const table = viewport.firstElementChild!;
    setRect(table, { top: 0 });
    setRect(viewport.querySelector('.ant-table-body')!, { top: 100 });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: table });
    expect(measureDataListViewport(viewport)).toEqual({ height: 900, bodyHeight: 736 });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: viewport });
    expect(measureDataListViewport(viewport)).toEqual({ height: 740, bodyHeight: 712 });
  });

  it('handles missing chrome, table summaries and windows too short for table chrome', () => {
    const viewport = makeViewport();
    const summary = document.createElement('div');
    summary.className = 'ant-table-summary';
    setRect(summary, { height: 40 });
    viewport.append(summary);
    expect(measureDataListViewport(viewport)).toEqual({ height: 740, bodyHeight: 512 });
    window.innerHeight = 180;
    expect(measureDataListViewport(viewport)).toEqual({ height: 20, bodyHeight: 0 });
    viewport.innerHTML = '';
    expect(measureDataListViewport(viewport)).toEqual({ height: 20, bodyHeight: 20 });
  });
});

describe('ResponsiveDataList viewport observer lifecycle', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  let resizeCallback: ResizeObserverCallback;
  let observe: jest.Mock;
  let disconnect: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    observe = jest.fn();
    disconnect = jest.fn();
    globalThis.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      resizeCallback = callback;
      return { observe, disconnect, unobserve: jest.fn() };
    }) as any;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 900 });
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  it('measures native scroll, remeasures changed chrome and releases every observer', async () => {
    const { container, unmount } = render(
      <div className='ant-modal-body'>
        <ResponsiveDataListViewport>
          {({ scroll }) => (
            <>
              <output>{String(scroll.y)}</output>
              <div className='responsive-data-list-toolbar' />
              <div className='ant-table-header' />
              <div className='ant-table-body' />
              <ul className='ant-pagination' />
            </>
          )}
        </ResponsiveDataListViewport>
      </div>,
    );
    const boundary = container.firstElementChild!;
    setRect(boundary, { bottom: 700 });
    setRect(container.querySelector('.responsive-data-list-viewport')!, { top: 100 });
    setRect(container.querySelector('.ant-table-body')!, { top: 200 });
    act(() => jest.advanceTimersByTime(20));
    expect(screen.getByRole('status')).toHaveTextContent('500');
    expect(observe).toHaveBeenCalledWith(boundary);
    expect(container.querySelector('.responsive-data-list-viewport')).toHaveStyle({
      height: '600px',
    });
    act(() => {
      resizeCallback([], {} as any);
      resizeCallback([], {} as any);
      jest.advanceTimersByTime(20);
    });
    expect(screen.getByRole('status')).toHaveTextContent('500');
    const button = document.createElement('button');
    await act(async () => container.querySelector('.responsive-data-list-toolbar')!.append(button));
    act(() => jest.advanceTimersByTime(20));
    setRect(boundary, { bottom: 800 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('fullscreenchange'));
      jest.advanceTimersByTime(20);
    });
    expect(screen.getByRole('status')).toHaveTextContent('600');
    act(() => resizeCallback([], {} as any));
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('leaves embedded business tables in their surrounding scroll container when disabled', () => {
    const { container, rerender } = render(
      <ResponsiveDataListViewport enabled={false}>
        {({ scroll }) => <output>{JSON.stringify(scroll)}</output>}
      </ResponsiveDataListViewport>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('{"x":"max-content"}');
    expect(container.firstElementChild).not.toHaveClass('responsive-data-list-viewport');
    expect(observe).not.toHaveBeenCalled();
    rerender(
      <ResponsiveDataListViewport>
        {({ scroll }) => <output>{String(scroll.y)}</output>}
      </ResponsiveDataListViewport>,
    );
    act(() => jest.advanceTimersByTime(20));
    expect(screen.getByRole('status')).toHaveTextContent('900');
  });
});
