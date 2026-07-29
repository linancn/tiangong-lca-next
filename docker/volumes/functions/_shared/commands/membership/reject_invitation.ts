import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from './repository.ts';
import type { MembershipCommandExecutionResult, TeamInvitationDecisionRequest } from './types.ts';
import { parseTeamInvitationDecisionRequest } from './validation.ts';

export function parseTeamRejectInvitationCommand(body: unknown) {
  return parseTeamInvitationDecisionRequest(body);
}

export async function executeTeamRejectInvitationCommand(
  request: TeamInvitationDecisionRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'team_reject_invitation',
    actorUserId: actor.userId,
    targetTable: 'roles',
    targetId: actor.userId,
    targetVersion: request.teamId,
    payload: {
      teamId: request.teamId,
    },
  });

  const result = await repository.rejectInvitation(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'team_reject_invitation',
      data: result.data,
    },
  };
}
