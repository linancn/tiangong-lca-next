import { supabase } from '@/services/supabase';
import type { SupabaseError, SupabaseMutationResult } from '@/services/supabase/data';
import { FunctionRegion } from '@supabase/supabase-js';

export type WorkerJobStatus =
  'queued' | 'running' | 'waiting' | 'completed' | 'blocked' | 'stale' | 'failed' | 'cancelled';

export type WorkerJobResult = {
  id?: string;
  jobKind?: string;
  workerRuntime?: string;
  workerQueue?: string;
  rootJobId?: string | null;
  parentJobId?: string | null;
  priority?: number | string | null;
  subjectType?: string;
  subjectId?: string;
  subjectVersion?: string;
  requestedBy?: string;
  status: WorkerJobStatus;
  phase?: string | null;
  progress?: number | string | null;
  result?: unknown;
  resultRef?: unknown;
  diagnostics?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  blockerCodes?: string[];
  resolutionScope?: 'user' | 'operator' | 'system' | null;
  retryable?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  cancelledAt?: string | null;
  [key: string]: unknown;
};

export type WorkerJobRequest =
  | {
      action?: 'list';
      subjectType?: string;
      subjectId?: string;
      visibility?: 'user' | 'operator';
      statuses?: WorkerJobStatus[];
      limit?: number;
    }
  | {
      action: 'read';
      jobId: string;
    }
  | {
      action: 'cancel';
      jobId: string;
      reason?: string;
    };

function normalizeWorkerJobRows<Row extends Record<string, unknown>>(payload: unknown): Row[] {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as Row[];
    }
    return data === null || data === undefined ? [] : [data as Row];
  }

  if (Array.isArray(payload)) {
    return payload as Row[];
  }

  return payload === null || payload === undefined ? [] : [payload as Row];
}

async function parseWorkerJobCommandErrorPayload(error: any) {
  if (!error?.context || typeof error.context.json !== 'function') {
    return null;
  }

  try {
    return await error.context.json();
  } catch (_parseError) {
    return null;
  }
}

function isWorkerJobEnvelope(payload: unknown): payload is {
  command?: string;
  data?: WorkerJobResult | WorkerJobResult[];
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as { command?: unknown; data?: unknown };
  return (
    (candidate.command === 'worker_jobs_list' ||
      candidate.command === 'worker_jobs_read' ||
      candidate.command === 'worker_jobs_cancel') &&
    candidate.data !== undefined
  );
}

function normalizeWorkerJobCommandError(error: any, payload: any): SupabaseError {
  return {
    message:
      payload?.message || payload?.detail || payload?.error || error?.message || 'Request failed',
    code: typeof payload?.code === 'string' ? payload.code : 'FUNCTION_ERROR',
    details: payload?.details ?? '',
    hint: payload?.hint ?? '',
  } as SupabaseError;
}

export async function requestWorkerJobsApi<Row extends WorkerJobResult = WorkerJobResult>(
  request: WorkerJobRequest,
): Promise<SupabaseMutationResult<Row>> {
  const session = await supabase.auth.getSession();
  if (!session?.data?.session) {
    return {
      data: null,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        details: '',
        hint: '',
      } as SupabaseError,
      count: null,
      status: 401,
      statusText: 'AUTH_REQUIRED',
    };
  }

  const body =
    request.action === 'read'
      ? {
          action: 'read',
          jobId: request.jobId,
        }
      : request.action === 'cancel'
        ? {
            action: 'cancel',
            jobId: request.jobId,
            ...(request.reason ? { reason: request.reason } : {}),
          }
        : {
            action: 'list',
            ...(request.subjectType ? { subjectType: request.subjectType } : {}),
            ...(request.subjectId ? { subjectId: request.subjectId } : {}),
            ...(request.visibility ? { visibility: request.visibility } : {}),
            ...(request.statuses?.length ? { statuses: request.statuses } : {}),
            ...(request.limit ? { limit: request.limit } : {}),
          };

  const result = await supabase.functions.invoke('app_worker_jobs', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body,
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    const payload = await parseWorkerJobCommandErrorPayload(result.error);
    if (isWorkerJobEnvelope(payload)) {
      return {
        data: normalizeWorkerJobRows<Row>(payload),
        error: null,
        count: null,
        status: result.error.context?.status ?? 200,
        statusText: 'OK',
      };
    }

    const normalizedError = normalizeWorkerJobCommandError(result.error, payload);
    return {
      data: null,
      error: normalizedError,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: normalizedError.code,
    };
  }

  return {
    data: normalizeWorkerJobRows<Row>(result.data),
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}
