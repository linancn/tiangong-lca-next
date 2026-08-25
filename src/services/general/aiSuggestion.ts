import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export const AI_SUGGESTION_RESULT_SCHEMA_VERSION = 'ai.tidas_suggestion.result.v1';
export const AI_SUGGESTION_POLL_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_SUGGESTION_POLL_INTERVALS_MS = [1000, 2000, 3000, 5000] as const;

type JsonRecord = Record<string, unknown>;
type AiSuggestionDataType = 'process' | 'flow';
type PendingAiSuggestionStatus = 'queued' | 'running' | 'stale';
type TerminalAiSuggestionStatus = 'completed' | 'failed' | 'cancelled' | 'blocked';

export type AiSuggestionResult = {
  schemaVersion: typeof AI_SUGGESTION_RESULT_SCHEMA_VERSION;
  status: 'complete' | 'partial';
  dataType: AiSuggestionDataType;
  data: JsonRecord;
  [key: string]: unknown;
};

export type AiSuggestionJobProjection = {
  jobId: string;
  status: PendingAiSuggestionStatus | TerminalAiSuggestionStatus;
  phase?: string | null;
  progress?: number;
  resultSchemaVersion?: string;
  result?: unknown;
  error?: { code?: string; message?: string; retryable?: boolean };
};

export type AiSuggestionPollingOptions = {
  timeoutMs?: number;
  intervalsMs?: readonly number[];
  signal?: AbortSignal;
  onTick?: (job: AiSuggestionJobProjection) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

async function getAccessToken(): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token?.trim();
  if (!token) throw new Error('ai_auth_required');
  return token;
}

async function invokeAiSuggest(accessToken: string, body: JsonRecord): Promise<JsonRecord> {
  const { data, error } = await supabase.functions.invoke('ai_suggest', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body,
    region: FunctionRegion.UsEast1,
  });
  if (error) throw new Error(error.message || 'ai_suggest_failed');
  if (!isRecord(data) || data.ok !== true || !isRecord(data.data)) {
    throw new Error('ai_suggest_response_invalid');
  }
  return data.data;
}

function parseJobProjection(value: JsonRecord): AiSuggestionJobProjection {
  const jobId = requiredText(value.jobId);
  const status = requiredText(value.status);
  if (!jobId || !status) throw new Error('ai_job_projection_invalid');
  if (
    !['queued', 'running', 'stale', 'completed', 'failed', 'cancelled', 'blocked'].includes(status)
  ) {
    throw new Error('ai_job_status_invalid');
  }
  return value as AiSuggestionJobProjection;
}

function parseCompletedResult(job: AiSuggestionJobProjection): AiSuggestionResult {
  if (
    job.resultSchemaVersion !== AI_SUGGESTION_RESULT_SCHEMA_VERSION ||
    !isRecord(job.result) ||
    job.result.schemaVersion !== AI_SUGGESTION_RESULT_SCHEMA_VERSION ||
    (job.result.status !== 'complete' && job.result.status !== 'partial') ||
    (job.result.dataType !== 'process' && job.result.dataType !== 'flow') ||
    !isRecord(job.result.data)
  ) {
    throw new Error('ai_result_invalid');
  }
  return job.result as AiSuggestionResult;
}

function terminalError(job: AiSuggestionJobProjection): Error {
  const code = requiredText(job.error?.code) ?? `ai_job_${job.status}`;
  return new Error(code);
}

export async function pollAiSuggestionJob(
  accessToken: string,
  jobId: string,
  options: AiSuggestionPollingOptions = {},
): Promise<AiSuggestionResult> {
  const timeoutMs = options.timeoutMs ?? AI_SUGGESTION_POLL_TIMEOUT_MS;
  const intervals = options.intervalsMs?.length
    ? options.intervalsMs
    : AI_SUGGESTION_POLL_INTERVALS_MS;
  const now = options.now ?? Date.now;
  const wait = options.sleep ?? sleep;
  const startedAt = now();
  let attempt = 0;

  while (true) {
    if (options.signal?.aborted) throw new Error('ai_poll_aborted');

    const job = parseJobProjection(await invokeAiSuggest(accessToken, { action: 'read', jobId }));
    options.onTick?.(job);

    if (job.status === 'completed') return parseCompletedResult(job);
    if (job.status === 'failed' || job.status === 'cancelled' || job.status === 'blocked') {
      throw terminalError(job);
    }
    if (now() - startedAt >= timeoutMs) throw new Error('ai_poll_timeout');

    const interval = intervals[Math.min(attempt, intervals.length - 1)];
    attempt += 1;
    await wait(interval);
  }
}

export async function getAISuggestion(
  tidasData: unknown,
  dataType: string,
  options: JsonRecord = {},
  pollingOptions: AiSuggestionPollingOptions = {},
): Promise<AiSuggestionResult> {
  const accessToken = await getAccessToken();
  const queued = parseJobProjection(
    await invokeAiSuggest(accessToken, {
      action: 'enqueue',
      tidasData,
      dataType,
      options,
    }),
  );
  return await pollAiSuggestionJob(accessToken, queued.jobId, pollingOptions);
}
