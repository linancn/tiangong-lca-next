import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { openaiChat } from '../_shared/openai_chat.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient } from '../_shared/supabase_client.ts';

const JSON_BLOCK_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

type TranslateRequest = {
  text?: string;
  texts?: string[];
  sourceLang?: string;
  targetLang?: string;
  model?: string;
};

const normalizeLang = (lang: unknown, fallback: string) => {
  if (typeof lang !== 'string' || !lang.trim()) return fallback;
  return lang.trim().toLowerCase();
};

const parseJsonLikeText = (value: string): any => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  const candidates = [trimmedValue];
  const blockMatch = trimmedValue.match(JSON_BLOCK_PATTERN);
  if (blockMatch?.[1]) {
    candidates.push(blockMatch[1].trim());
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return undefined;
};

const extractTranslatedText = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const parsed = parseJsonLikeText(value);
    if (parsed) return extractTranslatedText(parsed);
    return value.trim() || undefined;
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const obj = value as Record<string, unknown>;
  const directKeys = ['translatedText', 'translation', 'output_text', 'text'];
  for (const key of directKeys) {
    const keyValue = obj[key];
    if (typeof keyValue === 'string' && keyValue.trim()) {
      return keyValue.trim();
    }
  }

  for (const nestedKey of ['data', 'result', 'output', 'response']) {
    if (nestedKey in obj) {
      const nestedResult = extractTranslatedText(obj[nestedKey]);
      if (nestedResult) return nestedResult;
    }
  }

  return undefined;
};

async function translateOneText(
  sourceText: string,
  sourceLang: string,
  targetLang: string,
  model?: string,
) {
  const prompt = JSON.stringify({
    task: 'translate',
    sourceLanguage: sourceLang,
    targetLanguage: targetLang,
    text: sourceText,
    output: {
      format: 'json',
      schema: {
        translatedText: 'string',
      },
    },
    constraints: [
      'Return JSON only.',
      'Do not return markdown.',
      'Do not return explanation.',
      `Keep only ${targetLang} translation in translatedText.`,
    ],
  });

  const { text } = await openaiChat(prompt, { model });
  const parsed = parseJsonLikeText(text);
  const translatedText = extractTranslatedText(parsed ?? text);

  if (!translatedText) {
    throw new Error('Unable to parse translation result');
  }

  return translatedText.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const redis = await getRedisClient();
  const authResult = await authenticateRequest(req, {
    authClient: supabaseAuthClient,
    redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY, AuthMethod.SERVICE_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  let body: TranslateRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sourceLang = normalizeLang(body?.sourceLang, 'zh');
  const targetLang = normalizeLang(body?.targetLang, 'en');
  const model = typeof body?.model === 'string' ? body.model.trim() : undefined;

  const candidateTexts = Array.isArray(body?.texts)
    ? body.texts
    : typeof body?.text === 'string'
      ? [body.text]
      : [];
  const texts = candidateTexts
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  if (texts.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing text/texts for translation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (texts.length > 100) {
    return new Response(JSON.stringify({ error: 'Too many texts, max 100 per request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const uniqueTexts = Array.from(new Set(texts));
    const translatedPairs = await Promise.all(
      uniqueTexts.map(async (sourceText) => {
        const translatedText = await translateOneText(sourceText, sourceLang, targetLang, model);
        return { sourceText, translatedText };
      }),
    );
    const translationMap = new Map(
      translatedPairs.map((item) => [item.sourceText, item.translatedText] as const),
    );

    const translations = texts.map((sourceText) => ({
      sourceText,
      translatedText: translationMap.get(sourceText) ?? '',
    }));

    return new Response(
      JSON.stringify({
        sourceLang,
        targetLang,
        provider: 'openai',
        translations,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('translate_text error', error);
    return new Response(JSON.stringify({ error: 'Translation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
