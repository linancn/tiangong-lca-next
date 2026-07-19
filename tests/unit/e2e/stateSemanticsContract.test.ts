import fs from 'node:fs';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const SPEC_PATH = 'tests/e2e/i18n/state-semantics.spec.ts';

describe('state semantics production-read fixture contract', () => {
  it('fulfills only the exact verified production teams read', () => {
    const source = fs.readFileSync(path.join(REPOSITORY_ROOT, SPEC_PATH), 'utf8');

    expect(source).toContain('readVerifiedProductionBackendTarget()');
    expect(source).toContain("expect(request.method()).toBe('GET')");
    expect(source).toContain('target.origin).toBe(productionBackendTarget.origin)');
    expect(source).toContain("target.pathname).toBe('/rest/v1/teams')");
    expect(source).toContain(
      'request.headers().apikey).toBe(productionBackendTarget.publishableKey)',
    );
    expect(source).toContain('expect([...target.searchParams.keys()].sort()).toEqual([');
    expect(source).toContain("expect(target.searchParams.get('select')).toBe('id,json,rank')");
    expect(source).toContain("expect(target.searchParams.get('rank')).toBe('gt.0')");
    expect(source).toContain("expect(target.searchParams.get('order')).toBe('rank.asc')");
    expect(source).toContain("screenshot: 'off'");
    expect(source).toContain("trace: 'off'");
    expect(source).toContain("video: 'off'");
    expect(source).not.toMatch(/page\.screenshot|ariaSnapshot|context\.tracing|recordVideo/gu);
  });
});
