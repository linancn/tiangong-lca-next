import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import { authenticateRequest, AuthMethod, type AuthResult } from '../_shared/auth.ts';
import { getRedisClient, type RedisClient } from '../_shared/redis_client.ts';
import {
  enqueueImportTidasPackage,
  json,
  prepareImportTidasPackageUpload,
  TidasPackageError,
} from '../_shared/tidas_package.ts';

export type ImportTidasPackageHandlerDeps = {
  authenticateRequest: (
    req: Request,
    config: {
      supabase: SupabaseClient;
      redis?: RedisClient;
      allowedMethods: AuthMethod[];
    },
  ) => Promise<AuthResult>;
  getRedisClient: () => Promise<RedisClient | undefined>;
  supabase: SupabaseClient;
};

let cachedSupabaseClient: SupabaseClient | undefined;

function resolveBearerToken(req: Request): string {
  return (
    req.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim() ?? ''
  );
}

function looksLikeJwtToken(token: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
}

function getDefaultSupabaseClient(): SupabaseClient {
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createClient(
      Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('REMOTE_SERVICE_API_KEY') ?? Deno.env.get('SERVICE_API_KEY') ?? '',
    );
  }

  return cachedSupabaseClient;
}

export function createImportTidasPackageHandler(
  deps: ImportTidasPackageHandlerDeps = {
    authenticateRequest,
    getRedisClient,
    supabase: getDefaultSupabaseClient(),
  },
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return json('ok');
    }

    if (req.method !== 'POST') {
      return json(
        {
          ok: false,
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST is supported',
        },
        405,
      );
    }

    const bearerToken = resolveBearerToken(req);
    const shouldTryUserApiKey = bearerToken.length > 0 && !looksLikeJwtToken(bearerToken);
    const redis = shouldTryUserApiKey ? await deps.getRedisClient() : undefined;
    const authResult = await deps.authenticateRequest(req, {
      supabase: deps.supabase,
      redis,
      allowedMethods: shouldTryUserApiKey
        ? [AuthMethod.USER_API_KEY, AuthMethod.JWT]
        : [AuthMethod.JWT],
    });

    if (!authResult.isAuthenticated || !authResult.user?.id) {
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
    const userId = authResult.user.id;

    let body: unknown = {};
    try {
      body = await req.json();
    } catch (_error) {
      body = {};
    }

    try {
      const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      const action = typeof record.action === 'string' ? record.action : 'prepare_upload';

      if (action === 'prepare_upload') {
        const response = await prepareImportTidasPackageUpload(deps.supabase, userId, body, req);
        return json(response, 200);
      }

      if (action === 'enqueue') {
        const response = await enqueueImportTidasPackage(deps.supabase, userId, body);
        return json(response, response.mode === 'queued' ? 202 : 200);
      }

      return json(
        {
          ok: false,
          code: 'INVALID_ACTION',
          message: 'Unsupported import action',
        },
        400,
      );
    } catch (error) {
      console.error('import_tidas_package failed', error);
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
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to import TIDAS package',
        },
        500,
      );
    }
  };
}
