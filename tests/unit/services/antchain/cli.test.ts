/**
 * CLI execution tests for Antchain service
 * Path: src/services/antchain/api.ts
 *
 * These tests ensure that the workflow invoked by the module-level IIFE is
 * covered and behaves correctly when the module is executed directly versus
 * imported as a dependency.
 */

const ORIGINAL_ARGV = [...process.argv];
const MODULE_PATH = '/mock/project/src/services/antchain/api.ts';
const FORCE_RUN_ENV_KEY = 'ANTCHAIN_CLI_FORCE_RUN';

const mockConsole = () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  return { logSpy, errorSpy };
};

const registerMocks = (invokeMock: jest.Mock) => {
  jest.doMock('@/services/supabase', () => ({
    supabase: {
      functions: {
        invoke: invokeMock,
      },
    },
  }));

  jest.doMock(
    'url',
    () => ({
      fileURLToPath: jest.fn(() => MODULE_PATH),
    }),
    { virtual: true },
  );
};

const importCliModule = async () => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@/services/antchain/api');
  });
  // Allow any pending microtasks triggered by the module-level IIFE to settle
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

describe('Antchain CLI workflow execution', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.argv = [...ORIGINAL_ARGV];
    delete process.env[FORCE_RUN_ENV_KEY];
  });

  it('executes the complete calculation workflow when run as the main module', async () => {
    const invokeMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          success: true,
          instanceId: 'instance-001',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          status: 'INSTANCE_COMPLETED',
          coDatasetId: 'dataset-XYZ',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ valueList: [{ metric: 'co2', value: 42 }] }],
        },
        error: null,
      });

    jest.resetModules();
    registerMocks(invokeMock);
    const { logSpy, errorSpy } = mockConsole();
    process.argv = ['node', MODULE_PATH];
    process.env[FORCE_RUN_ENV_KEY] = 'true';

    await importCliModule();

    expect(invokeMock).toHaveBeenCalledTimes(3);
    expect(invokeMock).toHaveBeenNthCalledWith(
      1,
      'create_calculation',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          dataSetParams1: expect.objectContaining({ id: expect.any(String) }),
          dataSetParams2: expect.objectContaining({ id: expect.any(String) }),
        }),
      }),
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      2,
      'query_calculation_status',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ instanceId: 'instance-001' }),
      }),
    );
    expect(invokeMock).toHaveBeenNthCalledWith(
      3,
      'query_calculation_results',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ coDatasetId: 'dataset-XYZ' }),
      }),
    );
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logs an error when the workflow cannot be created successfully', async () => {
    const invokeMock = jest.fn().mockResolvedValueOnce({
      data: { success: false },
      error: null,
    });

    jest.resetModules();
    registerMocks(invokeMock);
    const { logSpy, errorSpy } = mockConsole();
    process.argv = ['node', MODULE_PATH];
    process.env[FORCE_RUN_ENV_KEY] = 'true';

    await importCliModule();

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('does not execute the workflow when imported as a dependency', async () => {
    const invokeMock = jest.fn();

    jest.resetModules();
    registerMocks(invokeMock);
    const { logSpy, errorSpy } = mockConsole();
    process.argv = ['node', '/some/other/script.ts'];
    process.env[FORCE_RUN_ENV_KEY] = 'false';

    await importCliModule();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalledWith('Running in Node.js environment');
    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
