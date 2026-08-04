// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callLcaReadResultProjectionRpc } from '../_shared/db_rpc/lca_results.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient, supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ResultLookupBody = { result_id?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    authClient: supabaseAuthClient,
    redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const userId = authResult.user?.id;
  if (!userId) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const body = req.method === 'POST' ? await parseLookupBody(req) : null;
  if (req.method === 'POST' && body === null) {
    return json({ error: 'invalid_json' }, 400);
  }

  const resultId = resolveResultId(req.url, body);
  if (!resultId) {
    return json({ error: 'missing_result_id' }, 400);
  }

  if (!UUID_RE.test(resultId)) {
    return json({ error: 'invalid_result_id' }, 400);
  }

  const projection = await callLcaReadResultProjectionRpc(supabaseClient, {
    requestedBy: userId,
    resultId,
  });

  if (!projection.ok) {
    console.error('query lca result projection failed', {
      error: projection.message,
      code: projection.code,
      details: projection.details,
      user_id: userId,
      result_id: resultId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  const projectionData = asRecord(projection.data);

  // Hide existence when the result does not belong to current user.
  if (!projectionData) {
    return json({ error: 'result_not_found' }, 404);
  }

  const resultRow = asRecord(projectionData.result);
  const jobRow = asRecord(projectionData.job);
  if (!resultRow || !jobRow) {
    console.error('lca result projection missing result or job payload', {
      user_id: userId,
      result_id: resultId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  const artifact = asRecord(resultRow.artifact) ?? {};
  const timestamps = asRecord(jobRow.timestamps) ?? {};
  const response = {
    result_id: stringField(resultRow, 'resultId'),
    snapshot_id: stringField(resultRow, 'snapshotId'),
    created_at: resultRow.createdAt,
    diagnostics: resultRow.diagnostics ?? null,
    artifact: {
      artifact_url: artifact.artifactUrl ?? null,
      artifact_format: artifact.artifactFormat ?? null,
      artifact_byte_size: artifact.artifactByteSize ?? null,
      artifact_sha256: artifact.artifactSha256 ?? null,
    },
    job: {
      job_id: stringField(jobRow, 'legacyJobId') || stringField(jobRow, 'workerJobId'),
      worker_job_id: stringField(jobRow, 'workerJobId'),
      job_type: stringField(jobRow, 'jobType'),
      job_kind: stringField(jobRow, 'jobKind'),
      status: stringField(jobRow, 'status'),
      timestamps: {
        created_at: timestamps.createdAt ?? null,
        started_at: timestamps.startedAt ?? null,
        finished_at: timestamps.finishedAt ?? null,
        updated_at: timestamps.updatedAt ?? null,
      },
    },
  };

  return json(response, 200);
});

async function parseLookupBody(req: Request): Promise<ResultLookupBody | null> {
  try {
    const parsed = (await req.json()) as ResultLookupBody;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function resolveResultId(rawUrl: string, body: ResultLookupBody | null): string | null {
  const bodyResultId = body?.result_id?.trim();
  if (bodyResultId) {
    return bodyResultId;
  }

  const url = new URL(rawUrl);
  const queryResultId = url.searchParams.get('result_id')?.trim();
  if (queryResultId) {
    return queryResultId;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.lastIndexOf('lca_results');
  if (fnIdx >= 0 && parts.length > fnIdx + 1) {
    return parts[fnIdx + 1];
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
