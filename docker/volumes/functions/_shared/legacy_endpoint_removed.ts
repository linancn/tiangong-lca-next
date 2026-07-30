import { corsHeaders } from './cors.ts';

export const LEGACY_ENDPOINT_REMOVED_RESPONSE = {
  ok: false,
  code: 'LEGACY_ENDPOINT_REMOVED',
  message: 'Use explicit command endpoints instead',
} as const;

export function createLegacyEndpointRemovedHandler() {
  return (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    return new Response(JSON.stringify(LEGACY_ENDPOINT_REMOVED_RESPONSE), {
      status: 410,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  };
}
