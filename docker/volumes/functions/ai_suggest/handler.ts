import type { SupabaseClient } from '@supabase/supabase-js@2';

import {
  enqueueAiTidasSuggestion,
  readAiTidasSuggestion,
  type AiWorkerJobProjection,
  type AiWorkerRpcError,
} from '../_shared/ai_worker.ts';
import {
  authenticateRequest,
  AuthMethod,
  type AuthConfig,
  type AuthResult,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseServiceClient, supabaseAuthClient } from '../_shared/supabase_client.ts';

const MAX_AI_TIDAS_DATA_BYTES = 2 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JsonRecord = Record<string, unknown>;

export type AiSuggestHandlerDeps = {
  authClient: SupabaseClient;
  authenticateRequest: (
    req: Request,
    config: AuthConfig & { allowedMethods: AuthMethod[] },
  ) => Promise<AuthResult>;
  supabase: SupabaseClient;
};

let cachedSupabaseClient: SupabaseClient | undefined;

function getDefaultSupabaseClient(): SupabaseClient {
  cachedSupabaseClient ??= createSupabaseServiceClient();
  return cachedSupabaseClient;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function parseBody(req: Request): Promise<JsonRecord | null> {
  try {
    const value = await req.json();
    return isRecord(value) ? value : null;
  } catch (_error) {
    return null;
  }
}

function normalizeDataType(value: unknown): 'process' | 'flow' | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized === 'process' || normalized === 'flow' ? normalized : null;
}

function parseTidasData(
  rawValue: unknown,
  dataType: 'process' | 'flow',
): { data: JsonRecord } | { response: Response } {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return {
      response: json(
        { ok: false, code: 'AI_DATA_REQUIRED', message: 'tidasData must be a JSON string' },
        400,
      ),
    };
  }

  if (new TextEncoder().encode(rawValue).byteLength > MAX_AI_TIDAS_DATA_BYTES) {
    return {
      response: json(
        {
          ok: false,
          code: 'AI_DATA_TOO_LARGE',
          message: 'AI request exceeds the 2 MiB Edge limit',
        },
        413,
      ),
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(rawValue);
  } catch (_error) {
    return {
      response: json(
        { ok: false, code: 'AI_DATA_INVALID', message: 'tidasData must contain valid JSON' },
        400,
      ),
    };
  }

  const rootKey = dataType === 'process' ? 'processDataSet' : 'flowDataSet';
  if (!isRecord(data) || !isRecord(data[rootKey])) {
    return {
      response: json(
        {
          ok: false,
          code: 'AI_DATA_INVALID',
          message: `tidasData must contain an object at ${rootKey}`,
        },
        400,
      ),
    };
  }

  return { data };
}

function rpcFailure(error: AiWorkerRpcError, fallbackCode: string): Response {
  if (error.source === 'contract') {
    return json({ ok: false, code: error.code, message: error.message }, error.status);
  }

  console.error('ai_suggest database RPC failed', { code: error.code });
  return json(
    {
      ok: false,
      code: fallbackCode,
      message: 'The AI worker service is temporarily unavailable',
    },
    502,
  );
}

function publicJobProjection(job: AiWorkerJobProjection): JsonRecord {
  const projection: JsonRecord = {
    jobId: job.id,
    status: job.status,
    phase: job.phase ?? null,
    progress: job.progress ?? 0,
    createdAt: job.createdAt ?? null,
    updatedAt: job.updatedAt ?? null,
  };

  if (job.resultSchemaVersion) projection.resultSchemaVersion = job.resultSchemaVersion;
  if (job.result !== undefined) projection.result = job.result;
  if (job.status === 'failed') {
    projection.error = {
      code: job.errorCode ?? 'AI_JOB_FAILED',
      message: job.errorMessage ?? 'AI suggestion failed',
      retryable: job.retryable ?? false,
    };
  }

  return projection;
}

async function handleEnqueue(
  body: JsonRecord,
  userId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  const dataType = normalizeDataType(body.dataType);
  if (!dataType) {
    return json(
      { ok: false, code: 'AI_DATA_TYPE_INVALID', message: 'dataType must be process or flow' },
      400,
    );
  }

  const parsed = parseTidasData(body.tidasData, dataType);
  if ('response' in parsed) return parsed.response;

  const result = await enqueueAiTidasSuggestion(supabase, {
    requestedBy: userId,
    dataType,
    data: parsed.data,
  });
  if (!result.ok) return rpcFailure(result.error, 'AI_JOB_ENQUEUE_FAILED');

  return json({ ok: true, data: publicJobProjection(result.job) }, 202);
}

async function handleRead(
  body: JsonRecord,
  userId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';
  if (!UUID_PATTERN.test(jobId)) {
    return json({ ok: false, code: 'AI_JOB_ID_INVALID', message: 'jobId must be a UUID' }, 400);
  }

  const result = await readAiTidasSuggestion(supabase, { requestedBy: userId, jobId });
  if (!result.ok) return rpcFailure(result.error, 'AI_JOB_READ_FAILED');

  return json({ ok: true, data: publicJobProjection(result.job) });
}

export function createAiSuggestHandler(
  deps: AiSuggestHandlerDeps = {
    authClient: supabaseAuthClient,
    authenticateRequest,
    supabase: getDefaultSupabaseClient(),
  },
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    if (req.method !== 'POST') {
      return json(
        { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported' },
        405,
      );
    }

    const authResult = await deps.authenticateRequest(req, {
      authClient: deps.authClient,
      allowedMethods: [AuthMethod.JWT],
    });
    if (!authResult.isAuthenticated || !authResult.principal?.userId) {
      return (
        authResult.response ??
        json({ ok: false, code: 'AUTH_REQUIRED', message: 'Authentication required' }, 401)
      );
    }

    const body = await parseBody(req);
    if (!body) {
      return json(
        { ok: false, code: 'INVALID_PAYLOAD', message: 'Request body must be a JSON object' },
        400,
      );
    }

    const action = body.action === undefined ? 'enqueue' : body.action;
    if (action === 'enqueue') {
      return await handleEnqueue(body, authResult.principal.userId, deps.supabase);
    }
    if (action === 'read') {
      return await handleRead(body, authResult.principal.userId, deps.supabase);
    }

    return json(
      { ok: false, code: 'AI_ACTION_INVALID', message: 'action must be enqueue or read' },
      400,
    );
  };
}
