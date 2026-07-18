import routes from '../../../config/routes';

describe('route access config', () => {
  it('protects the national carbon dashboard with admin access', () => {
    const dashboardRoute = routes.find((route) => route.path === '/dashboard/national-carbon');

    expect(dashboardRoute).toMatchObject({
      access: 'canAdmin',
      component: './NationalCarbonDashboard',
      layout: false,
      menu: false,
      wrappers: ['@/wrappers/AuthGuard'],
    });
  });

  it('protects data processing with data product manager access', () => {
    const dataProcessingRoute = routes.find((route) => route.path === '/data-processing');

    expect(dataProcessingRoute).toMatchObject({
      access: 'canDataProductManager',
      component: './DataProcessing',
      name: 'dataProcessing',
    });
  });

  it('places data processing after the user and team data modules', () => {
    const routePaths = routes.map((route) => route.path);

    expect(routePaths.indexOf('/data-processing')).toBeGreaterThan(routePaths.indexOf('/tedata'));
    expect(routePaths.indexOf('/data-processing')).toBeLessThan(routePaths.indexOf('/account'));
  });

  it('wraps every protected layout-free content route with the session guard', () => {
    const protectedLayoutFreeRoutes = routes.filter(
      (route) => route.layout === false && route.path !== '/user',
    );

    expect(protectedLayoutFreeRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/dashboard/national-carbon' }),
        expect.objectContaining({ path: '*' }),
      ]),
    );
    expect(protectedLayoutFreeRoutes).toHaveLength(2);
    expect(
      protectedLayoutFreeRoutes.every((route) => route.wrappers?.includes('@/wrappers/AuthGuard')),
    ).toBe(true);
  });

  it('canonicalizes the user parent and guards every anonymous login-flow leaf', () => {
    const userRoute = routes.find((route) => route.path === '/user');
    const loginFlowRoutes = userRoute?.routes?.filter((route) => route.component);

    expect(userRoute?.routes?.map((route) => route.path)).toEqual([
      '/user',
      '/user/login',
      '/user/login/password_forgot',
      '/user/login/password_reset',
    ]);
    expect(userRoute?.routes?.[0]).toEqual(
      expect.objectContaining({ path: '/user', redirect: '/user/login' }),
    );
    expect(
      loginFlowRoutes?.every(
        (route) => 'wrappers' in route && route.wrappers?.includes('@/wrappers/LoginFlowGuard'),
      ),
    ).toBe(true);
  });
});
