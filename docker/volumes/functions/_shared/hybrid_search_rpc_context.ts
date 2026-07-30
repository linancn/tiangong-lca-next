import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  createRequestSupabaseClient,
  supabaseClient as supabaseServiceClient,
} from './supabase_client.ts';

export type HybridSearchRpcUserContextKind = 'jwt' | 'service';

export type HybridSearchRpcContext =
  | {
      bearerToken: string;
      userContextKind: 'jwt';
    }
  | {
      bearerToken?: undefined;
      userContextKind: 'service';
    };

export type HybridSearchRpcClientContext = HybridSearchRpcContext & {
  client: SupabaseClient;
};

export class HybridSearchRpcContextError extends Error {
  code = 'HYBRID_SEARCH_USER_CONTEXT_REQUIRED';
  status = 403;

  constructor(dataSource: string) {
    super(`data_source ${dataSource} requires a Supabase JWT user context`);
    this.name = 'HybridSearchRpcContextError';
  }
}

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const USER_SCOPED_DATA_SOURCES = new Set(['my', 'te']);

function extractBearerToken(authHeader: string | null): string | undefined {
  if (!authHeader) {
    return undefined;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token.length > 0 ? token : undefined;
}

function isJwtLikeToken(token: string): boolean {
  return JWT_PATTERN.test(token);
}

export function resolveHybridSearchRpcContext(
  authHeader: string | null,
  dataSource: string,
): HybridSearchRpcContext {
  const bearerToken = extractBearerToken(authHeader);

  if (bearerToken && isJwtLikeToken(bearerToken)) {
    return {
      bearerToken,
      userContextKind: 'jwt',
    };
  }

  if (USER_SCOPED_DATA_SOURCES.has(dataSource)) {
    throw new HybridSearchRpcContextError(dataSource);
  }

  return {
    userContextKind: 'service',
  };
}

export function createHybridSearchRpcClient(
  authHeader: string | null,
  dataSource: string,
): HybridSearchRpcClientContext {
  const context = resolveHybridSearchRpcContext(authHeader, dataSource);
  const client =
    context.userContextKind === 'jwt'
      ? createRequestSupabaseClient(context.bearerToken)
      : supabaseServiceClient;

  return {
    ...context,
    client,
  };
}
