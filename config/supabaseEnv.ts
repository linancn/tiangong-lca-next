import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const SUPABASE_FRONTEND_KEYS = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] as const;

const SUPABASE_ENV_FILE_ORDER = {
  dev: ['.env.development', '.env.local', '.env.development.local'],
  main: ['.env', '.env.local'],
} as const;

type FrontendSupabaseTarget = keyof typeof SUPABASE_ENV_FILE_ORDER;
type FrontendRuntimeEnv = string | false | undefined;

type SupabaseFrontendEnv = Record<(typeof SUPABASE_FRONTEND_KEYS)[number], string | undefined>;

const hasEnvValue = (value: string | undefined): value is string => Boolean(value);

const readMergedEnvFiles = (
  rootDir: string,
  files: readonly string[],
): Record<string, string | undefined> => {
  return files.reduce<Record<string, string | undefined>>((merged, file) => {
    const filePath = join(rootDir, file);

    if (!existsSync(filePath)) {
      return merged;
    }

    return {
      ...merged,
      ...parseEnv(readFileSync(filePath, 'utf8')),
    };
  }, {});
};

export const resolveSupabaseFrontendTarget = (
  appEnv: FrontendRuntimeEnv,
): FrontendSupabaseTarget => {
  return appEnv === 'dev' ? 'dev' : 'main';
};

export const getSupabaseFrontendEnv = (
  rootDir: string,
  appEnv: FrontendRuntimeEnv,
): SupabaseFrontendEnv => {
  const target = resolveSupabaseFrontendTarget(appEnv);
  const env = readMergedEnvFiles(rootDir, SUPABASE_ENV_FILE_ORDER[target]);

  return {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_PUBLISHABLE_KEY,
  };
};

export const applySupabaseFrontendEnv = (
  rootDir: string,
  appEnv: FrontendRuntimeEnv,
): SupabaseFrontendEnv => {
  const fileEnv = getSupabaseFrontendEnv(rootDir, appEnv);

  return SUPABASE_FRONTEND_KEYS.reduce<SupabaseFrontendEnv>((merged, key) => {
    const runtimeValue = process.env[key];
    // const value = hasEnvValue(runtimeValue) ? runtimeValue : fileEnv[key];
    const value = hasEnvValue(fileEnv[key]) ? fileEnv[key] : runtimeValue;

    if (hasEnvValue(value)) {
      process.env[key] = value;
    }

    merged[key] = value;
    return merged;
  }, {} as SupabaseFrontendEnv);
};
