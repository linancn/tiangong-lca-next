import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const workflow = fs.readFileSync(
  path.resolve(__dirname, '../../../.github/workflows/dependency-pr.yml'),
  'utf8',
);

describe('ordinary dependency workflow validation ownership', () => {
  const cases = [
    ['Dev bot dependency', 'dev', 'dependabot/npm_and_yarn/ui', '', true, 'pull_request'],
    [
      'Main security proposal',
      'main',
      'dependabot/npm_and_yarn/security',
      '',
      true,
      'pull_request',
    ],
    ['human Dev maintenance', 'dev', 'codex/dependency-fix', '', true, 'pull_request'],
    [
      'marked Dev Release owner',
      'dev',
      'codex/release-v0.0.137',
      'tiangong-next-release-automation:v2',
      false,
      'pull_request',
    ],
    ['direct Dev promotion owner', 'main', 'dev', '', false, 'pull_request'],
    ['immutable promotion owner', 'main', 'codex/promote-v0.0.137', '', false, 'pull_request'],
    ['Main hotfix owner', 'main', 'codex/hotfix-dependabot-1264', '', false, 'pull_request'],
    [
      'unmarked Dev release-like branch',
      'dev',
      'codex/release-maintenance',
      '',
      true,
      'pull_request',
    ],
    ['manual exact ref', 'main', 'codex/hotfix-dependabot-1264', '', true, 'workflow_dispatch'],
  ] as const;

  it.each(cases)(
    '%s selects the existing validation owner',
    (_name, base, head, body, expected, event) => {
      const expression = workflow.match(/\n    if: >-\n([\s\S]*?)\n    runs-on:/u)?.[1];
      if (!expression) throw new Error('Dependency job selection expression is missing.');
      const actual = vm.runInNewContext(
        expression,
        {
          github: {
            event_name: event ?? 'pull_request',
            event: { pull_request: { base: { ref: base }, head: { ref: head }, body } },
          },
          contains: (value: string, part: string) =>
            value.toLowerCase().includes(part.toLowerCase()),
          startsWith: (value: string, part: string) =>
            value.toLowerCase().startsWith(part.toLowerCase()),
        },
        { timeout: 100 },
      );
      expect(actual).toBe(expected);
    },
  );

  it('retains a read-only canonical source gate without release or deployment authority', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('run: pnpm install --frozen-lockfile');
    expect(workflow).toContain('run: pnpm prepush:gate');
    expect(workflow).not.toMatch(
      /pull_request_target|secrets\.|release:static-preflight|pnpm deploy|pages deploy|gh release/u,
    );
    expect(workflow).not.toMatch(/contents:\s*write|id-token:\s*write|pull-requests:\s*write/u);
  });
});
