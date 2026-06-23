import routes from '../../../config/routes';

describe('route access config', () => {
  it('protects the national carbon dashboard with admin access', () => {
    const dashboardRoute = routes.find((route) => route.path === '/dashboard/national-carbon');

    expect(dashboardRoute).toMatchObject({
      access: 'canAdmin',
      component: './NationalCarbonDashboard',
      layout: false,
      menu: false,
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
});
