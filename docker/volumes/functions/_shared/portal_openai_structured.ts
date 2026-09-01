import OpenAI from '@openai/openai';

export interface PortalOpenAIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface PortalOpenAIStructuredRequest {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  signal?: AbortSignal;
}

const clients = new Map<string, OpenAI>();
export const PORTAL_OPENAI_MAX_OUTPUT_TOKENS = 256;

function getPortalOpenAIClient(provider: Readonly<PortalOpenAIProviderConfig>): OpenAI {
  if (!provider.apiKey || !provider.model || provider.apiKey !== provider.apiKey.trim()) {
    throw new Error('Invalid Portal OpenAI provider configuration');
  }
  const key = `${provider.apiKey}@@${provider.baseUrl ?? ''}`;
  const existing = clients.get(key);
  if (existing) return existing;

  const config: { apiKey: string; baseURL?: string } = { apiKey: provider.apiKey };
  if (provider.baseUrl) config.baseURL = provider.baseUrl;
  const client = new OpenAI(config);
  clients.set(key, client);
  return client;
}

function extractOutputText(response: unknown): string {
  if (!response || typeof response !== 'object') return '';
  const record = response as Record<string, unknown>;
  if (typeof record.output_text === 'string' && record.output_text.trim()) {
    return record.output_text.trim();
  }

  if (!Array.isArray(record.output)) {
    const choices = record.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0];
      if (first && typeof first === 'object') {
        const message = (first as Record<string, unknown>).message;
        if (message && typeof message === 'object') {
          const content = (message as Record<string, unknown>).content;
          if (typeof content === 'string' && content.trim()) return content.trim();
          if (Array.isArray(content)) {
            for (const part of content) {
              if (!part || typeof part !== 'object') continue;
              const text = (part as Record<string, unknown>).text;
              if (typeof text === 'string' && text.trim()) return text.trim();
            }
          }
        }
      }
    }
    return '';
  }

  for (const item of record.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) return text.trim();
    }
  }
  return '';
}

function parseJsonOutput(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  const normalized = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(normalized);
  } catch (_error) {
    const objectStart = normalized.indexOf('{');
    const objectEnd = normalized.lastIndexOf('}');
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(normalized.slice(objectStart, objectEnd + 1));
    }
    throw new Error('OpenAI output is not valid JSON');
  }
}

export function buildPortalOpenAIResponsesParameters(
  request: PortalOpenAIStructuredRequest,
  provider: Readonly<PortalOpenAIProviderConfig>,
) {
  return {
    model: provider.model,
    temperature: request.temperature ?? 0,
    store: false as const,
    max_output_tokens: PORTAL_OPENAI_MAX_OUTPUT_TOKENS,
    reasoning: { effort: 'none' as const },
    input: [
      { role: 'system' as const, content: request.systemPrompt },
      { role: 'user' as const, content: request.userPrompt },
    ],
    text: {
      verbosity: 'low' as const,
      format: {
        type: 'json_schema' as const,
        name: request.schemaName,
        schema: request.schema,
        strict: true as const,
      },
    },
  };
}

export async function portalOpenAIStructuredOutput<T>(
  request: PortalOpenAIStructuredRequest,
  provider: Readonly<PortalOpenAIProviderConfig>,
): Promise<T> {
  const client = getPortalOpenAIClient(provider) as unknown as {
    responses?: {
      create?: (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>;
    };
    chat?: {
      completions?: {
        create?: (args: unknown, options?: { signal?: AbortSignal }) => Promise<unknown>;
      };
    };
  };
  let response: unknown;

  if (client.responses?.create) {
    const parameters = buildPortalOpenAIResponsesParameters(request, provider);
    response = request.signal
      ? await client.responses.create(parameters, { signal: request.signal })
      : await client.responses.create(parameters);
  } else if (client.chat?.completions?.create) {
    const parameters = {
      model: provider.model,
      temperature: request.temperature ?? 0,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: request.schemaName,
          schema: request.schema,
          strict: true,
        },
      },
    };
    response = request.signal
      ? await client.chat.completions.create(parameters, { signal: request.signal })
      : await client.chat.completions.create(parameters);
  } else {
    throw new Error('OpenAI SDK missing both responses.create and chat.completions.create');
  }

  const outputText = extractOutputText(response);
  if (!outputText) throw new Error('OpenAI response did not contain output text');
  return parseJsonOutput(outputText) as T;
}
