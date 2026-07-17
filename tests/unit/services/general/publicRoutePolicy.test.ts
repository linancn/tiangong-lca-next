import { createPublicRoutePolicy } from '@/services/general/publicRoutePolicy';
import appRoutes from '../../../../config/routes';

const exactPublicPaths = [
  '/',
  '/welcome',
  '/user/login',
  '/user/login/password_forgot',
  '/user/login/password_reset',
];

describe('public route policy', () => {
  const isPublicPath = createPublicRoutePolicy(appRoutes, {
    exactPublicPaths,
    publicUnknownFallback: true,
  });

  it.each([...exactPublicPaths, '/welcome/'])('allows the explicit public route %s', (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each(['/tgdata', '/review', '/dashboard/national-carbon', '/data-processing'])(
    'protects the configured route %s',
    (pathname) => {
      expect(isPublicPath(pathname)).toBe(false);
    },
  );

  it('allows the explicit wildcard to render a public not-found page', () => {
    expect(isPublicPath('/this-route-does-not-exist')).toBe(true);
  });

  it('keeps future static and dynamic routes protected by default', () => {
    const futurePolicy = createPublicRoutePolicy(
      [
        ...appRoutes,
        { path: '/future-protected', component: './FutureProtected' } as any,
        { path: '/projects/:projectId', component: './Project' } as any,
      ],
      { exactPublicPaths, publicUnknownFallback: true },
    );

    expect(futurePolicy('/future-protected')).toBe(false);
    expect(futurePolicy('/projects/42')).toBe(false);
    expect(futurePolicy('/another-missing-route')).toBe(true);
  });

  it('does not make unknown paths public when no wildcard route exists', () => {
    const noFallbackPolicy = createPublicRoutePolicy([{ path: '/known' }], {
      exactPublicPaths: [],
      publicUnknownFallback: true,
    });

    expect(noFallbackPolicy('/missing')).toBe(false);
  });

  it('keeps the root redirect query contract explicit', () => {
    expect(appRoutes.find(({ path }) => path === '/')).toEqual(
      expect.objectContaining({ redirect: '/welcome', keepQuery: true }),
    );
  });
});
