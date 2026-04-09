const supabaseEnvOriginalEnv = { ...process.env };

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

describe('supabase frontend env resolution (config/supabaseEnv.ts)', () => {
  let tempDir: string;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...supabaseEnvOriginalEnv };
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supabase-env-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = supabaseEnvOriginalEnv;
  });

  it('reads dev frontend Supabase keys from .env.development with local overrides', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'SUPABASE_URL=https://main.supabase.co\nSUPABASE_PUBLISHABLE_KEY=main-key\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.development'),
      'SUPABASE_URL=https://dev.supabase.co\nSUPABASE_PUBLISHABLE_KEY=dev-key\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.development.local'),
      'SUPABASE_PUBLISHABLE_KEY=dev-local-key\n',
    );

    const { getSupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    expect(getSupabaseFrontendEnv(tempDir, 'dev')).toEqual({
      SUPABASE_URL: 'https://dev.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'dev-local-key',
    });
  });

  it('falls back to main frontend Supabase keys for non-dev app envs', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'SUPABASE_URL=https://main.supabase.co\nSUPABASE_PUBLISHABLE_KEY=main-key\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.development'),
      'SUPABASE_URL=https://dev.supabase.co\nSUPABASE_PUBLISHABLE_KEY=dev-key\n',
    );

    const { getSupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    expect(getSupabaseFrontendEnv(tempDir, 'main')).toEqual({
      SUPABASE_URL: 'https://main.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'main-key',
    });
    expect(getSupabaseFrontendEnv(tempDir, 'pre')).toEqual({
      SUPABASE_URL: 'https://main.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'main-key',
    });
  });

  it('applies the selected frontend Supabase keys onto process.env', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'SUPABASE_URL=https://main.supabase.co\nSUPABASE_PUBLISHABLE_KEY=main-key\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.development'),
      'SUPABASE_URL=https://dev.supabase.co\nSUPABASE_PUBLISHABLE_KEY=dev-key\n',
    );

    const { applySupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    process.env.SUPABASE_URL = 'https://unexpected.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'unexpected-key';

    applySupabaseFrontendEnv(tempDir, 'dev');

    expect(process.env.SUPABASE_URL).toBe('https://dev.supabase.co');
    expect(process.env.SUPABASE_PUBLISHABLE_KEY).toBe('dev-key');
  });
});
