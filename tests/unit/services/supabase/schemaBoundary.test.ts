import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const EXPECTED_EDGE_COMMIT = '5d0dd0078a438513d8d2484d2c211def7a0d0cda';
const NON_CORE_RELATIONS = ['roles', 'teams', 'users', 'comments', 'reviews'];

function sourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [absolute] : [];
  });
}

describe('Supabase schema cutover boundary', () => {
  const shippedSources = sourceFiles(path.join(ROOT, 'src'));
  const liveWorkflowSources = [
    ...sourceFiles(path.join(ROOT, 'tests/data-workflows/workflows')),
    ...sourceFiles(path.join(ROOT, 'tests/e2e')),
  ];

  it('keeps the shipped client on the api schema', () => {
    const source = fs.readFileSync(path.join(ROOT, 'src/services/supabase/index.ts'), 'utf8');
    expect(source).toMatch(/db:\s*\{\s*schema:\s*'api'/u);
  });

  it.each(NON_CORE_RELATIONS)('does not query the %s relation directly', (relation) => {
    const directRelation = new RegExp(`\\.from\\(\\s*['"]${relation}['"]\\s*\\)`, 'u');
    const offenders = shippedSources.filter((file) =>
      directRelation.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('routes shipped relation access through the public-entity boundary', () => {
    const directClientFrom = /\bsupabase\s*\.\s*from\s*\(/u;
    const offenders = shippedSources
      .filter((file) => !file.endsWith(path.join('supabase', 'storage.ts')))
      .filter((file) => directClientFrom.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('contains no private-schema consumer access', () => {
    const offenders = shippedSources.filter((file) =>
      /\.schema\(\s*['"]private['"]\s*\)/u.test(fs.readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps live workflow relation reads explicitly on public', () => {
    const offenders = liveWorkflowSources.flatMap((file) => {
      const source = fs.readFileSync(file, 'utf8');
      return [...source.matchAll(/\.from\s*\(/gu)]
        .filter((match) => {
          const prefix = source.slice(Math.max(0, (match.index ?? 0) - 120), match.index);
          if (/\b(?:Array|Buffer|Object)\s*$/u.test(prefix)) return false;
          return !/\.schema\(\s*['"]public['"]\s*\)\s*$/u.test(prefix);
        })
        .map(() => file);
    });
    expect(offenders).toEqual([]);
  });

  it('pins the generated Edge mirror to the reviewed commit', () => {
    const receipt = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'docker/volumes/functions/.source-revision.json'), 'utf8'),
    );
    expect(receipt).toEqual({
      repository: 'https://github.com/linancn/tiangong-lca-edge-functions.git',
      commit: EXPECTED_EDGE_COMMIT,
      sourcePath: 'supabase/functions',
    });
  });
});
