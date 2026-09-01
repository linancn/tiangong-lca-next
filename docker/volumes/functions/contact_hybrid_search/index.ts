import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'contact_hybrid_search',
    entityKind: 'contact',
    entityLabel: 'Contact',
    entityPlural: 'contacts',
    rpcName: 'hybrid_search_contacts',
    forwardVisibilityContext: true,
  }),
);
