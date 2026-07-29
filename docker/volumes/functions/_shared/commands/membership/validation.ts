import { z } from 'zod';

import type { CommandParseResult } from '../../command_runtime/command.ts';
import {
  MEMBER_ROLE_ACTIONS,
  type ReviewChangeMemberRoleRequest,
  type SystemChangeMemberRoleRequest,
  type TeamChangeMemberRoleRequest,
  type TeamCreateRequest,
  type TeamInvitationDecisionRequest,
  type TeamReinviteMemberRequest,
  type TeamSetRankRequest,
  type TeamUpdateProfileRequest,
  type UserUpdateContactRequest,
} from './types.ts';

const uuidSchema = z.string().uuid();
const nonEmptyStringSchema = z.string().trim().min(1);
const actionSchema = z.enum(MEMBER_ROLE_ACTIONS);

const baseChangeMemberRoleSchema = z
  .object({
    userId: uuidSchema,
    role: nonEmptyStringSchema.nullable().optional(),
    action: actionSchema.optional(),
  })
  .strict();

export const teamChangeMemberRoleRequestSchema = baseChangeMemberRoleSchema
  .extend({
    teamId: uuidSchema,
  })
  .strict();

export const systemChangeMemberRoleRequestSchema = baseChangeMemberRoleSchema.strict();

export const reviewChangeMemberRoleRequestSchema = baseChangeMemberRoleSchema.strict();

export const teamReinviteMemberRequestSchema = z
  .object({
    teamId: uuidSchema,
    userId: uuidSchema,
  })
  .strict();

export const teamInvitationDecisionRequestSchema = z
  .object({
    teamId: uuidSchema,
  })
  .strict();

export const teamCreateRequestSchema = z
  .object({
    teamId: uuidSchema,
    json: z.unknown(),
    rank: z.number().int(),
    isPublic: z.boolean(),
  })
  .strict();

export const teamUpdateProfileRequestSchema = z
  .object({
    teamId: uuidSchema,
    json: z.unknown(),
    isPublic: z.boolean(),
  })
  .strict();

export const teamSetRankRequestSchema = z
  .object({
    teamId: uuidSchema,
    rank: z.number().int(),
  })
  .strict();

export const userUpdateContactRequestSchema = z
  .object({
    userId: uuidSchema,
    contact: z.unknown(),
  })
  .strict();

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseTeamChangeMemberRoleRequest(
  body: unknown,
): CommandParseResult<TeamChangeMemberRoleRequest> {
  const parsed = teamChangeMemberRoleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team change-member-role payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseSystemChangeMemberRoleRequest(
  body: unknown,
): CommandParseResult<SystemChangeMemberRoleRequest> {
  const parsed = systemChangeMemberRoleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid system change-member-role payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseReviewChangeMemberRoleRequest(
  body: unknown,
): CommandParseResult<ReviewChangeMemberRoleRequest> {
  const parsed = reviewChangeMemberRoleRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid review change-member-role payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseTeamReinviteMemberRequest(
  body: unknown,
): CommandParseResult<TeamReinviteMemberRequest> {
  const parsed = teamReinviteMemberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team reinvite-member payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseTeamInvitationDecisionRequest(
  body: unknown,
): CommandParseResult<TeamInvitationDecisionRequest> {
  const parsed = teamInvitationDecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team invitation payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseTeamCreateRequest(body: unknown): CommandParseResult<TeamCreateRequest> {
  const parsed = teamCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team create payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseTeamUpdateProfileRequest(
  body: unknown,
): CommandParseResult<TeamUpdateProfileRequest> {
  const parsed = teamUpdateProfileRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team update-profile payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseTeamSetRankRequest(body: unknown): CommandParseResult<TeamSetRankRequest> {
  const parsed = teamSetRankRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid team set-rank payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}

export function parseUserUpdateContactRequest(
  body: unknown,
): CommandParseResult<UserUpdateContactRequest> {
  const parsed = userUpdateContactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid user update-contact payload', parsed.error);
  }
  return { ok: true, value: parsed.data };
}
