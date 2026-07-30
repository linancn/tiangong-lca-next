import '@supabase/functions-js/edge-runtime.d.ts';

import { createHybridSearchHandler } from '../_shared/hybrid_search_handler.ts';

Deno.serve(
  createHybridSearchHandler({
    functionName: 'process_hybrid_search',
    entityKind: 'process',
    entityLabel: 'Process',
    entityPlural: 'processes',
    rpcName: 'hybrid_search_processes_v2',
  }),
);
