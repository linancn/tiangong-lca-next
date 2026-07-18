import { render, screen } from '@testing-library/react';

const mockLoadProcessFlowGraphFromCache = jest.fn();
const mockLoadProcessFlowGraphGeoMapViewFromCache = jest.fn();
const mockResetProcessFlowGraphCacheLoaderState = jest.fn();
const mockRequestNationalCarbonGraphCacheJobsApi = jest.fn();
let mockLocale = 'fr-FR';

const mockFormatMessage = (
  { defaultMessage, id }: { defaultMessage?: string; id: string },
  values?: Record<string, unknown>,
) => {
  const messages = jest.requireActual('@/locales/fr-FR/pages_home').default;
  const template = messages[id] ?? defaultMessage ?? id;
  return Object.entries(values ?? {}).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    template,
  );
};

jest.mock('@umijs/max', () => ({
  getLocale: () => mockLocale,
  useIntl: () => ({
    formatMessage: mockFormatMessage,
    locale: mockLocale,
  }),
}));

jest.mock(
  '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/processFlowGraphCacheLoader',
  () => ({
    loadProcessFlowGraphFromCache: () => mockLoadProcessFlowGraphFromCache(),
    loadProcessFlowGraphGeoMapViewFromCache: (...args: unknown[]) =>
      mockLoadProcessFlowGraphGeoMapViewFromCache(...args),
    resetProcessFlowGraphCacheLoaderState: () => mockResetProcessFlowGraphCacheLoaderState(),
  }),
);

jest.mock('@/services/nationalCarbonGraphCache/jobs', () => ({
  requestNationalCarbonGraphCacheJobsApi: (...args: unknown[]) =>
    mockRequestNationalCarbonGraphCacheJobsApi(...args),
}));

const ProcessFlowGraphPanel =
  require('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/ProcessFlowGraphPanel').default;

describe('ProcessFlowGraphPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'fr-FR';
    mockLoadProcessFlowGraphGeoMapViewFromCache.mockResolvedValue(undefined);
    mockRequestNationalCarbonGraphCacheJobsApi.mockResolvedValue({
      data: [],
      status: 200,
    });
  });

  it('shows a localized no-data state when the S3 graph cache is unavailable', async () => {
    mockLoadProcessFlowGraphFromCache.mockRejectedValue(
      new Error('failed to fetch process-flow graph object: 403 https://cache.test/manifest.json'),
    );

    render(<ProcessFlowGraphPanel />);

    expect(await screen.findByText('Aucune donnée disponible')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Le cache est temporairement indisponible. Le graphe réapparaîtra une fois sa génération terminée.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/failed to fetch process-flow graph object/i),
    ).not.toBeInTheDocument();
  });
});
