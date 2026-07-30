import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type {
  DatasetTable,
  ReviewSubmitGateResult,
  ReviewSubmitGateStatus,
  ReviewSubmitJobResult,
  ReviewSubmitJobStatus,
  WorkerJobResult,
  WorkerJobStatus,
} from './commands/dataset/types.ts';

export interface ReviewSubmitJobWorkerOptions {
  supabase: SupabaseClient;
  batchSize?: number;
  staleSubmittingSeconds?: number;
}

export interface ReviewSubmitJobProcessResult {
  review_submit_job_id?: string;
  gate_run_id?: string | null;
  gate_worker_job_id?: string | null;
  table?: string;
  id?: string;
  version?: string;
  gate_status?: string;
  gate_worker_status?: string;
  status: 'submitted' | 'waiting_gate' | 'blocked' | 'stale' | 'cancelled' | 'failed';
  duration_ms: number;
  error_code?: string;
  error_message?: string;
}

export interface ReviewSubmitJobWorkerResult {
  claimed: number;
  submitted: number;
  waiting: number;
  blocked: number;
  stale: number;
  cancelled: number;
  failed: number;
  results: ReviewSubmitJobProcessResult[];
}

interface RpcEnvelope<T> {
  ok?: boolean;
  data?: T;
  code?: string;
  status?: number;
  message?: string;
  details?: unknown;
}

type RpcClient = Pick<SupabaseClient, 'rpc'>;

function positiveInteger(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value ?? NaN)) return fallback;
  return Math.min(Math.max(Math.trunc(value!), 1), max);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string'
    ? value
    : value === undefined || value === null
      ? ''
      : String(value);
}

function isGateStatus(value: unknown): value is ReviewSubmitGateStatus {
  return (
    value === 'queued' ||
    value === 'running' ||
    value === 'passed' ||
    value === 'blocked' ||
    value === 'error' ||
    value === 'stale'
  );
}

function isJobStatus(value: unknown): value is ReviewSubmitJobStatus {
  return (
    value === 'queued' ||
    value === 'waiting_gate' ||
    value === 'submitting' ||
    value === 'submitted' ||
    value === 'blocked' ||
    value === 'stale' ||
    value === 'error' ||
    value === 'cancelled'
  );
}

function isWorkerJobStatus(value: unknown): value is WorkerJobStatus {
  return (
    value === 'queued' ||
    value === 'running' ||
    value === 'waiting' ||
    value === 'completed' ||
    value === 'blocked' ||
    value === 'stale' ||
    value === 'failed' ||
    value === 'cancelled'
  );
}

function parseGate(value: unknown): ReviewSubmitGateResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const gate = value as Record<string, unknown>;
  return {
    ...gate,
    status: isGateStatus(gate.status) ? gate.status : 'error',
  } as ReviewSubmitGateResult;
}

function parseWorkerJob(value: unknown): WorkerJobResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const workerJob = value as Record<string, unknown>;
  return {
    ...workerJob,
    status: isWorkerJobStatus(workerJob.status) ? workerJob.status : 'failed',
  } as WorkerJobResult;
}

function parseJob(value: unknown): ReviewSubmitJobResult {
  const raw = asRecord(value);
  const datasetRevision = asRecord(raw.datasetRevision);
  const gate = parseGate(raw.gate);
  const gateWorkerJob = parseWorkerJob(raw.gateWorkerJob);
  return {
    ...raw,
    status: isJobStatus(raw.status) ? raw.status : 'error',
    reviewSubmitJobId: asString(raw.reviewSubmitJobId),
    gateRunId:
      raw.gateRunId === null || raw.gateRunId === undefined ? null : asString(raw.gateRunId),
    gateWorkerJobId:
      raw.gateWorkerJobId === null || raw.gateWorkerJobId === undefined
        ? null
        : asString(raw.gateWorkerJobId),
    datasetRevision: {
      table: asString(datasetRevision.table) as DatasetTable,
      id: asString(datasetRevision.id),
      version: asString(datasetRevision.version),
      revisionChecksum: asString(datasetRevision.revisionChecksum),
    },
    gate,
    gateWorkerJob,
  };
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const code = Reflect.get(error, 'code');
    if (typeof code === 'string' && code.trim()) return code;
  }
  return 'REVIEW_SUBMIT_JOB_WORKER_FAILED';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function envelopeFailure(envelope: RpcEnvelope<unknown>, fallbackCode: string): Error {
  return Object.assign(new Error(envelope.message ?? fallbackCode), {
    code: envelope.code ?? fallbackCode,
    status: envelope.status,
    details: envelope.details,
  });
}

async function claimJobs(
  supabase: RpcClient,
  batchSize: number,
  staleSubmittingSeconds: number,
): Promise<ReviewSubmitJobResult[]> {
  const { data, error } = await supabase.rpc('cmd_dataset_review_submit_job_claim', {
    p_qty: batchSize,
    p_stale_submitting_seconds: staleSubmittingSeconds,
  });

  if (error) throw error;

  const envelope = data as RpcEnvelope<unknown[]>;
  if (envelope?.ok === false) {
    throw envelopeFailure(envelope, 'REVIEW_SUBMIT_JOB_CLAIM_FAILED');
  }

  return Array.isArray(envelope?.data) ? envelope.data.map(parseJob) : [];
}

async function recordJobResult(
  supabase: RpcClient,
  job: ReviewSubmitJobResult,
  status: 'waiting_gate' | 'blocked' | 'stale' | 'error' | 'cancelled',
  error?: { code?: string; message?: string; details?: unknown },
): Promise<void> {
  const { data, error: rpcError } = await supabase.rpc(
    'cmd_dataset_review_submit_job_record_result',
    {
      p_job_id: job.reviewSubmitJobId,
      p_status: status,
      p_gate_run_id: job.gateRunId ?? null,
      p_result: null,
      p_error_code: error?.code ?? null,
      p_error_message: error?.message ?? null,
      p_error_details:
        error?.details === undefined
          ? null
          : typeof error.details === 'object' &&
              error.details !== null &&
              !Array.isArray(error.details)
            ? error.details
            : { details: error.details },
      p_audit: {
        command: 'review_submit_job_worker_record_result',
        reviewSubmitJobId: job.reviewSubmitJobId,
      },
    },
  );

  if (rpcError) throw rpcError;

  const envelope = data as RpcEnvelope<unknown>;
  if (envelope?.ok === false) {
    throw envelopeFailure(envelope, 'REVIEW_SUBMIT_JOB_RECORD_RESULT_FAILED');
  }
}

async function submitFromJob(
  supabase: RpcClient,
  job: ReviewSubmitJobResult,
): Promise<{ ok: boolean; data?: unknown; code?: string; message?: string }> {
  const { data, error } = await supabase.rpc('cmd_review_submit_from_job', {
    p_job_id: job.reviewSubmitJobId,
    p_audit: {
      command: 'review_submit_job_worker_submit',
      reviewSubmitJobId: job.reviewSubmitJobId,
      gateRunId: job.gateRunId ?? null,
      gateWorkerJobId: job.gateWorkerJobId ?? null,
    },
  });

  if (error) throw error;

  const envelope = data as RpcEnvelope<unknown>;
  if (envelope?.ok === false) {
    return {
      ok: false,
      code: envelope.code ?? 'REVIEW_SUBMIT_JOB_SUBMIT_FAILED',
      message: envelope.message ?? 'Review-submit job submit failed',
      data: envelope.details,
    };
  }

  return { ok: true, data: envelope?.data };
}

function resultBase(job: ReviewSubmitJobResult, startedAt: number) {
  return {
    review_submit_job_id: job.reviewSubmitJobId,
    gate_run_id: job.gateRunId ?? null,
    gate_worker_job_id: job.gateWorkerJobId ?? null,
    table: job.datasetRevision?.table,
    id: job.datasetRevision?.id,
    version: job.datasetRevision?.version,
    gate_status: job.gate?.status,
    gate_worker_status: job.gateWorkerJob?.status,
    duration_ms: Date.now() - startedAt,
  };
}

function terminalStatusForGate(gate: ReviewSubmitGateResult): 'blocked' | 'stale' | 'error' {
  if (gate.status === 'blocked') return 'blocked';
  if (gate.status === 'stale') return 'stale';
  return 'error';
}

function errorForGate(gate: ReviewSubmitGateResult): {
  code: string;
  message: string;
  details: unknown;
} {
  switch (gate.status) {
    case 'blocked':
      return {
        code: 'REVIEW_SUBMIT_GATE_BLOCKED',
        message: 'Review-submit gate blocked this dataset revision',
        details: { gate },
      };
    case 'stale':
      return {
        code: 'REVIEW_SUBMIT_GATE_STALE',
        message: 'Review-submit gate run is stale for the submitted dataset revision',
        details: { gate },
      };
    case 'error':
    default:
      return {
        code: 'REVIEW_SUBMIT_GATE_ERROR',
        message: 'Review-submit gate failed before review submission',
        details: { gate },
      };
  }
}

function terminalStatusForWorkerGate(
  workerJob: WorkerJobResult,
): 'blocked' | 'error' | 'cancelled' {
  if (workerJob.status === 'blocked') return 'blocked';
  if (workerJob.status === 'cancelled') return 'cancelled';
  return 'error';
}

function errorForWorkerGate(workerJob: WorkerJobResult): {
  code: string;
  message: string;
  details: unknown;
} {
  switch (workerJob.status) {
    case 'blocked':
      return {
        code: 'REVIEW_SUBMIT_GATE_BLOCKED',
        message: 'Review-submit gate blocked this dataset revision',
        details: { gateWorkerJob: workerJob },
      };
    case 'cancelled':
      return {
        code: 'REVIEW_SUBMIT_JOB_CANCELLED',
        message: 'Review-submit gate worker job was cancelled',
        details: { gateWorkerJob: workerJob },
      };
    case 'failed':
    default:
      return {
        code:
          typeof workerJob.errorCode === 'string' && workerJob.errorCode.trim()
            ? workerJob.errorCode
            : 'REVIEW_SUBMIT_GATE_ERROR',
        message:
          typeof workerJob.errorMessage === 'string' && workerJob.errorMessage.trim()
            ? workerJob.errorMessage
            : 'Review-submit gate failed before review submission',
        details: { gateWorkerJob: workerJob },
      };
  }
}

function workerGateResultStatus(workerJob: WorkerJobResult): string {
  const result = asRecord(workerJob.result);
  return asString(result.status);
}

async function processWorkerGateJob(
  supabase: RpcClient,
  job: ReviewSubmitJobResult,
  startedAt: number,
): Promise<ReviewSubmitJobProcessResult> {
  const workerJob = job.gateWorkerJob;

  if (!workerJob || !workerJob.status) {
    const error = {
      code: 'INVALID_REVIEW_SUBMIT_JOB_GATE',
      message: 'Review-submit job payload is missing gate worker state',
      details: { job },
    };
    await recordJobResult(supabase, job, 'error', error);
    return {
      ...resultBase(job, startedAt),
      status: 'failed',
      error_code: error.code,
      error_message: error.message,
    };
  }

  if (
    workerJob.status === 'queued' ||
    workerJob.status === 'running' ||
    workerJob.status === 'waiting' ||
    workerJob.status === 'stale'
  ) {
    await recordJobResult(supabase, job, 'waiting_gate');
    return {
      ...resultBase(job, startedAt),
      status: 'waiting_gate',
    };
  }

  if (workerJob.status === 'completed') {
    if (workerGateResultStatus(workerJob) !== 'passed') {
      const error = {
        code: 'INVALID_REVIEW_SUBMIT_GATE_RESULT',
        message: 'Review-submit gate worker job completed without a passed result',
        details: { gateWorkerJob: workerJob },
      };
      await recordJobResult(supabase, job, 'error', error);
      return {
        ...resultBase(job, startedAt),
        status: 'failed',
        error_code: error.code,
        error_message: error.message,
      };
    }

    const result = await submitFromJob(supabase, job);
    if (result.ok) {
      return {
        ...resultBase(job, startedAt),
        status: 'submitted',
      };
    }

    return {
      ...resultBase(job, startedAt),
      status:
        result.code === 'REVIEW_SUBMIT_GATE_BLOCKED'
          ? 'blocked'
          : result.code === 'REVIEW_SUBMIT_GATE_STALE' || result.code === 'REVIEW_SUBMIT_JOB_STALE'
            ? 'stale'
            : result.code === 'REVIEW_SUBMIT_JOB_CANCELLED'
              ? 'cancelled'
              : 'failed',
      error_code: result.code,
      error_message: result.message,
    };
  }

  const status = terminalStatusForWorkerGate(workerJob);
  const error = errorForWorkerGate(workerJob);
  await recordJobResult(supabase, job, status, error);
  return {
    ...resultBase(job, startedAt),
    status: status === 'error' ? 'failed' : status,
    error_code: error.code,
    error_message: error.message,
  };
}

async function processJob(
  supabase: RpcClient,
  job: ReviewSubmitJobResult,
): Promise<ReviewSubmitJobProcessResult> {
  const startedAt = Date.now();
  const gate = job.gate;

  if (!job.reviewSubmitJobId) {
    throw Object.assign(new Error('Review-submit job payload is missing reviewSubmitJobId'), {
      code: 'INVALID_REVIEW_SUBMIT_JOB_PAYLOAD',
    });
  }

  if (job.gateWorkerJob || job.gateWorkerJobId) {
    return await processWorkerGateJob(supabase, job, startedAt);
  }

  if (!gate || !gate.status) {
    const error = {
      code: 'INVALID_REVIEW_SUBMIT_JOB_GATE',
      message: 'Review-submit job payload is missing gate state',
      details: { job },
    };
    await recordJobResult(supabase, job, 'error', error);
    return {
      ...resultBase(job, startedAt),
      status: 'failed',
      error_code: error.code,
      error_message: error.message,
    };
  }

  if (gate.status === 'queued' || gate.status === 'running') {
    await recordJobResult(supabase, job, 'waiting_gate');
    return {
      ...resultBase(job, startedAt),
      status: 'waiting_gate',
    };
  }

  if (gate.status === 'passed') {
    const result = await submitFromJob(supabase, job);
    if (result.ok) {
      return {
        ...resultBase(job, startedAt),
        status: 'submitted',
      };
    }

    return {
      ...resultBase(job, startedAt),
      status:
        result.code === 'REVIEW_SUBMIT_GATE_BLOCKED'
          ? 'blocked'
          : result.code === 'REVIEW_SUBMIT_GATE_STALE' || result.code === 'REVIEW_SUBMIT_JOB_STALE'
            ? 'stale'
            : 'failed',
      error_code: result.code,
      error_message: result.message,
    };
  }

  const status = terminalStatusForGate(gate);
  const error = errorForGate(gate);
  await recordJobResult(supabase, job, status, error);
  return {
    ...resultBase(job, startedAt),
    status: status === 'error' ? 'failed' : status,
    error_code: error.code,
    error_message: error.message,
  };
}

export async function processReviewSubmitJobs(
  options: ReviewSubmitJobWorkerOptions,
): Promise<ReviewSubmitJobWorkerResult> {
  const batchSize = positiveInteger(options.batchSize, 10, 50);
  const staleSubmittingSeconds = positiveInteger(options.staleSubmittingSeconds, 300, 3600);
  const jobs = await claimJobs(options.supabase, batchSize, staleSubmittingSeconds);
  const results: ReviewSubmitJobProcessResult[] = [];

  for (const job of jobs) {
    try {
      const result = await processJob(options.supabase, job);
      console.log('[review_submit_job]', result);
      results.push(result);
    } catch (caught) {
      const code = errorCode(caught);
      const message = errorMessage(caught);
      if (job.reviewSubmitJobId) {
        try {
          await recordJobResult(options.supabase, job, 'error', {
            code,
            message,
            details: { stage: 'worker_exception' },
          });
        } catch (recordError) {
          console.error('[review_submit_job] failed to record worker exception', {
            review_submit_job_id: job.reviewSubmitJobId,
            error_code: errorCode(recordError),
            error_message: errorMessage(recordError),
          });
        }
      }

      const result = {
        ...resultBase(job, Date.now()),
        status: 'failed' as const,
        error_code: code,
        error_message: message,
      };
      console.error('[review_submit_job]', result);
      results.push(result);
    }
  }

  return {
    claimed: jobs.length,
    submitted: results.filter((result) => result.status === 'submitted').length,
    waiting: results.filter((result) => result.status === 'waiting_gate').length,
    blocked: results.filter((result) => result.status === 'blocked').length,
    stale: results.filter((result) => result.status === 'stale').length,
    cancelled: results.filter((result) => result.status === 'cancelled').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
}
