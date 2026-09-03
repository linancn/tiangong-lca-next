import { act, fireEvent, render, screen, within } from '@testing-library/react';

import NationalCarbonDashboardPage, {
  canViewNationalCarbonDashboard,
} from '@/pages/NationalCarbonDashboard';

let mockInitialState: { currentUser?: { access?: string } } | undefined;
let mockLocale = 'fr-FR';
const mockGetOrganizationContributionSnapshot = jest.fn();

const makeOrganizationStatistics = (publishedDatasetCount: number) => ({
  summary: {
    organizationCount: 1,
    publishedDatasetCount,
    pendingReviewDatasetCount: 2,
    reviewerCount: 7,
  },
  rankings: [
    {
      rank: 1,
      organizationKey: 'institut exemple',
      organizationName: 'Institut Exemple',
      publishedDatasetCount,
      assignedReviewerDatasetCount: 1,
      unassignedReviewerDatasetCount: 1,
    },
  ],
});

const dailyActivityDays = Array.from({ length: 366 }, (_, index) => {
  const date = new Date(Date.UTC(2025, 8, 1 + index)).toISOString().slice(0, 10);
  const processCount = index === 0 ? 3 : 0;
  return { date, processCount };
});

const organizationContributionSnapshot = {
  schemaVersion: 'national_carbon_organization_contribution_v5',
  datasetScope: 'process',
  attributionMode: 'current_user_profile',
  generatedAt: '2026-09-01T09:00:00+08:00',
  dataAsOf: '2026-09-01T08:00:00+08:00',
  dailyActivity: {
    metric: 'dataset_version_activity_count',
    deduplicationKey: ['datasetType', 'datasetId', 'version', 'date'],
    timezone: 'Asia/Shanghai',
    startDate: '2025-09-01',
    endDate: '2026-09-01',
    days: dailyActivityDays,
  },
  ...makeOrganizationStatistics(3),
  organizations: makeOrganizationStatistics(3).rankings,
  regions: {
    metric: 'latest_open_process_count',
    totalProcessCount: 5,
    items: [
      { locationCode: 'CN', processCount: 2 },
      { locationCode: 'UNKNOWN', processCount: 1 },
    ],
    globalProcessCount: 1,
    unassignedProcessCount: 1,
  },
};

const mockFormatMessage = (
  { defaultMessage, id }: { defaultMessage?: string; id: string },
  values?: Record<string, unknown>,
) => {
  const homeMessages =
    mockLocale === 'zh-CN'
      ? jest.requireActual('@/locales/zh-CN/pages_home').default
      : jest.requireActual('@/locales/fr-FR/pages_home').default;
  const pageMessages =
    mockLocale === 'zh-CN'
      ? jest.requireActual('@/locales/zh-CN/pages').default
      : jest.requireActual('@/locales/fr-FR/pages').default;
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
    getOrganizationContributionSnapshot: (...args: unknown[]) =>
      mockGetOrganizationContributionSnapshot(...args),
  };
});

jest.mock('@/services/locations/api', () => ({
  getILCDLocationByValues: jest
    .fn()
    .mockResolvedValue({ success: true, data: [{ '@value': 'CN', '#text': 'Chine' }] }),
}));

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
    jest.useRealTimers();
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

  it('renders only process statistics with regions and review experts, without a scope toggle', async () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';

    render(<NationalCarbonDashboardPage />);

    expect((await screen.findAllByText('Institut Exemple')).length).toBe(2);
    expect(screen.getByText('Activité quotidienne des données')).toBeInTheDocument();
    expect(screen.getByTestId('organization-daily-activity')).toBeInTheDocument();
    expect(screen.getByText('Activité sur un an').nextSibling).toHaveTextContent('3');
    expect(screen.queryByText('Création quotidienne de données')).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/3 versions de processus créées ou mises à jour pour la dernière fois/),
    ).toHaveAttribute('data-count', '3');
    expect(mockGetOrganizationContributionSnapshot).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('button', { name: 'Tout' })).not.toBeInTheDocument();
    expect(screen.getByText('Experts évaluateurs').nextSibling).toHaveTextContent('7');
    expect(await screen.findByText('Chine')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText('Monde (GLO)')).toBeInTheDocument();
    expect(screen.getByText('Lieu non renseigné')).toBeInTheDocument();
    expect(mockGetOrganizationContributionSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Vue actuelle : 05 Contribution/)).toBeInTheDocument();
    expect(screen.queryByText('Progression de la base TianGong')).not.toBeInTheDocument();
    expect(screen.queryByText(/Méthode : les contributions/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actualiser les données' }),
    ).not.toBeInTheDocument();
  });

  it('paginates all organizations locally, including review-only and zero-data organizations', async () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';
    const organizations = Array.from({ length: 23 }, (_, index) => ({
      ...organizationContributionSnapshot.organizations[0],
      rank: index + 1,
      organizationKey: `unit-${index}`,
      organizationName: `Unit ${index + 1}`,
      publishedDatasetCount: index > 9 ? 0 : 3,
    }));
    mockGetOrganizationContributionSnapshot.mockResolvedValueOnce({
      ...organizationContributionSnapshot,
      organizations,
    });
    render(<NationalCarbonDashboardPage />);
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Unit 10')).toBeInTheDocument();
    expect(within(table).queryByText('Unit 11')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('2'));
    expect(within(table).getByText('Unit 11')).toBeInTheDocument();
    expect(within(table).queryByText('Unit 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('3'));
    expect(within(table).getByText('Unit 23')).toBeInTheDocument();
    expect(mockGetOrganizationContributionSnapshot).toHaveBeenCalledTimes(1);
  });

  it('uses the reviewing-data label in Chinese', async () => {
    mockLocale = 'zh-CN';
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';

    render(<NationalCarbonDashboardPage />);

    expect(await screen.findByText('审核中数据')).toBeInTheDocument();
    expect(screen.getByText('单位数据填报情况')).toBeInTheDocument();
    expect(screen.getByText('已分配审核员')).toBeInTheDocument();
    expect(screen.getByText('待分配审核员')).toBeInTheDocument();
    expect(screen.queryByText('待审核数据')).not.toBeInTheDocument();
    expect(screen.queryByText('贡献者')).not.toBeInTheDocument();
    expect(screen.queryByText('占比')).not.toBeInTheDocument();
    expect(screen.queryByText('最近贡献')).not.toBeInTheDocument();
  });

  it('renders the enhanced empty state in both contribution panels', async () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';
    mockGetOrganizationContributionSnapshot.mockResolvedValueOnce({
      ...organizationContributionSnapshot,
      rankings: [],
      organizations: [],
      regions: {
        ...organizationContributionSnapshot.regions,
        totalProcessCount: 0,
        items: [],
        globalProcessCount: 0,
        unassignedProcessCount: 0,
      },
    });

    render(<NationalCarbonDashboardPage />);

    expect(await screen.findAllByTestId('organization-empty-state')).toHaveLength(3);
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.getAllByText('Aucune donnée')).toHaveLength(3);
  });

  it('renders the enhanced organization loading state', () => {
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash =
      '#/dashboard/national-carbon?screen=organization_contribution&autoplay=0';
    mockGetOrganizationContributionSnapshot.mockImplementationOnce(() => new Promise(() => {}));

    render(<NationalCarbonDashboardPage />);

    expect(screen.getByTestId('organization-loading-state')).toHaveAttribute(
      'aria-label',
      'Agrégation des contributions des organisations…',
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('stops autoplay on organization contributions while keeping manual navigation available', () => {
    jest.useFakeTimers();
    mockInitialState = { currentUser: { access: 'admin' } };
    window.location.hash = '#/dashboard/national-carbon?screen=connectivity';

    render(<NationalCarbonDashboardPage />);

    expect(screen.getByLabelText(/Vue actuelle : 04 Calculabilité/)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByLabelText(/Vue actuelle : 05 Contribution/)).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(18_000));
    expect(screen.getByLabelText(/Vue actuelle : 05 Contribution/)).toBeInTheDocument();
    expect(screen.queryByTestId('process-flow-graph-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Graphe des flux'));
    expect(screen.getByTestId('process-flow-graph-panel')).toBeInTheDocument();
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
