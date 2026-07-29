import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createExportTidasPackageHandler } from './handler.ts';

Deno.serve(createExportTidasPackageHandler());
