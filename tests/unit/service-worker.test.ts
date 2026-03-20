// @ts-nocheck

describe('service worker bootstrap', () => {
  const originalAddEventListener = globalThis.addEventListener;
  const originalSelf = globalThis.self;
  const originalWorkbox = globalThis.workbox;

  let messageHandler: ((event: any) => void) | undefined;
  let networkFirstResult: any;
  let mockSetCacheNameDetails: jest.Mock;
  let mockClientsClaim: jest.Mock;
  let mockPrecacheAndRoute: jest.Mock;
  let mockRegisterNavigationRoute: jest.Mock;
  let mockRegisterRoute: jest.Mock;
  let mockNetworkFirst: jest.Mock;
  let mockSkipWaiting: jest.Mock;

  const loadServiceWorker = () => {
    jest.isolateModules(() => {
      require('@/service-worker.js');
    });
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    messageHandler = undefined;
    networkFirstResult = { strategy: 'network-first' };
    mockSetCacheNameDetails = jest.fn();
    mockClientsClaim = jest.fn();
    mockPrecacheAndRoute = jest.fn();
    mockRegisterNavigationRoute = jest.fn();
    mockRegisterRoute = jest.fn();
    mockNetworkFirst = jest.fn(() => networkFirstResult);
    mockSkipWaiting = jest.fn(() => Promise.resolve());

    Object.defineProperty(globalThis, 'addEventListener', {
      configurable: true,
      value: jest.fn((type: string, handler: (event: any) => void) => {
        if (type === 'message') {
          messageHandler = handler;
        }
      }),
    });

    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      value: {
        __precacheManifest: [{ url: '/runtime.js' }],
        skipWaiting: mockSkipWaiting,
      },
    });

    Object.defineProperty(globalThis, 'workbox', {
      configurable: true,
      value: {
        core: {
          setCacheNameDetails: mockSetCacheNameDetails,
        },
        clientsClaim: mockClientsClaim,
        precaching: {
          precacheAndRoute: mockPrecacheAndRoute,
        },
        routing: {
          registerNavigationRoute: mockRegisterNavigationRoute,
          registerRoute: mockRegisterRoute,
        },
        strategies: {
          networkFirst: mockNetworkFirst,
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'addEventListener', {
      configurable: true,
      value: originalAddEventListener,
    });
    Object.defineProperty(globalThis, 'self', {
      configurable: true,
      value: originalSelf,
    });
    Object.defineProperty(globalThis, 'workbox', {
      configurable: true,
      value: originalWorkbox,
    });
  });

  it('registers workbox cache names, precache manifest, and runtime routes', () => {
    loadServiceWorker();

    expect(mockSetCacheNameDetails).toHaveBeenCalledWith({
      prefix: 'antd-pro',
      suffix: 'v5',
    });
    expect(mockClientsClaim).toHaveBeenCalledTimes(1);
    expect(mockPrecacheAndRoute).toHaveBeenCalledWith([{ url: '/runtime.js' }]);
    expect(mockRegisterNavigationRoute).toHaveBeenCalledWith('/index.html');
    expect(mockNetworkFirst).toHaveBeenCalledTimes(4);
    expect(mockRegisterRoute).toHaveBeenCalledTimes(4);
    expect(mockRegisterRoute.mock.calls[0][0]).toEqual(/\/api\//);
    expect(mockRegisterRoute.mock.calls[1][0]).toEqual(/^https:\/\/gw\.alipayobjects\.com\//);
    expect(mockRegisterRoute.mock.calls[2][0]).toEqual(/^https:\/\/cdnjs\.cloudflare\.com\//);
    expect(mockRegisterRoute.mock.calls[3][0]).toEqual(/\/color.less/);
    expect(
      mockRegisterRoute.mock.calls.every(([, strategy]) => strategy === networkFirstResult),
    ).toBe(true);
    expect(globalThis.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
  });

  it('replies after skip-waiting succeeds and ignores unrelated messages', async () => {
    loadServiceWorker();

    expect(messageHandler).toBeDefined();

    const unrelatedWaitUntil = jest.fn();
    messageHandler?.({
      ports: [],
      data: { type: 'other-event' },
      waitUntil: unrelatedWaitUntil,
    });
    expect(unrelatedWaitUntil).not.toHaveBeenCalled();

    const postMessage = jest.fn();
    const waitUntil = jest.fn((promise: Promise<any>) => promise);

    messageHandler?.({
      ports: [{ postMessage }],
      data: { type: 'skip-waiting' },
      waitUntil,
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];

    expect(mockSkipWaiting).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ error: null });
  });

  it('replies with an error when skip-waiting fails', async () => {
    const skipError = new Error('skip failed');
    mockSkipWaiting.mockRejectedValueOnce(skipError);

    loadServiceWorker();

    const postMessage = jest.fn();
    const waitUntil = jest.fn((promise: Promise<any>) => promise);

    messageHandler?.({
      ports: [{ postMessage }],
      data: { type: 'skip-waiting' },
      waitUntil,
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];

    expect(postMessage).toHaveBeenCalledWith({ error: skipError });
  });
});
