// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { z } from 'zod';

// We'll make a direct Postgres connection to update the document
import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';
import postgres from 'postgres';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient as supabase } from '../_shared/supabase_client.ts';

const SAGEMAKER_ENDPOINT_NAME = Deno.env.get('SAGEMAKER_ENDPOINT_NAME');
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_SESSION_TOKEN = Deno.env.get('AWS_SESSION_TOKEN');
const textDecoder = new TextDecoder();

// Initialize Postgres client
const sql = postgres(
  // `SUPABASE_DB_URL` is a built-in environment variable
  Deno.env.get('SUPABASE_DB_URL')!,
);

// Job schema: now supports composite PK (id, version)
const jobSchema = z.object({
  jobId: z.number(),
  id: z.string().uuid(),
  version: z.string(),
  schema: z.string(),
  table: z.string(),
  contentFunction: z.string(),
  embeddingColumn: z.string(),
});

const failedJobSchema = jobSchema.extend({
  error: z.string(),
});

type Job = z.infer<typeof jobSchema>;
type FailedJob = z.infer<typeof failedJobSchema>;

type Row = {
  id: string;
  version: string;
  content: unknown;
};

const QUEUE_NAME = 'embedding_jobs';

let sagemakerClient: SageMakerRuntimeClient | undefined;

function getSageMakerClient() {
  if (!sagemakerClient) {
    sagemakerClient = new SageMakerRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY ?? '',
        sessionToken: AWS_SESSION_TOKEN ?? undefined,
      },
    });
  }

  return sagemakerClient;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

/**
 * Attempts to parse a JSON string, returning undefined when parsing is not possible.
 */
function safeParseJsonString(value: string): unknown | undefined {
  const trimmed = value.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    console.warn('failed to parse JSON string from model response', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

function findFirstNumberArray(value: unknown): number[] | undefined {
  if (typeof value === 'string') {
    const parsed = safeParseJsonString(value);
    if (parsed !== undefined) {
      return findFirstNumberArray(parsed);
    }
    return undefined;
  }

  if (isNumberArray(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstNumberArray(item);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    for (const key of ['embedding', 'embeddings', 'data']) {
      if (key in obj) {
        const found = findFirstNumberArray(obj[key]);
        if (found) {
          return found;
        }
      }
    }

    for (const candidate of Object.values(obj)) {
      const found = findFirstNumberArray(candidate);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

function extractEmbedding(result: unknown): number[] | undefined {
  return findFirstNumberArray(result);
}

// Listen for HTTP requests
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('expected POST request', { status: 405 });
  }

  if (req.headers.get('content-type') !== 'application/json') {
    return new Response('expected json body', { status: 400 });
  }

  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabase,
    redis: redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  // Use Zod to parse and validate the request body
  const parseResult = z.array(jobSchema).safeParse(await req.json());

  if (parseResult.error) {
    return new Response(`invalid request body: ${parseResult.error.message}`, {
      status: 400,
    });
  }

  const pendingJobs = parseResult.data;

  // Track jobs that completed successfully
  const completedJobs: Job[] = [];

  // Track jobs that failed due to an error
  const failedJobs: FailedJob[] = [];

  async function processJobs() {
    let currentJob: Job | undefined;

    while ((currentJob = pendingJobs.shift()) !== undefined) {
      try {
        await processJob(currentJob);
        completedJobs.push(currentJob);
      } catch (error) {
        const msg = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('job failed', {
          id: currentJob.id,
          version: currentJob.version,
          jobId: currentJob.jobId,
          table: `${currentJob.schema}.${currentJob.table}`,
          contentFunction: currentJob.contentFunction,
          error: msg,
        });
        failedJobs.push({
          ...currentJob,
          error: msg,
        });
      }
    }
  }

  try {
    // Process jobs while listening for worker termination
    await Promise.race([processJobs(), catchUnload()]);
  } catch (error) {
    // If the worker is terminating (e.g. wall clock limit reached),
    // add pending jobs to fail list with termination reason
    failedJobs.push(
      ...pendingJobs.map((job) => ({
        ...job,
        error: error instanceof Error ? error.message : JSON.stringify(error),
      })),
    );
  }

  // Log completed and failed jobs for traceability
  console.log('finished processing jobs:', {
    completedJobs: completedJobs.length,
    failedJobs: failedJobs.length,
  });

  return new Response(
    JSON.stringify({
      completedJobs,
      failedJobs,
    }),
    {
      // 200 OK response
      status: 200,

      // Custom headers to report job status
      headers: {
        'content-type': 'application/json',
        'x-completed-jobs': completedJobs.length.toString(),
        'x-failed-jobs': failedJobs.length.toString(),
      },
    },
  );
});

/**
 * Generates an embedding for the given text.
 */
async function generateEmbedding(text: string) {
  if (!SAGEMAKER_ENDPOINT_NAME) {
    throw new Error('missing SAGEMAKER_ENDPOINT_NAME environment variable');
  }

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variable');
  }

  const client = getSageMakerClient();

  const command = new InvokeEndpointCommand({
    EndpointName: SAGEMAKER_ENDPOINT_NAME,
    ContentType: 'application/json',
    Accept: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  });

  const response = await client.send(command);

  const httpStatus = response.$metadata.httpStatusCode ?? 500;
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`SageMaker endpoint request failed: ${httpStatus}`);
  }

  const rawBody = response.Body;

  if (!rawBody) {
    throw new Error('empty response body from SageMaker endpoint');
  }

  let bodyString: string;

  if (typeof rawBody === 'string') {
    bodyString = rawBody;
  } else if (rawBody instanceof Uint8Array) {
    bodyString = textDecoder.decode(rawBody);
  } else if (
    rawBody &&
    typeof rawBody === 'object' &&
    'transformToByteArray' in rawBody &&
    typeof (rawBody as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray ===
      'function'
  ) {
    const bytes = await (
      rawBody as unknown as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    bodyString = textDecoder.decode(bytes);
  } else {
    throw new Error('unexpected response body type from SageMaker endpoint');
  }

  const parsed = JSON.parse(bodyString);
  const embedding = extractEmbedding(parsed);

  if (!embedding) {
    throw new Error('failed to generate embedding from SageMaker response');
  }

  return embedding;
}

/**
 * Processes an embedding job.
 */
async function processJob(job: Job) {
  const { jobId, id, version, schema, table, contentFunction, embeddingColumn } = job;

  // Log the id & version for traceability of each job
  console.log('processing embedding job', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    contentFunction,
  });

  // Fetch content for the schema/table/row combination
  const [row]: [Row] = await sql`
    select
      id,
      version,
      ${sql(contentFunction)}(t) as content
    from
      ${sql(schema)}.${sql(table)} t
    where
      id = ${id} and version = ${version}
  `;

  if (!row) {
    console.log('row not found or version changed, ACKing job', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
    });

    await sql`
      select pgmq.delete(${QUEUE_NAME}, ${jobId}::bigint)
    `;

    return;
  }

  if (typeof row.content !== 'string') {
    console.error('invalid content - expected string, ACKing job', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
      contentType: typeof row.content,
    });

    await sql`
      select pgmq.delete(${QUEUE_NAME}, ${jobId}::bigint)
    `;

    return;
  }

  console.log('generating embedding for ', row.content);

  const embedding = await generateEmbedding(row.content);

  const result = await sql`
    update
      ${sql(schema)}.${sql(table)}
    set
      ${sql(embeddingColumn)} = ${JSON.stringify(embedding)},
      embedding_ft_at = now()
    where
      id = ${id} and version = ${version}
  `;

  if (result.count === 0) {
    console.log('no rows affected - record not found or version changed, ACKing job', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
    });
  } else {
    console.log('embedding updated successfully', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
      rowsAffected: result.count,
    });
  }

  await sql`
    select pgmq.delete(${QUEUE_NAME}, ${jobId}::bigint)
  `;

  // Confirm completion for this id/version
  console.log('finished embedding job', { id, version, jobId });
}

/**
 * Returns a promise that rejects if the worker is terminating.
 */
function catchUnload() {
  return new Promise((reject) => {
    // Edge runtime beforeunload event detail isn't strongly typed; capture minimal shape
    addEventListener('beforeunload', (ev: Event & { detail?: { reason?: string } }) => {
      // Use optional chaining to avoid runtime errors if detail is absent
      reject(new Error(ev.detail?.reason));
    });
  });
}
