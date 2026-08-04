// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callLcaReadResultProjectionRpc } from '../_shared/db_rpc/lca_results.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient, supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTRIBUTION_PATH_FORMAT = 'contribution-path:v1';

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
    requiredArtifactFormat: CONTRIBUTION_PATH_FORMAT,
  });

  if (!projection.ok) {
    if (projection.code === 'UNSUPPORTED_LCA_RESULT_ARTIFACT_FORMAT') {
      return json({ error: 'unsupported_artifact_format' }, 409);
    }
    console.error('query lca contribution result projection failed', {
      error: projection.message,
      code: projection.code,
      details: projection.details,
      user_id: userId,
      result_id: resultId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  const projectionData = asRecord(projection.data);
  if (!projectionData) {
    return json({ error: 'result_not_found' }, 404);
  }

  const resultRow = asRecord(projectionData.result);
  const jobRow = asRecord(projectionData.job);
  if (!resultRow || !jobRow) {
    console.error('lca contribution result projection missing result or job payload', {
      user_id: userId,
      result_id: resultId,
    });
    return json({ error: 'result_lookup_failed' }, 500);
  }

  const artifactMeta = asRecord(resultRow.artifact) ?? {};
  const artifactUrl = String(artifactMeta.artifactUrl ?? '').trim();
  if (!artifactUrl) {
    return json({ error: 'artifact_missing' }, 500);
  }

  const artifact = await fetchArtifactJson<Record<string, unknown>>(artifactUrl);
  if (!artifact.ok) {
    return json({ error: 'artifact_fetch_failed', detail: artifact.error }, 502);
  }

  const response = {
    result_id: stringField(resultRow, 'resultId'),
    snapshot_id: stringField(resultRow, 'snapshotId'),
    created_at: resultRow.createdAt,
    diagnostics: resultRow.diagnostics ?? null,
    artifact: {
      artifact_url: artifactMeta.artifactUrl ?? null,
      artifact_format: artifactMeta.artifactFormat ?? null,
      artifact_byte_size: artifactMeta.artifactByteSize ?? null,
      artifact_sha256: artifactMeta.artifactSha256 ?? null,
    },
    job: {
      job_id: stringField(jobRow, 'legacyJobId') || stringField(jobRow, 'workerJobId'),
      worker_job_id: stringField(jobRow, 'workerJobId'),
      job_type: stringField(jobRow, 'jobType'),
      job_kind: stringField(jobRow, 'jobKind'),
      status: stringField(jobRow, 'status'),
      timestamps: {
        created_at: asRecord(jobRow.timestamps)?.createdAt ?? null,
        started_at: asRecord(jobRow.timestamps)?.startedAt ?? null,
        finished_at: asRecord(jobRow.timestamps)?.finishedAt ?? null,
        updated_at: asRecord(jobRow.timestamps)?.updatedAt ?? null,
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
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
