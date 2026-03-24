// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTRIBUTION_PATH_FORMAT = 'contribution-path:v1';

type ResultLookupBody = { result_id?: string };

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

  const resultId = resolveResultId(req.url, body);
  if (!resultId) {
    return json({ error: 'missing_result_id' }, 400);
  }

  if (!UUID_RE.test(resultId)) {
    return json({ error: 'invalid_result_id' }, 400);
  }

  const { data: resultRow, error: resultError } = await supabaseClient
    .from('lca_results')
    .select(
      'id,job_id,snapshot_id,diagnostics,artifact_url,artifact_format,artifact_byte_size,artifact_sha256,created_at',
    )
    .eq('id', resultId)
    .maybeSingle();

  if (resultError) {
    console.error('query lca_results failed', {
      error: resultError.message,
      code: resultError.code,
      user_id: userId,
      result_id: resultId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  if (!resultRow) {
    return json({ error: 'result_not_found' }, 404);
  }

  const { data: jobRow, error: jobError } = await supabaseClient
    .from('lca_jobs')
    .select('id,job_type,status,requested_by,created_at,started_at,finished_at,updated_at')
    .eq('id', resultRow.job_id)
    .eq('requested_by', userId)
    .maybeSingle();

  if (jobError) {
    console.error('query owner lca_jobs failed', {
      error: jobError.message,
      code: jobError.code,
      user_id: userId,
      result_id: resultId,
      job_id: resultRow.job_id,
    });
    return json({ error: 'result_owner_lookup_failed' }, 500);
  }

  if (!jobRow) {
    return json({ error: 'result_not_found' }, 404);
  }

  if (String(resultRow.artifact_format ?? '') !== CONTRIBUTION_PATH_FORMAT) {
    return json({ error: 'unsupported_artifact_format' }, 409);
  }

  const artifactUrl = String(resultRow.artifact_url ?? '').trim();
  if (!artifactUrl) {
    return json({ error: 'artifact_missing' }, 500);
  }

  const artifact = await fetchArtifactJson<Record<string, unknown>>(artifactUrl);
  if (!artifact.ok) {
    return json({ error: 'artifact_fetch_failed', detail: artifact.error }, 502);
  }

  const response = {
    result_id: String(resultRow.id),
    snapshot_id: String(resultRow.snapshot_id),
    created_at: resultRow.created_at,
    diagnostics: resultRow.diagnostics,
    artifact: {
      artifact_url: resultRow.artifact_url,
      artifact_format: resultRow.artifact_format,
      artifact_byte_size: resultRow.artifact_byte_size,
      artifact_sha256: resultRow.artifact_sha256,
    },
    job: {
      job_id: String(jobRow.id),
      job_type: String(jobRow.job_type),
      status: String(jobRow.status),
      timestamps: {
        created_at: jobRow.created_at,
        started_at: jobRow.started_at,
        finished_at: jobRow.finished_at,
        updated_at: jobRow.updated_at,
      },
    },
    data: artifact.data,
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
  const fnIdx = parts.lastIndexOf('lca_contribution_path_result');
  if (fnIdx >= 0 && parts.length > fnIdx + 1) {
    return parts[fnIdx + 1];
  }

  return null;
}

async function fetchArtifactJson<T>(
  artifactUrl: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const storagePath = parseStoragePathFromArtifactUrl(artifactUrl);
  let storageError: string | null = null;
  if (storagePath) {
    const downloaded = await supabaseClient.storage
      .from(storagePath.bucket)
      .download(storagePath.objectPath);
    if (!downloaded.error) {
      try {
        const parsed = JSON.parse(await downloaded.data.text()) as T;
        return { ok: true, data: parsed };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? `json_parse_failed:${error.message}` : 'json_parse_failed',
        };
      }
    } else {
      storageError = `storage_download_failed:${downloaded.error.message}`;
    }
  }
  const httpResult = await fetchJsonByHttp<T>(artifactUrl);
  if (!httpResult.ok && storageError) {
    return { ok: false, error: `${storageError};${httpResult.error}` };
  }
  return httpResult;
}

function parseStoragePathFromArtifactUrl(
  artifactUrl: string,
): { bucket: string; objectPath: string } | null {
  try {
    const url = new URL(artifactUrl);
    const marker = '/storage/v1/s3/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }
    const remainder = url.pathname.slice(markerIndex + marker.length);
    const splitIndex = remainder.indexOf('/');
    if (splitIndex <= 0 || splitIndex >= remainder.length - 1) {
      return null;
    }
    const bucket = decodeURIComponent(remainder.slice(0, splitIndex));
    const objectPath = decodeURIComponent(remainder.slice(splitIndex + 1));
    if (!bucket || !objectPath) {
      return null;
    }
    return { bucket, objectPath };
  } catch (_error) {
    return null;
  }
}

async function fetchJsonByHttp<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { ok: false, error: `http_${response.status}` };
    }
    const parsed = (await response.json()) as T;
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'fetch_failed' };
  }
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
