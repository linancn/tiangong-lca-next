import { supabase } from '@/services/supabase';
import { supabasePublishableKey, supabaseUrl } from '@/services/supabase/key';
import { createClient } from '@supabase/supabase-js';

/** Local intent fence; backend JWT authentication and authorization remain authoritative. */
export type TaskSessionGuard = {
  ownerId: string;
  isCurrent(): boolean;
};

export class TaskSessionChangedError extends Error {
  constructor() {
    super('task_owner_changed');
    this.name = 'TaskSessionChangedError';
  }
}

export async function assertTaskSession(
  accessToken: string,
  guard: TaskSessionGuard,
): Promise<void> {
  if (!accessToken || !guard.ownerId || !guard.isCurrent()) throw new TaskSessionChangedError();
  let claims;
  try {
    claims = await supabase.auth.getClaims(accessToken);
  } catch {
    throw new TaskSessionChangedError();
  }
  if (!guard.isCurrent() || claims.error || claims.data?.claims?.sub !== guard.ownerId) {
    throw new TaskSessionChangedError();
  }
}

/** Checks local intent after SDK token resolution, immediately before native dispatch.
 * A request already sent remains subject to backend authorization and cannot be undone here.
 * accessToken mode creates no persistent auth client, refresh timer or auth listener.
 */
export function createTaskSessionClient(accessToken: string, guard: TaskSessionGuard) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    db: { schema: 'api' },
    accessToken: async () => accessToken,
    global: {
      fetch: (input, init) => {
        if (!guard.isCurrent()) return Promise.reject(new TaskSessionChangedError());
        return fetch(input, init);
      },
    },
  });
}
