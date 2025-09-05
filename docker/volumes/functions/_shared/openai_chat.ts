import OpenAI from '@openai/openai';

/**
 * Reusable OpenAI client (lazy initialized singleton).
 */
// Cache clients per (apiKey+baseUrl) tuple so different base URLs can be used.
const _clients = new Map<string, OpenAI>();
function getClient(baseUrl?: string): OpenAI {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY environment variable');
  const key = `${apiKey}@@${baseUrl || ''}`;
  const existing = _clients.get(key);
  if (existing) return existing;
  const cfg: Record<string, unknown> = { apiKey };
  if (baseUrl) cfg.baseURL = baseUrl; // only include when provided
  const client = new OpenAI(cfg as { apiKey: string; baseURL?: string });
  _clients.set(key, client);
  return client;
}

export interface OpenAIChatOptions {
  /** Model name; defaults to env OPENAI_CHAT_MODEL or falls back to gpt-5-mini */
  model?: string;
  /** Enable streaming (default false). Function currently returns aggregate result. */
  stream?: boolean;
  /** Optional override for base URL (e.g. Azure / proxy); falls back to env OPENAI_BASE_URL */
  baseUrl?: string;
}

export interface OpenAIChatResult {
  text: string;
  raw: unknown; // Original response object for downstream use when needed
}

/**
 * Call OpenAI Responses API.
 * @param instruct System / behavior instruction
 * @param input User input text
 * @param options Optional settings
 * @returns Output text plus raw response
 */
export async function openaiChat(
  input: string,
  options: OpenAIChatOptions = {},
): Promise<OpenAIChatResult> {
  if (!input) throw new Error('input must not be empty');

  // allow both camelCase (preferred) and snake_case (legacy) for base url in options
  const baseUrl =
    options.baseUrl ||
    ((options as Record<string, unknown>).base_url as string | undefined) ||
    Deno.env.get('OPENAI_BASE_URL') ||
    undefined;
  const client = getClient(baseUrl);
  const model = options.model || Deno.env.get('OPENAI_CHAT_MODEL') || 'gpt-5-mini';
  const stream = options.stream ?? false;

  const response = await client.responses.create({
    model,
    stream,
    input,
  });

  // SDK is expected to provide output_text; fall back to empty string if absent.
  const maybeOutput = response as { output_text?: string };
  const text = maybeOutput.output_text ?? '';
  return { text, raw: response };
}

// Example usage (only runs when this file is executed directly, not when imported).
if (import.meta.main) {
  const demoInput = 'Say hello in one short sentence.';
  openaiChat(demoInput, { baseUrl: Deno.env.get('OPENAI_BASE_URL') || undefined })
    .then((r) => console.log('[demo]', r.text))
    .catch((e) => console.error('[demo error]', e));
}
