// Run with the repository Node launcher: node --import tsx scripts/qualification/process-capture-start.mjs
import { realpath, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyProductionRequest } from '../../tests/e2e/i18n/production-request-guard.ts';
import server from './process-capture-server.cjs';

const output = process.env.PROCESS_CAPTURE_OUTPUT;
if (!output || !path.isAbsolute(output))
  throw new Error('PROCESS_CAPTURE_OUTPUT must be an absolute private evidence path');
const repository = await realpath(fileURLToPath(new URL('../../', import.meta.url)));
let pinnedMain;
let sourceCommit;
try {
  pinnedMain = parseEnv(
    execFileSync('git', ['show', 'HEAD:.env'], {
      cwd: repository,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repository,
    encoding: 'utf8',
  }).trim();
  if (
    execFileSync('git', ['status', '--porcelain'], { cwd: repository, encoding: 'utf8' }).trim()
  ) {
    throw new Error('Uncommitted candidate');
  }
} catch {
  throw new Error('Capture requires a clean committed candidate and its tracked main environment');
}
if (
  new URL(pinnedMain.SUPABASE_URL).protocol !== 'https:' ||
  !pinnedMain.SUPABASE_PUBLISHABLE_KEY ||
  (process.env.PROCESS_CAPTURE_UPSTREAM_ORIGIN &&
    process.env.PROCESS_CAPTURE_UPSTREAM_ORIGIN !== pinnedMain.SUPABASE_URL) ||
  (process.env.PROCESS_CAPTURE_PUBLISHABLE_KEY &&
    process.env.PROCESS_CAPTURE_PUBLISHABLE_KEY !== pinnedMain.SUPABASE_PUBLISHABLE_KEY)
) {
  throw new Error('Capture upstream must match the committed main environment');
}
const outputParent = await realpath(path.dirname(output));
if (outputParent === repository || outputParent.startsWith(`${repository}${path.sep}`)) {
  throw new Error('Capture evidence must remain outside the repository');
}
const runtime = await server.startProcessCaptureServers({
  upstreamOrigin: pinnedMain.SUPABASE_URL,
  devOrigin: process.env.PROCESS_CAPTURE_DEV_ORIGIN,
  appPort: Number(process.env.PROCESS_CAPTURE_APP_PORT),
  parentPort: Number(process.env.PROCESS_CAPTURE_PARENT_PORT),
  publishableKey: pinnedMain.SUPABASE_PUBLISHABLE_KEY,
  processId: process.env.PROCESS_CAPTURE_PROCESS_ID,
  sourceVersion: process.env.PROCESS_CAPTURE_SOURCE_VERSION,
  classifyRequest: classifyProductionRequest,
  onCapture: async ({ body }) => {
    await writeFile(output, body, { flag: 'wx', mode: 0o600 });
  },
  onCaptured: async ({ sha256, summary }) => {
    process.stdout.write(
      `${JSON.stringify({ event: 'captured-without-dispatch', sha256, summary })}\n`,
    );
  },
});
process.stdout.write(
  `${JSON.stringify({ sourceCommit, parentOrigin: runtime.parentOrigin, appOrigin: runtime.appOrigin, upstreamOrigin: pinnedMain.SUPABASE_URL })}\n`,
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    process.stdout.write(`${JSON.stringify({ event: 'closed', summary: runtime.summary() })}\n`);
    await runtime.close();
    process.exit(0);
  });
