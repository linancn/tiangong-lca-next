import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export type LcaJobStatus = 'queued' | 'running' | 'ready' | 'completed' | 'failed' | 'stale';

type LcaSolveRequestBase = {
  scope?: string;
  snapshot_id?: string;
  solve?: {
    return_x?: boolean;
    return_g?: boolean;
    return_h?: boolean;
  };
  print_level?: number;
};

export type LcaSolveSingleRequest = LcaSolveRequestBase & {
  demand_mode?: 'single';
  demand: {
    process_index: number;
    amount?: number;
  };
};

export type LcaSolveAllUnitRequest = LcaSolveRequestBase & {
  demand_mode: 'all_unit';
  demand?: never;
  solve?: {
    return_x?: false;
    return_g?: false;
    return_h?: true;
  };
  unit_batch_size?: number;
};

export type LcaSolveRequest = LcaSolveSingleRequest | LcaSolveAllUnitRequest;

export type LcaSolveSubmitResponse =
  | {
      mode: 'queued' | 'in_progress';
      snapshot_id: string;
      cache_key: string;
      job_id: string;
      result_id?: never;
    }
  | {
      mode: 'cache_hit';
      snapshot_id: string;
      cache_key: string;
      result_id: string;
      job_id?: never;
    };

export type LcaJobResponse = {
  job_id: string;
  snapshot_id: string;
  job_type: string;
  status: LcaJobStatus;
  timestamps: {
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    updated_at: string;
  };
  payload: unknown;
  diagnostics: unknown;
  result: {
    result_id: string;
    created_at: string;
    artifact_url: string | null;
    artifact_format: string | null;
    artifact_byte_size: number | null;
    artifact_sha256: string | null;
    diagnostics: unknown;
  } | null;
};

export type LcaResultResponse = {
  result_id: string;
  snapshot_id: string;
  created_at: string;
  diagnostics: unknown;
  artifact: {
    artifact_url: string | null;
    artifact_format: string | null;
    artifact_byte_size: number | null;
    artifact_sha256: string | null;
  };
  job: {
    job_id: string;
    job_type: string;
    status: LcaJobStatus;
    timestamps: {
      created_at: string;
      started_at: string | null;
      finished_at: string | null;
      updated_at: string;
    };
  };
};

type PollOptions = {
  timeoutMs?: number;
  intervalsMs?: number[];
  signal?: AbortSignal;
  onTick?: (job: LcaJobResponse) => void;
};

const DEFAULT_POLL_INTERVALS_MS = [1000, 2000, 3000, 5000];
const DEFAULT_POLL_TIMEOUT_MS = 120000;

function fallbackIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lca-${Date.now()}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getAccessToken(): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token ?? '';
  if (!token) {
    throw new Error('unauthorized');
  }
  return token;
}

async function invokeLcaFn<T>(
  fnName: 'lca_solve' | 'lca_jobs' | 'lca_results',
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  const { data, error } = await supabase.functions.invoke(fnName, {
    method: 'POST',
    body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...extraHeaders,
    },
    region: FunctionRegion.UsEast1,
  });

  if (error) {
    throw new Error(error.message || `${fnName}_failed`);
  }

  return data as T;
}

export function isTerminalJobStatus(status: LcaJobStatus): boolean {
  return status === 'ready' || status === 'completed' || status === 'failed' || status === 'stale';
}

export async function submitLcaSolve(
  request: LcaSolveRequest,
  options?: { idempotencyKey?: string },
): Promise<LcaSolveSubmitResponse> {
  const idempotencyKey = options?.idempotencyKey ?? fallbackIdempotencyKey();
  return await invokeLcaFn<LcaSolveSubmitResponse>('lca_solve', request, {
    'X-Idempotency-Key': idempotencyKey,
  });
}

export async function getLcaJob(jobId: string): Promise<LcaJobResponse> {
  if (!jobId?.trim()) {
    throw new Error('job_id_required');
  }
  return await invokeLcaFn<LcaJobResponse>('lca_jobs', { job_id: jobId.trim() });
}

export async function getLcaResult(resultId: string): Promise<LcaResultResponse> {
  if (!resultId?.trim()) {
    throw new Error('result_id_required');
  }
  return await invokeLcaFn<LcaResultResponse>('lca_results', {
    result_id: resultId.trim(),
  });
}

export async function pollLcaJobUntilTerminal(
  jobId: string,
  options: PollOptions = {},
): Promise<LcaJobResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const intervalsMs = options.intervalsMs?.length ? options.intervalsMs : DEFAULT_POLL_INTERVALS_MS;
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    if (options.signal?.aborted) {
      throw new Error('poll_aborted');
    }

    const job = await getLcaJob(jobId);
    options.onTick?.(job);

    if (isTerminalJobStatus(job.status)) {
      return job;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('poll_timeout');
    }

    const delay = intervalsMs[Math.min(attempt, intervalsMs.length - 1)];
    attempt += 1;
    await sleep(delay);
  }
}
