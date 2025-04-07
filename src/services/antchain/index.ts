import { supabase } from '@/services/supabase';

export const defaultAntchainHeaders: Record<string, string> = {
  'x-authentication-version': '***',
  'x-authentication-type': '***',
  'x-tenant-id': '***',
  'x-isv-ak': '***',
  'x-signature-method': '***',
};

export async function signRequest(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  params: Record<string, any> | null,
  body: any,
) {
  // console.log('signRequest', baseUrl, path, headers, params, body, isvSk);
  const { data, error } = await supabase.functions.invoke('sign_request', {
    method: 'POST',
    body: { baseUrl, path, headers, params, body },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data.signature;
}
