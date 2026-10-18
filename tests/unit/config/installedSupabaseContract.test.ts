import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../../..');

// Native Node resolution bypasses Jest's module mappers and replacement SDK objects.
describe('installed Supabase package and actual consumer contracts', () => {
  it.each([
    ['installedSupabaseWire.contract.mjs', 'outcomes', 19],
    ['installedSupabaseAuthRace.contract.mjs', 'observations', 2],
    ['installedSupabaseConsumers.contract.cjs', 'consumers', 8],
  ])('%s uses synthetic transport and closes its SDK clients', (file, collection, count) => {
    const result = spawnSync(
      process.execPath,
      [path.join(repositoryRoot, 'tests/package-contracts', file), repositoryRoot],
      { cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000 },
    );
    expect({
      error: result.error?.message,
      signal: result.signal,
      status: result.status,
      diagnostic: result.status === 0 ? '' : result.stderr,
    }).toEqual({
      error: undefined,
      signal: null,
      status: 0,
      diagnostic: '',
    });
    // Auth can emit a diagnostic on stderr; exit and structured semantic outcomes own success.
    const report = JSON.parse(result.stdout);
    expect(report[collection]).toHaveLength(count);
    expect(report.websocketAttempts).toBe(0);
  });
});
