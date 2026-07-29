import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  MembershipCommandFailure,
  ReviewChangeMemberRoleRequest,
  SystemChangeMemberRoleRequest,
  TeamChangeMemberRoleRequest,
  TeamCreateRequest,
  TeamInvitationDecisionRequest,
  TeamReinviteMemberRequest,
  TeamSetRankRequest,
  TeamUpdateProfileRequest,
  UserUpdateContactRequest,
} from '../commands/membership/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type MembershipRpcResult = { ok: true; data: unknown } | MembershipCommandFailure;

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Membership command RPC failed',
    details: error.details ?? null,
  };
}

function isMembershipCommandFailure(data: unknown): data is MembershipCommandFailure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<MembershipCommandFailure> & {
    ok?: unknown;
  };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

async function callMembershipRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<MembershipRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }

  if (isMembershipCommandFailure(data)) {
    return data;
  }

  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as { ok?: unknown }).ok === true &&
    'data' in (data as Record<string, unknown>)
  ) {
    return {
      ok: true,
      data: (data as Record<string, unknown>).data,
    };
  }

  return {
    ok: true,
    data,
  };
}

export function buildTeamCreateRpcArgs(
  request: TeamCreateRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_json: request.json,
    p_rank: request.rank,
    p_is_public: request.isPublic,
    p_audit: audit,
  };
}

export function buildTeamUpdateProfileRpcArgs(
  request: TeamUpdateProfileRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_json: request.json,
    p_is_public: request.isPublic,
    p_audit: audit,
  };
}

export function buildTeamSetRankRpcArgs(
  request: TeamSetRankRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_rank: request.rank,
    p_audit: audit,
  };
}

export function buildUserUpdateContactRpcArgs(
  request: UserUpdateContactRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_user_id: request.userId,
    p_contact: request.contact,
    p_audit: audit,
  };
}

export function buildTeamChangeMemberRoleRpcArgs(
  request: TeamChangeMemberRoleRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_user_id: request.userId,
    p_role: request.role ?? null,
    p_action: request.action ?? 'set',
    p_audit: audit,
  };
}

export function buildSystemChangeMemberRoleRpcArgs(
  request: SystemChangeMemberRoleRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_user_id: request.userId,
    p_role: request.role ?? null,
    p_action: request.action ?? 'set',
    p_audit: audit,
  };
}

export function buildReviewChangeMemberRoleRpcArgs(
  request: ReviewChangeMemberRoleRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_user_id: request.userId,
    p_role: request.role ?? null,
    p_action: request.action ?? 'set',
    p_audit: audit,
  };
}

export function buildTeamReinviteMemberRpcArgs(
  request: TeamReinviteMemberRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_user_id: request.userId,
    p_audit: audit,
  };
}

export function buildTeamInvitationDecisionRpcArgs(
  request: TeamInvitationDecisionRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_team_id: request.teamId,
    p_audit: audit,
  };
}

export function callTeamCreateRpc(
  supabase: RpcClient,
  request: TeamCreateRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(supabase, 'cmd_team_create', buildTeamCreateRpcArgs(request, audit));
}

export function callTeamUpdateProfileRpc(
  supabase: RpcClient,
  request: TeamUpdateProfileRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_team_update_profile',
    buildTeamUpdateProfileRpcArgs(request, audit),
  );
}

export function callTeamSetRankRpc(
  supabase: RpcClient,
  request: TeamSetRankRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(supabase, 'cmd_team_set_rank', buildTeamSetRankRpcArgs(request, audit));
}

export function callUserUpdateContactRpc(
  supabase: RpcClient,
  request: UserUpdateContactRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_user_update_contact',
    buildUserUpdateContactRpcArgs(request, audit),
  );
}

export function callTeamChangeMemberRoleRpc(
  supabase: RpcClient,
  request: TeamChangeMemberRoleRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_team_change_member_role',
    buildTeamChangeMemberRoleRpcArgs(request, audit),
  );
}

export function callSystemChangeMemberRoleRpc(
  supabase: RpcClient,
  request: SystemChangeMemberRoleRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_system_change_member_role',
    buildSystemChangeMemberRoleRpcArgs(request, audit),
  );
}

export function callReviewChangeMemberRoleRpc(
  supabase: RpcClient,
  request: ReviewChangeMemberRoleRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_review_change_member_role',
    buildReviewChangeMemberRoleRpcArgs(request, audit),
  );
}

export function callTeamReinviteMemberRpc(
  supabase: RpcClient,
  request: TeamReinviteMemberRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_team_reinvite_member',
    buildTeamReinviteMemberRpcArgs(request, audit),
  );
}

export function callTeamAcceptInvitationRpc(
  supabase: RpcClient,
  request: TeamInvitationDecisionRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_team_accept_invitation',
    buildTeamInvitationDecisionRpcArgs(request, audit),
  );
}

export function callTeamRejectInvitationRpc(
  supabase: RpcClient,
  request: TeamInvitationDecisionRequest,
  audit: CommandAuditPayload,
) {
  return callMembershipRpc(
    supabase,
    'cmd_team_reject_invitation',
    buildTeamInvitationDecisionRpcArgs(request, audit),
  );
}
