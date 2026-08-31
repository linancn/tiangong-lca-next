import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const SUPABASE_FRONTEND_KEYS = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] as const;

const SUPABASE_ENV_FILE_ORDER = {
  dev: ['.env.development', '.env.local', '.env.development.local'],
  main: ['.env', '.env.local'],
  qualification: ['docker/e2e/qualification.env'],
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
  if (appEnv === 'dev') return 'dev';
  if (appEnv === 'qualification') return 'qualification';
  return 'main';
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
  const target = resolveSupabaseFrontendTarget(appEnv);
  const fileEnv = getSupabaseFrontendEnv(rootDir, appEnv);
  const mainFileEnv = target === 'dev' ? getSupabaseFrontendEnv(rootDir, 'main') : null;

  return SUPABASE_FRONTEND_KEYS.reduce<SupabaseFrontendEnv>((merged, key) => {
    const runtimeValue = process.env[key];
    const selectedFileValue = fileEnv[key];
    // Umi loads `.env` before evaluating this config. During a Dev launch that
    // makes the main-file default look like an explicit runtime override. Only
    // replace that exact inherited default; a distinct shell/build value keeps
    // its documented priority.
    const runtimeIsInheritedMainDefault =
      target === 'dev' &&
      hasEnvValue(runtimeValue) &&
      hasEnvValue(mainFileEnv?.[key]) &&
      runtimeValue === mainFileEnv[key];
    const value =
      target === 'qualification'
        ? selectedFileValue
        : runtimeIsInheritedMainDefault && hasEnvValue(selectedFileValue)
          ? selectedFileValue
          : hasEnvValue(runtimeValue)
            ? runtimeValue
            : selectedFileValue;

    if (hasEnvValue(value)) {
      process.env[key] = value;
    }

    merged[key] = value;
    return merged;
  }, {} as SupabaseFrontendEnv);
};
