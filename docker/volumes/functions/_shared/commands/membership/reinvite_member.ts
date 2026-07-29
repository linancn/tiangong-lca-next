import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from './repository.ts';
import type { MembershipCommandExecutionResult, TeamReinviteMemberRequest } from './types.ts';
import { parseTeamReinviteMemberRequest } from './validation.ts';

export function parseTeamReinviteMemberCommand(body: unknown) {
  return parseTeamReinviteMemberRequest(body);
}

export async function executeTeamReinviteMemberCommand(
  request: TeamReinviteMemberRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'team_reinvite_member',
    actorUserId: actor.userId,
    targetTable: 'roles',
    targetId: request.userId,
    targetVersion: request.teamId,
    payload: {
      teamId: request.teamId,
      userId: request.userId,
    },
  });

  const result = await repository.reinviteTeamMember(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'team_reinvite_member',
      data: result.data,
    },
  };
}
