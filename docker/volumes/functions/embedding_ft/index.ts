// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

// We'll make a direct Postgres connection to update the document
import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';
import postgres from 'postgres';
import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import {
  buildEmbeddingFtContentQuery,
  parseEmbeddingFtJobs,
  type EmbeddingFtJobError,
  type EmbeddingFtJob as Job,
} from '../_shared/embedding_ft_job.ts';
import { embeddingFtPostgresOptions } from '../_shared/embedding_ft_postgres.ts';
import {
  classifyEmbeddingJobError,
  parsePositiveInteger,
  type ClassifiedEmbeddingJobError,
} from '../_shared/embedding_queue_runtime.ts';
import { extractEmbeddingVector } from '../_shared/embedding_vector.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient } from '../_shared/supabase_client.ts';

const SAGEMAKER_ENDPOINT_NAME = Deno.env.get('SAGEMAKER_ENDPOINT_NAME');
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_SESSION_TOKEN = Deno.env.get('AWS_SESSION_TOKEN');
const DB_UPDATE_LOCK_TIMEOUT = Deno.env.get('EMBEDDING_FT_DB_LOCK_TIMEOUT')?.trim() || '5s';
const DB_UPDATE_STATEMENT_TIMEOUT =
  Deno.env.get('EMBEDDING_FT_DB_STATEMENT_TIMEOUT')?.trim() || '30s';
const DB_RETRY_BACKOFF_SECONDS = parsePositiveInteger(
  Deno.env.get('EMBEDDING_FT_DB_RETRY_BACKOFF_SECONDS'),
  300,
);
const textDecoder = new TextDecoder();

// Initialize Postgres client
const sql = postgres(
  // `SUPABASE_DB_URL` is a built-in environment variable
  Deno.env.get('SUPABASE_DB_URL')!,
  embeddingFtPostgresOptions(),
);

type FailedJob = Job & { error: string };

type DeferredJob = FailedJob & {
  category: string;
};

type JobOutcome =
  | {
      status: 'completed';
    }
  | {
      status: 'deferred';
      category: string;
      error: string;
    };

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
    authClient: supabaseAuthClient,
    redis: redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  let pendingJobs: Job[];
  try {
    pendingJobs = parseEmbeddingFtJobs(await req.json());
  } catch (error) {
    const code = (error as EmbeddingFtJobError)?.code ?? 'INVALID_EMBEDDING_JOB_BATCH';
    const message = error instanceof Error ? error.message : 'invalid request body';
    return new Response(JSON.stringify({ error: message, code }), {
      headers: { 'content-type': 'application/json' },
      status: 400,
    });
  }

  // Track jobs that completed successfully
  const completedJobs: Job[] = [];

  // Track jobs that failed due to an error
  const failedJobs: FailedJob[] = [];

  // Track jobs deliberately deferred with pgmq visibility timeout backoff
  const deferredJobs: DeferredJob[] = [];

  async function processJobs() {
    let currentJob: Job | undefined;

    while ((currentJob = pendingJobs.shift()) !== undefined) {
      try {
        const outcome = await processJob(currentJob);
        if (outcome.status === 'deferred') {
          deferredJobs.push({
            ...currentJob,
            category: outcome.category,
            error: outcome.error,
          });
        } else {
          completedJobs.push(currentJob);
        }
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
    deferredJobs: deferredJobs.length,
    failedJobs: failedJobs.length,
  });

  return new Response(
    JSON.stringify({
      completedJobs,
      deferredJobs,
      failedJobs,
    }),
    {
      // 200 OK response
      status: 200,

      // Custom headers to report job status
      headers: {
        'content-type': 'application/json',
        'x-completed-jobs': completedJobs.length.toString(),
        'x-deferred-jobs': deferredJobs.length.toString(),
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
  return extractEmbeddingVector(parsed);
}

/**
 * Processes an embedding job.
 */
async function processJob(job: Job): Promise<JobOutcome> {
  const { jobId, id, version, schema, table, contentFunction } = job;
  const jobStartedAt = performance.now();

  // Log the id & version for traceability of each job
  console.log('processing embedding job', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    contentFunction,
  });

  // Fetch content for the schema/table/row combination
  const fetchStartedAt = performance.now();
  const contentQuery = buildEmbeddingFtContentQuery(sql, job) as unknown as Promise<[Row]>;
  const [row]: [Row] = await contentQuery;

  console.log('embedding job content fetch finished', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    found: Boolean(row),
    durationMs: elapsedMs(fetchStartedAt),
  });

  if (!row) {
    console.log('row not found or version changed, ACKing job', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
    });

    await ackJob(job, 'row_not_found_or_version_changed');

    return { status: 'completed' };
  }

  if (typeof row.content !== 'string') {
    console.error('invalid content - expected string, ACKing job', {
      id,
      version,
      jobId,
      table: `${schema}.${table}`,
      contentType: typeof row.content,
    });

    await ackJob(job, 'invalid_content');

    return { status: 'completed' };
  }

  console.log('generating embedding', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    contentLength: row.content.length,
  });

  const embeddingStartedAt = performance.now();
  const embedding = await generateEmbedding(row.content);

  console.log('embedding generated', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    dimensions: embedding.length,
    durationMs: elapsedMs(embeddingStartedAt),
  });

  const updateStartedAt = performance.now();
  let result;

  try {
    result = await updateEmbeddingWithTimeouts(job, embedding);
  } catch (error) {
    const classified = classifyEmbeddingJobError(error);

    if (classified.retryable) {
      await deferJob(job, classified);
      return {
        status: 'deferred',
        category: classified.category,
        error: classified.message,
      };
    }

    throw error;
  }

  console.log('embedding update finished', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    rowsAffected: result.count,
    durationMs: elapsedMs(updateStartedAt),
  });

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

  await ackJob(job, result.count === 0 ? 'no_rows_affected' : 'updated');

  // Confirm completion for this id/version
  console.log('finished embedding job', {
    id,
    version,
    jobId,
    totalDurationMs: elapsedMs(jobStartedAt),
  });

  return { status: 'completed' };
}

async function updateEmbeddingWithTimeouts(job: Job, embedding: number[]) {
  const { id, version, schema, table, embeddingColumn } = job;

  return await sql.begin(async (transaction) => {
    const tx = transaction as unknown as typeof sql;

    await tx`
      select set_config('lock_timeout', ${DB_UPDATE_LOCK_TIMEOUT}, true)
    `;
    await tx`
      select set_config('statement_timeout', ${DB_UPDATE_STATEMENT_TIMEOUT}, true)
    `;

    return await tx`
      update
        ${tx(schema)}.${tx(table)}
      set
        ${tx(embeddingColumn)} = ${JSON.stringify(embedding)},
        embedding_ft_at = now()
      where
        id = ${id} and version = ${version}
    `;
  });
}

async function ackJob(job: Job, reason: string) {
  const { jobId, id, version, schema, table } = job;
  const ackStartedAt = performance.now();

  await sql`
    select pgmq.delete(${QUEUE_NAME}, ${jobId}::bigint)
  `;

  console.log('embedding job ACKed', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    reason,
    durationMs: elapsedMs(ackStartedAt),
  });
}

async function deferJob(job: Job, error: ClassifiedEmbeddingJobError) {
  const { jobId, id, version, schema, table } = job;
  const deferStartedAt = performance.now();

  await sql`
    select pgmq.set_vt(${QUEUE_NAME}, ${jobId}::bigint, ${DB_RETRY_BACKOFF_SECONDS}::integer)
  `;

  console.warn('embedding job deferred after retryable database contention', {
    id,
    version,
    jobId,
    table: `${schema}.${table}`,
    category: error.category,
    code: error.code,
    retryBackoffSeconds: DB_RETRY_BACKOFF_SECONDS,
    lockTimeout: DB_UPDATE_LOCK_TIMEOUT,
    statementTimeout: DB_UPDATE_STATEMENT_TIMEOUT,
    durationMs: elapsedMs(deferStartedAt),
    error: error.message,
  });
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt);
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
