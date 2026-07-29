import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from '../membership/repository.ts';
import type { MembershipCommandExecutionResult, TeamCreateRequest } from '../membership/types.ts';
import { parseTeamCreateRequest } from '../membership/validation.ts';

export function parseTeamCreateCommand(body: unknown) {
  return parseTeamCreateRequest(body);
}

export async function executeTeamCreateCommand(
  request: TeamCreateRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'team_create',
    actorUserId: actor.userId,
    targetTable: 'teams',
    targetId: request.teamId,
    targetVersion: '',
    payload: {
      rank: request.rank,
      isPublic: request.isPublic,
    },
  });

  const result = await repository.createTeam(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'team_create',
      data: result.data,
    },
  };
}
