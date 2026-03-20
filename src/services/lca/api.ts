import { supabase } from '@/services/supabase';
import { FunctionRegion } from '@supabase/supabase-js';

export type LcaJobStatus = 'queued' | 'running' | 'ready' | 'completed' | 'failed' | 'stale';

type LcaSolveRequestBase = {
  scope?: string;
  snapshot_id?: string;
  data_scope?: LcaDataScope;
  solve?: {
    return_x?: boolean;
    return_g?: boolean;
    return_h?: boolean;
  };
  print_level?: number;
};

export type LcaSolveSingleRequest = LcaSolveRequestBase & {
  demand_mode?: 'single';
  demand:
    | {
        process_index: number;
        process_id?: never;
        process_version?: never;
        amount?: number;
      }
    | {
        process_id: string;
        process_version?: string;
        process_index?: never;
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
      mode: 'snapshot_building';
      snapshot_id: string;
      build_job_id: string;
      build_snapshot_id: string;
      cache_key?: never;
      job_id?: never;
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

export type LcaQueryMode = 'process_all_impacts' | 'processes_one_impact';
export type LcaHotspotSortBy = 'absolute_value' | 'value' | 'process_index';
export type LcaSortDirection = 'asc' | 'desc';
export type LcaDataScope = 'current_user' | 'open_data' | 'all_data';

export type LcaQueryRequest =
  | {
      scope?: string;
      snapshot_id?: string;
      data_scope?: LcaDataScope;
      mode: 'process_all_impacts';
      process_id: string;
      process_version?: string;
      allow_fallback?: boolean;
    }
  | {
      scope?: string;
      snapshot_id?: string;
      data_scope?: LcaDataScope;
      mode: 'processes_one_impact';
      process_ids: string[];
      impact_id: string;
      allow_fallback?: boolean;
      top_n?: never;
      offset?: never;
      sort_by?: never;
      sort_direction?: never;
    }
  | {
      scope?: string;
      snapshot_id?: string;
      data_scope?: LcaDataScope;
      mode: 'processes_one_impact';
      process_ids?: never;
      impact_id: string;
      allow_fallback?: boolean;
      top_n?: number;
      offset?: number;
      sort_by?: LcaHotspotSortBy;
      sort_direction?: LcaSortDirection;
    };

export type LcaQueryResponse = {
  snapshot_id: string;
  result_id: string;
  source: 'all_unit' | 'fallback_solve_one' | 'fallback_solve_batch';
  mode: LcaQueryMode;
  data: unknown;
  meta: {
    cache_hit: boolean;
    computed_at: string;
    query_artifact_format?: string;
  };
};

export type LcaContributionPathRequest = {
  scope?: string;
  snapshot_id?: string;
  data_scope?: LcaDataScope;
  process_id: string;
  process_version?: string;
  impact_id: string;
  amount?: number;
  options?: {
    max_depth?: number;
    top_k_children?: number;
    cutoff_share?: number;
    max_nodes?: number;
  };
  print_level?: number;
};

export type LcaContributionPathSubmitResponse =
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
    }
  | {
      mode: 'snapshot_building';
      snapshot_id: string;
      build_job_id: string;
      build_snapshot_id: string;
      cache_key?: never;
      job_id?: never;
      result_id?: never;
    };

export type LcaContributionPathResultResponse = {
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
  data: unknown;
};

type PollOptions = {
  timeoutMs?: number;
  intervalsMs?: number[];
  signal?: AbortSignal;
  onTick?: (job: LcaJobResponse) => void;
};

const DEFAULT_POLL_INTERVALS_MS = [1000, 2000, 3000, 5000];
const DEFAULT_POLL_TIMEOUT_MS = 120000;
type LcaFunctionName =
  | 'lca_solve'
  | 'lca_jobs'
  | 'lca_results'
  | 'lca_query_results'
  | 'lca_contribution_path'
  | 'lca_contribution_path_result';

type InvokeErrorBody = {
  error?: unknown;
  detail?: unknown;
  [key: string]: unknown;
};

type ResolvedInvokeError = {
  message: string;
  status?: number;
  body?: InvokeErrorBody;
};

export class LcaFunctionInvokeError extends Error {
  readonly status?: number;
  readonly body?: InvokeErrorBody;
  readonly code?: string;
  readonly detail?: string;

  constructor(message: string, options?: { status?: number; body?: InvokeErrorBody }) {
    super(message);
    this.name = 'LcaFunctionInvokeError';
    this.status = options?.status;
    this.body = options?.body;
    this.code = typeof options?.body?.error === 'string' ? options.body.error : undefined;
    this.detail = typeof options?.body?.detail === 'string' ? options.body.detail : undefined;
  }
}

export function isLcaFunctionInvokeError(error: unknown): error is LcaFunctionInvokeError {
  return error instanceof LcaFunctionInvokeError;
}

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

async function resolveFunctionInvokeError(
  fnName: LcaFunctionName,
  error: { message?: string; context?: Response },
): Promise<ResolvedInvokeError> {
  const base = error.message || `${fnName}_failed`;
  const ctx = error.context;
  if (!ctx || typeof ctx.text !== 'function') {
    return { message: base };
  }
  try {
    const text = await ctx.text();
    if (!text) {
      return { message: base, status: ctx.status };
    }
    try {
      const parsed = JSON.parse(text) as InvokeErrorBody;
      const code = typeof parsed.error === 'string' ? parsed.error : '';
      const detail = typeof parsed.detail === 'string' ? parsed.detail : '';
      if (code || detail) {
        return {
          message: [code, detail].filter(Boolean).join(': '),
          status: ctx.status,
          body: parsed,
        };
      }
      return {
        message: `${base}: ${text}`,
        status: ctx.status,
        body: parsed,
      };
    } catch (_error) {
      // Ignore parse failure and fall back to raw response text.
    }
    return { message: `${base}: ${text}`, status: ctx.status };
  } catch (_error) {
    return { message: base, status: ctx.status };
  }
}

async function invokeLcaFn<T>(
  fnName: LcaFunctionName,
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
    const resolved = await resolveFunctionInvokeError(fnName, error);
    throw new LcaFunctionInvokeError(resolved.message, {
      status: resolved.status,
      body: resolved.body,
    });
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
  try {
    return await invokeLcaFn<LcaSolveSubmitResponse>('lca_solve', request, {
      'X-Idempotency-Key': idempotencyKey,
    });
  } catch (error) {
    if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
      const buildJobId =
        typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
      const buildSnapshotId =
        typeof error.body?.build_snapshot_id === 'string'
          ? error.body.build_snapshot_id.trim()
          : '';
      if (buildJobId && buildSnapshotId) {
        return {
          mode: 'snapshot_building',
          snapshot_id: buildSnapshotId,
          build_job_id: buildJobId,
          build_snapshot_id: buildSnapshotId,
        };
      }
    }
    throw error;
  }
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

export async function queryLcaResults(request: LcaQueryRequest): Promise<LcaQueryResponse> {
  return await invokeLcaFn<LcaQueryResponse>(
    'lca_query_results',
    request as Record<string, unknown>,
  );
}

export async function submitLcaContributionPath(
  request: LcaContributionPathRequest,
  options?: { idempotencyKey?: string },
): Promise<LcaContributionPathSubmitResponse> {
  const idempotencyKey = options?.idempotencyKey ?? fallbackIdempotencyKey();
  try {
    return await invokeLcaFn<LcaContributionPathSubmitResponse>(
      'lca_contribution_path',
      request as Record<string, unknown>,
      {
        'X-Idempotency-Key': idempotencyKey,
      },
    );
  } catch (error) {
    if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
      const buildJobId =
        typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
      const buildSnapshotId =
        typeof error.body?.build_snapshot_id === 'string'
          ? error.body.build_snapshot_id.trim()
          : '';
      if (buildJobId && buildSnapshotId) {
        return {
          mode: 'snapshot_building',
          snapshot_id: buildSnapshotId,
          build_job_id: buildJobId,
          build_snapshot_id: buildSnapshotId,
        };
      }
    }
    throw error;
  }
}

export async function getLcaContributionPathResult(
  resultId: string,
): Promise<LcaContributionPathResultResponse> {
  if (!resultId?.trim()) {
    throw new Error('result_id_required');
  }
  return await invokeLcaFn<LcaContributionPathResultResponse>('lca_contribution_path_result', {
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
