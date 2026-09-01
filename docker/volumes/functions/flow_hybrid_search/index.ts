import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'flow_hybrid_search',
    entityKind: 'flow',
    entityLabel: 'Flow',
    entityPlural: 'flows',
    rpcName: 'hybrid_search_flows',
  }),
);
