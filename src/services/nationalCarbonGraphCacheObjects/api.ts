import { supabase } from '@/services/supabase';
import type { SupabaseError, SupabaseSingleResult } from '@/services/supabase/data';
import { FunctionRegion } from '@supabase/supabase-js';

export type NationalCarbonGraphCacheObjectsRequest = {
  action: 'read_manifest_bundle';
};

export type NationalCarbonGraphCacheActiveManifest = {
  activeBuildId: string;
  buildManifestPath: string;
  generatedAt?: string;
  schemaVersion: 'process_flow_graph_manifest_v1';
};

export type NationalCarbonGraphCacheBuildManifestFile = {
  byteSize?: number;
  contentType?: string;
  path: string;
  sha256?: string;
  signedUrl?: string;
};

export type NationalCarbonGraphCacheBuildManifest = {
  buildId: string;
  files: Record<string, NationalCarbonGraphCacheBuildManifestFile>;
  schemaVersion: 'process_flow_graph_v2';
  stats: {
    edgeCount: number;
    flowCount: number;
    maxDegree: number;
    processCount: number;
  };
};

export type NationalCarbonGraphCacheObjectsBundle = {
  activeManifest: NationalCarbonGraphCacheActiveManifest;
  buildManifest: NationalCarbonGraphCacheBuildManifest;
  bucket: string;
  expiresIn: number;
  prefix: string;
};

async function parseGraphCacheObjectsCommandErrorPayload(error: any) {
  if (!error?.context || typeof error.context.json !== 'function') {
    return null;
  }

  try {
    return await error.context.json();
  } catch (_parseError) {
    return null;
  }
}

function isGraphCacheObjectsEnvelope(payload: unknown): payload is {
  command?: string;
  data?: NationalCarbonGraphCacheObjectsBundle;
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as { command?: unknown; data?: unknown };
  return (
    candidate.command === 'national_carbon_graph_cache_objects_read_manifest_bundle' &&
    candidate.data !== undefined
  );
}

function isGraphCacheObjectsBundle(
  payload: unknown,
): payload is NationalCarbonGraphCacheObjectsBundle {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as {
    activeManifest?: unknown;
    buildManifest?: unknown;
  };
  return Boolean(candidate.activeManifest && candidate.buildManifest);
}

function normalizeGraphCacheObjectsBundle(
  payload: unknown,
): NationalCarbonGraphCacheObjectsBundle | null {
  if (isGraphCacheObjectsEnvelope(payload)) {
    return isGraphCacheObjectsBundle(payload.data) ? payload.data : null;
  }

  return isGraphCacheObjectsBundle(payload) ? payload : null;
}

function normalizeGraphCacheObjectsCommandError(error: any, payload: any): SupabaseError {
  return {
    message:
      payload?.message || payload?.detail || payload?.error || error?.message || 'Request failed',
    code: typeof payload?.code === 'string' ? payload.code : 'FUNCTION_ERROR',
    details: payload?.details ?? '',
    hint: payload?.hint ?? '',
  } as SupabaseError;
}

function missingGraphCacheObjectsBundleError(): SupabaseError {
  return {
    message: 'National carbon graph cache manifest bundle is missing',
    code: 'GRAPH_CACHE_OBJECTS_BUNDLE_MISSING',
    details: '',
    hint: '',
  } as SupabaseError;
}

export async function requestNationalCarbonGraphCacheObjectsApi(
  request: NationalCarbonGraphCacheObjectsRequest = { action: 'read_manifest_bundle' },
): Promise<SupabaseSingleResult<NationalCarbonGraphCacheObjectsBundle>> {
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

  const result = await supabase.functions.invoke('app_national_carbon_graph_cache_objects', {
    headers: {
      Authorization: `Bearer ${session.data.session?.access_token ?? ''}`,
    },
    body: {
      action: request.action,
    },
    region: FunctionRegion.UsEast1,
  });

  if (result.error) {
    const payload = await parseGraphCacheObjectsCommandErrorPayload(result.error);
    const normalizedError = normalizeGraphCacheObjectsCommandError(result.error, payload);
    return {
      data: null,
      error: normalizedError,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: normalizedError.code,
    };
  }

  const bundle = normalizeGraphCacheObjectsBundle(result.data);
  if (!bundle) {
    const normalizedError = missingGraphCacheObjectsBundleError();
    return {
      data: null,
      error: normalizedError,
      count: null,
      status: 502,
      statusText: normalizedError.code,
    };
  }

  return {
    data: bundle,
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  };
}
