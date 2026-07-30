import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { z } from 'zod';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import type { CommandParseResult } from '../../command_runtime/command.ts';
import { stableJsonSha256 } from './canonical_json.ts';
import type { DatasetCommandExecutionResult } from './types.ts';

type QueryClient = Pick<SupabaseClient, 'from'>;

export const REMOTE_VERIFY_TABLES = [
  'contacts',
  'sources',
  'unitgroups',
  'flowproperties',
  'flows',
  'processes',
  'lifecyclemodels',
  'lciamethods',
] as const;

export type RemoteVerifyTable = (typeof REMOTE_VERIFY_TABLES)[number];
export type RemoteVerifyRole = 'root' | 'reference';
export type RemoteVerifyRootPolicy = 'existing' | 'candidate';

export type RemoteVerifyStatus =
  | 'ok'
  | 'candidate_root'
  | 'lookup_failed'
  | 'missing_dataset'
  | 'missing_version'
  | 'payload_hash_mismatch'
  | 'payload_missing'
  | 'state_code_mismatch'
  | 'version_outdated';

export type RemoteVerifyReference = {
  table: RemoteVerifyTable;
  id: string;
  version?: string | null;
  role: RemoteVerifyRole;
  path?: string;
  expectedStateCodes?: number[];
  expectedJsonSha256?: string;
  requirePayload?: boolean;
};

export type VerifyRemoteRequest = {
  rootPolicy: RemoteVerifyRootPolicy;
  references: RemoteVerifyReference[];
};

export type RemoteVerifyRow = {
  id: string;
  version: string | null;
  state_code: number | null;
  user_id: string | null;
  modified_at: string | null;
  json_ordered?: unknown;
};

export type RemoteVerifyLookup = {
  exact: RemoteVerifyRow | null;
  latest: RemoteVerifyRow | null;
};

export type RemoteVerifyCheck = {
  index: number;
  table: RemoteVerifyTable;
  id: string;
  version: string | null;
  role: RemoteVerifyRole;
  path: string | null;
  status: RemoteVerifyStatus;
  message: string;
  exact_version: string | null;
  latest_version: string | null;
  state_code: number | null;
  user_id: string | null;
  modified_at: string | null;
  payload_present: boolean | null;
  expected_state_codes: number[] | null;
  expected_json_sha256: string | null;
  actual_json_sha256: string | null;
};

export type RemoteVerifyBlocker = {
  code: RemoteVerifyStatus;
  message: string;
  index: number;
  table: RemoteVerifyTable;
  id: string;
  version: string | null;
  role: RemoteVerifyRole;
  path: string | null;
};

export type VerifyRemoteReport = {
  status: 'passed_remote_verification' | 'blocked_remote_verification';
  root_policy: RemoteVerifyRootPolicy;
  checked_at_utc: string;
  counts: {
    references: number;
    blockers: number;
    by_status: Record<RemoteVerifyStatus, number>;
  };
  checks: RemoteVerifyCheck[];
  blockers: RemoteVerifyBlocker[];
};

const VERSION_PATTERN = /^\d{2}\.\d{2}\.\d{3}$/;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;

const remoteVerifyReferenceSchema = z
  .object({
    table: z.enum(REMOTE_VERIFY_TABLES),
    id: z.string().uuid(),
    version: z
      .string()
      .regex(VERSION_PATTERN, 'version must be in 00.00.000 format')
      .nullable()
      .optional(),
    role: z.enum(['root', 'reference']).default('reference'),
    path: z.string().trim().min(1).optional(),
    expectedStateCodes: z.array(z.number().int()).max(20).optional(),
    expectedJsonSha256: z
      .string()
      .regex(SHA_256_PATTERN, 'expectedJsonSha256 must be a lowercase SHA-256 hex digest')
      .optional(),
    requirePayload: z.boolean().optional(),
  })
  .strict();

export const verifyRemoteRequestSchema = z
  .object({
    rootPolicy: z.enum(['existing', 'candidate']).default('existing'),
    references: z.array(remoteVerifyReferenceSchema).min(1).max(200),
  })
  .strict();

const EMPTY_STATUS_COUNTS: Record<RemoteVerifyStatus, number> = {
  ok: 0,
  candidate_root: 0,
  lookup_failed: 0,
  missing_dataset: 0,
  missing_version: 0,
  payload_hash_mismatch: 0,
  payload_missing: 0,
  state_code_mismatch: 0,
  version_outdated: 0,
};

function invalidPayload<T>(message: string, error: z.ZodError): CommandParseResult<T> {
  return {
    ok: false,
    message,
    details: error.flatten(),
  };
}

export { stableJsonSha256 } from './canonical_json.ts';

function normalizeRow(row: unknown): RemoteVerifyRow | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const candidate = row as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const version = typeof candidate.version === 'string' ? candidate.version.trim() : null;
  const stateCode =
    typeof candidate.state_code === 'number' && Number.isInteger(candidate.state_code)
      ? candidate.state_code
      : null;
  const userId = typeof candidate.user_id === 'string' ? candidate.user_id.trim() || null : null;
  const modifiedAt =
    typeof candidate.modified_at === 'string' ? candidate.modified_at.trim() || null : null;

  if (!id) {
    return null;
  }

  return {
    id,
    version,
    state_code: stateCode,
    user_id: userId,
    modified_at: modifiedAt,
    json_ordered: candidate.json_ordered,
  };
}

async function fetchRows(
  supabase: QueryClient,
  reference: Pick<RemoteVerifyReference, 'table' | 'id'> & { version?: string | null },
  mode: 'exact' | 'latest',
): Promise<
  { ok: true; rows: RemoteVerifyRow[] } | { ok: false; message: string; details: unknown }
> {
  let query = supabase
    .from(reference.table)
    .select('id,version,state_code,user_id,modified_at,json_ordered')
    .eq('id', reference.id);

  if (mode === 'exact' && reference.version) {
    query = query.eq('version', reference.version);
  }

  if (mode === 'latest') {
    query = query.order('version', { ascending: false });
  }

  const { data, error } = await query.range(0, mode === 'exact' ? 1 : 0);
  if (error) {
    return {
      ok: false,
      message: error.message ?? 'Remote dataset lookup failed',
      details: error,
    };
  }

  return {
    ok: true,
    rows: (Array.isArray(data) ? data : []).map(normalizeRow).filter((row) => row !== null),
  };
}

export async function lookupRemoteDataset(
  supabase: QueryClient,
  reference: RemoteVerifyReference,
): Promise<
  { ok: true; lookup: RemoteVerifyLookup } | { ok: false; message: string; details: unknown }
> {
  const latestRows = await fetchRows(supabase, reference, 'latest');
  if (!latestRows.ok) {
    return latestRows;
  }

  if (!reference.version) {
    return {
      ok: true,
      lookup: {
        exact: latestRows.rows[0] ?? null,
        latest: latestRows.rows[0] ?? null,
      },
    };
  }

  const exactRows = await fetchRows(supabase, reference, 'exact');
  if (!exactRows.ok) {
    return exactRows;
  }

  return {
    ok: true,
    lookup: {
      exact: exactRows.rows[0] ?? null,
      latest: latestRows.rows[0] ?? null,
    },
  };
}

function isCandidateRootAllowed(
  reference: RemoteVerifyReference,
  lookup: RemoteVerifyLookup,
  rootPolicy: RemoteVerifyRootPolicy,
): boolean {
  if (rootPolicy !== 'candidate' || reference.role !== 'root') {
    return false;
  }

  if (!lookup.latest?.version || !reference.version) {
    return true;
  }

  return lookup.latest.version < reference.version;
}

function isBlocker(status: RemoteVerifyStatus): boolean {
  return status !== 'ok' && status !== 'candidate_root';
}

async function buildCheck(
  reference: RemoteVerifyReference,
  lookup: RemoteVerifyLookup,
  rootPolicy: RemoteVerifyRootPolicy,
  index: number,
): Promise<RemoteVerifyCheck> {
  const path = reference.path ?? null;
  const version = reference.version ?? null;
  const latestVersion = lookup.latest?.version ?? null;
  const exactVersion = lookup.exact?.version ?? null;

  if (!lookup.exact) {
    if (isCandidateRootAllowed(reference, lookup, rootPolicy)) {
      return {
        index,
        table: reference.table,
        id: reference.id,
        version,
        role: reference.role,
        path,
        status: 'candidate_root',
        message: 'Root dataset is a candidate row and is not required to exist before write.',
        exact_version: null,
        latest_version: latestVersion,
        state_code: null,
        user_id: null,
        modified_at: null,
        payload_present: null,
        expected_state_codes: reference.expectedStateCodes ?? null,
        expected_json_sha256: reference.expectedJsonSha256 ?? null,
        actual_json_sha256: null,
      };
    }

    return {
      index,
      table: reference.table,
      id: reference.id,
      version,
      role: reference.role,
      path,
      status: latestVersion ? 'missing_version' : 'missing_dataset',
      message: latestVersion
        ? 'Requested dataset version is not visible to the caller.'
        : 'Dataset id is not visible to the caller.',
      exact_version: null,
      latest_version: latestVersion,
      state_code: null,
      user_id: null,
      modified_at: null,
      payload_present: null,
      expected_state_codes: reference.expectedStateCodes ?? null,
      expected_json_sha256: reference.expectedJsonSha256 ?? null,
      actual_json_sha256: null,
    };
  }

  const payloadPresent =
    lookup.exact.json_ordered !== undefined && lookup.exact.json_ordered !== null;
  const expectedStateCodes = reference.expectedStateCodes ?? null;
  const expectedJsonSha256 = reference.expectedJsonSha256 ?? null;
  const actualJsonSha256 =
    payloadPresent && expectedJsonSha256 ? await stableJsonSha256(lookup.exact.json_ordered) : null;
  let status: RemoteVerifyStatus = 'ok';
  let message = 'Dataset row is visible to the caller.';

  if (latestVersion && exactVersion && latestVersion > exactVersion) {
    status = 'version_outdated';
    message = 'Requested dataset version is visible but older than the latest visible version.';
  } else if (expectedStateCodes && !expectedStateCodes.includes(lookup.exact.state_code ?? NaN)) {
    status = 'state_code_mismatch';
    message = 'Dataset row state_code does not match the expected verification policy.';
  } else if ((reference.requirePayload || expectedJsonSha256) && !payloadPresent) {
    status = 'payload_missing';
    message = 'Dataset row is visible but json_ordered payload is missing.';
  } else if (expectedJsonSha256 && actualJsonSha256 !== expectedJsonSha256) {
    status = 'payload_hash_mismatch';
    message = 'Dataset row payload hash does not match the expected SHA-256 digest.';
  }

  return {
    index,
    table: reference.table,
    id: reference.id,
    version,
    role: reference.role,
    path,
    status,
    message,
    exact_version: exactVersion,
    latest_version: latestVersion,
    state_code: lookup.exact.state_code,
    user_id: lookup.exact.user_id,
    modified_at: lookup.exact.modified_at,
    payload_present: payloadPresent,
    expected_state_codes: expectedStateCodes,
    expected_json_sha256: expectedJsonSha256,
    actual_json_sha256: actualJsonSha256,
  };
}

function buildBlocker(check: RemoteVerifyCheck): RemoteVerifyBlocker {
  return {
    code: check.status,
    message: check.message,
    index: check.index,
    table: check.table,
    id: check.id,
    version: check.version,
    role: check.role,
    path: check.path,
  };
}

export function parseVerifyRemoteCommand(body: unknown): CommandParseResult<VerifyRemoteRequest> {
  const parsed = verifyRemoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return invalidPayload('Invalid dataset verify-remote payload', parsed.error);
  }

  return {
    ok: true,
    value: parsed.data,
  };
}

export async function executeVerifyRemoteCommand(
  request: VerifyRemoteRequest,
  actor: ActorContext,
  lookupRemoteDatasetImpl = lookupRemoteDataset,
): Promise<DatasetCommandExecutionResult> {
  const checks: RemoteVerifyCheck[] = [];

  for (const [index, reference] of request.references.entries()) {
    const lookup = await lookupRemoteDatasetImpl(actor.supabase, reference);
    if (!lookup.ok) {
      checks.push({
        index,
        table: reference.table,
        id: reference.id,
        version: reference.version ?? null,
        role: reference.role,
        path: reference.path ?? null,
        status: 'lookup_failed',
        message: lookup.message,
        exact_version: null,
        latest_version: null,
        state_code: null,
        user_id: null,
        modified_at: null,
        payload_present: null,
        expected_state_codes: reference.expectedStateCodes ?? null,
        expected_json_sha256: reference.expectedJsonSha256 ?? null,
        actual_json_sha256: null,
      });
      continue;
    }

    checks.push(await buildCheck(reference, lookup.lookup, request.rootPolicy, index));
  }

  const byStatus = { ...EMPTY_STATUS_COUNTS };
  for (const check of checks) {
    byStatus[check.status] += 1;
  }

  const blockers = checks.filter((check) => isBlocker(check.status)).map(buildBlocker);
  const report: VerifyRemoteReport = {
    status: blockers.length > 0 ? 'blocked_remote_verification' : 'passed_remote_verification',
    root_policy: request.rootPolicy,
    checked_at_utc: new Date().toISOString(),
    counts: {
      references: checks.length,
      blockers: blockers.length,
      by_status: byStatus,
    },
    checks,
    blockers,
  };

  return {
    ok: true,
    status: blockers.length > 0 ? 409 : 200,
    body: {
      ok: blockers.length === 0,
      command: 'dataset_verify_remote',
      data: report,
    },
  };
}
