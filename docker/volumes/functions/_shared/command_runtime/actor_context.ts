import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import { authenticateRequest, AuthMethod } from '../auth.ts';
import { createRequestSupabaseClient } from '../supabase_client.ts';
import { commandError } from './http.ts';

export type ActorContext = {
  userId: string;
  accessToken: string;
  supabase: SupabaseClient;
};

export type ActorContextResult =
  | { ok: true; value: ActorContext }
  | { ok: false; response: Response };

export type ResolveActorContextOptions = {
  authenticate?: typeof authenticateRequest;
  createSupabaseClient?: (accessToken: string) => SupabaseClient;
};

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function resolveActorContext(
  req: Request,
  options: ResolveActorContextOptions = {},
): Promise<ActorContextResult> {
  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    return {
      ok: false,
      response: commandError('AUTH_REQUIRED', 'Authentication required', 401),
    };
  }

  const requestSupabase = (options.createSupabaseClient ?? createRequestSupabaseClient)(
    accessToken,
  );
  const authResult = await (options.authenticate ?? authenticateRequest)(req, {
    authClient: requestSupabase,
    allowedMethods: [AuthMethod.JWT],
  });

  if (!authResult.isAuthenticated || !authResult.user?.id) {
    return {
      ok: false,
      response:
        authResult.response ?? commandError('AUTH_REQUIRED', 'Authentication required', 401),
    };
  }

  return {
    ok: true,
    value: {
      userId: authResult.user.id,
      accessToken,
      supabase: requestSupabase,
    },
  };
}
