const mockAbortSignal = jest.fn();
const mockRpc = jest.fn(() => ({ abortSignal: mockAbortSignal }));
const mockSchema = jest.fn((schema: string) => {
  void schema;
  return { rpc: mockRpc };
});

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: { schema: (schema: string) => mockSchema(schema) },
}));

import {
  getSystemStatus,
  isRuntimeConfigEnabled,
  isSystemMaintenanceActive,
  NORMAL_SYSTEM_STATUS,
  systemStatusSchema,
} from '@/services/general/systemStatus';

const maintenanceStatus = {
  schemaVersion: 1,
  phase: 'maintenance',
  reason: 'release_upgrade',
  targetVersion: '0.0.71',
  estimatedEndAt: '2026-08-14T10:30:00+08:00',
  releaseId: 'release-20260814',
  updatedAt: '2026-08-14T09:00:00+08:00',
};

const originalRuntimeConfigEnabled = process.env.APP_RUNTIME_CONFIG_ENABLED;

describe('systemStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.APP_RUNTIME_CONFIG_ENABLED;
    mockAbortSignal.mockResolvedValue({ data: maintenanceStatus, error: null });
  });

  afterAll(() => {
    if (originalRuntimeConfigEnabled === undefined) {
      delete process.env.APP_RUNTIME_CONFIG_ENABLED;
    } else {
      process.env.APP_RUNTIME_CONFIG_ENABLED = originalRuntimeConfigEnabled;
    }
  });

  it('reads and validates the fixed API facade', async () => {
    await expect(getSystemStatus()).resolves.toEqual(maintenanceStatus);

    expect(mockSchema).toHaveBeenCalledWith('api');
    expect(mockRpc).toHaveBeenCalledWith('qry_system_status');
    expect(mockAbortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it.each([
    [undefined, true],
    ['', true],
    ['true', true],
    ['unexpected', true],
    [' false ', false],
    ['FALSE', false],
  ])('maps runtime-config env %p to enabled=%s', (value, expected) => {
    expect(isRuntimeConfigEnabled(value)).toBe(expected);
  });

  it('skips the runtime-config RPC when explicitly disabled', async () => {
    process.env.APP_RUNTIME_CONFIG_ENABLED = 'false';

    await expect(getSystemStatus()).resolves.toBe(NORMAL_SYSTEM_STATUS);
    expect(mockSchema).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockAbortSignal).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'RPC errors', result: { data: null, error: { message: 'offline' } } },
    {
      label: 'malformed payloads',
      result: { data: { schemaVersion: 1, phase: 'unknown' }, error: null },
    },
  ])('fails open to normal for $label', async ({ result }) => {
    mockAbortSignal.mockResolvedValueOnce(result);
    await expect(getSystemStatus()).resolves.toBe(NORMAL_SYSTEM_STATUS);
  });

  it('fails open when the request rejects', async () => {
    mockAbortSignal.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(getSystemStatus()).resolves.toBe(NORMAL_SYSTEM_STATUS);
  });

  it('aborts a startup read after the fixed timeout', async () => {
    jest.useFakeTimers();
    let finishRequest!: (value: unknown) => void;
    mockAbortSignal.mockImplementationOnce(
      (signal: AbortSignal) =>
        new Promise((resolve) => {
          finishRequest = resolve;
          expect(signal.aborted).toBe(false);
        }),
    );

    const request = getSystemStatus();
    const signal = mockAbortSignal.mock.calls[0][0] as AbortSignal;
    jest.advanceTimersByTime(4000);
    expect(signal.aborted).toBe(true);
    finishRequest({ data: NORMAL_SYSTEM_STATUS, error: null });
    await expect(request).resolves.toEqual(NORMAL_SYSTEM_STATUS);
    jest.useRealTimers();
  });

  it('accepts only the versioned status shape', () => {
    expect(systemStatusSchema.safeParse(maintenanceStatus).success).toBe(true);
    expect(systemStatusSchema.safeParse({ ...maintenanceStatus, extra: true }).success).toBe(false);
  });

  it.each([
    ['normal', false],
    ['maintenance', true],
    ['verifying', true],
    [undefined, false],
  ])('maps phase %s to maintenance=%s', (phase, expected) => {
    expect(
      isSystemMaintenanceActive(phase ? ({ schemaVersion: 1, phase } as any) : undefined),
    ).toBe(expected);
  });
});
