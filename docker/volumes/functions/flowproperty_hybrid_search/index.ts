import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'flowproperty_hybrid_search',
    entityKind: 'flowproperty',
    entityLabel: 'Flow property',
    entityPlural: 'flow properties',
    rpcName: 'hybrid_search_flowproperties',
    forwardVisibilityContext: true,
  }),
);
