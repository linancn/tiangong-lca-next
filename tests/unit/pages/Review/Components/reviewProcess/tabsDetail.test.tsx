// @ts-nocheck
import { renderWithProviders, screen, waitFor } from '../../../../../helpers/testUtils';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

const mockGetUserDetail = jest.fn();
const mockGetProcessExchange = jest.fn();
const mockGetFlowStateCodeByIdsAndVersions = jest.fn();
const mockGetUnitData = jest.fn();
const mockGenProcessExchangeTableData = jest.fn((data: any) => data);

const proTableRequests: Array<{ title: string; data: any[] }> = [];

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  return {
    __esModule: true,
    ProTable: ({ request, actionRef, columns }: any) => {
      const [rows, setRows] = React.useState<any[]>([]);
      const title = toText(columns?.[0]?.title) || 'table';

      const runRequest = React.useCallback(async () => {
        const response = await request?.({ pageSize: 10, current: 1 });
        const nextRows = response?.data ?? [];
        proTableRequests.push({ title, data: nextRows });
        setRows(nextRows);
        return response;
      }, [request, title]);

      React.useEffect(() => {
        actionRef.current = { reload: jest.fn(() => runRequest()) };
        void runRequest();
      }, [actionRef, runRequest]);

      return (
        <div data-testid={`table-${title}`}>
          {rows.map((row, index) => (
            <div
              key={`${title}-${index}`}
            >{`${row.referenceToFlowDataSetId}:${row.stateCode ?? 'na'}:${row.classification ?? '-'}`}</div>
          ))}
        </div>
      );
    },
  };
});

jest.mock('antd', () => {
  const React = require('react');
  const ConfigProvider = ({ children }: any) => <div>{children}</div>;
  const Card = ({ children, tabList, activeTabKey, onTabChange }: any) => (
    <section>
      <div>
        {(tabList ?? []).map((tab: any) => (
          <button key={tab.key} type='button' onClick={() => onTabChange?.(tab.key)}>
            {toText(tab.tab)}
          </button>
        ))}
      </div>
      <div data-active-tab={activeTabKey}>{children}</div>
    </section>
  );
  const Collapse = ({ items }: any) => (
    <div>
      {items?.map((item: any) => (
        <div key={item.key}>{item.children}</div>
      ))}
    </div>
  );
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  return {
    __esModule: true,
    Card,
    Collapse,
    ConfigProvider,
    Descriptions,
    Divider,
    Space,
    Tooltip,
  };
});

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value}</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div>{JSON.stringify(data ?? null)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div>{JSON.stringify(data ?? null)}</div>,
}));

jest.mock('@/components/LocationTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div>{JSON.stringify(data ?? null)}</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{String(value)}</span>,
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: ({ title }: any) => <div>{toText(title)}</div>,
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ title }: any) => <div>{toText(title)}</div>,
}));

jest.mock('@/pages/Review/Components/Compliance/form', () => ({
  __esModule: true,
  default: () => <div>compliance-form</div>,
}));

jest.mock('@/pages/Review/Components/Compliance/view', () => ({
  __esModule: true,
  default: ({ data }: any) => (
    <div>{`compliance-view-${Array.isArray(data) ? data.length : 0}`}</div>
  ),
}));

jest.mock('@/pages/Review/Components/Exchange/view', () => ({
  __esModule: true,
  default: ({ id }: any) => <span>{`exchange-view-${id}`}</span>,
}));

jest.mock('@/pages/Review/Components/ReviewForm/form', () => ({
  __esModule: true,
  default: () => <div>review-form</div>,
}));

jest.mock('@/pages/Review/Components/ReviewForm/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div>{`review-view-${Array.isArray(data) ? data.length : 0}`}</div>,
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  completenessElementaryFlowsTypeOptions: [{ value: 'type-a', label: 'Type A' }],
  completenessElementaryFlowsValueOptions: [{ value: 'value-a', label: 'Value A' }],
  completenessProductModelOptions: [{ value: 'product-a', label: 'Product A' }],
  copyrightOptions: [{ value: 'yes', label: 'Yes' }],
  LCIMethodApproachOptions: [{ value: 'approach-a', label: 'Approach A' }],
  LCIMethodPrincipleOptions: [{ value: 'principle-a', label: 'Principle A' }],
  licenseTypeOptions: [{ value: 'license-a', label: 'License A' }],
  processtypeOfDataSetOptions: [{ value: 'process-a', label: 'Process A' }],
  uncertaintyDistributionTypeOptions: [{ value: 'distribution-a', label: 'Distribution A' }],
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowStateCodeByIdsAndVersions: (...args: any[]) =>
    mockGetFlowStateCodeByIdsAndVersions(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: jest.fn((value: any) => {
    if (Array.isArray(value)) return value[0]?.['#text'] ?? '-';
    if (typeof value === 'string') return value;
    return value?.['#text'] ?? '-';
  }),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessExchange: (...args: any[]) => mockGetProcessExchange(...args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessExchangeTableData: (...args: any[]) => mockGenProcessExchangeTableData(...args),
}));

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserDetail: (...args: any[]) => mockGetUserDetail(...args),
}));

describe('Review process TabsDetail', () => {
  const TabsDetail = require('@/pages/Review/Components/reviewProcess/tabsDetail').TabsDetail;

  const exchangeRow = {
    dataSetInternalID: 'ex-1',
    referenceToFlowDataSetId: 'flow-1',
    referenceToFlowDataSetVersion: '1.0.0',
    referenceToFlowDataSet: { '@refObjectId': 'flow-1', '@version': '1.0.0' },
    stateCode: undefined,
    classification: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    proTableRequests.length = 0;
    mockGetUserDetail.mockResolvedValue({
      data: {
        contact: {
          '@refObjectId': 'contact-1',
          '@version': '1.0.0',
          '@type': 'contact data set',
        },
      },
    });
    mockGetProcessExchange.mockImplementation(async (_data: any, direction: string) => ({
      success: true,
      data: [{ ...exchangeRow, direction }],
    }));
    mockGetUnitData.mockImplementation(async (_type: string, data: any[]) => data);
    mockGetFlowStateCodeByIdsAndVersions.mockResolvedValue({
      error: null,
      data: [{ id: 'flow-1', version: '1.0.0', stateCode: 30, classification: 'class-a' }],
    });
  });

  it('initializes validation review data and reviewer contact in edit mode', async () => {
    const fieldValues: Record<string, any> = {};
    const getFieldValue = jest.fn((path: any[]) => fieldValues[path.join('.')]);
    const setFieldValue = jest.fn((path: any[], value: any) => {
      fieldValues[path.join('.')] = value;
    });
    const formRef = { current: { getFieldValue, setFieldValue } };

    renderWithProviders(
      <TabsDetail
        lang='en'
        activeTabKey='validation'
        formRef={formRef as any}
        onData={jest.fn()}
        onExchangeData={jest.fn()}
        onTabChange={jest.fn()}
        exchangeDataSource={[exchangeRow]}
        initData={{ modellingAndValidation: {} }}
        type='edit'
      />,
    );

    await waitFor(() =>
      expect(setFieldValue).toHaveBeenCalledWith(
        ['modellingAndValidation', 'validation', 'review'],
        [{ 'common:scope': [{}] }],
      ),
    );
    await waitFor(() =>
      expect(setFieldValue).toHaveBeenCalledWith(
        [
          'modellingAndValidation',
          'validation',
          'review',
          0,
          'common:referenceToNameOfReviewerAndInstitution',
        ],
        expect.objectContaining({ '@refObjectId': 'contact-1' }),
      ),
    );
  });

  it('flattens rejected validation and compliance comments in edit mode', async () => {
    renderWithProviders(
      <TabsDetail
        lang='en'
        activeTabKey='validation'
        formRef={{ current: { getFieldValue: jest.fn(), setFieldValue: jest.fn() } } as any}
        onData={jest.fn()}
        onExchangeData={jest.fn()}
        onTabChange={jest.fn()}
        exchangeDataSource={[exchangeRow]}
        initData={{ modellingAndValidation: {} }}
        rejectedComments={[
          {
            modellingAndValidation: {
              validation: { review: [{ id: 'review-1' }, { id: 'review-2' }] },
            },
          },
          {
            modellingAndValidation: {
              validation: { review: { id: 'review-3' } },
              complianceDeclarations: { compliance: [{ id: 'compliance-1' }] },
            },
          },
        ]}
        type='edit'
      />,
    );

    expect(await screen.findByText('review-view-3')).toBeInTheDocument();

    renderWithProviders(
      <TabsDetail
        lang='en'
        activeTabKey='complianceDeclarations'
        formRef={{ current: { getFieldValue: jest.fn(), setFieldValue: jest.fn() } } as any}
        onData={jest.fn()}
        onExchangeData={jest.fn()}
        onTabChange={jest.fn()}
        exchangeDataSource={[exchangeRow]}
        initData={{ modellingAndValidation: {} }}
        rejectedComments={[
          {
            modellingAndValidation: {
              complianceDeclarations: { compliance: { id: 'compliance-1' } },
            },
          },
          {
            modellingAndValidation: {
              complianceDeclarations: { compliance: [{ id: 'compliance-2' }] },
            },
          },
        ]}
        type='edit'
      />,
    );

    expect(await screen.findByText('compliance-view-2')).toBeInTheDocument();
  });

  it('loads exchange tables and enriches rows with flow review state data', async () => {
    renderWithProviders(
      <TabsDetail
        lang='en'
        activeTabKey='exchanges'
        formRef={{ current: { getFieldValue: jest.fn(), setFieldValue: jest.fn() } } as any}
        onData={jest.fn()}
        onExchangeData={jest.fn()}
        onTabChange={jest.fn()}
        exchangeDataSource={[exchangeRow]}
        initData={{ modellingAndValidation: {} }}
        type='view'
      />,
    );

    await waitFor(() => expect(mockGetProcessExchange).toHaveBeenCalledTimes(4));
    expect(mockGenProcessExchangeTableData).toHaveBeenCalledWith([exchangeRow], 'en');
    expect(mockGetFlowStateCodeByIdsAndVersions).toHaveBeenCalledWith(
      [{ id: 'flow-1', version: '1.0.0' }],
      'en',
    );
    expect(await screen.findAllByText('flow-1:30:class-a')).toHaveLength(2);
  });
});
