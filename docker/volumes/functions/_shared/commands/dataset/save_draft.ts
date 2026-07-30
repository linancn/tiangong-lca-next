import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertSaveDraftPolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { DatasetCommandExecutionResult, SaveDraftRequest } from './types.ts';
import { parseSaveDraftRequest, saveDraftRequestSchema } from './validation.ts';

export { saveDraftRequestSchema };

export function parseSaveDraftCommand(body: unknown) {
  return parseSaveDraftRequest(body);
}

export async function executeSaveDraftCommand(
  request: SaveDraftRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertSaveDraftPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_save_draft',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: request.modelId ? { modelId: request.modelId } : {},
  });

  const result = await repository.saveDraft(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_save_draft',
      data: result.data,
    },
  };
}
