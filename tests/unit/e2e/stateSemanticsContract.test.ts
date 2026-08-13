import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SPEC_PATH = 'tests/e2e/i18n/state-semantics.spec.ts';

describe('state semantics production-read fixture contract', () => {
  it('fulfills only the exact verified production teams read', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');

    expect(source).toContain('readVerifiedProductionBackendTarget()');
    expect(source).toContain('assertAuditedSyntheticReadRequest(route.request(), {');
    expect(source).toContain('expectedOrigin: productionBackendTarget.origin');
    expect(source).toContain('expectedPublishableKey: productionBackendTarget.publishableKey');
    expect(source).toContain("method: 'POST'");
    expect(source).toContain("pathname: '/rest/v1/rpc/qry_team_list'");
    expect(source).toContain('p_keyword: null');
    expect(source).toContain("p_mode: 'ranked'");
    expect(source).toContain('p_page: 1');
    expect(source).toContain('p_page_size: 100');
    expect(source).toContain('searchParams: {}');
    expect(source).toContain("screenshot: 'off'");
    expect(source).toContain("trace: 'off'");
    expect(source).toContain("video: 'off'");
    expect(source).not.toMatch(/page\.screenshot|ariaSnapshot|context\.tracing|recordVideo/gu);
  });
});
