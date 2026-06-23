import DataProcessing from '@/pages/DataProcessing';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('antd', () => require('../../../mocks/antd').createAntdMock());
jest.mock('@ant-design/pro-components', () =>
  require('../../../mocks/proComponents').createProComponentsMock(),
);
jest.mock('@ant-design/icons', () =>
  require('../../../mocks/antDesignIcons').createAntDesignIconsMock(),
);

const mockGetSystemUserRoleApi = jest.fn();
const mockCreateLciaResultBuildRequest = jest.fn();
const mockPreviewLciaResultPackage = jest.fn();
const mockPublishLciaResultPackage = jest.fn();
const mockUnpublishLciaResultPublication = jest.fn();
const mockRequestWorkerJobsApi = jest.fn();

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getSystemUserRoleApi: (...args: any[]) => mockGetSystemUserRoleApi(...args),
}));

jest.mock('@/services/dataProducts', () => ({
  __esModule: true,
  createLciaResultBuildRequest: (...args: any[]) => mockCreateLciaResultBuildRequest(...args),
  previewLciaResultPackage: (...args: any[]) => mockPreviewLciaResultPackage(...args),
  publishLciaResultPackage: (...args: any[]) => mockPublishLciaResultPackage(...args),
  unpublishLciaResultPublication: (...args: any[]) => mockUnpublishLciaResultPublication(...args),
}));

jest.mock('@/services/workerJobs/api', () => ({
  __esModule: true,
  requestWorkerJobsApi: (...args: any[]) => mockRequestWorkerJobsApi(...args),
}));

describe('DataProcessing page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSystemUserRoleApi.mockResolvedValue({ role: 'data_product_manager' });
    mockCreateLciaResultBuildRequest.mockResolvedValue({
      data: { buildId: 'build-1', workerJobId: 'worker-job-1' },
      error: null,
    });
    mockPreviewLciaResultPackage.mockResolvedValue({
      data: {
        summary: {
          packageId: 'package-1',
          packageVersion: '2026-06-public',
          status: 'preview_ready',
          eligibleInputCount: 10,
          includedInputCount: 10,
        },
      },
      error: null,
    });
    mockPublishLciaResultPackage.mockResolvedValue({
      data: { publicationId: 'publication-1', packageId: 'package-1' },
      error: null,
    });
    mockUnpublishLciaResultPublication.mockResolvedValue({
      data: { publicationId: 'publication-1', status: 'unpublished' },
      error: null,
    });
    mockRequestWorkerJobsApi.mockResolvedValue({
      data: [
        {
          id: 'worker-job-1',
          jobKind: 'lcia_result.package_build',
          subjectId: 'build-1',
          status: 'running',
        },
      ],
      error: null,
      total: 1,
    });
  });

  it('submits build, preview, publish, and unpublish commands for managers', async () => {
    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitFor(() =>
      expect(mockRequestWorkerJobsApi).toHaveBeenCalledWith({
        action: 'list',
        subjectType: 'lcia_result_build',
        limit: 25,
      }),
    );

    fireEvent.change(screen.getByLabelText('Package name'), {
      target: { value: 'June package' },
    });
    fireEvent.change(screen.getByLabelText('Default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create build' }));

    await waitFor(() =>
      expect(mockCreateLciaResultBuildRequest).toHaveBeenCalledWith({
        name: 'June package',
        coverageMode: 'global_eligible',
        defaultImpactCategory: 'climate-change',
        lciaMethodSet: [],
      }),
    );
    expect(await screen.findByTestId('pro-table-cell-id-worker-job-1')).toHaveTextContent(
      'worker-job-1',
    );

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Preview package id'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview package' }));

    await waitFor(() => expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith('package-1'));
    expect(await screen.findByText('2026-06-public')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-publication'));
    const publicationPanel = screen.getByTestId('tab-panel-publication');
    fireEvent.change(within(publicationPanel).getByLabelText('Publish package id'), {
      target: { value: 'package-1' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish reason'), {
      target: { value: 'approve public package' },
    });
    fireEvent.click(within(publicationPanel).getByRole('button', { name: 'Publish package' }));

    await waitFor(() =>
      expect(mockPublishLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-1',
        displayDefaultImpactCategory: 'climate-change',
        reason: 'approve public package',
      }),
    );

    fireEvent.change(within(publicationPanel).getByLabelText('Unpublish publication id'), {
      target: { value: 'publication-1' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Unpublish reason'), {
      target: { value: 'rollback package' },
    });
    fireEvent.click(
      within(publicationPanel).getByRole('button', { name: 'Unpublish publication' }),
    );

    await waitFor(() =>
      expect(mockUnpublishLciaResultPublication).toHaveBeenCalledWith({
        publicationId: 'publication-1',
        reason: 'rollback package',
      }),
    );
  });

  it('handles command errors and sparse payload fallbacks for managers', async () => {
    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'job list failed' },
    });
    mockCreateLciaResultBuildRequest.mockResolvedValueOnce({
      data: null,
      error: {},
    });
    mockPreviewLciaResultPackage.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    mockPreviewLciaResultPackage.mockResolvedValueOnce({
      data: null,
      error: { message: 'preview failed' },
    });
    mockPublishLciaResultPackage.mockResolvedValueOnce({
      data: null,
      error: { message: 'publish failed' },
    });
    mockUnpublishLciaResultPublication.mockResolvedValueOnce({
      data: 'unpublished',
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitFor(() => expect(mockRequestWorkerJobsApi).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('pro-table-empty')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Package name'), {
      target: { value: 'Sparse package' },
    });
    fireEvent.change(screen.getByLabelText('Coverage mode'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create build' }));

    await waitFor(() =>
      expect(mockCreateLciaResultBuildRequest).toHaveBeenCalledWith({
        name: 'Sparse package',
        coverageMode: 'global_eligible',
        lciaMethodSet: [],
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Command failed');

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Preview package id'), {
      target: { value: 'package-sparse' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview package' }));

    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith('package-sparse'),
    );
    expect(await screen.findAllByText('-')).toHaveLength(5);

    fireEvent.change(screen.getByLabelText('Preview package id'), {
      target: { value: 'package-error' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview package' }));

    await waitFor(() => expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith('package-error'));
    expect(await screen.findByRole('alert')).toHaveTextContent('preview failed');
    expect(screen.queryByTestId('descriptions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-publication'));
    const publicationPanel = screen.getByTestId('tab-panel-publication');
    fireEvent.change(within(publicationPanel).getByLabelText('Publish package id'), {
      target: { value: 'package-sparse' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.click(within(publicationPanel).getByRole('button', { name: 'Publish package' }));

    await waitFor(() =>
      expect(mockPublishLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-sparse',
        displayDefaultImpactCategory: 'climate-change',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('publish failed');

    fireEvent.change(within(publicationPanel).getByLabelText('Unpublish publication id'), {
      target: { value: 'publication-sparse' },
    });
    fireEvent.click(
      within(publicationPanel).getByRole('button', { name: 'Unpublish publication' }),
    );

    await waitFor(() =>
      expect(mockUnpublishLciaResultPublication).toHaveBeenCalledWith({
        publicationId: 'publication-sparse',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('unpublished');
  });

  it('renders access denied for non-manager users', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ role: 'member' });

    render(<DataProcessing />);

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });

  it('renders access denied when role lookup fails', async () => {
    mockGetSystemUserRoleApi.mockRejectedValueOnce(new Error('role lookup failed'));

    render(<DataProcessing />);

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });
});
