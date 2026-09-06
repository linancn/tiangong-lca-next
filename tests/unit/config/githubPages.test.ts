import fs from 'node:fs';
import path from 'node:path';

describe('fork GitHub Pages contract', () => {
  const root = process.cwd();
  const workflowPath = path.join(root, '.github/workflows/github-pages.yml');

  it('uses the fork project path and the official Pages artifact deployment flow', () => {
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toContain('APP_BASE_PATH: /tiangong-lca-next-practice/');
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("APP_RUNTIME_CONFIG_ENABLED: 'false'");
    expect(workflow).toContain('SUPABASE_URL: ${{ vars.SUPABASE_URL }}');
    expect(workflow).toContain('SUPABASE_PUBLISHABLE_KEY: ${{ vars.SUPABASE_PUBLISHABLE_KEY }}');
    expect(workflow).toContain('pnpm install --frozen-lockfile');
    expect(workflow).toContain('uses: actions/configure-pages@v6');
    expect(workflow).toContain('uses: actions/upload-pages-artifact@v5');
    expect(workflow).toContain('uses: actions/deploy-pages@v5');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).not.toContain('EDGEONE_API_TOKEN');
  });

  it('does not publish the upstream custom domain from project Pages', () => {
    expect(fs.existsSync(path.join(root, 'public/CNAME'))).toBe(false);
  });
});
