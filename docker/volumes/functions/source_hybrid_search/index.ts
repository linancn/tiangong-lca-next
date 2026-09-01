import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'source_hybrid_search',
    entityKind: 'source',
    entityLabel: 'Source',
    entityPlural: 'sources',
    rpcName: 'hybrid_search_sources',
    forwardVisibilityContext: true,
  }),
);
