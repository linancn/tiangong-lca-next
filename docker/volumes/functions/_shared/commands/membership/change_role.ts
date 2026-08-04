import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from './repository.ts';
import type {
  MembershipCommandExecutionResult,
  ReviewChangeMemberRoleRequest,
  SystemChangeMemberRoleRequest,
  TeamChangeMemberRoleRequest,
} from './types.ts';
import {
  parseReviewChangeMemberRoleRequest,
  parseSystemChangeMemberRoleRequest,
  parseTeamChangeMemberRoleRequest,
} from './validation.ts';

type ChangeMemberRoleScope = 'team' | 'system' | 'review';

function normalizeAction(action?: 'set' | 'remove') {
  return action ?? 'set';
}

function assertChangeRolePayload(
  action: 'set' | 'remove',
  role: string | null | undefined,
): MembershipCommandExecutionResult | null {
  if (action === 'set' && (!role || role.trim().length === 0)) {
    return {
      ok: false,
      code: 'ROLE_REQUIRED',
      status: 400,
      message: 'role is required when action is set',
    };
  }

  if (action === 'remove' && role && role.trim().length > 0) {
    return {
      ok: false,
      code: 'ROLE_NOT_ALLOWED',
      status: 400,
      message: 'role must be omitted when action is remove',
    };
  }

  return null;
}

export function parseTeamChangeMemberRoleCommand(body: unknown) {
  return parseTeamChangeMemberRoleRequest(body);
}

export function parseSystemChangeMemberRoleCommand(body: unknown) {
  return parseSystemChangeMemberRoleRequest(body);
}

export function parseReviewChangeMemberRoleCommand(body: unknown) {
  return parseReviewChangeMemberRoleRequest(body);
}

export async function executeTeamChangeMemberRoleCommand(
  request: TeamChangeMemberRoleRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  return executeChangeRoleByScope('team', request, actor, repository);
}

export async function executeSystemChangeMemberRoleCommand(
  request: SystemChangeMemberRoleRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  return executeChangeRoleByScope('system', request, actor, repository);
}

export async function executeReviewChangeMemberRoleCommand(
  request: ReviewChangeMemberRoleRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  return executeChangeRoleByScope('review', request, actor, repository);
}

async function executeChangeRoleByScope(
  scope: ChangeMemberRoleScope,
  request:
    | TeamChangeMemberRoleRequest
    | SystemChangeMemberRoleRequest
    | ReviewChangeMemberRoleRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository,
): Promise<MembershipCommandExecutionResult> {
  const action = normalizeAction(request.action);
  const roleError = assertChangeRolePayload(action, request.role);
  if (roleError) {
    return roleError;
  }

  const audit = buildCommandAuditPayload({
    command: `${scope}_change_member_role`,
    actorUserId: actor.userId,
    targetTable: 'roles',
    targetId: request.userId,
    targetVersion: 'teamId' in request ? request.teamId : '',
    payload: {
      action,
      role: request.role ?? null,
      teamId: 'teamId' in request ? request.teamId : null,
    },
  });

  const result =
    scope === 'team'
      ? await repository.changeTeamMemberRole(request as TeamChangeMemberRoleRequest, audit)
      : scope === 'system'
        ? await repository.changeSystemMemberRole(request as SystemChangeMemberRoleRequest, audit)
        : await repository.changeReviewMemberRole(request as ReviewChangeMemberRoleRequest, audit);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: `${scope}_change_member_role`,
      data: result.data,
    },
  };
}
