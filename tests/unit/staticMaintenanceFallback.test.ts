import fs from 'node:fs';
import path from 'node:path';

describe('standalone maintenance fallback', () => {
  it('ships without React or external assets and supports all runtime locales', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'public/maintenance.html'), 'utf8');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain("'zh-CN'");
    expect(html).toContain("'en-US'");
    expect(html).toContain("'de-DE'");
    expect(html).toContain("'fr-FR'");
    expect(html).toContain("window.location.protocol === 'file:'");
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href=/);
  });

  it('arms a boot timeout and redirects only if React never mounts', () => {
    const script = fs.readFileSync(path.join(process.cwd(), 'public/scripts/loading.js'), 'utf8');

    expect(script).toContain('__TIANGONG_APP_BOOT_TIMEOUT__');
    expect(script).toContain('__TIANGONG_APP_MOUNTED__');
    expect(script).toContain('15000');
    expect(script).toContain('/maintenance.html?reason=boot-timeout');
  });
});
