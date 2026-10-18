import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/dependency-pr.yml'), 'utf8');
const browserJob = workflow.split('\n  semantic-qualification:\n')[1];

describe('ordinary dependency browser qualification boundary', () => {
  it('uses the same protected-phase selection and one unchanged aggregate owner', () => {
    const condition = (section: string) =>
      section.split('    if: >-\n')[1].split('    runs-on:')[0];
    expect(condition(browserJob)).toBe(condition(workflow.split('\n  dependency-gate:\n')[1]));
    expect(workflow.match(/run: pnpm prepush:gate/gu)).toHaveLength(1);
    expect(browserJob).toContain('ref: ${{ github.event.pull_request.head.sha || github.sha }}');
    expect(browserJob).toContain('persist-credentials: false');
    expect(browserJob).toContain('fetch-depth: 0');
    expect(browserJob).toContain('pnpm install --frozen-lockfile');
    expect(browserJob).not.toMatch(
      /secrets\.|pull_request_target|production|release:to-dev|e2e:dev/u,
    );
    expect(workflow).toContain('permissions:\n  contents: read');
  });

  it('keeps canonical proof separate from owned cleanup and artifact service acknowledgement', () => {
    const positions = [
      'supabase-browser-resources.cjs start',
      'pnpm --silent e2e:qualify --proof .local/e2e-release/qualification-proof.json',
      'pnpm --silent release:proof:verify --proof .local/e2e-release/qualification-proof.json',
      'supabase-browser-resources.cjs finish',
      'supabase-browser-resources.cjs verify',
      'id: semantic-artifact',
      '--stage artifact-upload',
    ].map((value) => browserJob.indexOf(value));
    expect(positions.every((position) => position > 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(browserJob.match(/if: always\(\) && env.QUALIFICATION_STATE != ''/gu)).toHaveLength(2);
    expect(browserJob).toContain('printf \'QUALIFICATION_STATE=%s\\n\' "$state" >> "$GITHUB_ENV"');
    expect(browserJob).toContain('archive: true');
    expect(browserJob).toContain('retention-days: 7');
    expect(browserJob).not.toContain('docker system prune');
    expect(browserJob).not.toMatch(/path:.*\.local\/\*\*/u);
    expect(browserJob).toContain('runs/**/semantic-harness-qualification.json');
    expect(browserJob).not.toMatch(/auth-state|\.env|\.png|\.webm|trace[.]zip/u);
  });
});
