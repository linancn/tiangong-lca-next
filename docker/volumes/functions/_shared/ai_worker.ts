import type { SupabaseClient } from '@supabase/supabase-js@2';

type JsonRecord = Record<string, unknown>;

export type AiWorkerJobProjection = {
  id: string;
  status: string;
  phase?: string | null;
  progress?: number | null;
  resultSchemaVersion?: string | null;
  result?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AiWorkerRpcError = {
  source: 'contract' | 'transport';
  code: string;
  message: string;
  status: number;
};

type AiWorkerResult =
  { ok: true; job: AiWorkerJobProjection } | { ok: false; error: AiWorkerRpcError };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeJob(value: unknown): AiWorkerJobProjection | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.status !== 'string') {
    return null;
  }
  return value as AiWorkerJobProjection;
}

async function callAiWorkerRpc(
  supabase: SupabaseClient,
  name: string,
  args: JsonRecord,
): Promise<AiWorkerResult> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    return {
      ok: false,
      error: {
        source: 'transport',
        code: typeof error.code === 'string' ? error.code : 'AI_RPC_FAILED',
        message: 'AI worker database RPC failed',
        status: 502,
      },
    };
  }

  if (!isRecord(data)) {
    return {
      ok: false,
      error: {
        source: 'transport',
        code: 'AI_RPC_RESPONSE_INVALID',
        message: 'AI worker database RPC returned an invalid response',
        status: 502,
      },
    };
  }

  if (data.ok !== true) {
    return {
      ok: false,
      error: {
        source: 'contract',
        code: typeof data.code === 'string' ? data.code : 'AI_RPC_REJECTED',
        message: typeof data.message === 'string' ? data.message : 'AI worker request was rejected',
        status: typeof data.status === 'number' ? data.status : 400,
      },
    };
  }

  const job = normalizeJob(data.data);
  if (!job) {
    return {
      ok: false,
      error: {
        source: 'transport',
        code: 'AI_JOB_PROJECTION_INVALID',
        message: 'AI worker database RPC returned an invalid job projection',
        status: 502,
      },
    };
  }
  return { ok: true, job };
}

export async function enqueueAiTidasSuggestion(
  supabase: SupabaseClient,
  request: {
    requestedBy: string;
    dataType: 'process' | 'flow';
    data: JsonRecord;
  },
): Promise<AiWorkerResult> {
  return await callAiWorkerRpc(supabase, 'svc_ai_tidas_suggestion_enqueue', {
    p_requested_by: request.requestedBy,
    p_data_type: request.dataType,
    p_data: request.data,
  });
}

export async function readAiTidasSuggestion(
  supabase: SupabaseClient,
  request: { requestedBy: string; jobId: string },
): Promise<AiWorkerResult> {
  return await callAiWorkerRpc(supabase, 'svc_ai_tidas_suggestion_read', {
    p_requested_by: request.requestedBy,
    p_job_id: request.jobId,
  });
}
