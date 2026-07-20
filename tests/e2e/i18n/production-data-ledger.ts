import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseEnv, promisify } from 'node:util';

import { createClient, FunctionRegion } from '@supabase/supabase-js';

import { loadE2ECredential } from './auth';
import {
  AUTHORING_LANGUAGES,
  E2E_LEDGER_PATH,
  E2E_LEDGER_RESULT_PATH,
  E2E_RUNTIME_DIR,
  PRODUCTION_DATA_MARKER_PREFIX,
  REPOSITORY_ROOT,
} from './contracts';
import {
  assertLedgerScope,
  assertOwnedCodexRow,
  assertPersistedProcessSynonyms,
  assertProductionDataResult,
  assertProductionDataWriteAuthorization,
  executeVerifiedCodexCleanup,
  makeCodexE2EProcessSynonyms,
  persistProductionLedgerCopies,
  PROCESS_TABLE,
  PROCESS_VERSION,
  reconcileProductionLedgerCopies,
  type PersistedProcessRow,
  type ProductionDataLedger,
  type ProductionDataResult,
} from './production-data-safety';
import { loadReferenceFixture } from './reference-fixture';

export type { ProductionDataLedger } from './production-data-safety';

export type { ProductionDataResult } from './production-data-safety';

const execFileAsync = promisify(execFile);

async function readJsonIfPresent<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

function resolveRecoveryLedgerPath(required: boolean): string | undefined {
  const configuredPath = process.env.E2E_RECOVERY_LEDGER_PATH?.trim();
  if (!configuredPath) {
    if (required) {
      throw new Error(
        'Production-data E2E requires an absolute recovery ledger path outside the candidate worktree.',
      );
    }
    return undefined;
  }
  if (!path.isAbsolute(configuredPath)) {
    throw new Error('E2E_RECOVERY_LEDGER_PATH must be absolute.');
  }
  const resolvedPath = path.resolve(configuredPath);
  const relativeToRepository = path.relative(REPOSITORY_ROOT, resolvedPath);
  if (
    relativeToRepository === '' ||
    (!relativeToRepository.startsWith(`..${path.sep}`) &&
      relativeToRepository !== '..' &&
      !path.isAbsolute(relativeToRepository))
  ) {
    throw new Error('E2E_RECOVERY_LEDGER_PATH must be outside the candidate worktree.');
  }
  return resolvedPath;
}

async function readProductionLedgerCopies(recoveryPath: string | undefined): Promise<{
  primary: ProductionDataLedger | undefined;
  recovery: ProductionDataLedger | undefined;
}> {
  let primary: ProductionDataLedger | undefined;
  let recovery: ProductionDataLedger | undefined;
  let primaryUnreadable = false;
  let recoveryUnreadable = false;
  try {
    primary = await readJsonIfPresent<ProductionDataLedger>(E2E_LEDGER_PATH);
  } catch {
    primaryUnreadable = true;
  }
  if (recoveryPath) {
    try {
      recovery = await readJsonIfPresent<ProductionDataLedger>(recoveryPath);
    } catch {
      recoveryUnreadable = true;
    }
  }
  if (primaryUnreadable || recoveryUnreadable) {
    throw new Error('The codex-e2e recovery ledger is unreadable; refusing production work.');
  }
  return { primary, recovery };
}

async function writeProductionLedger(ledger: ProductionDataLedger): Promise<void> {
  const recoveryPath = resolveRecoveryLedgerPath(true)!;
  const { primary, recovery } = await readProductionLedgerCopies(recoveryPath);
  await persistProductionLedgerCopies({
    next: ledger,
    primary,
    recovery,
    writePrimary: (next) => writeJson(E2E_LEDGER_PATH, next),
    writeRecovery: (next) => writeJson(recoveryPath, next),
  });
}

async function removeProductionLedgers(): Promise<void> {
  const recoveryPath = resolveRecoveryLedgerPath(false);
  await rm(E2E_LEDGER_PATH, { force: true });
  if (recoveryPath) {
    await rm(recoveryPath, { force: true });
  }
}

async function loadSupabasePublicConfig(): Promise<{ publishableKey: string; url: string }> {
  let fileEnv: Record<string, string | undefined> = {};
  try {
    fileEnv = parseEnv(await readFile(path.join(REPOSITORY_ROOT, '.env'), 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const url = process.env.SUPABASE_URL?.trim() || fileEnv.SUPABASE_URL?.trim();
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || fileEnv.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error('Production-data E2E requires SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  }
  const trackedMainEnv = parseEnv(
    (
      await execFileAsync('git', ['show', 'origin/main:.env'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
      })
    ).stdout,
  );
  const trackedMainUrl = trackedMainEnv.SUPABASE_URL?.trim();
  const trackedMainPublishableKey = trackedMainEnv.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (
    !trackedMainUrl ||
    !trackedMainPublishableKey ||
    new URL(url).origin !== new URL(trackedMainUrl).origin ||
    publishableKey !== trackedMainPublishableKey
  ) {
    throw new Error('Supabase host does not match the tracked main environment.');
  }
  return { publishableKey, url };
}

function createE2EClient(url: string, publishableKey: string) {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function makeMinimalProcessJson(ledger: ProductionDataLedger): Record<string, unknown> {
  const referenceFixture = loadReferenceFixture();
  const multilingualField = (field: string) =>
    AUTHORING_LANGUAGES.map((languageCode) => ({
      '#text': `${ledger.marker} ${field} ${languageCode}`,
      '@xml:lang': languageCode,
    }));
  return {
    processDataSet: {
      '@xmlns': 'http://lca.jrc.it/ILCD/Process',
      '@version': '1.1',
      '@locations': '../ILCDLocations.xml',
      '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@xmlns:common': 'http://lca.jrc.it/ILCD/Common',
      '@xsi:schemaLocation': 'http://lca.jrc.it/ILCD/Process ../../schemas/ILCD_ProcessDataSet.xsd',
      processInformation: {
        dataSetInformation: {
          name: {
            baseName: multilingualField('baseName'),
            treatmentStandardsRoutes: multilingualField('treatmentStandardsRoutes'),
            mixAndLocationTypes: multilingualField('mixAndLocationTypes'),
            functionalUnitFlowProperties: multilingualField('functionalUnitFlowProperties'),
          },
          'common:synonyms': makeCodexE2EProcessSynonyms(ledger, 'before-ui-save'),
          'common:generalComment': multilingualField('generalComment'),
          classificationInformation: {
            'common:classification': {
              'common:class': referenceFixture.classification.canonicalPath.map(
                ({ id: classId, label }, level) => ({
                  '#text': label,
                  '@level': String(level),
                  '@classId': classId,
                }),
              ),
            },
          },
          'common:UUID': ledger.id,
        },
        geography: {
          locationOfOperationSupplyOrProduction: {
            '@location': referenceFixture.location.code,
          },
        },
      },
      administrativeInformation: {
        dataEntryBy: {
          'common:timeStamp': new Date().toISOString(),
        },
        publicationAndOwnership: {
          'common:dataSetVersion': PROCESS_VERSION,
          'common:permanentDataSetURI':
            `https://lcdn.tiangong.earth/datasetdetail/process.xhtml?uuid=${ledger.id}` +
            `&version=${PROCESS_VERSION}`,
        },
      },
    },
  };
}

async function withAuthenticatedClient<T>(
  callback: (input: {
    accessToken: string;
    client: ReturnType<typeof createE2EClient>;
    userId: string;
  }) => Promise<T>,
): Promise<T> {
  const [{ publishableKey, url }, credential] = await Promise.all([
    loadSupabasePublicConfig(),
    loadE2ECredential(),
  ]);
  const client = createE2EClient(url, publishableKey);
  const signIn = await client.auth.signInWithPassword({
    email: credential.email,
    password: credential.password,
  });
  if (signIn.error || !signIn.data.session) {
    throw new Error(`Production-data E2E sign-in failed: ${signIn.error?.message ?? 'no session'}`);
  }
  try {
    return await callback({
      accessToken: signIn.data.session.access_token,
      client,
      userId: signIn.data.session.user.id,
    });
  } finally {
    await client.auth.signOut();
  }
}

export async function readProductionDataLedger(): Promise<ProductionDataLedger | undefined> {
  const { primary, recovery } = await readProductionLedgerCopies(resolveRecoveryLedgerPath(false));
  return reconcileProductionLedgerCopies(primary, recovery);
}

export async function readProductionDataResult(): Promise<ProductionDataResult> {
  const result = (await readJsonIfPresent<ProductionDataResult>(E2E_LEDGER_RESULT_PATH)) ?? {
    cleaned: 0,
    created: 0,
    leaked: 0,
  };
  assertProductionDataResult(result);
  return result;
}

export async function createCodexE2EProcess(): Promise<ProductionDataLedger> {
  // Keep the write authorization at the mutation boundary so direct callers cannot bypass the
  // equivalent checks performed by Playwright global setup.
  assertProductionDataWriteAuthorization(process.env);
  resolveRecoveryLedgerPath(true);
  const previousLedger = await readProductionDataLedger();
  if (previousLedger) {
    // Recovery deliberately uses the same exact-id cleanup path declared below.
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const previousResult = await cleanupCodexE2EProcess();
    if (previousResult.leaked !== 0) {
      throw new Error(
        'A previous codex-e2e process could not be cleaned; refusing another create.',
      );
    }
  }

  const id = randomUUID();
  const marker = `${PRODUCTION_DATA_MARKER_PREFIX}-${id}`;
  const ledger: ProductionDataLedger = {
    cleaned: 0,
    cleanupPrepared: false,
    createAttempted: false,
    created: 0,
    id,
    leaked: 0,
    marker,
    state: 'initial',
    table: PROCESS_TABLE,
    version: PROCESS_VERSION,
  };
  assertLedgerScope(ledger);
  await mkdir(E2E_RUNTIME_DIR, { recursive: true });
  await writeProductionLedger(ledger);

  try {
    await withAuthenticatedClient(async ({ accessToken, client, userId }) => {
      const attemptedLedger: ProductionDataLedger = {
        ...ledger,
        createAttempted: true,
        state: 'create-attempted',
      };
      await writeProductionLedger(attemptedLedger);
      assertProductionDataWriteAuthorization(process.env);
      const createResult = await client.functions.invoke('app_dataset_create', {
        body: {
          id,
          jsonOrdered: makeMinimalProcessJson(attemptedLedger),
          ruleVerification: false,
          table: PROCESS_TABLE,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
        region: FunctionRegion.UsEast1,
      });
      if (createResult.error) {
        throw new Error(`codex-e2e process create failed: ${createResult.error.message}`);
      }

      const verification = await client
        .from(PROCESS_TABLE)
        .select('id,version,json,json_ordered,user_id')
        .eq('id', id)
        .eq('version', PROCESS_VERSION)
        .maybeSingle();
      if (verification.error || !verification.data) {
        throw new Error(
          `codex-e2e process verification failed: ${verification.error?.message ?? 'not found'}`,
        );
      }
      const persistedRow = verification.data as PersistedProcessRow;
      assertOwnedCodexRow(persistedRow, attemptedLedger, userId);
      assertPersistedProcessSynonyms(persistedRow, attemptedLedger, 'before-ui-save');
    });
  } catch (createError) {
    try {
      // Recovery must use the same persisted-row owner + marker verification as normal teardown.
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const recovery = await cleanupCodexE2EProcess();
      if (recovery.leaked !== 0) {
        throw new Error(`recovery left ${recovery.leaked} exact-id row(s)`);
      }
    } catch {
      throw new Error('codex-e2e create failed and exact-id recovery cleanup did not complete.');
    }
    throw createError;
  }

  const createdLedger: ProductionDataLedger = {
    ...ledger,
    createAttempted: true,
    created: 1,
    leaked: 1,
    state: 'created',
  };
  await writeProductionLedger(createdLedger);
  await writeJson(E2E_LEDGER_RESULT_PATH, {
    cleaned: 0,
    created: 1,
    leaked: 1,
  });
  return createdLedger;
}

export async function cleanupCodexE2EProcess(): Promise<ProductionDataResult> {
  const ledger = await readProductionDataLedger();
  if (!ledger) {
    const emptyResult = { cleaned: 0, created: 0, leaked: 0 };
    await writeJson(E2E_LEDGER_RESULT_PATH, emptyResult);
    return emptyResult;
  }
  // Cleanup is a production mutation too, including recovery after a prior interrupted run.
  // Require the same explicit local operator envelope before reading or deleting the exact row.
  assertProductionDataWriteAuthorization(process.env);
  assertLedgerScope(ledger);
  // A prior crash may have left the recovery copy one adjacent state ahead of the primary copy.
  // Heal that split before beginning the next state transition so another crash can never create
  // a two-step disagreement.
  await writeProductionLedger(ledger);

  const result = await withAuthenticatedClient(async ({ accessToken, client, userId }) => {
    const existing = await client
      .from(PROCESS_TABLE)
      .select('id,version,json,json_ordered,user_id')
      .eq('id', ledger.id);
    if (existing.error) {
      throw new Error(`codex-e2e pre-cleanup verification failed: ${existing.error.message}`);
    }

    const exactIdRows = (existing.data ?? []) as PersistedProcessRow[];
    return executeVerifiedCodexCleanup({
      authenticatedUserId: userId,
      ledger,
      rows: exactIdRows,
      prepareCleanup: async (preparedLedger) => {
        await writeProductionLedger(preparedLedger);
      },
      deleteExactVersion: async () => {
        assertProductionDataWriteAuthorization(process.env);
        const deleteResult = await client.functions.invoke('app_dataset_delete', {
          body: { id: ledger.id, table: ledger.table, version: ledger.version },
          headers: { Authorization: `Bearer ${accessToken}` },
          region: FunctionRegion.UsEast1,
        });
        if (deleteResult.error) {
          throw new Error(`codex-e2e process cleanup failed: ${deleteResult.error.message}`);
        }
        return deleteResult.data;
      },
      countRemaining: async () => {
        const remaining = await client
          .from(PROCESS_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('id', ledger.id);
        if (remaining.error) {
          throw new Error(`codex-e2e post-cleanup verification failed: ${remaining.error.message}`);
        }
        return remaining.count ?? 0;
      },
    });
  });

  await writeJson(E2E_LEDGER_RESULT_PATH, result);
  if (result.leaked === 0) {
    await removeProductionLedgers();
  } else {
    await writeProductionLedger({
      ...ledger,
      ...result,
      cleanupPrepared: true,
      state: 'leak-result',
    });
  }
  return result;
}
