import OpenAI from '@openai/openai';

const _clients = new Map<string, OpenAI>();

function getClient(baseUrl?: string): OpenAI {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable');
  }

  const key = `${apiKey}@@${baseUrl || ''}`;
  const existing = _clients.get(key);
  if (existing) {
    return existing;
  }

  const cfg: Record<string, unknown> = { apiKey };
  if (baseUrl) {
    cfg.baseURL = baseUrl;
  }

  const client = new OpenAI(cfg as { apiKey: string; baseURL?: string });
  _clients.set(key, client);
  return client;
}

function extractOutputText(response: unknown): string {
  if (!response || typeof response !== 'object') {
    return '';
  }

  const asRecord = response as Record<string, unknown>;
  const outputText = asRecord.output_text;
  if (typeof outputText === 'string' && outputText.trim()) {
    return outputText.trim();
  }

  const output = asRecord.output;
  if (!Array.isArray(output)) {
    const choices = asRecord.choices;
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0];
      if (first && typeof first === 'object') {
        const message = (first as Record<string, unknown>).message;
        if (message && typeof message === 'object') {
          const content = (message as Record<string, unknown>).content;
          if (typeof content === 'string' && content.trim()) {
            return content.trim();
          }

          if (Array.isArray(content)) {
            for (const part of content) {
              if (!part || typeof part !== 'object') {
                continue;
              }

              const text = (part as Record<string, unknown>).text;
              if (typeof text === 'string' && text.trim()) {
                return text.trim();
              }
            }
          }
        }
      }
    }

    return '';
  }

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if (!part || typeof part !== 'object') {
        continue;
      }

      const text = (part as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    }
  }

  return '';
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

function parseJson(text: string): unknown {
  const normalized = stripCodeFence(text);

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

export interface OpenAIStructuredOptions {
  model?: string;
  temperature?: number;
  baseUrl?: string;
}

export interface OpenAIStructuredRequest {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
  options?: OpenAIStructuredOptions;
}

export async function openaiStructuredOutput<T>(request: OpenAIStructuredRequest): Promise<T> {
  const baseUrl = request.options?.baseUrl || Deno.env.get('OPENAI_BASE_URL') || undefined;
  const model = request.options?.model || Deno.env.get('OPENAI_CHAT_MODEL') || 'gpt-4.1-mini';
  const temperature = request.options?.temperature ?? 0;

  const client = getClient(baseUrl);
  const clientAny = client as unknown as {
    responses?: { create?: (args: unknown) => Promise<unknown> };
    chat?: { completions?: { create?: (args: unknown) => Promise<unknown> } };
  };

  let response: unknown;

  if (clientAny.responses?.create) {
    response = await clientAny.responses.create({
      model,
      temperature,
      input: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: request.schemaName,
          schema: request.schema,
          strict: true,
        },
      },
    });
  } else if (clientAny.chat?.completions?.create) {
    response = await clientAny.chat.completions.create({
      model,
      temperature,
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
    });
  } else {
    throw new Error('OpenAI SDK missing both responses.create and chat.completions.create');
  }

  const outputText = extractOutputText(response);
  if (!outputText) {
    throw new Error('OpenAI response did not contain output text');
  }

  return parseJson(outputText) as T;
}
