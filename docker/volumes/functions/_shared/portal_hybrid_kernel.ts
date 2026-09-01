import { InvokeEndpointCommand, SageMakerRuntimeClient } from '@aws-sdk/client-sagemaker-runtime';

import { extractEmbeddingVector } from './embedding_vector.ts';
import {
  HYBRID_SYNONYM_RULES,
  hybridQuerySchema,
  type HybridSearchQuery,
} from './hybrid_query_utils.ts';
import {
  portalOpenAIStructuredOutput,
  type PortalOpenAIProviderConfig,
} from './portal_openai_structured.ts';

export interface PortalHybridKernelConfig {
  functionName: string;
  entityLabel: string;
  entityPlural: string;
}

export interface PortalHybridKernelProviderConfig {
  openAi: PortalOpenAIProviderConfig;
  sageMaker: {
    endpointName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

const textDecoder = new TextDecoder();

export async function rewritePortalHybridSearchQuery(
  config: PortalHybridKernelConfig,
  queryText: string,
  signal: AbortSignal,
  provider: Readonly<PortalHybridKernelProviderConfig>,
): Promise<HybridSearchQuery> {
  return await portalOpenAIStructuredOutput<HybridSearchQuery>(
    {
      schemaName: `${config.functionName}_queries`,
      schema: hybridQuerySchema,
      systemPrompt: `Field: Life Cycle Assessment (LCA)
Task: Transform description of ${config.entityPlural} into three specific queries: SemanticQueryEN, FulltextQueryEN and FulltextQueryZH.
${HYBRID_SYNONYM_RULES}`,
      userPrompt: `${config.entityLabel} description: ${queryText}`,
      temperature: 0,
      signal,
    },
    provider.openAi,
  );
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

export async function generatePortalHybridSearchEmbedding(
  text: string,
  signal: AbortSignal,
  provider: Readonly<PortalHybridKernelProviderConfig>,
): Promise<number[]> {
  const command = new InvokeEndpointCommand({
    EndpointName: provider.sageMaker.endpointName,
    ContentType: 'application/json',
    Accept: 'application/json',
    Body: JSON.stringify({ inputs: text }),
  });
  const client = new SageMakerRuntimeClient({
    region: provider.sageMaker.region,
    credentials: {
      accessKeyId: provider.sageMaker.accessKeyId,
      secretAccessKey: provider.sageMaker.secretAccessKey,
      sessionToken: provider.sageMaker.sessionToken,
    },
  });
  const response = await client.send(command, { abortSignal: signal });
  const httpStatus = response.$metadata.httpStatusCode ?? 500;
  if (httpStatus < 200 || httpStatus >= 300) {
    throw new Error(`SageMaker endpoint request failed: ${httpStatus}`);
  }
  if (!response.Body) throw new Error('empty response body from SageMaker endpoint');
  return extractEmbeddingVector(JSON.parse(await readSageMakerBody(response.Body)));
}
