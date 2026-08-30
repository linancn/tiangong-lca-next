import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const publicRoot = path.resolve(process.cwd(), 'public');
const bridgeScript = fs.readFileSync(path.join(publicRoot, 'oauth-consent-bridge.js'), 'utf8');
const edgeOneConfig = JSON.parse(fs.readFileSync(path.join(publicRoot, 'edgeone.json'), 'utf8'));

const runBridge = (search: string) => {
  const replace = jest.fn();
  vm.runInNewContext(bridgeScript, {
    URLSearchParams,
    window: { location: { replace, search } },
  });
  return replace;
};

describe('OAuth consent hash-history bridge', () => {
  it('rewrites the exact public OAuth path to the no-store bridge', () => {
    expect(edgeOneConfig.rewrites).toContainEqual({
      source: '/oauth/consent',
      destination: '/oauth-consent-bridge.html',
    });
    expect(edgeOneConfig.headers.find(({ source }: any) => source === '/oauth/consent')).toEqual(
      expect.objectContaining({
        headers: expect.arrayContaining([
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ]),
      }),
    );
  });

  it('moves one valid authorization ID into the SPA hash route', () => {
    const replace = runBridge('?authorization_id=123E4567-E89B-42D3-A456-426614174000');
    expect(replace).toHaveBeenCalledWith(
      '/#/oauth/consent?authorization_id=123e4567-e89b-42d3-a456-426614174000',
    );
  });

  it.each([
    '',
    '?authorization_id=javascript:alert(1)',
    '?authorization_id=123e4567-e89b-42d3-a456-426614174000&authorization_id=123e4567-e89b-42d3-a456-426614174000',
  ])('fails closed for malformed bridge input %s', (search) => {
    const replace = runBridge(search);
    expect(replace).toHaveBeenCalledWith('/#/oauth/consent?error=invalid_authorization_request');
  });
});
