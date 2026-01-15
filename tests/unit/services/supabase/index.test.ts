const originalEnv = { ...process.env };

const mockCreateClient = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  __esModule: true,
  createClient: (...args: any[]) => mockCreateClient(...args),
}));

describe('supabase client bootstrap (src/services/supabase/index.ts)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockCreateClient.mockReset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('initializes supabase client with env configuration and options', () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'public-key';
    const expectedOptions = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    };
    const mockedClient = { client: true };
    mockCreateClient.mockReturnValue(mockedClient);

    const { supabase } = require('@/services/supabase/index');

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'public-key',
      expectedOptions,
    );
    expect(supabase).toBe(mockedClient);
  });

  it('falls back to empty config when env vars are missing', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_PUBLISHABLE_KEY;

    mockCreateClient.mockReturnValue({ client: 'empty-env' });

    const { supabase } = require('@/services/supabase/index');

    expect(mockCreateClient).toHaveBeenCalledWith('', '', expect.any(Object));
    expect(supabase).toEqual({ client: 'empty-env' });
  });
});
