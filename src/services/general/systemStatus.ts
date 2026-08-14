import { supabase } from '@/services/supabase';
import { z } from 'zod';

const optionalNullableText = z.string().trim().min(1).nullable().optional();

export const systemStatusSchema = z
  .object({
    schemaVersion: z.literal(1),
    phase: z.enum(['normal', 'maintenance', 'verifying']),
    reason: z.enum(['release_upgrade', 'emergency']).nullable().optional(),
    targetVersion: optionalNullableText,
    estimatedEndAt: z.iso.datetime({ offset: true }).nullable().optional(),
    releaseId: optionalNullableText,
    updatedAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export type SystemStatus = z.infer<typeof systemStatusSchema>;

export const NORMAL_SYSTEM_STATUS: SystemStatus = Object.freeze({
  schemaVersion: 1,
  phase: 'normal',
  reason: null,
  targetVersion: null,
  estimatedEndAt: null,
  releaseId: null,
  updatedAt: null,
});

export const SYSTEM_STATUS_TIMEOUT_MS = 4000;

export function isRuntimeConfigEnabled(
  value: string | undefined = process.env.APP_RUNTIME_CONFIG_ENABLED,
): boolean {
  return value?.trim().toLowerCase() !== 'false';
}

export function isSystemMaintenanceActive(status?: SystemStatus): boolean {
  return status?.phase === 'maintenance' || status?.phase === 'verifying';
}

/**
 * Reads the public startup status once per full browser load. A missing,
 * malformed, timed-out, or unavailable response deliberately fails open so a
 * control-plane outage cannot take the application offline by itself.
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  if (!isRuntimeConfigEnabled()) {
    return NORMAL_SYSTEM_STATUS;
  }

  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), SYSTEM_STATUS_TIMEOUT_MS);

  try {
    const query = supabase.schema('api').rpc('qry_system_status');
    const { data, error } = await query.abortSignal(controller.signal);
    if (error) {
      return NORMAL_SYSTEM_STATUS;
    }
    const parsed = systemStatusSchema.safeParse(data);
    return parsed.success ? parsed.data : NORMAL_SYSTEM_STATUS;
  } catch {
    return NORMAL_SYSTEM_STATUS;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
