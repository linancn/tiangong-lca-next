import type { SupportedAppLocale } from '../../../src/services/general/localeRegistry';

import { APP_LOCALES } from './contracts';

export const RESPONSIVE_SURFACE_SCENARIO = 'responsive-surface-matrix';

export const RESPONSIVE_VIEWPORTS = [
  { height: 900, id: 'desktop', width: 1440 },
  { height: 844, id: 'narrow', width: 390 },
] as const;

export const RESPONSIVE_THEMES = [
  { dark: false, id: 'light' },
  { dark: true, id: 'dark' },
] as const;

export const RESPONSIVE_SURFACE_MATRIX = [
  {
    assertionRoute: '/team',
    containerContract: 'viewport-contained-popup',
    driver: 'responsive-layout.spec.ts',
    id: 'authoring-language-dropdown',
  },
  {
    assertionRoute: '/mydata/processes',
    containerContract: 'operable-internal-horizontal-scroller',
    driver: 'responsive-surfaces.spec.ts',
    id: 'process-data-table',
  },
  {
    assertionRoute: '/welcome',
    containerContract: 'viewport-contained-wrapping-modal',
    driver: 'responsive-surfaces.spec.ts',
    id: 'welcome-data-ecosystem-modal',
  },
  {
    assertionRoute: '/mydata/models',
    containerContract: 'viewport-contained-drawer',
    driver: 'responsive-surfaces.spec.ts',
    id: 'life-cycle-model-drawer',
  },
  {
    assertionRoute: '/mydata/models',
    containerContract: 'accessible-ellipsis-and-operable-pan-zoom',
    driver: 'responsive-surfaces.spec.ts',
    id: 'life-cycle-model-graph-node',
  },
] as const;

export type ResponsiveSurfaceId = (typeof RESPONSIVE_SURFACE_MATRIX)[number]['id'];

export const RESPONSIVE_SURFACE_LOCALES: readonly SupportedAppLocale[] = [...APP_LOCALES];

export function responsiveSurfaceIdsForRoute(route: string): ResponsiveSurfaceId[] {
  return RESPONSIVE_SURFACE_MATRIX.filter(({ assertionRoute }) => assertionRoute === route).map(
    ({ id }) => id,
  );
}

export function assertResponsiveSurfaceClosure(
  route: string,
  observedSurfaceIds: Iterable<ResponsiveSurfaceId>,
): void {
  const expected = responsiveSurfaceIdsForRoute(route).sort();
  const observed = [...new Set(observedSurfaceIds)].sort();
  if (JSON.stringify(observed) !== JSON.stringify(expected)) {
    throw new Error(
      `Responsive surface closure failed for ${route}: expected ${expected.join(', ')}, observed ${observed.join(', ')}.`,
    );
  }
}
