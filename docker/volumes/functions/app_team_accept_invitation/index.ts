import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import {
  executeTeamAcceptInvitationCommand,
  parseTeamAcceptInvitationCommand,
} from '../_shared/commands/membership/accept_invitation.ts';
import type { TeamInvitationDecisionRequest } from '../_shared/commands/membership/types.ts';

export function createAppTeamAcceptInvitationHandler(
  overrides: Partial<CommandHandlerOptions<TeamInvitationDecisionRequest>> = {},
) {
  return createCommandHandler<TeamInvitationDecisionRequest>({
    parse: parseTeamAcceptInvitationCommand,
    execute: executeTeamAcceptInvitationCommand,
    ...overrides,
  });
}

export const handleAppTeamAcceptInvitation = createAppTeamAcceptInvitationHandler();

if (import.meta.main) {
  Deno.serve(handleAppTeamAcceptInvitation);
}
