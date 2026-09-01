import '@supabase/functions-js/edge-runtime.d.ts';

import { createDeleteLifecycleModelBundleHandler } from './handler.ts';

Deno.serve(createDeleteLifecycleModelBundleHandler());
