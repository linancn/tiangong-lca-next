import { createRequire } from 'node:module';
import path from 'node:path';

export const SEMANTIC_EVIDENCE_REPOSITORY_PATH = '.local/e2e-release/semantic-e2e-evidence.json';

export async function formatCanonicalSemanticEvidence(
  value: unknown,
  repositoryRoot: string,
): Promise<string> {
  const require = createRequire(path.join(repositoryRoot, 'package.json'));
  const prettier: typeof import('prettier') = require('prettier');
  const canonicalPath = path.join(repositoryRoot, SEMANTIC_EVIDENCE_REPOSITORY_PATH);
  const resolvedConfig = await prettier.resolveConfig(canonicalPath);
  return prettier.format(JSON.stringify(value, null, 2), {
    ...(resolvedConfig ?? {}),
    filepath: canonicalPath,
  });
}
