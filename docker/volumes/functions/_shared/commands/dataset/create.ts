import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertCreatePolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { CreateRequest, DatasetCommandExecutionResult } from './types.ts';
import { createRequestSchema, parseCreateRequest } from './validation.ts';

export { createRequestSchema };

export function parseCreateCommand(body: unknown) {
  return parseCreateRequest(body);
}

export async function executeCreateCommand(
  request: CreateRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertCreatePolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_create',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: '',
    payload: request.modelId ? { modelId: request.modelId } : {},
  });

  const result = await repository.create(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_create',
      data: result.data,
    },
  };
}
