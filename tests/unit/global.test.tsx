// @ts-nocheck

const mockNotification = {
  destroy: jest.fn(),
  open: jest.fn(),
};
const mockMessage = {
  warning: jest.fn(),
};
const mockUseIntl = jest.fn(() => ({
  formatMessage: ({ id, defaultMessage }: any) => defaultMessage ?? id,
}));

const flushAsync = async () => {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
};

describe('global runtime side effects', () => {
  const originalCaches = window.caches;
  const originalGlobalCaches = global.caches;
  const originalLocation = window.location;
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: originalCaches,
    });
    Object.defineProperty(global, 'caches', {
      configurable: true,
      value: originalGlobalCaches,
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  const loadGlobalModule = async ({
    pwa,
    eventHandlers,
    getRegistrations,
    getRegistration,
    cacheKeys = [],
    cacheKeyError,
    reloadSpy,
  }: any) => {
    const addEventListenerSpy = jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((event: string, handler: any) => {
        eventHandlers[event] = handler;
      });

    jest.doMock('../../config/defaultSettings', () => ({
      __esModule: true,
      default: {
        pwa,
      },
    }));

    jest.doMock('@umijs/max', () => ({
      __esModule: true,
      useIntl: () => mockUseIntl(),
    }));

    jest.doMock('antd', () => ({
      __esModule: true,
      Button: ({ children, onClick }: any) => (
        <button type='button' onClick={onClick}>
          {children}
        </button>
      ),
      message: mockMessage,
      notification: mockNotification,
    }));

    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: cacheKeyError
          ? jest.fn().mockRejectedValue(cacheKeyError)
          : jest.fn().mockResolvedValue(cacheKeys),
        delete: jest.fn().mockResolvedValue(true),
      },
    });
    Object.defineProperty(global, 'caches', {
      configurable: true,
      value: window.caches,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: jest.fn().mockResolvedValue(getRegistrations ?? []),
        getRegistration: jest.fn().mockResolvedValue(getRegistration ?? null),
      },
    });
    const locationValue = reloadSpy
      ? {
          protocol: originalLocation.protocol,
          reload: reloadSpy ?? jest.fn(),
        }
      : originalLocation;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: locationValue,
    });
    Object.defineProperty(global, 'MessageChannel', {
      configurable: true,
      value: class {
        port1: any;
        port2: any;
        constructor() {
          this.port1 = { onmessage: null };
          this.port2 = { __peer: this.port1 };
        }
      },
    });

    require('@/global');
    addEventListenerSpy.mockRestore();
    await flushAsync();
  };

  it('registers PWA offline and updated handlers, then clears cache and reloads after update', async () => {
    const eventHandlers: Record<string, any> = {};
    const reloadSpy = jest.fn();

    await loadGlobalModule({
      pwa: true,
      eventHandlers,
      cacheKeys: ['cache-a'],
      reloadSpy,
    });

    expect(eventHandlers['sw.offline']).toBeDefined();
    expect(eventHandlers['sw.updated']).toBeDefined();

    eventHandlers['sw.offline']();
    expect(mockMessage.warning).toHaveBeenCalledWith('app.pwa.offline');

    const waitingWorker = {
      postMessage: jest.fn((_msg: any, [port]: any[]) => {
        port.__peer.onmessage({ data: {} });
      }),
    };
    eventHandlers['sw.updated']({
      detail: {
        waiting: waitingWorker,
      },
    });

    expect(mockNotification.open).toHaveBeenCalledTimes(1);
    const openPayload = mockNotification.open.mock.calls[0][0];
    expect(openPayload.message).toBe('app.pwa.serviceworker.updated');
    expect(openPayload.description).toBe('app.pwa.serviceworker.updated.hint');

    openPayload.btn.props.onClick();
    await flushAsync();

    expect(mockNotification.destroy).toHaveBeenCalledWith(openPayload.key);
    expect(waitingWorker.postMessage).toHaveBeenCalled();
    expect(window.caches.keys).toHaveBeenCalled();
    expect(window.caches.delete).toHaveBeenCalledWith('cache-a');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the app open when no waiting service worker exists and exposes a no-op onClose', async () => {
    const eventHandlers: Record<string, any> = {};
    const reloadSpy = jest.fn();

    await loadGlobalModule({
      pwa: true,
      eventHandlers,
      cacheKeys: ['cache-a'],
      reloadSpy,
    });

    eventHandlers['sw.updated']({
      detail: {},
    });

    expect(mockNotification.open).toHaveBeenCalledTimes(1);
    const openPayload = mockNotification.open.mock.calls[0][0];

    await expect(openPayload.onClose()).resolves.toBeNull();

    openPayload.btn.props.onClick();
    await flushAsync();

    expect(mockNotification.destroy).toHaveBeenCalledWith(openPayload.key);
    expect(window.caches.keys).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('logs cache cleanup failures during service worker update reload', async () => {
    const eventHandlers: Record<string, any> = {};
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const reloadSpy = jest.fn();

    await loadGlobalModule({
      pwa: true,
      eventHandlers,
      cacheKeyError: new Error('cache failed'),
      reloadSpy,
    });

    const waitingWorker = {
      postMessage: jest.fn((_msg: any, [port]: any[]) => {
        port.__peer.onmessage({ data: {} });
      }),
    };

    eventHandlers['sw.updated']({
      detail: {
        waiting: waitingWorker,
      },
    });

    const openPayload = mockNotification.open.mock.calls[0][0];
    openPayload.btn.props.onClick();
    await flushAsync();

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('does not unregister service workers when PWA is disabled on non-https origins', async () => {
    const eventHandlers: Record<string, any> = {};
    const unregister = jest.fn();

    await loadGlobalModule({
      pwa: false,
      eventHandlers,
      getRegistrations: [{ unregister }],
      getRegistration: { unregister },
      cacheKeys: ['cache-a'],
    });

    expect(eventHandlers['sw.offline']).toBeUndefined();
    expect(eventHandlers['sw.updated']).toBeUndefined();
    expect(unregister).not.toHaveBeenCalled();
    expect(window.caches.keys).not.toHaveBeenCalled();
  });
});
