#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_CATALOG_CONFIRMATION,
  DEFAULT_PILOT_CONFIRMATION,
  readCatalogOfflineConfirmation,
  readPilotOfflineConfirmation,
} from './german-offline-review.mjs';
import {
  FROZEN_BASELINE_COMMIT,
  FROZEN_CONTEXT_LEDGER,
  readJson,
} from './german-runtime-policy.mjs';

const PILOT_REVIEW_PACK = 'docs/plans/i18n-de-DE/pilot-review-pack.json';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseArgs(argv) {
  const options = { root: process.cwd(), scope: 'pilot', mode: 'enforce', confirmation: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (['--root', '--scope', '--mode', '--confirmation'].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${argument}`);
      options[
        {
          '--root': 'root',
          '--scope': 'scope',
          '--mode': 'mode',
          '--confirmation': 'confirmation',
        }[argument]
      ] = value;
      index += 1;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!['pilot', 'catalog'].includes(options.scope))
    throw new Error('scope must be pilot or catalog.');
  if (!['report', 'enforce'].includes(options.mode))
    throw new Error('mode must be report or enforce.');
  options.root = path.resolve(options.root);
  options.confirmation ??=
    options.scope === 'pilot' ? DEFAULT_PILOT_CONFIRMATION : DEFAULT_CATALOG_CONFIRMATION;
  return options;
}

function frozenDigest(root, relativeFile) {
  return sha256(
    execFileSync('git', ['show', `${FROZEN_BASELINE_COMMIT}:${relativeFile}`], {
      cwd: root,
      encoding: null,
      maxBuffer: 20 * 1024 * 1024,
    }),
  );
}

function currentDigest(root, relativeFile) {
  return sha256(fs.readFileSync(path.resolve(root, relativeFile)));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourcePath = options.scope === 'pilot' ? PILOT_REVIEW_PACK : FROZEN_CONTEXT_LEDGER;
  const expectedDigest = frozenDigest(options.root, sourcePath);
  const actualDigest = currentDigest(options.root, sourcePath);
  const snapshotMatches = expectedDigest === actualDigest;
  const source = readJson(options.root, sourcePath);
  const review =
    options.scope === 'pilot'
      ? readPilotOfflineConfirmation(options.root, options.confirmation, source)
      : readCatalogOfflineConfirmation(options.root, options.confirmation, source);
  const approved = snapshotMatches && review.approved;
  const reasons = [
    ...(snapshotMatches ? [] : [`Tracked ${options.scope} review source differs from Issue #601.`]),
    ...review.reasons,
  ];
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: 'tiangong.i18n-de-frozen-review-check.v1',
        locale: 'de-DE',
        scope: options.scope,
        sourceCommit: FROZEN_BASELINE_COMMIT,
        snapshotMatches,
        approved,
        counts: review.counts,
        reasons,
      },
      null,
      2,
    )}\n`,
  );
  if (options.mode === 'enforce' && !approved) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(
      `Frozen German review check failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}
