import '@supabase/functions-js/edge-runtime.d.ts';

import { createAiSuggestHandler } from './handler.ts';

export const handleAiSuggest = createAiSuggestHandler();

if (import.meta.main) {
  Deno.serve(handleAiSuggest);
}
