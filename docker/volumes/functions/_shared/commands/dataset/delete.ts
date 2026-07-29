import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertDeletePolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { DatasetCommandExecutionResult, DeleteRequest } from './types.ts';
import { deleteRequestSchema, parseDeleteRequest } from './validation.ts';

export { deleteRequestSchema };

export function parseDeleteCommand(body: unknown) {
  return parseDeleteRequest(body);
}

export async function executeDeleteCommand(
  request: DeleteRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertDeletePolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_delete',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {},
  });

  const result = await repository.delete(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_delete',
      data: result.data,
    },
  };
}
