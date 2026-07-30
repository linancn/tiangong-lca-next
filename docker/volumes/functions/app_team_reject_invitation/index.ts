import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeTeamRejectInvitationCommand,
  parseTeamRejectInvitationCommand,
} from '../_shared/commands/membership/reject_invitation.ts';
import type { TeamInvitationDecisionRequest } from '../_shared/commands/membership/types.ts';

export function createAppTeamRejectInvitationHandler(
  overrides: Partial<CommandHandlerOptions<TeamInvitationDecisionRequest>> = {},
) {
  return createCommandHandler<TeamInvitationDecisionRequest>({
    parse: parseTeamRejectInvitationCommand,
    execute: executeTeamRejectInvitationCommand,
    ...overrides,
  });
}

export const handleAppTeamRejectInvitation = createAppTeamRejectInvitationHandler();

if (import.meta.main) {
  Deno.serve(handleAppTeamRejectInvitation);
}
