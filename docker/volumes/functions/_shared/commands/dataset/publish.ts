import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertPublishPolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { DatasetCommandExecutionResult, PublishRequest } from './types.ts';
import { parsePublishRequest } from './validation.ts';

export function parsePublishCommand(body: unknown) {
  return parsePublishRequest(body);
}

export async function executePublishCommand(
  request: PublishRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertPublishPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_publish',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {},
  });

  const result = await repository.publish(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_publish',
      data: result.data,
    },
  };
}
