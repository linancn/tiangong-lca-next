import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  type CommandHandlerOptions,
  createCommandHandler,
} from '../_shared/command_runtime/command.ts';
import type { UserUpdateContactRequest } from '../_shared/commands/membership/types.ts';
import {
  executeUserUpdateContactCommand,
  parseUserUpdateContactCommand,
} from '../_shared/commands/profile/update_user_contact.ts';

export function createAppUserUpdateContactHandler(
  overrides: Partial<CommandHandlerOptions<UserUpdateContactRequest>> = {},
) {
  return createCommandHandler<UserUpdateContactRequest>({
    parse: parseUserUpdateContactCommand,
    execute: executeUserUpdateContactCommand,
    ...overrides,
  });
}

export const handleAppUserUpdateContact = createAppUserUpdateContactHandler();

if (import.meta.main) {
  Deno.serve(handleAppUserUpdateContact);
}
