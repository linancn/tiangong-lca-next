import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callReviewChangeMemberRoleRpc,
  callSystemChangeMemberRoleRpc,
  callTeamAcceptInvitationRpc,
  callTeamChangeMemberRoleRpc,
  callTeamCreateRpc,
  callTeamReinviteMemberRpc,
  callTeamRejectInvitationRpc,
  callTeamSetRankRpc,
  callTeamUpdateProfileRpc,
  callUserUpdateContactRpc,
  type MembershipRpcResult,
} from '../../db_rpc/membership_commands.ts';
import type {
  ReviewChangeMemberRoleRequest,
  SystemChangeMemberRoleRequest,
  TeamChangeMemberRoleRequest,
  TeamCreateRequest,
  TeamInvitationDecisionRequest,
  TeamReinviteMemberRequest,
  TeamSetRankRequest,
  TeamUpdateProfileRequest,
  UserUpdateContactRequest,
} from './types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type MembershipCommandRepository = {
  createTeam: (
    request: TeamCreateRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  updateTeamProfile: (
    request: TeamUpdateProfileRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  setTeamRank: (
    request: TeamSetRankRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  updateUserContact: (
    request: UserUpdateContactRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  changeTeamMemberRole: (
    request: TeamChangeMemberRoleRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  changeSystemMemberRole: (
    request: SystemChangeMemberRoleRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  changeReviewMemberRole: (
    request: ReviewChangeMemberRoleRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  reinviteTeamMember: (
    request: TeamReinviteMemberRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  acceptInvitation: (
    request: TeamInvitationDecisionRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
  rejectInvitation: (
    request: TeamInvitationDecisionRequest,
    audit: CommandAuditPayload,
  ) => Promise<MembershipRpcResult>;
};

function requireExplicitClient(supabase: RpcClient | null | undefined): RpcClient {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('Membership command repository requires an explicit Supabase client');
  }

  return supabase;
}

export function createMembershipCommandRepository(
  supabase: RpcClient,
): MembershipCommandRepository {
  const client = requireExplicitClient(supabase);

  return {
    createTeam: (request, audit) => callTeamCreateRpc(client, request, audit),
    updateTeamProfile: (request, audit) => callTeamUpdateProfileRpc(client, request, audit),
    setTeamRank: (request, audit) => callTeamSetRankRpc(client, request, audit),
    updateUserContact: (request, audit) => callUserUpdateContactRpc(client, request, audit),
    changeTeamMemberRole: (request, audit) => callTeamChangeMemberRoleRpc(client, request, audit),
    changeSystemMemberRole: (request, audit) =>
      callSystemChangeMemberRoleRpc(client, request, audit),
    changeReviewMemberRole: (request, audit) =>
      callReviewChangeMemberRoleRpc(client, request, audit),
    reinviteTeamMember: (request, audit) => callTeamReinviteMemberRpc(client, request, audit),
    acceptInvitation: (request, audit) => callTeamAcceptInvitationRpc(client, request, audit),
    rejectInvitation: (request, audit) => callTeamRejectInvitationRpc(client, request, audit),
  };
}
