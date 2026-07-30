import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createLegacyEndpointRemovedHandler } from '../_shared/legacy_endpoint_removed.ts';

export const handleUpdateUser = createLegacyEndpointRemovedHandler();

if (import.meta.main) {
  Deno.serve(handleUpdateUser);
}
