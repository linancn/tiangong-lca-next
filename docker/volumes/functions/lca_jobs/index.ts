// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type JobLookupBody = { job_id?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
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

  const { data: job, error: jobError } = await supabaseClient
    .from('lca_jobs')
    .select(
      'id,job_type,snapshot_id,status,payload,diagnostics,created_at,started_at,finished_at,updated_at',
    )
    .eq('id', jobId)
    .eq('requested_by', userId)
    .maybeSingle();

  if (jobError) {
    console.error('query lca_jobs failed', {
      error: jobError.message,
      code: jobError.code,
      user_id: userId,
      job_id: jobId,
    });
    return json({ error: 'job_lookup_failed' }, 500);
  }

  if (!job) {
    return json({ error: 'job_not_found' }, 404);
  }

  const { data: resultRow, error: resultError } = await supabaseClient
    .from('lca_results')
    .select(
      'id,artifact_url,artifact_format,artifact_byte_size,artifact_sha256,diagnostics,created_at',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resultError) {
    console.error('query lca_results failed', {
      error: resultError.message,
      code: resultError.code,
      user_id: userId,
      job_id: jobId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  const response = {
    job_id: String(job.id),
    snapshot_id: String(job.snapshot_id),
    job_type: String(job.job_type),
    status: String(job.status),
    timestamps: {
      created_at: job.created_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      updated_at: job.updated_at,
    },
    payload: job.payload,
    diagnostics: job.diagnostics,
    result: resultRow
      ? {
          result_id: String(resultRow.id),
          created_at: resultRow.created_at,
          artifact_url: resultRow.artifact_url,
          artifact_format: resultRow.artifact_format,
          artifact_byte_size: resultRow.artifact_byte_size,
          artifact_sha256: resultRow.artifact_sha256,
          diagnostics: resultRow.diagnostics,
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
