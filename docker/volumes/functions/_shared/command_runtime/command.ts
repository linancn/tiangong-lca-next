import { corsHeaders } from '../cors.ts';
import {
  type ActorContext,
  type ActorContextResult,
  type RequestJwtActorContext,
  resolveActorContext,
} from './actor_context.ts';
import { commandError, json } from './http.ts';
import { type JsonBodyResult, readJsonBody } from './request.ts';

export type CommandActorProfile = 'generic' | 'request-jwt';

type CommandActor<Profile extends CommandActorProfile> = Profile extends 'request-jwt'
  ? RequestJwtActorContext
  : ActorContext;

export type CommandParseResult<T> =
  { ok: true; value: T } | { ok: false; message: string; details?: unknown };

export type CommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
      details?: unknown;
    };

export type CommandHandlerOptions<T, Profile extends CommandActorProfile = 'generic'> = {
  parse: (body: unknown) => CommandParseResult<T>;
  execute: (input: T, actor: CommandActor<Profile>) => Promise<CommandExecutionResult>;
  resolveActor?: (req: Request) => Promise<ActorContextResult<CommandActor<Profile>>>;
  readBody?: (req: Request) => Promise<JsonBodyResult>;
};

export function createCommandHandler<T, Profile extends CommandActorProfile = 'generic'>(
  options: CommandHandlerOptions<T, Profile>,
) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return commandError('METHOD_NOT_ALLOWED', 'Only POST is supported', 405);
    }

    const resolveActor =
      options.resolveActor ??
      (resolveActorContext as (req: Request) => Promise<ActorContextResult<CommandActor<Profile>>>);
    const actorResult = await resolveActor(req);
    if (!actorResult.ok) {
      return actorResult.response;
    }

    const bodyResult = await (options.readBody ?? readJsonBody)(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const parsed = options.parse(bodyResult.value);
    if (!parsed.ok) {
      return commandError('INVALID_PAYLOAD', parsed.message, 400, parsed.details);
    }

    const result = await options.execute(parsed.value, actorResult.value);
    if (!result.ok) {
      return commandError(result.code, result.message, result.status, result.details);
    }

    return json(result.body, result.status ?? 200);
  };
}
