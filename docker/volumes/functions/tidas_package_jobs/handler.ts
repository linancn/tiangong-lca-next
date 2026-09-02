import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import {
  authenticateRequest,
  AuthMethod,
  type AuthConfig,
  type AuthResult,
} from '../_shared/auth.ts';
import { createSupabaseServiceClient, supabaseAuthClient } from '../_shared/supabase_client.ts';
import { json, lookupTidasPackageJob, TidasPackageError } from '../_shared/tidas_package.ts';

type JobLookupBody = {
  job_id?: string;
};

export type TidasPackageJobsHandlerDeps = {
  authClient: SupabaseClient;
  authenticateRequest: (
    req: Request,
    config: AuthConfig & { allowedMethods: AuthMethod[] },
  ) => Promise<AuthResult>;
  supabase: SupabaseClient;
};

let cachedSupabaseClient: SupabaseClient | undefined;

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
  const fnIdx = parts.lastIndexOf('tidas_package_jobs');
  if (fnIdx >= 0 && parts.length > fnIdx + 1) {
    return parts[fnIdx + 1];
  }

  return null;
}

function getDefaultSupabaseClient(): SupabaseClient {
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createSupabaseServiceClient();
  }

  return cachedSupabaseClient;
}

export function createTidasPackageJobsHandler(
  deps: TidasPackageJobsHandlerDeps = {
    authClient: supabaseAuthClient,
    authenticateRequest,
    supabase: getDefaultSupabaseClient(),
  },
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return json('ok');
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      return json(
        {
          ok: false,
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET and POST are supported',
        },
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
        json(
          {
            ok: false,
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
          401,
        )
      );
    }

    const body = req.method === 'POST' ? await parseLookupBody(req) : null;
    if (req.method === 'POST' && body === null) {
      return json(
        {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'Request body must be valid JSON',
        },
        400,
      );
    }

    const jobId = resolveJobId(req.url, body);
    if (!jobId) {
      return json(
        {
          ok: false,
          code: 'MISSING_JOB_ID',
          message: 'A package job id is required',
        },
        400,
      );
    }

    try {
      const response = await lookupTidasPackageJob(
        deps.supabase,
        authResult.principal.userId,
        jobId,
      );
      return json(response, 200);
    } catch (error) {
      console.error('tidas_package_jobs failed', error);
      if (error instanceof TidasPackageError) {
        return json(
          {
            ok: false,
            code: error.code,
            message: error.message,
          },
          error.status,
        );
      }

      return json(
        {
          ok: false,
          code: 'JOB_LOOKUP_FAILED',
          message: error instanceof Error ? error.message : 'Failed to query package job',
        },
        500,
      );
    }
  };
}
