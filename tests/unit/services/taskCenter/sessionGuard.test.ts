import { supabase } from '@/services/supabase';
import { assertTaskSession, createTaskSessionClient } from '@/services/taskCenter/sessionGuard';
const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: any[]) => mockCreateClient(...args),
}));
jest.mock('@/services/supabase/key', () => ({
  supabaseUrl: 'https://example.invalid',
  supabasePublishableKey: 'sb_publishable_test',
}));
jest.mock('@/services/supabase', () => ({ supabase: { auth: { getClaims: jest.fn() } } }));
const getClaims = supabase.auth.getClaims as jest.Mock;
describe('task write intent session fence', () => {
  beforeEach(() => {
    getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: 'owner-a' } }, error: null });
  });
  it('rejects an empty bearer before SDK claims can fall back to another session', async () => {
    await expect(
      assertTaskSession('', { ownerId: 'owner-a', isCurrent: () => true }),
    ).rejects.toThrow('task_owner_changed');
    expect(getClaims).not.toHaveBeenCalled();
  });
  it('verifies the exact bearer actor without weakening backend authorization', async () => {
    await assertTaskSession('token-a', { ownerId: 'owner-a', isCurrent: () => true });
    expect(getClaims).toHaveBeenCalledWith('token-a');
  });
  it.each([
    { ownerId: '', isCurrent: () => true },
    { ownerId: 'owner-a', isCurrent: () => false },
  ])('does not verify an already-invalid intent', async (guard) => {
    await expect(assertTaskSession('token-a', guard)).rejects.toThrow('task_owner_changed');
    expect(getClaims).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: { message: 'denied' } },
    { data: { claims: { sub: 'owner-b' } }, error: null },
    { data: null, error: null },
  ])('rejects denied, foreign or missing claims', async (result) => {
    getClaims.mockResolvedValueOnce(result);
    await expect(
      assertTaskSession('token-b', { ownerId: 'owner-a', isCurrent: () => true }),
    ).rejects.toThrow('task_owner_changed');
  });
  it('fences generation changes while claims verification is pending and fails closed on verification errors', async () => {
    let finish: (value: any) => void = () => undefined;
    let active = true;
    getClaims.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const pending = assertTaskSession('token-a', { ownerId: 'owner-a', isCurrent: () => active });
    active = false;
    finish({ data: { claims: { sub: 'owner-a' } }, error: null });
    await expect(pending).rejects.toThrow('task_owner_changed');
    getClaims.mockRejectedValueOnce(new Error('verify unavailable'));
    await expect(
      assertTaskSession('token-a', { ownerId: 'owner-a', isCurrent: () => true }),
    ).rejects.toThrow('task_owner_changed');
  });
  it('captures a stateless bearer and guards the native dispatcher after SDK async work', async () => {
    let active = true;
    const originalFetch = globalThis.fetch;
    const nativeFetch = jest.fn().mockResolvedValue({} as Response);
    globalThis.fetch = nativeFetch;
    createTaskSessionClient('token-a', { ownerId: 'owner-a', isCurrent: () => active });
    const [url, key, options] = mockCreateClient.mock.calls[mockCreateClient.mock.calls.length - 1];
    expect(url).toBe('https://example.invalid');
    expect(key).toBe('sb_publishable_test');
    expect(options.db).toEqual({ schema: 'api' });
    expect(options.auth).toBeUndefined();
    expect(await options.accessToken()).toBe('token-a');
    await options.global.fetch('https://example.invalid/functions/v1/test', { method: 'POST' });
    expect(nativeFetch).toHaveBeenCalledTimes(1);
    active = false;
    await expect(
      options.global.fetch('https://example.invalid/functions/v1/test', {}),
    ).rejects.toThrow('task_owner_changed');
    expect(nativeFetch).toHaveBeenCalledTimes(1);
    globalThis.fetch = originalFetch;
  });
});
