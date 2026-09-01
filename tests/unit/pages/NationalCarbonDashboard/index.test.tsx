import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import NationalCarbonDashboardPage, {
  canViewNationalCarbonDashboard,
} from '@/pages/NationalCarbonDashboard';

let mockInitialState: { currentUser?: { access?: string } } | undefined;
let mockLocale = 'fr-FR';
const mockGetOrganizationContributionSnapshot = jest.fn();

const makeOrganizationScope = (
  datasetScope: 'process' | 'model' | 'all',
  publishedDatasetCount: number,
) => ({
  datasetScope,
  metric: 'latest_published_dataset_count',
  summary: {
    organizationCount: 1,
    publishedDatasetCount,
    pendingReviewDatasetCount: 2,
    publishedLast30DaysCount: 1,
  },
  rankings: [
    {
      rank: 1,
      organizationKey: 'institut exemple',
      organizationName: 'Institut Exemple',
      publishedDatasetCount,
      reviewingDatasetCount: 2,
      contributorCount: 3,
      contributionShare: 0.5,
      latestContributedAt: '2026-09-01T08:00:00+08:00',
    },
  ],
});

const organizationContributionSnapshot = {
  schemaVersion: 'national_carbon_organization_contribution_v1',
  attributionMode: 'current_user_profile',
  generatedAt: '2026-09-01T09:00:00+08:00',
  dataAsOf: '2026-09-01T08:00:00+08:00',
  defaultScope: 'all',
  scopes: {
    process: makeOrganizationScope('process', 3),
    model: makeOrganizationScope('model', 2),
    all: makeOrganizationScope('all', 5),
  },
};

const mockFormatMessage = (
  { defaultMessage, id }: { defaultMessage?: string; id: string },
  values?: Record<string, unknown>,
) => {
  const homeMessages = jest.requireActual('@/locales/fr-FR/pages_home').default;
  const pageMessages = jest.requireActual('@/locales/fr-FR/pages').default;
  const template = homeMessages[id] ?? pageMessages[id] ?? defaultMessage ?? id;
  return Object.entries(values ?? {}).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
};

jest.mock('@umijs/max', () => ({
  FormattedMessage: (props: { defaultMessage?: string; id: string }) => (
    <span>{mockFormatMessage(props)}</span>
  ),
  getLocale: () => mockLocale,
  useIntl: () => ({
    formatMessage: mockFormatMessage,
    locale: mockLocale,
  }),
  useModel: () => ({
    initialState: mockInitialState,
  }),
}));

jest.mock('@/services/nationalCarbonDashboard/api', () => {
  return {
    organizationContributionDatasetScopes: ['process', 'model', 'all'],
    getOrganizationContributionSnapshot: (...args: unknown[]) =>
      mockGetOrganizationContributionSnapshot(...args),
  };
});

jest.mock('pixi.js', () => {
  const createGraphics = () => {
    const graphic: Record<string, any> = {};
    ['ellipse', 'fill', 'lineTo', 'moveTo', 'poly', 'rect', 'removeChildren', 'stroke'].forEach(
      (method) => {
        graphic[method] = jest.fn(() => graphic);
      },
    );
    return graphic;
  };

  return {
    Application: jest.fn().mockImplementation(() => ({
      canvas: global.document.createElement('canvas'),
      destroy: jest.fn(),
      init: jest.fn().mockResolvedValue(undefined),
      stage: { addChild: jest.fn() },
      ticker: { add: jest.fn() },
    })),
    Container: jest.fn().mockImplementation(() => ({ addChild: jest.fn() })),
    Graphics: jest.fn().mockImplementation(createGraphics),
  };
});

jest.mock(
  '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/ProcessFlowGraphPanel',
  () => {
    return function MockProcessFlowGraphPanel() {
      return <div data-testid='process-flow-graph-panel' />;
    };
  },
);

describe('NationalCarbonDashboard access guard', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockLocale = 'fr-FR';
    window.location.hash = '#/dashboard/national-carbon?screen=overview&autoplay=0';
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    mockGetOrganizationContributionSnapshot.mockResolvedValue(organizationContributionSnapshot);
  });

  afterEach(() => {
    mockInitialState = undefined;
    window.location.hash = '';
    global.fetch = originalFetch;
  });

  it('only allows admin users', () => {
    expect(canViewNationalCarbonDashboard({ access: 'admin' } as Auth.CurrentUser)).toBe(true);
    expect(canViewNationalCarbonDashboard({ access: 'user' } as Auth.CurrentUser)).toBe(false);
    expect(canViewNationalCarbonDashboard(undefined)).toBe(false);
  });

  it('renders access denied for non-admin direct visits', () => {
    mockInitialState = { currentUser: { access: 'user' } };

    render(<NationalCarbonDashboardPage />);

    expect(screen.getByTestId('access-denied')).toBeInTheDocument();
    expect(
      screen.getByText('Vous n’êtes pas autorisé à accéder à cette page.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it.each([
    ['overview', 'Volume total de données en développement'],
    ['map_status', 'Détails du statut régional'],
    ['outcome_metrics', 'Résultats cumulés du développement'],
    ['connectivity', 'Taux de bouclage de la chaîne d’approvisionnement'],
  ])('renders the %s view without fixture-language leakage', (view, expectedCopy) => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash = `#/dashboard/national-carbon?screen=${view}&autoplay=0`;

    const { container } = render(<NationalCarbonDashboardPage />);

    expect(screen.getByText(expectedCopy)).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Sélecteur de vue du tableau de bord' }),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it('renders the localized flow-topology view', () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash = '#/dashboard/national-carbon?screen=flow_topology&autoplay=0';

    const { container } = render(<NationalCarbonDashboardPage />);

    expect(screen.getByTestId('process-flow-graph-panel')).toBeInTheDocument();
    expect(screen.getByLabelText(/Vue actuelle : 06 Graphe des flux/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it('renders organization contributions and switches the local scope without another RPC', async () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';

    render(<NationalCarbonDashboardPage />);

    expect((await screen.findAllByText('Institut Exemple')).length).toBe(2);
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(mockGetOrganizationContributionSnapshot).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Processus'));
    await waitFor(() => expect(screen.getAllByText('3').length).toBeGreaterThan(0));
    expect(mockGetOrganizationContributionSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Vue actuelle : 05 Contribution/)).toBeInTheDocument();
  });

  it('uses localized screen labels while autoplay advances the dashboard', () => {
    jest.useFakeTimers();
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash = '#/dashboard/national-carbon?screen=overview';

    render(<NationalCarbonDashboardPage />);

    expect(screen.getByLabelText(/Vue actuelle : 01 Vue d’ensemble/)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByLabelText(/Vue actuelle : 02 Carte de situation/)).toBeInTheDocument();
  });
});
