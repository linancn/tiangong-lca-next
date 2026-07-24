#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const prettier = require('prettier');
const root = process.cwd();
const evidencePath = path.join(root, 'docs/plans/i18n/semantic-e2e-evidence.json');
const checkedInEvidence = fs.readFileSync(evidencePath, 'utf8');
const resolvedConfig = await prettier.resolveConfig(evidencePath);
const canonicalEvidence = await prettier.format(
  JSON.stringify(JSON.parse(checkedInEvidence), null, 2),
  {
    ...(resolvedConfig ?? {}),
    filepath: evidencePath,
  },
);

if (canonicalEvidence !== checkedInEvidence) {
  throw new Error(
    'Semantic E2E evidence is not canonical; regenerate it with the repository evidence reporter.',
  );
}

process.stdout.write('Semantic E2E evidence is canonical.\n');
