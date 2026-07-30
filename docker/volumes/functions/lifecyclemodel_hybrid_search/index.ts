import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'lifecyclemodel_hybrid_search',
    entityKind: 'lifecyclemodel',
    entityLabel: 'Lifecycle model',
    entityPlural: 'lifecycle models',
    rpcName: 'hybrid_search_lifecyclemodels_v2',
  }),
);
