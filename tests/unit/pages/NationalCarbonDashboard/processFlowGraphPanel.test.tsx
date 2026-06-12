import { render, screen } from '@testing-library/react';

const mockLoadProcessFlowGraphFromCache = jest.fn();
const mockLoadProcessFlowGraphGeoMapViewFromCache = jest.fn();
const mockResetProcessFlowGraphCacheLoaderState = jest.fn();
const mockRequestNationalCarbonGraphCacheJobsApi = jest.fn();

jest.mock(
  '@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/processFlowGraphCacheLoader',
  () => ({
    loadProcessFlowGraphFromCache: () => mockLoadProcessFlowGraphFromCache(),
    loadProcessFlowGraphGeoMapViewFromCache: (...args: unknown[]) =>
      mockLoadProcessFlowGraphGeoMapViewFromCache(...args),
    resetProcessFlowGraphCacheLoaderState: () => mockResetProcessFlowGraphCacheLoaderState(),
  }),
);

jest.mock('@/services/nationalCarbonGraphCacheJobs/api', () => ({
  requestNationalCarbonGraphCacheJobsApi: (...args: unknown[]) =>
    mockRequestNationalCarbonGraphCacheJobsApi(...args),
}));

const ProcessFlowGraphPanel =
  require('@/pages/NationalCarbonDashboard/components/ProcessFlowGraph/ProcessFlowGraphPanel').default;

describe('ProcessFlowGraphPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(await screen.findByText('暂无可用数据')).toBeInTheDocument();
    expect(screen.getByText('缓存暂不可用，等待图谱缓存生成后将恢复展示')).toBeInTheDocument();
    expect(
      screen.queryByText(/failed to fetch process-flow graph object/i),
    ).not.toBeInTheDocument();
  });
});
