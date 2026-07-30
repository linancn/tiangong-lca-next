import '@supabase/functions-js/edge-runtime.d.ts';

import { createSaveLifecycleModelBundleHandler } from './handler.ts';

Deno.serve(createSaveLifecycleModelBundleHandler());
