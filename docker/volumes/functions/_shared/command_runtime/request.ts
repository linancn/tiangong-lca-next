import { commandError } from './http.ts';

export type JsonBodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

export async function readJsonBody(req: Request): Promise<JsonBodyResult> {
  try {
    return {
      ok: true,
      value: await req.json(),
    };
  } catch (_error) {
    return {
      ok: false,
      response: commandError('INVALID_PAYLOAD', 'Request body must be valid JSON', 400),
    };
  }
}
