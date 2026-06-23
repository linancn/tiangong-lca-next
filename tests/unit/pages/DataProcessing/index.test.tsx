import DataProcessing, {
  buildImpactCategoryOptions,
  resolveLocalizedText,
} from '@/pages/DataProcessing';
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
const mockFetch = jest.fn();
let mockLocale: string | undefined = 'en-US';

const mockMessages: Record<string, Record<string, string>> = {
  'zh-CN': {
    'pages.dataProcessing.title': '数据处理',
    'pages.dataProcessing.tabs.builds': '构建请求',
    'pages.dataProcessing.tabs.preview': '包预览',
    'pages.dataProcessing.tabs.publication': '发布',
    'pages.dataProcessing.form.packageName': '包名称',
    'pages.dataProcessing.form.coverageMode': '覆盖范围',
    'pages.dataProcessing.form.defaultImpactCategory': '默认影响类别',
    'pages.dataProcessing.form.publishDefaultImpactCategory': '发布默认影响类别',
    'pages.dataProcessing.form.previewPackageId': '预览包 ID',
    'pages.dataProcessing.form.publishPackageId': '发布包 ID',
    'pages.dataProcessing.form.publishReason': '发布原因',
    'pages.dataProcessing.form.unpublishPublicationId': '下架发布 ID',
    'pages.dataProcessing.form.unpublishReason': '下架原因',
    'pages.dataProcessing.action.createBuild': '创建构建',
    'pages.dataProcessing.action.previewPackage': '预览包',
    'pages.dataProcessing.action.publishPackage': '发布包',
    'pages.dataProcessing.action.unpublishPublication': '下架发布',
    'pages.dataProcessing.jobs.title': '包构建任务',
    'pages.dataProcessing.jobs.empty': '暂无包构建任务',
    'pages.dataProcessing.jobs.refresh': '刷新任务',
    'pages.dataProcessing.jobs.build': '构建',
    'pages.dataProcessing.jobs.updatedAt': '更新时间',
  },
};

const mockFormatMessage = ({ id, defaultMessage }: { id?: string; defaultMessage?: string }) =>
  (id && mockLocale ? mockMessages[mockLocale]?.[id] : undefined) ?? defaultMessage ?? id ?? '';

const mockLciaMethodList = {
  files: [
    {
      id: 'climate-change',
      version: '01.00.000',
      description: [
        { '@xml:lang': 'en', '#text': 'Climate change' },
        { '@xml:lang': 'zh', '#text': '气候变化' },
      ],
      referenceQuantity: {
        'common:shortDescription': {
          '@xml:lang': 'en',
          '#text': 'kg CO2 eq',
        },
      },
    },
    {
      id: 'acidification',
      version: '01.00.000',
      description: [
        { '@xml:lang': 'en', '#text': 'Acidification' },
        { '@xml:lang': 'zh', '#text': '酸化' },
      ],
      referenceQuantity: {
        'common:shortDescription': {
          '@xml:lang': 'en',
          '#text': 'mol H+ eq',
        },
      },
    },
  ],
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: mockFormatMessage,
    locale: mockLocale,
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
    mockLocale = 'en-US';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockLciaMethodList,
    });
    global.fetch = mockFetch as any;
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
          phase: 'materializing',
          progress: 35,
          updatedAt: '2026-06-23T10:00:00Z',
        },
      ],
      error: null,
      total: 1,
    });
  });

  it('normalizes localized impact category option metadata', () => {
    expect(resolveLocalizedText('String label', 'en-US')).toBe('String label');
    expect(
      resolveLocalizedText(
        [
          null,
          { '@xml:lang': 'fr', '#text': 'Changement climatique' },
          { '@xml:lang': 'en', '#text': 'Climate fallback' },
        ],
        'zh-CN',
      ),
    ).toBe('Climate fallback');
    expect(resolveLocalizedText([{ '@xml:lang': 'fr', '#text': 'Acidification' }], 'en-US')).toBe(
      'Acidification',
    );
    expect(resolveLocalizedText([{}], 'en-US')).toBe('');
    expect(resolveLocalizedText(['raw fallback'], 'en-US')).toBe('');
    expect(resolveLocalizedText({}, 'en-US')).toBe('');
    expect(resolveLocalizedText(undefined, 'en-US')).toBe('');

    expect(buildImpactCategoryOptions({}, 'en-US')).toEqual([]);
    expect(
      buildImpactCategoryOptions(
        {
          files: [
            { description: 'Missing id' },
            { id: 'fallback-name' },
            {
              id: 'string-name',
              description: 'String name',
              version: '01.00.000',
              referenceQuantity: {
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'kg eq' }],
              },
            },
          ],
        },
        'en-US',
      ),
    ).toEqual([
      { value: 'fallback-name', label: 'fallback-name' },
      { value: 'string-name', label: 'String name (01.00.000 / kg eq)' },
    ]);
  });

  it('submits build, preview, publish, and unpublish commands for managers', async () => {
    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    expect(await screen.findByLabelText('Default impact category')).toHaveTextContent(
      'Climate change',
    );
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
    expect(await screen.findByTestId('data-product-job-worker-job-1')).toHaveTextContent(
      'worker-job-1',
    );
    expect(screen.getByTestId('data-product-job-worker-job-1')).toHaveTextContent('running');
    expect(screen.getByTestId('data-product-job-worker-job-1')).toHaveTextContent('materializing');

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

  it('summarizes successful build responses without rendering the raw worker payload', async () => {
    mockCreateLciaResultBuildRequest.mockResolvedValueOnce({
      data: {
        buildId: 'build-with-large-payload',
        workerJobId: 'worker-job-with-large-payload',
        workerJob: {
          payload: {
            input_manifest: {
              processes: [{ id: 'process-from-raw-manifest', version: '01.01.000' }],
            },
          },
        },
      },
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.change(screen.getByLabelText('Package name'), {
      target: { value: 'Large payload package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create build' }));

    expect(await screen.findByText('Build request submitted')).toBeInTheDocument();
    expect(screen.getByText('build-with-large-payload')).toBeInTheDocument();
    expect(screen.getByText('worker-job-with-large-payload')).toBeInTheDocument();
    expect(screen.queryByText(/input_manifest/)).not.toBeInTheDocument();
    expect(screen.queryByText(/process-from-raw-manifest/)).not.toBeInTheDocument();
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
    expect(screen.getByTestId('data-product-jobs-empty')).toHaveTextContent(
      'No package build jobs',
    );

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
    expect(await screen.findByText('Command failed')).toBeInTheDocument();

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
    expect(await screen.findByText('preview failed')).toBeInTheDocument();
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
    expect(await screen.findByText('publish failed')).toBeInTheDocument();

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
    expect(await screen.findByText('unpublished')).toBeInTheDocument();
  });

  it('handles failed method metadata loading and sparse worker jobs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: [
        {
          jobKind: 'lcia_result.package_build',
          status: 'failed',
          progress: 'not-a-number',
          errorMessage: 'job failed',
        },
      ],
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/lciamethods/list.json'));
    expect(screen.getByLabelText('Default impact category')).not.toHaveTextContent(
      'Climate change',
    );
    expect(screen.getByTestId('data-product-job-job-0')).toHaveTextContent('Build: -');
    expect(screen.getByTestId('data-product-job-job-0')).toHaveTextContent('Updated at: -');
    expect(screen.getByText('job failed')).toBeInTheDocument();
  });

  it('surfaces thrown command errors and falls back when locale is unavailable', async () => {
    mockLocale = undefined;
    mockPreviewLciaResultPackage.mockRejectedValueOnce('plain preview failure');
    mockCreateLciaResultBuildRequest.mockRejectedValueOnce(new Error('build exploded'));

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.change(screen.getByLabelText('Package name'), {
      target: { value: 'Throwing package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create build' }));

    expect(await screen.findByText('build exploded')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Preview package id'), {
      target: { value: 'package-throw' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview package' }));

    expect(await screen.findByText('plain preview failure')).toBeInTheDocument();
  });

  it('renders access denied for non-manager users', async () => {
    mockGetSystemUserRoleApi.mockResolvedValueOnce({ role: 'member' });

    render(<DataProcessing />);

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });

  it('renders localized Chinese workbench copy and impact category labels', async () => {
    mockLocale = 'zh-CN';

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('数据处理');
    expect(screen.getByTestId('tab-builds')).toHaveTextContent('构建请求');
    expect(screen.getByTestId('tab-preview')).toHaveTextContent('包预览');
    expect(screen.getByTestId('tab-publication')).toHaveTextContent('发布');
    expect(screen.getByLabelText('默认影响类别')).toHaveTextContent('气候变化');
    expect(screen.getByRole('button', { name: '创建构建' })).toBeInTheDocument();
  });

  it('renders access denied when role lookup fails', async () => {
    mockGetSystemUserRoleApi.mockRejectedValueOnce(new Error('role lookup failed'));

    render(<DataProcessing />);

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });
});
