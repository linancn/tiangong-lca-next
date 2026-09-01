import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'unitgroup_hybrid_search',
    entityKind: 'unitgroup',
    entityLabel: 'Unit group',
    entityPlural: 'unit groups',
    rpcName: 'hybrid_search_unitgroups',
    forwardVisibilityContext: true,
  }),
);
