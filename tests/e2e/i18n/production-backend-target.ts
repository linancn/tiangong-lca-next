import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

import type { BrowserContext, Page } from '@playwright/test';

import { REPOSITORY_ROOT, sha256 } from './contracts';
import {
  installReadOnlyProductionGuard,
  type ProductionRequestGuard,
  type ProductionRequestGuardOptions,
} from './production-request-guard';

export type VerifiedProductionRequestGuardOptions = Omit<
  ProductionRequestGuardOptions,
  'expectedPublishableKey'
>;

export type VerifiedProductionBackendTarget = {
  candidateEnvironmentSha256: string;
  origin: string;
  originSha256: string;
  publishableKey: string;
  publishableKeySha256: string;
  trackedMainEnvironmentSha256: string;
};

function parseProductionBackend(environment: string): {
  origin: string;
  publishableKey: string;
} {
  let values: Record<string, string | undefined>;
  try {
    values = parseEnv(environment);
  } catch {
    throw new Error('Environment does not define a valid production backend target.');
  }
  const url = values.SUPABASE_URL?.trim();
  const publishableKey = values.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error('Environment does not define a complete production backend target.');
  }
  try {
    return { origin: new URL(url).origin, publishableKey };
  } catch {
    throw new Error('Environment defines an invalid production backend target.');
  }
}

export function verifyProductionBackendTargetSources(
  candidateEnvironment: string,
  trackedMainEnvironment: string,
): VerifiedProductionBackendTarget {
  const candidate = parseProductionBackend(candidateEnvironment);
  const trackedMain = parseProductionBackend(trackedMainEnvironment);
  if (
    candidate.origin !== trackedMain.origin ||
    candidate.publishableKey !== trackedMain.publishableKey
  ) {
    throw new Error('Candidate backend target differs from tracked main production.');
  }
  return {
    candidateEnvironmentSha256: sha256(candidateEnvironment),
    origin: trackedMain.origin,
    originSha256: sha256(trackedMain.origin),
    publishableKey: trackedMain.publishableKey,
    publishableKeySha256: sha256(trackedMain.publishableKey),
    trackedMainEnvironmentSha256: sha256(trackedMainEnvironment),
  };
}

export function readVerifiedProductionBackendTarget(): VerifiedProductionBackendTarget {
  const candidateEnvironment = readFileSync(path.join(REPOSITORY_ROOT, '.env'), 'utf8');
  const trackedMainEnvironment = execFileSync('git', ['show', 'origin/main:.env'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  });
  return verifyProductionBackendTargetSources(candidateEnvironment, trackedMainEnvironment);
}

export function bindVerifiedProductionRequestGuardOptions(
  backendTarget: Pick<VerifiedProductionBackendTarget, 'publishableKey'>,
  options: VerifiedProductionRequestGuardOptions = {},
): ProductionRequestGuardOptions {
  return {
    ...options,
    expectedPublishableKey: backendTarget.publishableKey,
  };
}

export async function installVerifiedProductionReadOnlyGuard(
  target: BrowserContext | Page,
  options: VerifiedProductionRequestGuardOptions = {},
): Promise<{
  backendTarget: VerifiedProductionBackendTarget;
  guard: ProductionRequestGuard;
}> {
  const backendTarget = readVerifiedProductionBackendTarget();
  const guard = await installReadOnlyProductionGuard(
    target,
    backendTarget.origin,
    bindVerifiedProductionRequestGuardOptions(backendTarget, options),
  );
  return { backendTarget, guard };
}
