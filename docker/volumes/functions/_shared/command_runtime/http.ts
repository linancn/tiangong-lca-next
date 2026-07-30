import { corsHeaders } from '../cors.ts';

export type CommandErrorBody = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function commandError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: CommandErrorBody = {
    ok: false,
    code,
    message,
    ...(details === undefined ? {} : { details }),
  };

  return json(body, status);
}
