import DataProcessing, {
  buildImpactCategoryOptions,
  createSubmittedBuildTask,
  firstNumberText,
  formatArtifactByteSize,
  formatNumericValue,
  formatTimestamp,
  packageCountLabel,
  packageOptionsFromTaskSummaries,
  parseDataProcessingDeepLink,
  resolveLocalizedText,
  stateCodeCountsFromProcesses,
  stateCodeCountsFromScope,
  stateCodeFromProcess,
  statusIconFromValue,
  statusToneFromValue,
  stringifyCommandData,
} from '@/pages/DataProcessing';
import { CONTENT_LANGUAGE_REGISTRY } from '@/services/general/contentLanguageRegistry';
import { LOCALE_CAPABILITY_MATRIX } from '@/services/general/localeCapabilities';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

jest.mock('antd', () => require('../../../mocks/antd').createAntdMock());
jest.mock('@ant-design/pro-components', () =>
  require('../../../mocks/proComponents').createProComponentsMock(),
);
jest.mock('@ant-design/icons', () =>
  require('../../../mocks/antDesignIcons').createAntDesignIconsMock(),
);
jest.mock('@/pages/DataProcessing/CalculationBundlePanel', () => ({
  __esModule: true,
  default: ({ packageId }: any) => <div data-testid='calculation-bundle-panel'>{packageId}</div>,
}));
jest.mock('@/components/LcaReleaseReadPanel', () => ({
  __esModule: true,
  default: ({ processId }: any) => <div data-testid='release-read-panel'>{processId}</div>,
}));

const mockGetSystemUserRoleApi = jest.fn();
const mockCreateLciaResultBuildRequest = jest.fn();
const mockPreviewLciaResultPackage = jest.fn();
const mockPublishLciaResultPackage = jest.fn();
const mockUnpublishLciaResultPublication = jest.fn();
const mockListLciaResultPublications = jest.fn();
const mockRequestWorkerJobsApi = jest.fn();
const mockGetClosureCheck = jest.fn();
const mockListClosureCheckIssues = jest.fn();
const mockCreateClosureReportDownload = jest.fn();
const mockCreateClosureCheck = jest.fn();
const taskListeners = new Set<() => void>();
let mockDataProductTasks: any[] = [];
const mockRefreshDataProductTasks = jest.fn(async () => mockDataProductTasks);
const mockListDataProductTasks = jest.fn(() => mockDataProductTasks);
const mockSubscribeDataProductTasks = jest.fn((listener: () => void) => {
  taskListeners.add(listener);
  return () => taskListeners.delete(listener);
});
const mockUpsertDataProductTasks = jest.fn((rows: any[]) => {
  const byId = new Map(mockDataProductTasks.map((task) => [task.jobId, task]));
  rows.forEach((task) => byId.set(task.jobId, task));
  mockDataProductTasks = [...byId.values()];
  taskListeners.forEach((listener) => listener());
});
const mockFetch = jest.fn();
let mockLocale: string | undefined = 'en-US';
let mockLocation = { pathname: '/data-processing', search: '' };
const mockHistoryReplace = jest.fn();

const mockMessages: Record<string, Record<string, string>> = {
  'zh-CN': {
    'pages.dataProcessing.title': '数据处理',
    'pages.dataProcessing.tabs.builds': '结果生成',
    'pages.dataProcessing.tabs.preview': '结果预览',
    'pages.dataProcessing.tabs.publication': '发布',
    'pages.dataProcessing.form.packageName': '结果集名称',
    'pages.dataProcessing.form.coverageMode': '覆盖范围',
    'pages.dataProcessing.form.defaultImpactCategory': '默认影响类别',
    'pages.dataProcessing.form.publishDefaultImpactCategory': '发布默认影响类别',
    'pages.dataProcessing.form.previewPackageId': '选择结果集',
    'pages.dataProcessing.form.publishPackageId': '发布结果集',
    'pages.dataProcessing.form.publishReason': '发布原因',
    'pages.dataProcessing.form.unpublishPublicationId': '下架发布 ID',
    'pages.dataProcessing.form.unpublishReason': '下架原因',
    'pages.dataProcessing.action.createBuild': '生成结果集',
    'pages.dataProcessing.action.previewPackage': '预览结果集',
    'pages.dataProcessing.action.publishPackage': '发布结果集',
    'pages.dataProcessing.action.unpublishPublication': '下架发布',
    'pages.dataProcessing.jobs.title': '结果生成任务',
    'pages.dataProcessing.jobs.empty': '暂无结果生成任务',
    'pages.dataProcessing.jobs.refresh': '刷新任务',
    'pages.dataProcessing.jobs.build': '生成',
    'pages.dataProcessing.jobs.updatedAt': '更新时间',
    'pages.dataProcessing.preview.stateCode': '状态码',
    'pages.dataProcessing.publications.title': '发布管理',
    'pages.dataProcessing.publications.refresh': '刷新发布',
    'pages.dataProcessing.publications.empty': '暂无已发布结果集',
    'pages.dataProcessing.publications.current': '当前',
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
  history: { replace: (...args: any[]) => Reflect.apply(mockHistoryReplace, undefined, args) },
  useIntl: () => ({
    formatMessage: mockFormatMessage,
    locale: mockLocale,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getSystemUserRoleApi: (...args: any[]) =>
    Reflect.apply(mockGetSystemUserRoleApi, undefined, args),
}));

jest.mock('@/services/dataProducts', () => ({
  __esModule: true,
  createLciaResultBuildRequest: (...args: any[]) =>
    Reflect.apply(mockCreateLciaResultBuildRequest, undefined, args),
  previewLciaResultPackage: (...args: any[]) =>
    Reflect.apply(mockPreviewLciaResultPackage, undefined, args),
  publishLciaResultPackage: (...args: any[]) =>
    Reflect.apply(mockPublishLciaResultPackage, undefined, args),
  unpublishLciaResultPublication: (...args: any[]) =>
    Reflect.apply(mockUnpublishLciaResultPublication, undefined, args),
  listLciaResultPublications: (...args: any[]) =>
    Reflect.apply(mockListLciaResultPublications, undefined, args),
  getClosureCheck: (...args: any[]) => Reflect.apply(mockGetClosureCheck, undefined, args),
  listClosureCheckIssues: (...args: any[]) =>
    Reflect.apply(mockListClosureCheckIssues, undefined, args),
  createClosureCheck: (...args: any[]) => Reflect.apply(mockCreateClosureCheck, undefined, args),
  createClosureReportDownload: (...args: any[]) =>
    Reflect.apply(mockCreateClosureReportDownload, undefined, args),
  refreshDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockRefreshDataProductTasks, undefined, args),
  listDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockListDataProductTasks, undefined, args),
  subscribeDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockSubscribeDataProductTasks, undefined, args),
  upsertDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockUpsertDataProductTasks, undefined, args),
}));

jest.mock('@/services/dataProducts/taskCenter', () => ({
  __esModule: true,
  refreshDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockRefreshDataProductTasks, undefined, args),
  listDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockListDataProductTasks, undefined, args),
  subscribeDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockSubscribeDataProductTasks, undefined, args),
  upsertDataProductTasks: (...args: any[]) =>
    Reflect.apply(mockUpsertDataProductTasks, undefined, args),
}));

jest.mock('@/services/workerJobs/api', () => ({
  __esModule: true,
  requestWorkerJobsApi: (...args: any[]) =>
    Reflect.apply(mockRequestWorkerJobsApi, undefined, args),
}));

describe('DataProcessing page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'en-US';
    mockLocation = { pathname: '/data-processing', search: '?closureCheckId=closure-valid' };
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
    mockListLciaResultPublications.mockResolvedValue({
      data: [],
      error: null,
    });
    mockGetClosureCheck.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-check.v1',
        closureCheckId: 'closure-valid',
        runStatus: 'passed',
        certificateValidity: 'valid',
        scanCompleteness: 'complete',
        requestedScopeHash: 'scope-hash-valid',
        policyFingerprint: 'policy-valid',
      },
      error: null,
    });
    mockCreateClosureCheck.mockResolvedValue({
      data: {
        closureCheckId: 'closure-new',
        requestedScopeHash: 'scope-hash-new',
        policyFingerprint: 'policy-new',
        workerJob: { jobId: 'closure-worker-new', status: 'queued' },
        reused: false,
      },
      error: null,
    });
    mockCreateClosureReportDownload.mockResolvedValue({ data: null, error: null });
    mockListClosureCheckIssues.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-issues-page.v1',
        closureCheckId: 'closure-valid',
        issues: [],
      },
      error: null,
    });
    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-1',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'running',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: '',
        phase: 'materializing',
        progressFraction: 0.35,
        capabilities: {
          canCancel: true,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: false,
        },
      },
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-ready',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'completed',
        domainStatus: 'preview_ready',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:05:00Z',
        title: 'Ready package',
        resultPackageId: 'package-1',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: true,
        },
      },
    ];
    (URL as any).createObjectURL = jest.fn(() => 'blob:mock-export');
    (URL as any).revokeObjectURL = jest.fn();
    HTMLAnchorElement.prototype.click = jest.fn();
  });

  async function waitForValidCertificate() {
    await waitFor(() => expect(mockGetClosureCheck).toHaveBeenCalledWith('closure-valid'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generate result set' })).not.toBeDisabled(),
    );
  }

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

    const registryLocalizedValue = CONTENT_LANGUAGE_REGISTRY.map(({ languageCode }) => ({
      '@xml:lang': languageCode,
      '#text': `label-${languageCode}`,
    }));
    for (const { appLocale, contentLanguage } of LOCALE_CAPABILITY_MATRIX) {
      if (!contentLanguage) {
        throw new Error(`Missing content capability for ${appLocale}.`);
      }
      expect(resolveLocalizedText(registryLocalizedValue, appLocale)).toBe(
        `label-${contentLanguage}`,
      );
    }
    expect(
      resolveLocalizedText(
        [
          { '@xml:lang': 'fr', '#text': '   ' },
          { '@xml:lang': 'en', '#text': 'English fallback after blank French' },
          { '@xml:lang': 'zh', '#text': '中文备选' },
        ],
        'fr-FR',
      ),
    ).toBe('English fallback after blank French');
    expect(
      resolveLocalizedText(
        [
          { '@xml:lang': 'fr', '#text': '' },
          { '@xml:lang': 'ja', '#text': 'First non-blank legacy fallback' },
        ],
        'fr-FR',
      ),
    ).toBe('First non-blank legacy fallback');

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

  it('covers data-processing display helper fallbacks', () => {
    expect(parseDataProcessingDeepLink('')).toEqual({
      activeTabKey: 'builds',
      packageId: undefined,
      processId: undefined,
      processVersion: undefined,
    });
    expect(
      parseDataProcessingDeepLink(
        '?tab=publication&packageId=package-1&processId=process-1&processVersion=01.00.000',
      ),
    ).toEqual({
      activeTabKey: 'publication',
      packageId: 'package-1',
      processId: 'process-1',
      processVersion: '01.00.000',
    });
    expect(parseDataProcessingDeepLink('?tab=preview').activeTabKey).toBe('preview');
    expect(parseDataProcessingDeepLink('?tab=unknown&packageId=%20').activeTabKey).toBe('builds');

    expect(stringifyCommandData(null)).toBe('-');
    expect(stringifyCommandData('plain')).toBe('plain');
    expect(stringifyCommandData({ value: '<quoted>' })).toBe('{"value":"<quoted>"}');

    expect(statusToneFromValue('blocked')).toBe('warning');
    expect(statusToneFromValue('cancelled')).toBe('default');
    expect(statusToneFromValue('preview_ready')).toBe('success');
    expect(statusToneFromValue({})).toBe('default');
    expect(statusIconFromValue('blocked')).toBeTruthy();
    expect(statusIconFromValue('unpublished')).toBeTruthy();
    expect(statusIconFromValue('unknown-status')).toBeTruthy();

    expect(firstNumberText(undefined, null, Number.NaN, '')).toBeUndefined();
    expect(firstNumberText(0)).toBe('0');
    expect(firstNumberText('100')).toBe('100');

    expect(
      packageCountLabel({ value: 'a', label: 'A', packageId: 'a', includedInputCount: '2' }),
    ).toBe('2');
    expect(
      packageCountLabel({ value: 'b', label: 'B', packageId: 'b', eligibleInputCount: '3' }),
    ).toBe('3');
    expect(packageCountLabel({ value: 'c', label: 'C', packageId: 'c' })).toBeUndefined();
    expect(
      packageCountLabel({
        value: 'd',
        label: 'D',
        packageId: 'd',
        includedInputCount: '2',
        eligibleInputCount: '4',
      }),
    ).toBe('2/4');

    expect(stateCodeFromProcess(null)).toBe('-');
    expect(stateCodeFromProcess({ state_code: 101 })).toBe('101');
    expect(
      stateCodeCountsFromProcesses([
        { stateCode: 100 },
        { state_code: '101' },
        null,
        { stateCode: 100 },
      ]),
    ).toEqual([
      { stateCode: '-', count: 1 },
      { stateCode: '100', count: 2 },
      { stateCode: '101', count: 1 },
    ]);
    expect(
      stateCodeCountsFromScope([
        { count: 1 },
        { state_code: 100, count: '2' },
        { stateCode: '101', count: 1 },
        { stateCode: '102', count: 'not-a-number' },
      ]),
    ).toEqual([
      { stateCode: '-', count: 1 },
      { stateCode: '100', count: 2 },
      { stateCode: '101', count: 1 },
    ]);

    expect(formatArtifactByteSize(-1)).toBe('-');
    expect(formatArtifactByteSize(512)).toBe('512 B');
    expect(formatArtifactByteSize(1536)).toBe('1.5 KB');
    expect(formatArtifactByteSize(2 * 1024 * 1024)).toBe('2.00 MB');
    expect(formatNumericValue('bad')).toBe('-');
    expect(formatNumericValue('12.5')).toBe('12.5');
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp('2026-06-24T09:10:11Z')).toBe('2026-06-24 09:10');
    expect(formatTimestamp('not-iso')).toBe('not-iso');
  });

  it('normalizes a locally submitted safe build task before the feed observes it', () => {
    expect(createSubmittedBuildTask(null)).toBeNull();
    expect(createSubmittedBuildTask({ workerJobId: 'worker-without-build' })).not.toHaveProperty(
      'deepLink',
    );
    expect(
      createSubmittedBuildTask({ workerJobId: 'worker-safe', buildId: 'build-safe' }),
    ).toMatchObject({
      jobId: 'worker-safe',
      jobKind: 'lcia_result.package_build',
      workerStatus: 'queued',
    });
    expect(
      packageOptionsFromTaskSummaries([
        {
          schemaVersion: 'task-summary.v2',
          jobId: 'safe-ready',
          jobKind: 'lcia_result.package_build',
          category: 'data_product',
          workerStatus: 'completed',
          domainValidity: 'none',
          projectionUpdatedAt: '2026-06-23T10:00:00Z',
          title: 'Safe package',
          resultPackageId: 'package-safe',
          capabilities: {
            canCancel: false,
            canDownloadReport: false,
            canOpenWorkbench: true,
            canPreviewResult: true,
          },
        },
      ] as any),
    ).toEqual([expect.objectContaining({ packageId: 'package-safe' })]);
    expect(
      packageOptionsFromTaskSummaries([
        {
          schemaVersion: 'task-summary.v2',
          jobId: 'safe-ready-fallback',
          jobKind: 'lcia_result.package_build',
          category: 'data_product',
          workerStatus: 'completed',
          domainValidity: 'none',
          projectionUpdatedAt: '2026-06-23T10:00:00Z',
          title: '',
          resultPackageId: 'package-fallback',
          capabilities: {},
        },
      ] as any),
    ).toEqual([expect.objectContaining({ label: 'package-fallback' })]);
  });

  it('submits build, preview, publish, and unpublish commands for managers', async () => {
    mockLocation = { pathname: '/data-processing', search: '' };
    mockGetClosureCheck.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-check.v1',
        closureCheckId: 'closure-new',
        runStatus: 'passed',
        certificateValidity: 'valid',
        scanCompleteness: 'complete',
        requestedScopeHash: 'scope-hash-new',
        policyFingerprint: 'policy-new',
      },
      error: null,
    });
    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    expect(await screen.findByLabelText('Default impact category')).toHaveTextContent(
      'Climate change',
    );
    expect(mockRefreshDataProductTasks).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'June package' },
    });
    fireEvent.change(screen.getByLabelText('Default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check data completeness' }));
    await waitFor(() =>
      expect(mockCreateClosureCheck).toHaveBeenCalledWith({
        requestedScope: {
          coverageMode: 'global_eligible',
          lciaMethods: ['climate-change'],
        },
        requestIdempotencyToken: expect.any(String),
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generate result set' })).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    await waitFor(() =>
      expect(mockCreateLciaResultBuildRequest).toHaveBeenCalledWith({
        name: 'June package',
        coverageMode: 'global_eligible',
        defaultImpactCategory: 'climate-change',
        lciaMethodSet: [],
        closureCheckId: 'closure-new',
        requestedScopeHash: 'scope-hash-new',
        policyFingerprint: 'policy-new',
      }),
    );
    const runningJob = await screen.findByTestId('data-product-job-worker-job-1');
    expect(within(runningJob).getByLabelText('queued')).toBeInTheDocument();
    expect(runningJob).not.toHaveTextContent('queued');
    expect(runningJob).not.toHaveTextContent('worker-job-1');
    expect(runningJob).not.toHaveTextContent('build-1');

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-1',
        rowOffset: 0,
        rowLimit: 25,
      }),
    );
    expect(await screen.findByText('2026-06-public')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-publication'));
    const publicationPanel = screen.getByTestId('tab-panel-publication');
    fireEvent.change(within(publicationPanel).getByLabelText('Publish result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish reason'), {
      target: { value: 'approve public package' },
    });
    fireEvent.click(within(publicationPanel).getByRole('button', { name: 'Publish result set' }));

    await waitFor(() =>
      expect(mockPublishLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-1',
        displayDefaultImpactCategory: 'climate-change',
        reason: 'approve public package',
      }),
    );

    mockListLciaResultPublications.mockResolvedValueOnce({
      data: [
        {
          publicationId: 'publication-1',
          packageId: 'package-1',
          packageName: 'June package',
          packageVersion: '2026-06-public',
          status: 'published',
          isCurrent: true,
          displayDefaultImpactCategory: 'climate-change',
          publishedAt: '2026-06-24T09:00:00Z',
        },
      ],
      error: null,
    });
    fireEvent.click(within(publicationPanel).getByRole('button', { name: 'Refresh publications' }));
    const publicationRow = await screen.findByTestId('data-product-publication-publication-1');
    expect(publicationRow).toHaveTextContent('June package');
    expect(publicationRow).toHaveTextContent('2026-06-public');
    expect(publicationRow).toHaveTextContent('Current');
    expect(within(publicationRow).getByLabelText('published')).toBeInTheDocument();
    const unpublishButton = within(publicationRow).getByRole('button', {
      name: 'Unpublish publication',
    });
    expect(unpublishButton).not.toHaveTextContent('Unpublish publication');
    fireEvent.click(unpublishButton);

    await waitFor(() =>
      expect(mockUnpublishLciaResultPublication).toHaveBeenCalledWith({
        publicationId: 'publication-1',
      }),
    );
  });

  it('hydrates typed hash tabs and preserves other deep-link parameters when tabs change', async () => {
    mockLocation = {
      pathname: '/data-processing',
      search: '?tab=preview&packageId=package-1',
    };

    render(<DataProcessing />);

    expect(await screen.findByTestId('tab-panel-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('tab-publication'));
    expect(mockHistoryReplace).toHaveBeenCalledWith({
      pathname: '/data-processing',
      search: '?tab=publication&packageId=package-1',
    });
    await waitFor(() => expect(mockListLciaResultPublications).toHaveBeenCalledWith({ limit: 50 }));
    await waitFor(() =>
      expect(
        within(screen.getByTestId('tab-panel-publication')).getByRole('button', {
          name: 'Refresh publications',
        }),
      ).toHaveAttribute('data-loading', 'false'),
    );
  });

  it('keeps generation blocked until a complete valid closure check succeeds', async () => {
    mockGetClosureCheck.mockReset();
    mockGetClosureCheck.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-check.v1',
        closureCheckId: 'closure-blocked',
        runStatus: 'blocked',
        certificateValidity: 'unavailable',
        scanCompleteness: 'complete',
        blockerCodes: ['missing_provider', 'missing_reference'],
      },
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    expect(screen.getByRole('button', { name: 'Generate result set' })).toBeDisabled();
    expect(await screen.findByText('blocked')).toBeInTheDocument();
    expect(screen.getByText('2 blockers')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate result set' })).toBeDisabled();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });

  it.each(['current_release_required', 'closure_evidence_unavailable'])(
    'maps %s as an execution prerequisite and revokes the displayed certificate',
    async (code) => {
      mockCreateClosureCheck.mockResolvedValueOnce({
        data: null,
        error: { code, message: 'untrusted raw error' },
      });

      render(<DataProcessing />);
      await waitForValidCertificate();
      expect(screen.getByRole('button', { name: 'Generate result set' })).not.toBeDisabled();

      // The lightweight Form mock validates every registered field even when
      // validateFields(names) is used, so satisfy the unrelated build name too.
      fireEvent.change(screen.getByLabelText('Result set name'), {
        target: { value: 'certificate preflight' },
      });
      fireEvent.change(screen.getByLabelText('Default impact category'), {
        target: { value: 'climate-change' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Check data completeness' }));

      expect(
        await screen.findByText(
          'The current public release or snapshot is unavailable; a certificate cannot be issued.',
        ),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Generate result set' })).toBeDisabled(),
      );
      expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
    },
  );

  it('loads closure issues by stable issue id without putting issue details in the task feed', async () => {
    mockListClosureCheckIssues
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'lcia.scope-closure-issues-page.v1',
          closureCheckId: 'closure-valid',
          issues: [
            {
              issueId: 'issue-1',
              severity: 'blocking',
              blocking: true,
              code: 'missing_provider',
              title: 'Missing provider',
              summary: 'A required provider is unavailable.',
              suggestedAction: 'Publish or select a provider.',
              occurrenceCount: 1,
              affectedRootCount: 1,
            },
          ],
          nextCursor: 'cursor-2',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          schemaVersion: 'lcia.scope-closure-issues-page.v1',
          closureCheckId: 'closure-valid',
          issues: [
            {
              issueId: 'issue-1',
              severity: 'blocking',
              blocking: true,
              code: 'missing_provider',
              title: 'Missing provider',
              occurrenceCount: 1,
              affectedRootCount: 1,
            },
            {
              issueId: 'issue-2',
              severity: 'warning',
              blocking: false,
              code: 'version_ambiguous',
              title: 'Version ambiguity',
              occurrenceCount: 1,
              affectedRootCount: 1,
            },
          ],
        },
        error: null,
      });

    render(<DataProcessing />);

    expect(await screen.findByTestId('closure-issue-issue-1')).toHaveTextContent(
      'Missing provider',
    );
    expect(screen.getByText('Publish or select a provider.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more issues' }));
    expect(await screen.findByTestId('closure-issue-issue-2')).toHaveTextContent(
      'Version ambiguity',
    );
    expect(screen.getAllByTestId('closure-issue-issue-1')).toHaveLength(1);
    expect(mockListClosureCheckIssues).toHaveBeenLastCalledWith('closure-valid', {
      afterIssueId: 'cursor-2',
      limit: 50,
    });
  });

  it('shows an empty closure-issue state without blocking task history rendering', async () => {
    render(<DataProcessing />);
    expect(await screen.findByText('No closure issues found.')).toBeInTheDocument();
    expect(screen.getByTestId('data-product-job-worker-job-1')).toBeInTheDocument();
  });

  it('shows a closure-issue loading error without blocking task history rendering', async () => {
    mockListClosureCheckIssues.mockResolvedValueOnce({
      data: null,
      error: { message: 'issue page failed' },
    });
    render(<DataProcessing />);
    expect(await screen.findByText('issue page failed')).toBeInTheDocument();
    expect(screen.getByTestId('data-product-job-worker-job-1')).toBeInTheDocument();
  });

  it('uses the closure-issue fallback when the page is unavailable without an error detail', async () => {
    mockListClosureCheckIssues.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    render(<DataProcessing />);
    expect(await screen.findByText('Unable to load issues.')).toBeInTheDocument();
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
    await waitForValidCertificate();
    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'Large payload package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    expect(await screen.findByText('Result generation request submitted')).toBeInTheDocument();
    const successAlert = screen.getByRole('alert');
    expect(within(successAlert).getByText('build-with-large-payload')).toBeInTheDocument();
    expect(within(successAlert).getByText('worker-job-with-large-payload')).toBeInTheDocument();
    expect(screen.queryByText(/input_manifest/)).not.toBeInTheDocument();
    expect(screen.queryByText(/process-from-raw-manifest/)).not.toBeInTheDocument();
  });

  it('keeps a newly submitted build visible when the refreshed task feed is still empty', async () => {
    mockDataProductTasks = [];
    mockCreateLciaResultBuildRequest.mockResolvedValueOnce({
      data: {
        buildId: 'build-pending-after-submit',
        workerJobId: 'worker-job-pending-after-submit',
      },
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitForValidCertificate();
    await waitFor(() => expect(mockRefreshDataProductTasks).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('data-product-jobs-empty')).toHaveTextContent(
      'No result generation tasks',
    );

    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'Pending package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    expect(await screen.findByText('Result generation request submitted')).toBeInTheDocument();
    await waitFor(() => expect(mockRefreshDataProductTasks).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('data-product-jobs-empty')).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('data-product-job-worker-job-pending-after-submit')).getByLabelText(
        'queued',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('data-product-job-worker-job-pending-after-submit'),
    ).not.toHaveTextContent('queued');
    expect(
      screen.getByTestId('data-product-job-worker-job-pending-after-submit'),
    ).not.toHaveTextContent('worker-job-pending-after-submit');
    expect(screen.getByText('Waiting for worker processing')).toBeInTheDocument();
  });

  it('previews packages directly from completed safe task summaries', async () => {
    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-ready',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'completed',
        domainStatus: 'preview_ready',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: 'June public result set',
        resultPackageId: 'package-ready',
        progressCounters: { completed: 2037, total: 2037 },
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: true,
        },
      },
    ];

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitForValidCertificate();
    const readyJob = await screen.findByTestId('data-product-job-worker-job-ready');
    expect(readyJob).toHaveTextContent('June public result set');
    expect(readyJob).toHaveTextContent('2037');
    expect(within(readyJob).getByLabelText('completed')).toBeInTheDocument();
    expect(readyJob).not.toHaveTextContent('completed');
    expect(readyJob).not.toHaveTextContent('worker-job-ready');
    expect(readyJob).not.toHaveTextContent('build-ready');
    expect(readyJob).not.toHaveTextContent('lcia_result.package_build');
    expect(readyJob).not.toHaveTextContent('package-ready');

    const previewButton = within(readyJob).getByRole('button', { name: 'Preview result set' });
    expect(previewButton).not.toHaveTextContent('Preview result set');
    fireEvent.click(previewButton);

    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-ready',
        rowOffset: 0,
        rowLimit: 25,
      }),
    );
    expect(screen.getByTestId('tab-panel-preview')).toBeInTheDocument();
  });

  it('shows projection titles and only server-curated failure summaries', async () => {
    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-ready',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'completed',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: 'June public result set',
        resultPackageId: 'package-ready',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: true,
        },
      },
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-failed-log',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'failed',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:01:00Z',
        title: 'Failed June result set',
        errorSummary: 'The selected data scope is not calculable.',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: false,
        },
      },
    ];

    render(<DataProcessing />);

    const readyJob = await screen.findByTestId('data-product-job-worker-job-ready');
    expect(readyJob).toHaveTextContent('June public result set');
    expect(readyJob).not.toHaveTextContent('package-ready');

    const failedJob = await screen.findByTestId('data-product-job-worker-job-failed-log');
    expect(failedJob).toHaveTextContent('Failed June result set');
    const failedStatus = within(failedJob).getByLabelText('failed');
    expect(failedStatus).toHaveAttribute(
      'title',
      expect.stringContaining('The selected data scope is not calculable.'),
    );
  });

  it('renders preview input scope and artifact verification details', async () => {
    mockPreviewLciaResultPackage
      .mockResolvedValueOnce({
        data: {
          summary: {
            packageId: 'package-1',
            packageVersion: '2026-06-public',
            status: 'preview_ready',
            coverageMode: 'global_eligible',
            inputManifestHash: 'input-hash-1',
            defaultImpactCategory: 'climate-change',
            eligibleInputCount: 2,
            includedInputCount: 2,
            availableImpactCategories: ['climate-change', 'acidification'],
          },
          inputManifest: {
            selectionMode: 'all_eligible',
            predicateVersion: 'published-state-code-100-199:latest-per-id:v1',
          },
          inputScope: {
            processCount: 2,
            selectionMode: 'all_eligible',
            predicateVersion: 'published-state-code-100-199:latest-per-id:v1',
            stateCodeCounts: [
              { stateCode: '100', count: 1 },
              { stateCode: '101', count: 1 },
            ],
          },
          detailPage: {
            status: 'ready',
            impactCategoryId: 'climate-change',
            impactKey: 'climate-change',
            impactIndex: 0,
            impactName: 'Climate change',
            impactVersion: '01.00.000',
            unit: 'kg CO2 eq',
            offset: 0,
            limit: 25,
            returnedCount: 2,
            totalCount: 2,
            omittedInputCount: 0,
            rows: [
              {
                rowNumber: 1,
                processId: 'process-a',
                processVersion: '01.00.000',
                processName: 'Portland cement production',
                processIndex: 0,
                stateCode: 100,
                impactCategoryId: 'climate-change',
                impactKey: 'climate-change',
                impactIndex: 0,
                impactName: 'Climate change',
                impactVersion: '01.00.000',
                unit: 'unknown',
                value: 12.5,
              },
              {
                rowNumber: 2,
                processId: 'process-b',
                processVersion: '01.00.001',
                processName: 'Electricity, medium voltage',
                processIndex: 1,
                stateCode: 101,
                impactCategoryId: 'climate-change',
                impactKey: 'climate-change',
                impactIndex: 0,
                impactName: 'Climate change',
                impactVersion: '01.00.000',
                unit: 'unknown',
                value: -0.45,
              },
            ],
          },
          previewWarnings: [
            {
              code: 'preview_impact_metadata_lookup_failed',
              detail: 'optional LCIA method metadata fallback',
            },
          ],
          queryArtifact: {
            artifactFormat: 'all-unit-query:v1',
            artifactByteSize: 831250,
            artifactSha256: 'query-sha-256',
          },
          resultArtifact: {
            artifactFormat: 'hdf5:v1',
            artifactByteSize: 1054768,
            artifactSha256: 'result-sha-256',
          },
          artifactManifest: {
            artifactManifestVersion: 'lcia-result-package-worker.v1',
            resultDiagnostics: {
              storage: 'object_storage',
              persist_mode: 's3-strict',
            },
            snapshotBuilder: {
              resolved_snapshot_id: 'snapshot-resolved',
              stdout_tail:
                '[matrix] process_count=2 flow_count=3 impact_count=25 a_nnz=4 b_nnz=5 c_nnz=6\n[coverage] unique_match=9.15 any_match=35.44 singular_risk=medium',
            },
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          detailPage: {
            status: 'ready',
            impactCategoryId: 'climate-change',
            impactKey: 'climate-change',
            impactName: 'Climate change',
            impactVersion: '01.00.000',
            unit: 'kg CO2 eq',
            offset: 0,
            limit: 100,
            returnedCount: 2,
            totalCount: 2,
            rows: [
              {
                rowNumber: 1,
                processId: 'process-a',
                processName: 'Portland cement production',
                processVersion: '01.00.000',
                stateCode: 100,
                value: 12.5,
              },
              {
                rowNumber: 2,
                processId: 'process-b',
                processName: 'Electricity, medium voltage',
                processVersion: '01.00.001',
                stateCode: 101,
                value: -0.45,
              },
            ],
          },
        },
        error: null,
      });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitForValidCertificate();
    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    expect(await screen.findByText('Input scope')).toBeInTheDocument();
    expect(screen.getByText('published-state-code-100-199:latest-per-id:v1')).toBeInTheDocument();
    expect(screen.getByText('100: 1')).toBeInTheDocument();
    expect(screen.getByText('101: 1')).toBeInTheDocument();
    expect(screen.queryByText('process-a@01.00.000')).not.toBeInTheDocument();
    expect(screen.queryByText('process-b@01.00.001')).not.toBeInTheDocument();
    expect(screen.queryByText('Input data')).not.toBeInTheDocument();
    expect(screen.queryByText('Calculation results')).not.toBeInTheDocument();
    expect(screen.getByText('Result details')).toBeInTheDocument();
    const processLink = screen.getByRole('link', { name: 'Portland cement production' });
    expect(processLink).toHaveAttribute(
      'href',
      '/mydata/processes?id=process-a&version=01.00.000&mode=view',
    );
    expect(screen.getByText('Electricity, medium voltage')).toBeInTheDocument();
    expect(screen.queryByText('process-a')).not.toBeInTheDocument();
    expect(screen.queryByText('process-b')).not.toBeInTheDocument();
    expect(screen.getByText('Climate change (01.00.000 / kg CO2 eq)')).toBeInTheDocument();
    expect(screen.getAllByText('01.00.000')).not.toHaveLength(0);
    expect(screen.queryByRole('columnheader', { name: 'LCIA method' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Method version' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Unit' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Value (kg CO2 eq)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeInTheDocument();
    expect(screen.queryByText('Some preview data could not be loaded')).not.toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('-0.45')).toBeInTheDocument();
    expect(screen.getByText('Artifact verification')).toBeInTheDocument();
    expect(screen.getByText('all-unit-query:v1')).toBeInTheDocument();
    expect(screen.getByText('hdf5:v1')).toBeInTheDocument();
    expect(screen.getByText('query-sha-256')).toBeInTheDocument();
    expect(screen.getByText('result-sha-256')).toBeInTheDocument();
    expect(screen.getByText('object_storage / s3-strict')).toBeInTheDocument();
    expect(screen.getByText('snapshot-resolved')).toBeInTheDocument();
    expect(screen.getByText('process_count=2 flow_count=3 impact_count=25')).toBeInTheDocument();
    expect(
      screen.getByText('unique_match=9.15 any_match=35.44 singular_risk=medium'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
        packageId: 'package-1',
        impactCategoryId: 'climate-change',
        rowOffset: 0,
        rowLimit: 100,
      }),
    );
    expect(URL.createObjectURL).toHaveBeenCalled();
    const exportedBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    const exportedHtml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportedBlob);
    });
    expect(exportedHtml).toContain('<th>Process UUID</th>');
    expect(exportedHtml).toContain('<td>process-a</td>');
    expect(exportedHtml).toContain('<td>process-b</td>');
  });

  it('paginates preview details, switches impact categories, and renders preview warnings', async () => {
    const previewPayload = (offset: number, returnedCount = 25) => ({
      data: {
        summary: {
          packageId: 'package-1',
          packageVersion: '2026-06-public',
          status: 'preview_ready',
          defaultImpactCategory: 'climate-change',
        },
        detailPage: {
          status: 'ready',
          impactCategoryId: 'climate-change',
          impactName: 'Climate change',
          impactVersion: '01.00.000',
          unit: 'kg CO2 eq',
          offset,
          limit: 25,
          returnedCount,
          totalCount: 60,
          rows: [
            {
              rowNumber: offset + 1,
              processId: 'process-without-version',
              processName: 'Process without version',
              stateCode: 100,
              value: 1.5,
            },
            {
              rowNumber: offset + 2,
              processId: 'process-without-name',
              stateCode: 100,
              value: 2.5,
            },
            {
              rowNumber: offset + 3,
              stateCode: 100,
              value: 3.5,
            },
          ],
        },
        impactOptions: [
          {
            impactCategoryId: 'climate-change',
            impactName: 'Climate change',
            impactVersion: '01.00.000',
            unit: 'kg CO2 eq',
          },
          {
            impactCategoryId: 'acidification',
            impactName: 'Acidification',
            impactVersion: '01.00.000',
            unit: 'mol H+ eq',
          },
          {
            impactName: 'Impact without id',
          },
          {
            impactCategoryId: 'no-suffix-impact',
            impactName: 'No suffix impact',
          },
          {
            impactCategoryId: 'suffix-without-local-label',
            impactName: 'Suffix without local label',
            impactVersion: '99.00.000',
            unit: 'points',
          },
        ],
        previewWarnings: [{ code: 'partial_process_name_lookup_failed' }],
      },
      error: null,
    });
    mockPreviewLciaResultPackage
      .mockResolvedValueOnce(previewPayload(25))
      .mockResolvedValueOnce(previewPayload(50, 10))
      .mockResolvedValueOnce(previewPayload(25))
      .mockResolvedValueOnce({
        data: {
          ...previewPayload(0).data,
          detailPage: {
            ...previewPayload(0).data.detailPage,
            impactCategoryId: 'acidification',
            unit: 'mol H+ eq',
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ...previewPayload(0).data,
          detailPage: {
            ...previewPayload(0).data.detailPage,
            impactCategoryId: 'no-suffix-impact',
            unit: undefined,
          },
        },
        error: null,
      });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    expect(await screen.findByText('Some preview data could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('Process without version')).toBeInTheDocument();
    expect(screen.getByText('process-without-name')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Process without version' })).not.toBeInTheDocument();
    expect(screen.getByText('26-50 / 60')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
        packageId: 'package-1',
        impactCategoryId: 'climate-change',
        rowOffset: 50,
        rowLimit: 25,
      }),
    );
    expect(await screen.findByText('51-60 / 60')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
        packageId: 'package-1',
        impactCategoryId: 'climate-change',
        rowOffset: 25,
        rowLimit: 25,
      }),
    );

    fireEvent.change(screen.getByLabelText('LCIA method'), {
      target: { value: 'acidification' },
    });
    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
        packageId: 'package-1',
        impactCategoryId: 'acidification',
        rowOffset: 0,
        rowLimit: 25,
      }),
    );
    expect(
      await screen.findByRole('columnheader', { name: 'Value (mol H+ eq)' }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('LCIA method'), {
      target: { value: 'no-suffix-impact' },
    });
    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
        packageId: 'package-1',
        impactCategoryId: 'no-suffix-impact',
        rowOffset: 0,
        rowLimit: 25,
      }),
    );
  });

  it('shows an error when preview detail export fails', async () => {
    mockPreviewLciaResultPackage
      .mockResolvedValueOnce({
        data: {
          summary: {
            packageId: 'package-1',
            packageVersion: '2026-06-public',
            status: 'preview_ready',
            defaultImpactCategory: 'climate-change',
          },
          detailPage: {
            status: 'ready',
            impactCategoryId: 'climate-change',
            unit: 'kg CO2 eq',
            offset: 0,
            limit: 25,
            returnedCount: 1,
            totalCount: 1,
            rows: [
              {
                rowNumber: 1,
                processId: 'process-a',
                processVersion: '01.00.000',
                processName: 'Process A',
                stateCode: 100,
                value: 1,
              },
            ],
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: {},
      });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));
    expect(await screen.findByText('Process A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(await screen.findByText('Failed to export result details')).toBeInTheDocument();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('exports an empty preview page when the export query returns no rows', async () => {
    mockPreviewLciaResultPackage
      .mockResolvedValueOnce({
        data: {
          summary: {
            packageId: 'package-1',
            packageVersion: '2026-06-public',
            status: 'preview_ready',
          },
          detailPage: {
            status: 'ready',
            offset: 0,
            limit: 25,
            returnedCount: 0,
            totalCount: 0,
            rows: [],
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          detailPage: {
            status: 'ready',
            offset: 0,
            limit: 100,
            totalCount: 0,
            rows: [
              {
                rowNumber: 1,
                stateCode: undefined,
                value: 'not-a-number',
              },
            ],
          },
        },
        error: null,
      });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));
    expect(await screen.findByText('0-0 / 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    const exportedBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    const exportedHtml = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(exportedBlob);
    });
    expect(exportedHtml).toContain('<td>1</td>');
    expect(exportedHtml.match(/<td>-<\/td>/g)?.length).toBeGreaterThanOrEqual(4);
    expect(mockPreviewLciaResultPackage).toHaveBeenLastCalledWith({
      packageId: 'package-1',
      rowOffset: 0,
      rowLimit: 100,
    });

    mockPreviewLciaResultPackage.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
  });

  it('uses local impact labels without version suffixes in preview details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        files: [{ id: 'plain-impact', description: 'Plain impact' }],
      }),
    });
    mockPreviewLciaResultPackage.mockResolvedValueOnce({
      data: {
        summary: {
          packageId: 'package-1',
          packageVersion: '2026-06-public',
          status: 'preview_ready',
        },
        detailPage: {
          status: 'ready',
          impactCategoryId: 'plain-impact',
          offset: 0,
          limit: 25,
          returnedCount: 1,
          totalCount: 1,
          rows: [
            {
              rowNumber: 1,
              processId: 'process-a',
              processVersion: '01.00.000',
              processName: 'Process A',
              stateCode: 100,
              value: 1,
            },
          ],
        },
      },
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await screen.findByText('Plain impact');
    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    expect(await screen.findByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
  });

  it('handles command errors and sparse payload fallbacks for managers', async () => {
    mockDataProductTasks = [];
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
    await waitForValidCertificate();
    await waitFor(() => expect(mockRefreshDataProductTasks).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('data-product-jobs-empty')).toHaveTextContent(
      'No result generation tasks',
    );

    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'Sparse package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    await waitFor(() =>
      expect(mockCreateLciaResultBuildRequest).toHaveBeenCalledWith({
        name: 'Sparse package',
        coverageMode: 'global_eligible',
        lciaMethodSet: [],
        closureCheckId: 'closure-valid',
        requestedScopeHash: 'scope-hash-valid',
        policyFingerprint: 'policy-valid',
      }),
    );
    expect(await screen.findByText('Command failed')).toBeInTheDocument();

    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-ready-after-error',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'completed',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: 'Preview-ready package',
        resultPackageId: 'package-1',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: true,
        },
      },
    ];
    await act(async () => {
      taskListeners.forEach((listener) => listener());
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh jobs' }));
    await waitFor(() => expect(mockRefreshDataProductTasks).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    await waitFor(() =>
      expect(mockPreviewLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-1',
        rowOffset: 0,
        rowLimit: 25,
      }),
    );
    expect(await screen.findByText('Result set overview')).toBeInTheDocument();
    expect(screen.getByText('Input scope')).toBeInTheDocument();
    expect(screen.getByText('Artifact verification')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(5);

    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    await waitFor(() => expect(mockPreviewLciaResultPackage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('preview failed')).toBeInTheDocument();
    expect(screen.queryByTestId('descriptions')).not.toBeInTheDocument();

    mockListLciaResultPublications.mockResolvedValueOnce({
      data: [
        {
          publicationId: 'publication-sparse',
          packageId: 'package-1',
          packageName: 'Sparse package',
          packageVersion: '2026-06-public',
          status: 'current',
          isCurrent: true,
        },
        {
          packageId: 'package-without-publication-id',
          packageName: 'Unpublished package',
          packageVersion: '2026-06-old',
          status: 'unpublished',
        },
        {
          packageName: 'Publication without package id',
          packageVersion: '2026-05-old',
          status: 'unpublished',
        },
      ],
      error: null,
    });
    fireEvent.click(screen.getByTestId('tab-publication'));
    const publicationPanel = screen.getByTestId('tab-panel-publication');
    fireEvent.change(within(publicationPanel).getByLabelText('Publish result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.change(within(publicationPanel).getByLabelText('Publish default impact category'), {
      target: { value: 'climate-change' },
    });
    fireEvent.click(within(publicationPanel).getByRole('button', { name: 'Publish result set' }));

    await waitFor(() =>
      expect(mockPublishLciaResultPackage).toHaveBeenCalledWith({
        packageId: 'package-1',
        displayDefaultImpactCategory: 'climate-change',
      }),
    );
    expect(await screen.findByText('publish failed')).toBeInTheDocument();

    const publicationRow = await screen.findByTestId('data-product-publication-publication-sparse');
    expect(await screen.findByTestId('data-product-publication-1')).toHaveTextContent(
      'Unpublished package',
    );
    fireEvent.click(within(publicationRow).getByRole('button', { name: 'Unpublish publication' }));

    await waitFor(() =>
      expect(mockUnpublishLciaResultPublication).toHaveBeenCalledWith({
        publicationId: 'publication-sparse',
      }),
    );
    expect(await screen.findByText('unpublished')).toBeInTheDocument();
  });

  it('handles failed method metadata loading and sparse task summaries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'job-0',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'failed',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: 'Result set generation',
        errorSummary: 'job failed',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: false,
        },
      },
    ];

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/lciamethods/list.json'));
    expect(screen.getByLabelText('Default impact category')).not.toHaveTextContent(
      'Climate change',
    );
    expect(screen.getByTestId('data-product-job-job-0')).toHaveTextContent('Result set generation');
    expect(
      within(screen.getByTestId('data-product-job-job-0')).getByLabelText('failed'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('data-product-job-job-0')).not.toHaveTextContent('failed');
    expect(
      within(screen.getByTestId('data-product-job-job-0')).getByLabelText('failed'),
    ).toHaveAttribute('title', expect.stringContaining('job failed'));
  });

  it('renders only the safe failure summaries carried by task projections', async () => {
    mockDataProductTasks = [
      {
        schemaVersion: 'task-summary.v2',
        jobId: 'worker-job-failed-log',
        jobKind: 'lcia_result.package_build',
        category: 'data_product',
        workerStatus: 'failed',
        domainValidity: 'none',
        projectionUpdatedAt: '2026-06-23T10:00:00Z',
        title: 'Result generation',
        errorSummary: 'The selected process is outside the calculable input scope.',
        capabilities: {
          canCancel: false,
          canDownloadReport: false,
          canOpenWorkbench: true,
          canPreviewResult: false,
        },
      },
    ];

    render(<DataProcessing />);

    const job = await screen.findByTestId('data-product-job-worker-job-failed-log');
    expect(within(job).getByLabelText('failed')).toHaveAttribute(
      'title',
      expect.stringContaining('The selected process is outside the calculable input scope.'),
    );
  });

  it('lists current publications first and unpublishes from the management list', async () => {
    mockListLciaResultPublications.mockResolvedValueOnce({
      data: [
        {
          publicationId: 'publication-old',
          packageId: 'package-old',
          packageName: 'May result set',
          packageVersion: '2026-05-public',
          status: 'unpublished',
          isCurrent: false,
          displayDefaultImpactCategory: 'acidification',
          publishedAt: '2026-05-20T09:00:00Z',
          unpublishedAt: '2026-06-01T09:00:00Z',
        },
        {
          publicationId: 'publication-current',
          packageId: 'package-current',
          packageName: 'June result set',
          packageVersion: '2026-06-public',
          status: 'published',
          isCurrent: true,
          displayDefaultImpactCategory: 'climate-change',
          publishedAt: '2026-06-24T09:00:00Z',
        },
      ],
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-publication'));

    await waitFor(() => expect(mockListLciaResultPublications).toHaveBeenCalledWith({ limit: 50 }));
    const currentRow = await screen.findByTestId('data-product-publication-publication-current');
    const oldRow = screen.getByTestId('data-product-publication-publication-old');
    expect(currentRow.compareDocumentPosition(oldRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(currentRow).toHaveTextContent('June result set');
    expect(currentRow).toHaveTextContent('2026-06-public');
    expect(currentRow).toHaveTextContent('Current');
    expect(currentRow).toHaveTextContent('Climate change');
    expect(within(currentRow).getByLabelText('published')).toBeInTheDocument();
    expect(currentRow).not.toHaveTextContent('published');
    expect(oldRow).toHaveTextContent('May result set');
    expect(within(oldRow).getByLabelText('unpublished')).toBeInTheDocument();
    expect(oldRow).not.toHaveTextContent('unpublished');
    expect(oldRow).not.toHaveTextContent('Current');

    const unpublishButton = within(currentRow).getByRole('button', {
      name: 'Unpublish publication',
    });
    expect(unpublishButton).not.toHaveTextContent('Unpublish publication');
    fireEvent.click(unpublishButton);

    await waitFor(() =>
      expect(mockUnpublishLciaResultPublication).toHaveBeenCalledWith({
        publicationId: 'publication-current',
      }),
    );
  });

  it('renders sparse publication rows without exposing an unavailable unpublish action', async () => {
    mockListLciaResultPublications.mockResolvedValueOnce({
      data: [
        {
          packageId: 'package-only',
          status: 'unpublished',
          isCurrent: false,
          includedInputCount: 4,
          displayDefaultImpactCategory: 'unknown-impact',
        },
        {
          publicationId: 'publication-with-eligible-only',
          packageVersion: '2026-06-public',
          status: 'blocked',
          eligibleInputCount: 6,
          unpublishedAt: '2026-06-24T08:30:00Z',
        },
        {
          publicationId: 'publication-empty',
        },
      ],
      error: { message: 'publication list warning' },
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-publication'));

    expect(await screen.findByText('publication list warning')).toBeInTheDocument();
    const packageOnlyRow = await screen.findByTestId('data-product-publication-1');
    expect(packageOnlyRow).toHaveTextContent('package-only');
    expect(packageOnlyRow).toHaveTextContent('unknown-impact');
    expect(packageOnlyRow).toHaveTextContent('4/-');
    expect(
      within(packageOnlyRow).queryByRole('button', { name: 'Unpublish publication' }),
    ).toBeNull();

    const eligibleOnlyRow = await screen.findByTestId(
      'data-product-publication-publication-with-eligible-only',
    );
    expect(eligibleOnlyRow).toHaveTextContent('2026-06-public');
    expect(eligibleOnlyRow).toHaveTextContent('-/6');
    expect(eligibleOnlyRow).toHaveTextContent('-');
    expect(within(eligibleOnlyRow).getByLabelText('blocked')).toBeInTheDocument();

    const emptyRow = await screen.findByTestId('data-product-publication-publication-empty');
    expect(emptyRow).toHaveTextContent('-');
    expect(within(emptyRow).getByLabelText('-')).toBeInTheDocument();
  });

  it('renders an empty publication list when the response omits data rows', async () => {
    mockListLciaResultPublications.mockResolvedValueOnce({
      data: undefined,
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    fireEvent.click(screen.getByTestId('tab-publication'));

    expect(await screen.findByTestId('data-product-publications-empty')).toHaveTextContent(
      'No publications yet',
    );
  });

  it('surfaces thrown command errors and falls back when locale is unavailable', async () => {
    mockLocale = undefined;
    mockPreviewLciaResultPackage.mockReset();
    mockPreviewLciaResultPackage.mockRejectedValueOnce('plain preview failure');
    mockCreateLciaResultBuildRequest.mockRejectedValueOnce(new Error('build exploded'));

    render(<DataProcessing />);

    expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
    await waitForValidCertificate();
    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'Throwing package' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    expect(await screen.findByText('build exploded')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('tab-preview'));
    fireEvent.change(screen.getByLabelText('Select result set'), {
      target: { value: 'package-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview result set' }));

    expect(await screen.findByText('plain preview failure')).toBeInTheDocument();
  });

  it('surfaces non-Error task refresh failures and rejects a certificate without binding hashes', async () => {
    mockRefreshDataProductTasks.mockRejectedValueOnce('task feed unavailable');
    mockGetClosureCheck.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-check.v1',
        closureCheckId: 'closure-valid',
        runStatus: 'passed',
        certificateValidity: 'valid',
        scanCompleteness: 'complete',
      },
      error: null,
    });

    render(<DataProcessing />);

    expect(await screen.findByText('task feed unavailable')).toBeInTheDocument();
    mockRefreshDataProductTasks.mockRejectedValueOnce(new Error('task feed exploded'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh jobs' }));
    expect(await screen.findByText('task feed exploded')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Generate result set' })).not.toBeDisabled(),
    );
    fireEvent.change(screen.getByLabelText('Result set name'), {
      target: { value: 'Unbound certificate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));

    expect(
      await screen.findByText(
        'Run a complete data check for the current selection before generating a result set.',
      ),
    ).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });

  it.each([
    [{ message: 'closure summary failed' }, 'closure summary failed'],
    [null, 'Command failed'],
  ])(
    'surfaces an unavailable post-create closure summary',
    async (summaryError, expectedMessage) => {
      mockLocation = { pathname: '/data-processing', search: '' };
      mockGetClosureCheck.mockResolvedValueOnce({
        data: null,
        error: summaryError,
      });

      render(<DataProcessing />);

      expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
      fireEvent.change(screen.getByLabelText('Result set name'), {
        target: { value: 'Closure summary check' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Check data completeness' }));

      expect(await screen.findByText(expectedMessage)).toBeInTheDocument();
    },
  );

  it('uses the idempotency fallback and invalidates the certificate when selection changes', async () => {
    mockLocation = { pathname: '/data-processing', search: '' };
    const originalRandomUuid = globalThis.crypto.randomUUID;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: undefined,
    });

    try {
      render(<DataProcessing />);

      expect(await screen.findByTestId('page-title')).toHaveTextContent('Data Processing');
      fireEvent.change(screen.getByLabelText('Result set name'), {
        target: { value: 'Fallback token check' },
      });
      fireEvent.change(screen.getByLabelText('Coverage mode'), {
        target: { value: '' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Check data completeness' }));

      await waitFor(() =>
        expect(mockCreateClosureCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            requestIdempotencyToken: expect.stringMatching(/^closure-check-\d+-[a-z0-9]+$/),
          }),
        ),
      );
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Generate result set' })).not.toBeDisabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Generate result set' }));
      await waitFor(() =>
        expect(mockCreateLciaResultBuildRequest).toHaveBeenCalledWith(
          expect.objectContaining({ coverageMode: 'global_eligible' }),
        ),
      );

      fireEvent.change(screen.getByLabelText('Default impact category'), {
        target: { value: 'climate-change' },
      });
      expect(
        await screen.findByText(
          'The current selection differs from this check. Run a new check before generating.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate result set' })).toBeDisabled();
    } finally {
      Object.defineProperty(globalThis.crypto, 'randomUUID', {
        configurable: true,
        value: originalRandomUuid,
      });
    }
  });

  it('reports unavailable closure downloads and opens a valid signed report', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockCreateClosureReportDownload
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'closure report failed' } })
      .mockResolvedValueOnce({
        data: { signedDownloadUrl: 'https://storage.example.test/closure.xlsx' },
        error: null,
      });

    render(<DataProcessing />);
    await waitForValidCertificate();
    const downloadButton = await screen.findByRole('button', { name: 'Download issue report' });

    fireEvent.click(downloadButton);
    expect(await screen.findByText('Report is unavailable')).toBeInTheDocument();

    fireEvent.click(downloadButton);
    expect(await screen.findByText('closure report failed')).toBeInTheDocument();

    fireEvent.click(downloadButton);
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://storage.example.test/closure.xlsx',
        '_blank',
        'noopener,noreferrer',
      ),
    );
    openSpy.mockRestore();
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
    expect(screen.getByTestId('tab-builds')).toHaveTextContent('结果生成');
    expect(screen.getByTestId('tab-preview')).toHaveTextContent('结果预览');
    expect(screen.getByTestId('tab-publication')).toHaveTextContent('发布');
    expect(screen.getByLabelText('默认影响类别')).toHaveTextContent('气候变化');
    expect(screen.getByRole('button', { name: '生成结果集' })).toBeInTheDocument();
  });

  it('renders access denied when role lookup fails', async () => {
    mockGetSystemUserRoleApi.mockRejectedValueOnce(new Error('role lookup failed'));

    render(<DataProcessing />);

    expect(await screen.findByTestId('access-denied')).toBeInTheDocument();
    expect(mockCreateLciaResultBuildRequest).not.toHaveBeenCalled();
  });
});
