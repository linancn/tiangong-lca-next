import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';

import { extractEmbeddingVector } from './embedding_vector.ts';
import {
  HYBRID_SYNONYM_RULES,
  hybridQuerySchema,
  type HybridSearchQuery,
} from './hybrid_query_utils.ts';
import { openaiStructuredOutput } from './openai_structured.ts';

export interface HybridSearchKernelConfig {
  functionName: string;
  entityLabel: string;
  entityPlural: string;
}

const OPENAI_CHAT_MODEL = Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4.1-mini';
const SAGEMAKER_ENDPOINT_NAME = Deno.env.get('SAGEMAKER_ENDPOINT_NAME');
const AWS_REGION = 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
const AWS_SESSION_TOKEN = Deno.env.get('AWS_SESSION_TOKEN');
const textDecoder = new TextDecoder();

let sagemakerClient: SageMakerRuntimeClient | undefined;

function getSageMakerClient(): SageMakerRuntimeClient {
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

export async function rewriteHybridSearchQuery(
  config: HybridSearchKernelConfig,
  queryText: string,
  signal?: AbortSignal,
): Promise<HybridSearchQuery> {
  return await openaiStructuredOutput<HybridSearchQuery>({
    schemaName: `${config.functionName}_queries`,
    schema: hybridQuerySchema,
    systemPrompt: `Field: Life Cycle Assessment (LCA)
Task: Transform description of ${config.entityPlural} into three specific queries: SemanticQueryEN, FulltextQueryEN and FulltextQueryZH.
${HYBRID_SYNONYM_RULES}`,
    userPrompt: `${config.entityLabel} description: ${queryText}`,
    options: { model: OPENAI_CHAT_MODEL, temperature: 0 },
    signal,
  });
}

async function readSageMakerBody(rawBody: unknown): Promise<string> {
  if (typeof rawBody === 'string') return rawBody;
  if (rawBody instanceof Uint8Array) return textDecoder.decode(rawBody);
  if (
    rawBody &&
    typeof rawBody === 'object' &&
    'transformToByteArray' in rawBody &&
    typeof (rawBody as { transformToByteArray?: unknown }).transformToByteArray === 'function'
  ) {
    const bytes = await (
      rawBody as unknown as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return textDecoder.decode(bytes);
  }
  throw new Error('unexpected response body type from SageMaker endpoint');
}

export async function generateHybridSearchEmbedding(
  text: string,
  signal?: AbortSignal,
): Promise<number[]> {
  if (!SAGEMAKER_ENDPOINT_NAME) {
    throw new Error('missing SAGEMAKER_ENDPOINT_NAME environment variable');
  }
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error('missing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variable');
  }

  const command = new InvokeEndpointCommand({
    EndpointName: SAGEMAKER_ENDPOINT_NAME,
    ContentType: 'application/json',
    Accept: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  });
  const response = signal
    ? await getSageMakerClient().send(command, { abortSignal: signal })
    : await getSageMakerClient().send(command);
  const httpStatus = response.$metadata.httpStatusCode ?? 500;
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`SageMaker endpoint request failed: ${httpStatus}`);
  }
  if (!response.Body) throw new Error('empty response body from SageMaker endpoint');

  return extractEmbeddingVector(JSON.parse(await readSageMakerBody(response.Body)));
}
