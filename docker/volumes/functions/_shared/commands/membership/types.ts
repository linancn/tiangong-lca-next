export const MEMBER_ROLE_ACTIONS = ['set', 'remove'] as const;

export type MemberRoleAction = (typeof MEMBER_ROLE_ACTIONS)[number];

export type TeamChangeMemberRoleRequest = {
  teamId: string;
  userId: string;
  role?: string | null;
  action?: MemberRoleAction;
};

export type SystemChangeMemberRoleRequest = {
  userId: string;
  role?: string | null;
  action?: MemberRoleAction;
};

export type ReviewChangeMemberRoleRequest = {
  userId: string;
  role?: string | null;
  action?: MemberRoleAction;
};

export type TeamReinviteMemberRequest = {
  teamId: string;
  userId: string;
};

export type TeamInvitationDecisionRequest = {
  teamId: string;
};

export type TeamCreateRequest = {
  teamId: string;
  json: unknown;
  rank: number;
  isPublic: boolean;
};

export type TeamUpdateProfileRequest = {
  teamId: string;
  json: unknown;
  isPublic: boolean;
};

export type TeamSetRankRequest = {
  teamId: string;
  rank: number;
};

export type UserUpdateContactRequest = {
  userId: string;
  contact: unknown;
};

export type MembershipCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type MembershipCommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | MembershipCommandFailure;
