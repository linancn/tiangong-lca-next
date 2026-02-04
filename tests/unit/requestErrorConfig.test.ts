/**
 * Tests for request error handling configuration
 * Path: src/requestErrorConfig.ts
 */

import { errorConfig } from '@/requestErrorConfig';
import { message, notification } from 'antd';

jest.mock('antd', () => ({
  __esModule: true,
  message: {
    warning: jest.fn(),
    error: jest.fn(),
  },
  notification: {
    open: jest.fn(),
  },
}));

type MessageMock = {
  warning: jest.Mock;
  error: jest.Mock;
};

type NotificationMock = {
  open: jest.Mock;
};

const requireValue = <T>(value: T | undefined, name: string): T => {
  if (!value) {
    throw new Error(`${name} is missing`);
  }
  return value;
};

const {
  errorConfig: internalConfig,
  requestInterceptors = [],
  responseInterceptors = [],
} = errorConfig;
const errorThrower = requireValue(internalConfig?.errorThrower, 'errorThrower');
const errorHandler = requireValue(internalConfig?.errorHandler, 'errorHandler');
const requestInterceptor = requireValue(requestInterceptors[0], 'requestInterceptor');
const responseInterceptor = requireValue(responseInterceptors[0], 'responseInterceptor');

const callRequestInterceptor = (interceptor: any, arg: any) => {
  return Array.isArray(interceptor) ? interceptor[0](arg) : interceptor(arg);
};

const callResponseInterceptor = (interceptor: any, arg: any) => {
  return Array.isArray(interceptor) ? interceptor[0](arg) : interceptor(arg);
};

const messageMock = message as unknown as MessageMock;
const notificationMock = notification as unknown as NotificationMock;

describe('requestErrorConfig (src/requestErrorConfig.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createBizError = (showType?: number, errorMessage = 'failed', errorCode = 400) => {
    try {
      errorThrower({
        success: false,
        data: { foo: 'bar' },
        errorCode,
        errorMessage,
        showType,
      } as any);
    } catch (error: any) {
      return error;
    }

    throw new Error('Expected errorThrower to throw');
  };

  it('throws BizError with response info when success is false', () => {
    const error = createBizError(2, 'boom', 401);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('BizError');
    expect(error.info).toMatchObject({
      errorCode: 401,
      errorMessage: 'boom',
      showType: 2,
      data: { foo: 'bar' },
    });
  });

  it('does not throw when success is true', () => {
    expect(() =>
      errorThrower({
        success: true,
        data: {},
        errorCode: 200,
        errorMessage: 'ok',
      } as any),
    ).not.toThrow();
  });

  it('rethrows immediately when skipErrorHandler is provided', () => {
    const rawError = new Error('skip');
    expect(() => errorHandler(rawError, { skipErrorHandler: true })).toThrow(rawError);
  });

  it('shows warning for WARN_MESSAGE', () => {
    const error = createBizError(1, 'warn-path');

    errorHandler(error, {});

    expect(messageMock.warning).toHaveBeenCalledWith('warn-path');
    expect(messageMock.error).not.toHaveBeenCalled();
    expect(notificationMock.open).not.toHaveBeenCalled();
  });

  it('shows error toast for ERROR_MESSAGE', () => {
    const error = createBizError(2, 'error-path');

    errorHandler(error, {});

    expect(messageMock.error).toHaveBeenCalledWith('error-path');
    expect(notificationMock.open).not.toHaveBeenCalled();
  });

  it('opens notification for NOTIFICATION type', () => {
    const error = createBizError(3, 'notify-path', 503);

    errorHandler(error, {});

    expect(notificationMock.open).toHaveBeenCalledWith({
      description: 'notify-path',
      message: 503,
    });
    expect(messageMock.error).not.toHaveBeenCalled();
  });

  it('does nothing for SILENT and REDIRECT types', () => {
    const silentError = createBizError(0, 'silent-path');
    const redirectError = createBizError(9, 'redirect-path');

    errorHandler(silentError, {});
    errorHandler(redirectError, {});

    expect(messageMock.error).not.toHaveBeenCalled();
    expect(messageMock.warning).not.toHaveBeenCalled();
    expect(notificationMock.open).not.toHaveBeenCalled();
  });

  it('falls back to error toast for unknown showType', () => {
    const error = createBizError(undefined, 'default-path');

    errorHandler(error, {});

    expect(messageMock.error).toHaveBeenCalledWith('default-path');
  });

  it('shows status message for non-Biz errors with response', () => {
    const error = { response: { status: 503 } };

    errorHandler(error as any, {});

    expect(messageMock.error).toHaveBeenCalledWith('Response status:503');
  });

  it('shows request missing message when request exists but no response', () => {
    errorHandler({ request: {} } as any, {});

    expect(messageMock.error).toHaveBeenCalledWith('None response! Please retry.');
  });

  it('shows generic error message for unknown errors', () => {
    errorHandler({} as any, {});

    expect(messageMock.error).toHaveBeenCalledWith('Request error, please retry.');
  });

  it('appends token query in request interceptor', () => {
    const config = { url: '/api/example', headers: { 'x-test': '1' } };

    const result = callRequestInterceptor(requestInterceptor, config as any);

    expect(result).not.toBe(config);
    expect(result.url).toBe('/api/example?token = 123');
    expect(result.headers).toEqual(config.headers);
  });

  it('returns response and reports failure in response interceptor', () => {
    const response = { data: { success: false } };

    const result = callResponseInterceptor(responseInterceptor, response as any);

    expect(result).toBe(response);
    expect(messageMock.error).toHaveBeenCalledWith('请求失败！');
  });

  it('passes through successful responses silently', () => {
    const response = { data: { success: true } };

    const result = callResponseInterceptor(responseInterceptor, response as any);

    expect(result).toBe(response);
    expect(messageMock.error).not.toHaveBeenCalled();
  });
});
