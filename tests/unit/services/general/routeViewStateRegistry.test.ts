import {
  getRouteViewStateQueryValue,
  getRouteViewStateVariantIds,
  resolveRouteViewState,
} from '@/services/general/routeViewState';

describe('route view state registry', () => {
  it.each([
    ['welcome-view', null, 'overview'],
    ['welcome-view', 'carbon-footprint', 'carbon-footprint-guide'],
    ['dataset-drawer-mode', 'edit', 'edit'],
    ['dataset-drawer-mode', 'view', 'view'],
    ['dataset-required', null, 'optional'],
    ['dataset-required', '1', 'required'],
    ['team-action', null, 'base'],
    ['team-action', 'create', 'create'],
    ['team-action', 'edit', 'edit'],
    ['data-processing-tab', 'builds', 'builds'],
    ['data-processing-tab', 'preview', 'preview'],
    ['data-processing-tab', 'publication', 'publication'],
    ['national-carbon-screen', 'flow_topology', 'flow_topology'],
    ['national-carbon-autoplay', '0', 'disabled'],
  ] as const)('resolves %s %s to %s', (registryId, queryValue, expected) => {
    expect(resolveRouteViewState(registryId, queryValue)).toBe(expected);
  });

  it.each([
    ['welcome-view', 'new-view', 'overview'],
    ['dataset-drawer-mode', 'new-mode', 'edit'],
    ['dataset-required', 'true', 'optional'],
    ['team-action', 'delete', 'base'],
    ['data-processing-tab', 'admin', 'builds'],
    ['national-carbon-screen', 'new-screen', 'overview'],
    ['national-carbon-autoplay', 'yes', 'enabled'],
  ] as const)('fails closed for unknown %s query values', (registryId, queryValue, expected) => {
    expect(resolveRouteViewState(registryId, queryValue)).toBe(expected);
  });

  it('exposes finite ordered variants and exact query values', () => {
    expect(getRouteViewStateVariantIds('team-action')).toEqual(['base', 'create', 'edit']);
    expect(getRouteViewStateQueryValue('welcome-view', 'carbon-footprint-guide')).toBe(
      'carbon-footprint',
    );
    expect(() => getRouteViewStateQueryValue('team-action', 'remove')).toThrow(
      'Unknown team-action route-view variant',
    );
  });

  it('rejects registry identifiers outside the finite contract', () => {
    expect(() => resolveRouteViewState('unknown-registry' as never, null)).toThrow(
      'Unknown route-view state registry: unknown-registry',
    );
  });
});
