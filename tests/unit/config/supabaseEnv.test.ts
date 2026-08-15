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

  it('uses the deterministic qualification backend instead of a deploy target', () => {
    fs.mkdirSync(path.join(tempDir, 'docker/e2e'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'docker/e2e/qualification.env'),
      'SUPABASE_URL=https://semantic-harness.invalid\nSUPABASE_PUBLISHABLE_KEY=harness-key\n',
    );

    const { applySupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    process.env.SUPABASE_URL = 'https://ambient-deployment.invalid';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'ambient-deployment-key';

    expect(applySupabaseFrontendEnv(tempDir, 'qualification')).toEqual({
      SUPABASE_URL: 'https://semantic-harness.invalid',
      SUPABASE_PUBLISHABLE_KEY: 'harness-key',
    });
    expect(process.env.SUPABASE_URL).toBe('https://semantic-harness.invalid');
    expect(process.env.SUPABASE_PUBLISHABLE_KEY).toBe('harness-key');
  });

  it('lets explicit build environment keys override repository defaults', () => {
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

    expect(process.env.SUPABASE_URL).toBe('https://unexpected.supabase.co');
    expect(process.env.SUPABASE_PUBLISHABLE_KEY).toBe('unexpected-key');
  });

  it('falls back to existing runtime Supabase keys when the selected env files omit them', () => {
    fs.writeFileSync(path.join(tempDir, '.env.development'), '');

    const { applySupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    process.env.SUPABASE_URL = 'https://runtime.supabase.co';
    process.env.SUPABASE_PUBLISHABLE_KEY = 'runtime-key';

    applySupabaseFrontendEnv(tempDir, 'dev');

    expect(process.env.SUPABASE_URL).toBe('https://runtime.supabase.co');
    expect(process.env.SUPABASE_PUBLISHABLE_KEY).toBe('runtime-key');
  });

  it('fills missing or blank runtime Supabase keys from the selected frontend env files', () => {
    fs.writeFileSync(
      path.join(tempDir, '.env'),
      'SUPABASE_URL=https://main.supabase.co\nSUPABASE_PUBLISHABLE_KEY=main-key\n',
    );
    fs.writeFileSync(
      path.join(tempDir, '.env.development'),
      'SUPABASE_URL=https://dev.supabase.co\nSUPABASE_PUBLISHABLE_KEY=dev-key\n',
    );

    const { applySupabaseFrontendEnv } = require('../../../config/supabaseEnv');

    process.env.SUPABASE_URL = '';
    process.env.SUPABASE_PUBLISHABLE_KEY = '';

    applySupabaseFrontendEnv(tempDir, 'dev');

    expect(process.env.SUPABASE_URL).toBe('https://dev.supabase.co');
    expect(process.env.SUPABASE_PUBLISHABLE_KEY).toBe('dev-key');
  });
});
