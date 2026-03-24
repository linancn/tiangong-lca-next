import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import {
  ensureOwnerOrReviewAdmin,
  json,
  mapRpcError,
  normalizeSaveRpcPayload,
  permissionErrorStatusCode,
  validateSavePlan,
} from '../_shared/lifecyclemodel_bundle.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

Deno.serve(async (req) => {
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

  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    allowedMethods: [AuthMethod.JWT],
  });

  const userId = authResult.user?.id;
  if (!authResult.isAuthenticated || !userId) {
    return json(
      {
        ok: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      },
      401,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (_error) {
    return json(
      {
        ok: false,
        code: 'INVALID_PAYLOAD',
        message: 'Request body must be valid JSON',
      },
      400,
    );
  }

  const validation = validateSavePlan(body);
  if (!validation.ok) {
    return json(
      {
        ok: false,
        code: 'INVALID_PAYLOAD',
        message: validation.message,
      },
      400,
    );
  }

  const plan = validation.value;
  if (plan.mode === 'update') {
    const permission = await ensureOwnerOrReviewAdmin(
      supabaseClient,
      userId,
      plan.modelId,
      plan.version!,
    );
    if (!permission.ok) {
      return json(permission.error, permissionErrorStatusCode(permission.error));
    }
  }

  // The RPC runs with service_role, so ownership must be forwarded explicitly.
  const rpcPlan = {
    ...plan,
    actorUserId: userId,
  };

  const { data, error } = await supabaseClient.rpc('save_lifecycle_model_bundle', {
    p_plan: rpcPlan,
  });

  if (error) {
    console.error('save_lifecycle_model_bundle rpc failed', {
      model_id: plan.modelId,
      version: plan.version ?? null,
      mode: plan.mode,
      error: error.message,
      code: error.code,
      details: error.details,
    });
    const mapped = mapRpcError(error);
    return json(mapped, mapped.code === 'MODEL_NOT_FOUND' ? 404 : 400);
  }

  return json(normalizeSaveRpcPayload(data), 200);
});
