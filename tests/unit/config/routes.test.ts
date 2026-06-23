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
});
