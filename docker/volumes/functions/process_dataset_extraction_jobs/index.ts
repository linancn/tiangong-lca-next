// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { processDatasetExtractionJobs } from '../_shared/dataset_extraction_worker.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

interface WorkerRequestBody {
  batchSize?: number;
  visibilityTimeoutSeconds?: number;
  maxReadCount?: number;
}

async function parseBody(req: Request): Promise<WorkerRequestBody> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return {};
  const body = await req.json();
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as WorkerRequestBody)
    : {};
}

export async function handleProcessDatasetExtractionJobs(req: Request): Promise<Response> {
  const authResult = await authenticateRequest(req, {
    allowedMethods: [AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  try {
    const body = await parseBody(req);
    const result = await processDatasetExtractionJobs({
      supabase: supabaseClient,
      batchSize: body.batchSize,
      visibilityTimeoutSeconds: body.visibilityTimeoutSeconds,
      maxReadCount: body.maxReadCount,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code =
      typeof error === 'object' && error !== null && typeof Reflect.get(error, 'code') === 'string'
        ? Reflect.get(error, 'code')
        : 'DATASET_EXTRACTION_WORKER_FAILED';

    console.error('[process_dataset_extraction_jobs] caught error', {
      code,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return new Response(JSON.stringify({ success: false, code, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

Deno.serve(handleProcessDatasetExtractionJobs);
