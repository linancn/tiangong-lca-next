import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { z } from 'zod';

import type { ActorContext } from '../command_runtime/actor_context.ts';
import type { CommandExecutionResult, CommandParseResult } from '../command_runtime/command.ts';
import { createSupabaseServiceClient } from '../supabase_client.ts';

const DEFAULT_CACHE_BUCKET = 'lca_results';
const DEFAULT_CACHE_PREFIX = 'national-carbon/process-flow-graph/v1';
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 3600;
const MAX_SIGNED_URL_EXPIRES_IN_SECONDS = 86400;
const ACTIVE_MANIFEST_SCHEMA_VERSION = 'process_flow_graph_manifest_v1';
const BUILD_SCHEMA_VERSION = 'process_flow_graph_v2';

type EnvReader = (name: string) => string | undefined;

type CommandFailureResult = Extract<CommandExecutionResult, { ok: false }>;

type StorageDownloadResult = {
  data: { text(): Promise<string> } | null;
  error: { message?: string; code?: string; statusCode?: string | number } | null;
};

type SignedUrlResult = {
  data: { signedUrl?: string } | null;
  error: { message?: string; code?: string; statusCode?: string | number } | null;
};

type StorageBucketClient = {
  download(path: string): Promise<StorageDownloadResult>;
  createSignedUrl(path: string, expiresIn: number): Promise<SignedUrlResult>;
};

type StorageClient = Pick<SupabaseClient, 'storage'> & {
  storage: {
    from(bucket: string): StorageBucketClient;
  };
};

type ActiveManifest = {
  schemaVersion: string;
  activeBuildId: string;
  buildManifestPath: string;
  generatedAt?: string;
};

type BuildManifestFile = {
  path: string;
  byteSize?: number;
  sha256?: string;
  contentType?: string;
  signedUrl?: string;
};

type BuildManifest = {
  schemaVersion: string;
  buildId: string;
  files: Record<string, BuildManifestFile>;
  [key: string]: unknown;
};

type GraphCacheObjectsConfig = {
  bucket: string;
  prefix: string;
  signedUrlExpiresIn: number;
};

const requestSchema = z
  .object({
    action: z.literal('read_manifest_bundle'),
  })
  .strict();

const activeManifestSchema = z
  .object({
    schemaVersion: z.literal(ACTIVE_MANIFEST_SCHEMA_VERSION),
    activeBuildId: z.string().trim().min(1),
    buildManifestPath: z.string().trim().min(1),
    generatedAt: z.string().optional(),
  })
  .passthrough();

const buildManifestFileSchema = z
  .object({
    path: z.string().trim().min(1),
    byteSize: z.number().optional(),
    sha256: z.string().optional(),
    contentType: z.string().optional(),
  })
  .passthrough();

const buildManifestSchema = z
  .object({
    schemaVersion: z.literal(BUILD_SCHEMA_VERSION),
    buildId: z.string().trim().min(1),
    files: z.record(z.string(), buildManifestFileSchema),
  })
  .passthrough();

export type NationalCarbonGraphCacheObjectsRequest = z.infer<typeof requestSchema>;

function defaultReadEnv(name: string): string | undefined {
  try {
    const value = Deno.env.get(name);
    return value && value.trim().length > 0 ? value.trim() : undefined;
  } catch (_error) {
    return undefined;
  }
}

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export function parseNationalCarbonGraphCacheObjectsCommand(
  body: unknown,
): CommandParseResult<NationalCarbonGraphCacheObjectsRequest> {
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid national carbon graph cache object payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

function normalizePathPart(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function hasUnsafePathSegment(path: string): boolean {
  return path
    .split('/')
    .filter(Boolean)
    .some((segment) => segment === '.' || segment === '..');
}

function joinStoragePath(...parts: string[]): string {
  const path = parts.map(normalizePathPart).filter(Boolean).join('/');
  if (!path || hasUnsafePathSegment(path)) {
    throw new Error('Invalid national carbon graph cache object path');
  }
  return path;
}

function dirname(path: string): string {
  const normalized = normalizePathPart(path);
  const index = normalized.lastIndexOf('/');
  return index < 0 ? '' : normalized.slice(0, index);
}

function readPositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readConfig(readEnv: EnvReader): GraphCacheObjectsConfig {
  const bucket =
    readEnv('NATIONAL_CARBON_GRAPH_CACHE_BUCKET') ??
    readEnv('PROCESS_FLOW_GRAPH_CACHE_BUCKET') ??
    DEFAULT_CACHE_BUCKET;
  const prefix =
    readEnv('NATIONAL_CARBON_GRAPH_CACHE_PREFIX') ??
    readEnv('PROCESS_FLOW_GRAPH_CACHE_PREFIX') ??
    DEFAULT_CACHE_PREFIX;
  const signedUrlExpiresIn = Math.min(
    readPositiveInt(readEnv('NATIONAL_CARBON_GRAPH_CACHE_SIGNED_URL_EXPIRES_IN')) ??
      DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS,
    MAX_SIGNED_URL_EXPIRES_IN_SECONDS,
  );

  return {
    bucket,
    prefix: normalizePathPart(prefix),
    signedUrlExpiresIn,
  };
}

function storageFailure(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): CommandFailureResult {
  return {
    ok: false,
    code,
    message,
    status,
    details,
  };
}

async function downloadJson(
  storage: StorageBucketClient,
  objectPath: string,
): Promise<{ ok: true; data: unknown } | CommandFailureResult> {
  const result = await storage.download(objectPath);
  if (result.error) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_OBJECT_NOT_FOUND',
      `Unable to read national carbon graph cache object: ${objectPath}`,
      404,
      result.error,
    );
  }

  try {
    return {
      ok: true,
      data: JSON.parse(await result.data!.text()),
    };
  } catch (error) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_OBJECT_INVALID_JSON',
      `National carbon graph cache object is not valid JSON: ${objectPath}`,
      502,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function validateActiveManifest(payload: unknown): ActiveManifest | CommandFailureResult {
  const parsed = activeManifestSchema.safeParse(payload);
  if (!parsed.success) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_ACTIVE_MANIFEST_INVALID',
      'National carbon graph cache active manifest is invalid',
      502,
      parsed.error.flatten(),
    );
  }

  if (hasUnsafePathSegment(parsed.data.buildManifestPath)) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_ACTIVE_MANIFEST_INVALID',
      'National carbon graph cache build manifest path is unsafe',
      502,
    );
  }

  return parsed.data;
}

function validateBuildManifest(payload: unknown): BuildManifest | CommandFailureResult {
  const parsed = buildManifestSchema.safeParse(payload);
  if (!parsed.success) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_BUILD_MANIFEST_INVALID',
      'National carbon graph cache build manifest is invalid',
      502,
      parsed.error.flatten(),
    );
  }

  for (const [key, file] of Object.entries(parsed.data.files)) {
    if (hasUnsafePathSegment(file.path)) {
      return storageFailure(
        'NATIONAL_CARBON_GRAPH_CACHE_BUILD_MANIFEST_INVALID',
        `National carbon graph cache file path is unsafe: ${key}`,
        502,
      );
    }
  }

  return parsed.data;
}

async function attachSignedUrls(
  storage: StorageBucketClient,
  config: GraphCacheObjectsConfig,
  activeManifest: ActiveManifest,
  buildManifest: BuildManifest,
): Promise<BuildManifest | CommandFailureResult> {
  const buildRootPath = dirname(activeManifest.buildManifestPath);
  const files: Record<string, BuildManifestFile> = {};

  for (const [key, file] of Object.entries(buildManifest.files)) {
    const objectPath = joinStoragePath(config.prefix, buildRootPath, file.path);
    const signed = await storage.createSignedUrl(objectPath, config.signedUrlExpiresIn);
    if (signed.error || !signed.data?.signedUrl) {
      return storageFailure(
        'NATIONAL_CARBON_GRAPH_CACHE_SIGNED_URL_FAILED',
        `Unable to create signed URL for national carbon graph cache object: ${key}`,
        502,
        signed.error ?? { objectPath },
      );
    }

    files[key] = {
      ...file,
      signedUrl: signed.data.signedUrl,
    };
  }

  return {
    ...buildManifest,
    files,
  };
}

function isCommandFailure(value: unknown): value is CommandFailureResult {
  return Boolean(value && typeof value === 'object' && (value as { ok?: unknown }).ok === false);
}

export async function executeNationalCarbonGraphCacheObjectsCommand(
  _request: NationalCarbonGraphCacheObjectsRequest,
  _actor: ActorContext,
  serviceClient: StorageClient = createSupabaseServiceClient() as StorageClient,
  readEnv: EnvReader = defaultReadEnv,
): Promise<CommandExecutionResult> {
  const config = readConfig(readEnv);
  let activeManifestPath: string;

  try {
    activeManifestPath = joinStoragePath(config.prefix, 'manifest.json');
  } catch (error) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_CONFIG_INVALID',
      error instanceof Error ? error.message : String(error),
      500,
    );
  }

  const storage = serviceClient.storage.from(config.bucket);
  const activePayload = await downloadJson(storage, activeManifestPath);
  if (!activePayload.ok) {
    return activePayload;
  }

  const activeManifest = validateActiveManifest(activePayload.data);
  if (isCommandFailure(activeManifest)) {
    return activeManifest;
  }

  let buildManifestPath: string;
  try {
    buildManifestPath = joinStoragePath(config.prefix, activeManifest.buildManifestPath);
  } catch (error) {
    return storageFailure(
      'NATIONAL_CARBON_GRAPH_CACHE_ACTIVE_MANIFEST_INVALID',
      error instanceof Error ? error.message : String(error),
      502,
    );
  }

  const buildPayload = await downloadJson(storage, buildManifestPath);
  if (!buildPayload.ok) {
    return buildPayload;
  }

  const buildManifest = validateBuildManifest(buildPayload.data);
  if (isCommandFailure(buildManifest)) {
    return buildManifest;
  }

  const signedBuildManifest = await attachSignedUrls(
    storage,
    config,
    activeManifest,
    buildManifest,
  );
  if (isCommandFailure(signedBuildManifest)) {
    return signedBuildManifest;
  }

  return {
    ok: true,
    body: {
      ok: true,
      command: 'national_carbon_graph_cache_objects_read_manifest_bundle',
      data: {
        activeManifest,
        buildManifest: signedBuildManifest,
        bucket: config.bucket,
        prefix: config.prefix,
        expiresIn: config.signedUrlExpiresIn,
      },
    },
  };
}
