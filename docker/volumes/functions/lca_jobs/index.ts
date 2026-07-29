// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callLcaReadJobProjectionRpc } from '../_shared/db_rpc/lca_results.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient, supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JobLookupBody = { job_id?: string };

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

  const jobId = resolveJobId(req.url, body);
  if (!jobId) {
    return json({ error: 'missing_job_id' }, 400);
  }

  if (!UUID_RE.test(jobId)) {
    return json({ error: 'invalid_job_id' }, 400);
  }

  const projection = await callLcaReadJobProjectionRpc(supabaseClient, {
    requestedBy: userId,
    legacyJobId: jobId,
    includeInternal: true,
  });

  if (!projection.ok) {
    console.error('query lca job projection failed', {
      error: projection.message,
      code: projection.code,
      details: projection.details,
      user_id: userId,
      job_id: jobId,
    });
    return json({ error: 'job_lookup_failed' }, 500);
  }

  const projectionData = asRecord(projection.data);
  if (!projectionData) {
    return json({ error: 'job_not_found' }, 404);
  }

  const job = asRecord(projectionData.job);
  if (!job) {
    console.error('lca job projection missing job payload', {
      user_id: userId,
      job_id: jobId,
    });
    return json({ error: 'job_lookup_failed' }, 500);
  }

  const resultRow = asRecord(projectionData.result);
  const artifact = asRecord(resultRow?.artifact) ?? {};
  const timestamps = asRecord(job.timestamps) ?? {};
  const response = {
    job_id: stringField(job, 'legacyJobId') || stringField(job, 'workerJobId'),
    worker_job_id: stringField(job, 'workerJobId'),
    snapshot_id: stringField(job, 'snapshotId'),
    job_type: stringField(job, 'jobType'),
    job_kind: stringField(job, 'jobKind'),
    status: stringField(job, 'status'),
    timestamps: {
      created_at: timestamps.createdAt ?? null,
      started_at: timestamps.startedAt ?? null,
      finished_at: timestamps.finishedAt ?? null,
      updated_at: timestamps.updatedAt ?? null,
    },
    payload: job.payload ?? null,
    diagnostics: job.diagnostics ?? null,
    result: resultRow
      ? {
          result_id: stringField(resultRow, 'resultId'),
          created_at: resultRow.createdAt,
          artifact_url: artifact.artifactUrl ?? null,
          artifact_format: artifact.artifactFormat ?? null,
          artifact_byte_size: artifact.artifactByteSize ?? null,
          artifact_sha256: artifact.artifactSha256 ?? null,
          diagnostics: resultRow.diagnostics ?? null,
        }
      : null,
  };

  return json(response, 200);
});

async function parseLookupBody(req: Request): Promise<JobLookupBody | null> {
  try {
    const parsed = (await req.json()) as JobLookupBody;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (_error) {
    return null;
  }
}

function resolveJobId(rawUrl: string, body: JobLookupBody | null): string | null {
  const bodyJobId = body?.job_id?.trim();
  if (bodyJobId) {
    return bodyJobId;
  }

  const url = new URL(rawUrl);
  const queryJobId = url.searchParams.get('job_id')?.trim();
  if (queryJobId) {
    return queryJobId;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  const fnIdx = parts.lastIndexOf('lca_jobs');
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
