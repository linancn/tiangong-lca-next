import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createTidasPackageJobsHandler } from './handler.ts';

Deno.serve(createTidasPackageJobsHandler());
