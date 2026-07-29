#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  formatCanonicalSemanticEvidence,
  SEMANTIC_EVIDENCE_REPOSITORY_PATH,
} from './semantic-evidence-format.ts';

const root = process.cwd();
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--path')) {
  throw new Error('Usage: check-semantic-evidence-format.mjs [--path <evidence-path>]');
}
const evidencePath =
  args.length === 2
    ? path.resolve(root, args[1])
    : path.join(root, SEMANTIC_EVIDENCE_REPOSITORY_PATH);
const checkedInEvidence = fs.readFileSync(evidencePath, 'utf8');
const canonicalEvidence = await formatCanonicalSemanticEvidence(
  JSON.parse(checkedInEvidence),
  root,
);

if (canonicalEvidence !== checkedInEvidence) {
  throw new Error(
    'Semantic E2E evidence is not canonical; regenerate it with the repository evidence reporter.',
  );
}

process.stdout.write('Semantic E2E evidence is canonical.\n');
