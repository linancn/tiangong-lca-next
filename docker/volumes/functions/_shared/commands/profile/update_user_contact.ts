import type { ActorContext } from '../../command_runtime/actor_context.ts';
import { buildCommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  createMembershipCommandRepository,
  type MembershipCommandRepository,
} from '../membership/repository.ts';
import type {
  MembershipCommandExecutionResult,
  UserUpdateContactRequest,
} from '../membership/types.ts';
import { parseUserUpdateContactRequest } from '../membership/validation.ts';

export function parseUserUpdateContactCommand(body: unknown) {
  return parseUserUpdateContactRequest(body);
}

export async function executeUserUpdateContactCommand(
  request: UserUpdateContactRequest,
  actor: ActorContext,
  repository: MembershipCommandRepository = createMembershipCommandRepository(actor.supabase),
): Promise<MembershipCommandExecutionResult> {
  const audit = buildCommandAuditPayload({
    command: 'user_update_contact',
    actorUserId: actor.userId,
    targetTable: 'users',
    targetId: request.userId,
    targetVersion: '',
    payload: {
      hasContact: true,
    },
  });

  const result = await repository.updateUserContact(request, audit);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      command: 'user_update_contact',
      data: result.data,
    },
  };
}
