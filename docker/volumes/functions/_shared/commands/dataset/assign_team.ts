import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import { assertAssignTeamPolicy } from './policy.ts';
import { createDatasetCommandRepository, type DatasetCommandRepository } from './repository.ts';
import type { AssignTeamRequest, DatasetCommandExecutionResult } from './types.ts';
import { parseAssignTeamRequest } from './validation.ts';

export function parseAssignTeamCommand(body: unknown) {
  return parseAssignTeamRequest(body);
}

export async function executeAssignTeamCommand(
  request: AssignTeamRequest,
  actor: ActorContext,
  repository: DatasetCommandRepository = createDatasetCommandRepository(actor.supabase),
): Promise<DatasetCommandExecutionResult> {
  const policy = assertAssignTeamPolicy(request);
  if (!policy.ok) {
    return policy;
  }

  const audit = buildCommandAuditPayload({
    command: 'dataset_assign_team',
    actorUserId: actor.userId,
    targetTable: request.table,
    targetId: request.id,
    targetVersion: request.version,
    payload: {
      teamId: request.teamId,
    },
  });

  const result = await repository.assignTeam(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'dataset_assign_team',
      data: result.data,
    },
  };
}
