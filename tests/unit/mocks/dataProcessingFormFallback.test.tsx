import DataProcessing from '@/pages/DataProcessing';
import { render, waitFor } from '@testing-library/react';
import { useRef } from 'react';

jest.mock('antd', () => require('../../mocks/antd').createAntdMock());
jest.mock('@ant-design/pro-components', () =>
  require('../../mocks/proComponents').createProComponentsMock(),
);
jest.mock('@ant-design/icons', () =>
  require('../../mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('@/components/AccessDenied', () => ({
  __esModule: true,
  default: () => <div>Access denied</div>,
}));
jest.mock('@/components/ClosureTaskDetail', () => ({
  ClosureArtifactList: () => null,
  closureCheckNeedsPolling: () => false,
  closureCheckPollIntervalMs: 1,
  closureCheckPollMaxAttempts: 1,
}));
jest.mock('@/components/LcaReleaseReadPanel', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/pages/DataProcessing/CalculationBundlePanel', () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetClosureCheck = jest.fn();
const mockDataProductTasks: any[] = [];
const mockListDataProductTasks = jest.fn(() => mockDataProductTasks);
const mockSubscribeDataProductTasks = jest.fn((listener: () => void) => {
  void listener;
  return () => undefined;
});

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  history: { replace: jest.fn() },
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
    locale: 'en-US',
  }),
  useLocation: () => ({
    pathname: '/data-processing',
    search: '?closureCheckId=closure-valid',
  }),
}));

jest.mock('@/services/roles/api', () => ({
  getSystemUserRoleApi: jest.fn(async () => ({ role: 'data_product_manager' })),
}));

jest.mock('@/services/dataProducts', () => ({
  createLciaResultSet: jest.fn(),
  getLciaResultSet: jest.fn(),
  listLciaResultSets: jest.fn(async () => ({ data: { items: [] }, error: null })),
  createClosureCheck: jest.fn(),
  createLciaResultBuildRequest: jest.fn(),
  getClosureCheck: (...args: any[]) => Reflect.apply(mockGetClosureCheck, undefined, args),
  listClosureCheckIssues: jest.fn(async () => ({ data: { issues: [] }, error: null })),
  listLciaResultPublications: jest.fn(async () => ({ data: [], error: null })),
  previewLciaResultPackage: jest.fn(),
  publishLciaResultPackage: jest.fn(),
  unpublishLciaResultPublication: jest.fn(),
}));

jest.mock('@/services/dataProducts/taskCenter', () => ({
  listDataProductTasks: () => mockListDataProductTasks(),
  refreshDataProductTasks: jest.fn(async () => []),
  subscribeDataProductTasks: (listener: () => void) => mockSubscribeDataProductTasks(listener),
  upsertDataProductTasks: jest.fn(),
}));

describe('DataProcessing form compatibility fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ files: [] }),
    })) as any;
    mockGetClosureCheck.mockResolvedValue({
      data: {
        schemaVersion: 'lcia.scope-closure-check.v1',
        closureCheckId: 'closure-valid',
        runStatus: 'passed',
        certificateValidity: 'valid',
        scanCompleteness: 'complete',
        requestedScopeHash: 'scope-hash-valid',
        policyFingerprint: 'policy-valid',
        artifacts: [],
      },
      error: null,
    });
  });

  it('uses an empty selection when the form API omits current-value access', async () => {
    const { Form } = jest.requireMock('antd');
    const originalUseForm = Form.useForm;

    function useFormWithoutCurrentValues() {
      const [form] = originalUseForm();
      const proxyRef = useRef<object>();
      if (!proxyRef.current) {
        proxyRef.current = new Proxy(form, {
          get(target, property, receiver) {
            if (property === 'getFieldsValue') return undefined;
            return Reflect.get(target, property, receiver);
          },
        });
      }
      return [proxyRef.current];
    }

    Form.useForm = useFormWithoutCurrentValues;
    const view = render(<DataProcessing />);

    try {
      await waitFor(() => expect(mockGetClosureCheck).toHaveBeenCalledWith('closure-valid'));
      await waitFor(() => expect(mockGetClosureCheck).toHaveBeenCalledTimes(1));
    } finally {
      view.unmount();
      Form.useForm = originalUseForm;
    }
  });
});
