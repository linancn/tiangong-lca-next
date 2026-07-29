import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertCreateVersionPolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { CreateVersionRequest, DatasetCommandExecutionResult } from './types.ts';
import { createVersionRequestSchema, parseCreateVersionRequest } from './validation.ts';

export { createVersionRequestSchema };

export function parseCreateVersionCommand(body: unknown) {
  return parseCreateVersionRequest(body);
}

export async function executeCreateVersionCommand(
  request: CreateVersionRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertCreateVersionPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_create_version',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: '',
    payload: {
      sourceVersion: request.sourceVersion,
      ...(request.modelId ? { modelId: request.modelId } : {}),
    },
  });

  const result = await repository.createVersion(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_create_version',
      data: result.data,
    },
  };
}
