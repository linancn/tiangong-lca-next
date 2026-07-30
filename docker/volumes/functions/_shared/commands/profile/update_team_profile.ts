import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from '../membership/repository.ts';
import type {
  MembershipCommandExecutionResult,
  TeamSetRankRequest,
  TeamUpdateProfileRequest,
} from '../membership/types.ts';
import {
  parseTeamSetRankRequest,
  parseTeamUpdateProfileRequest,
} from '../membership/validation.ts';

export function parseTeamUpdateProfileCommand(body: unknown) {
  return parseTeamUpdateProfileRequest(body);
}

export function parseTeamSetRankCommand(body: unknown) {
  return parseTeamSetRankRequest(body);
}

export async function executeTeamUpdateProfileCommand(
  request: TeamUpdateProfileRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'team_update_profile',
    actorUserId: actor.userId,
    targetTable: 'teams',
    targetId: request.teamId,
    targetVersion: '',
    payload: {
      isPublic: request.isPublic,
    },
  });

  const result = await repository.updateTeamProfile(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'team_update_profile',
      data: result.data,
    },
  };
}

export async function executeTeamSetRankCommand(
  request: TeamSetRankRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'team_set_rank',
    actorUserId: actor.userId,
    targetTable: 'teams',
    targetId: request.teamId,
    targetVersion: '',
    payload: {
      rank: request.rank,
    },
  });

  const result = await repository.setTeamRank(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'team_set_rank',
      data: result.data,
    },
  };
}
