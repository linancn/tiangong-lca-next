const mockGetSession = jest.fn();
const mockInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import {
  AI_SUGGESTION_POLL_INTERVALS_MS,
  AI_SUGGESTION_RESULT_SCHEMA_VERSION,
  getAISuggestion,
  pollAiSuggestionJob,
} from '@/services/general/aiSuggestion';
import { FunctionRegion } from '@supabase/supabase-js';

const ACCESS_TOKEN = 'access-token';
const JOB_ID = '22222222-2222-4222-8222-222222222222';

const completedResult = {
  schemaVersion: AI_SUGGESTION_RESULT_SCHEMA_VERSION,
  status: 'complete' as const,
  dataType: 'process' as const,
  data: { processDataSet: { name: 'improved' } },
};

const envelope = (data: Record<string, unknown>) => ({
  data: { ok: true, data },
  error: null,
});

const completedJob = (overrides: Record<string, unknown> = {}) => ({
  jobId: JOB_ID,
  status: 'completed',
  resultSchemaVersion: AI_SUGGESTION_RESULT_SCHEMA_VERSION,
  result: completedResult,
  ...overrides,
});

beforeEach(() => {
  jest.useRealTimers();
  mockGetSession.mockReset();
  mockInvoke.mockReset();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: ` ${ACCESS_TOKEN} ` } },
  });
});

it('enqueues, polls, and returns the versioned AI Worker result', async () => {
  const onTick = jest.fn();
  const wait = jest.fn().mockResolvedValue(undefined);
  mockInvoke
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'queued' }))
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'running', progress: 25 }))
    .mockResolvedValueOnce(envelope(completedJob()));

  await expect(
    getAISuggestion(
      '{"processDataSet":{}}',
      'process',
      { maxRetries: 1 },
      { intervalsMs: [3], sleep: wait, now: () => 0, onTick },
    ),
  ).resolves.toEqual(completedResult);

  expect(mockInvoke.mock.calls).toEqual([
    [
      'ai_suggest',
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: {
          action: 'enqueue',
          tidasData: '{"processDataSet":{}}',
          dataType: 'process',
          options: { maxRetries: 1 },
        },
        region: FunctionRegion.UsEast1,
      },
    ],
    [
      'ai_suggest',
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: { action: 'read', jobId: JOB_ID },
        region: FunctionRegion.UsEast1,
      },
    ],
    [
      'ai_suggest',
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        body: { action: 'read', jobId: JOB_ID },
        region: FunctionRegion.UsEast1,
      },
    ],
  ]);
  expect(wait).toHaveBeenCalledTimes(1);
  expect(onTick).toHaveBeenCalledTimes(2);
});

it('requires an authenticated session before enqueue', async () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  await expect(getAISuggestion('{}', 'process')).rejects.toThrow('ai_auth_required');
  expect(mockInvoke).not.toHaveBeenCalled();
});

it.each([
  [{ data: null, error: { message: 'edge unavailable' } }, 'edge unavailable'],
  [{ data: null, error: { message: '' } }, 'ai_suggest_failed'],
])('surfaces bounded function invocation failures', async (reply, expected) => {
  mockInvoke.mockResolvedValue(reply);
  await expect(getAISuggestion('{}', 'process')).rejects.toThrow(expected);
});

it.each([[null], [{}], [{ ok: false, data: {} }], [{ ok: true, data: null }]])(
  'rejects malformed Edge envelopes: %p',
  async (data) => {
    mockInvoke.mockResolvedValue({ data, error: null });
    await expect(getAISuggestion('{}', 'process')).rejects.toThrow('ai_suggest_response_invalid');
  },
);

it.each([
  [{ status: 'queued' }, 'ai_job_projection_invalid'],
  [{ jobId: JOB_ID }, 'ai_job_projection_invalid'],
  [{ jobId: JOB_ID, status: 'mystery' }, 'ai_job_status_invalid'],
])('rejects malformed job projections', async (job, expected) => {
  mockInvoke.mockResolvedValue(envelope(job));
  await expect(getAISuggestion('{}', 'process')).rejects.toThrow(expected);
});

it('uses progressive bounded intervals for queued, running, and stale jobs', async () => {
  const wait = jest.fn().mockResolvedValue(undefined);
  const onTick = jest.fn();
  mockInvoke
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'queued' }))
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'running' }))
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'stale' }))
    .mockResolvedValueOnce(envelope(completedJob()));

  await pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, {
    intervalsMs: [3, 5],
    sleep: wait,
    now: () => 0,
    onTick,
  });

  expect(wait.mock.calls).toEqual([[3], [5], [5]]);
  expect(onTick).toHaveBeenCalledTimes(4);
});

it('uses the default polling timer and interval when no overrides are supplied', async () => {
  jest.useFakeTimers();
  mockInvoke
    .mockResolvedValueOnce(envelope({ jobId: JOB_ID, status: 'queued' }))
    .mockResolvedValueOnce(envelope(completedJob()));

  const pending = pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID);
  await jest.advanceTimersByTimeAsync(AI_SUGGESTION_POLL_INTERVALS_MS[0]);

  await expect(pending).resolves.toEqual(completedResult);
  jest.useRealTimers();
});

it('aborts before issuing another status request', async () => {
  const controller = new AbortController();
  controller.abort();

  await expect(
    pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, { signal: controller.signal }),
  ).rejects.toThrow('ai_poll_aborted');
  expect(mockInvoke).not.toHaveBeenCalled();
});

it('times out without sleeping after the timeout boundary', async () => {
  const wait = jest.fn();
  const now = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(10);
  mockInvoke.mockResolvedValue(envelope({ jobId: JOB_ID, status: 'queued' }));

  await expect(
    pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, {
      timeoutMs: 10,
      intervalsMs: [1],
      sleep: wait,
      now,
    }),
  ).rejects.toThrow('ai_poll_timeout');
  expect(wait).not.toHaveBeenCalled();
});

it.each([
  ['failed', { code: 'ai_provider_timeout' }, 'ai_provider_timeout'],
  ['cancelled', undefined, 'ai_job_cancelled'],
  ['blocked', { code: '   ' }, 'ai_job_blocked'],
])('fails closed for terminal %s jobs', async (status, error, expected) => {
  mockInvoke.mockResolvedValue(envelope({ jobId: JOB_ID, status, error }));
  await expect(pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, { now: () => 0 })).rejects.toThrow(
    expected,
  );
});

it.each([
  { overrides: { resultSchemaVersion: 'wrong' }, label: 'wrong result schema' },
  { overrides: { result: null }, label: 'missing result' },
  {
    overrides: { result: { ...completedResult, schemaVersion: 'wrong' } },
    label: 'wrong nested schema',
  },
  {
    overrides: { result: { ...completedResult, status: 'failed' } },
    label: 'failed result state',
  },
  {
    overrides: { result: { ...completedResult, dataType: 'model' } },
    label: 'wrong data type',
  },
  {
    overrides: { result: { ...completedResult, data: [] } },
    label: 'non-object result data',
  },
])('rejects invalid completed results: $label', async ({ overrides }) => {
  mockInvoke.mockResolvedValue(envelope(completedJob(overrides as Record<string, unknown>)));
  await expect(pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, { now: () => 0 })).rejects.toThrow(
    'ai_result_invalid',
  );
});

it('accepts a valid partial result', async () => {
  const partial = { ...completedResult, status: 'partial' as const, dataType: 'flow' as const };
  mockInvoke.mockResolvedValue(envelope(completedJob({ result: partial })));

  await expect(pollAiSuggestionJob(ACCESS_TOKEN, JOB_ID, { now: () => 0 })).resolves.toEqual(
    partial,
  );
});
