import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createImportTidasPackageHandler } from './handler.ts';

Deno.serve(createImportTidasPackageHandler());
