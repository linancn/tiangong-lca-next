import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import {
  authenticateRequest,
  AuthMethod,
  type AuthConfig,
  type AuthResult,
} from '../_shared/auth.ts';
import { createSupabaseServiceClient, supabaseAuthClient } from '../_shared/supabase_client.ts';
import {
  enqueueImportTidasPackage,
  json,
  prepareImportTidasPackageUpload,
  TidasPackageError,
} from '../_shared/tidas_package.ts';

export type ImportTidasPackageHandlerDeps = {
  authClient: SupabaseClient;
  authenticateRequest: (
    req: Request,
    config: AuthConfig & { allowedMethods: AuthMethod[] },
  ) => Promise<AuthResult>;
  supabase: SupabaseClient;
};

let cachedSupabaseClient: SupabaseClient | undefined;

function getDefaultSupabaseClient(): SupabaseClient {
  if (!cachedSupabaseClient) {
    cachedSupabaseClient = createSupabaseServiceClient();
  }

  return cachedSupabaseClient;
}

export function createImportTidasPackageHandler(
  deps: ImportTidasPackageHandlerDeps = {
    authClient: supabaseAuthClient,
    authenticateRequest,
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
    const userId = authResult.principal.userId;

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
