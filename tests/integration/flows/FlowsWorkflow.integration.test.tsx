/**
 * Flows create workflow integration tests covering classification and property association.
 * Scope:
 * - src/pages/Flows/index.tsx
 * - src/pages/Flows/Components/create.tsx
 *
 * Journeys:
 * 1. Owner loads /mydata flows table (ProTable request invoked with getFlowTableAll).
 * 2. Owner opens create drawer, selects flow type + classification, adds a flow property, saves, observes success toast and table reload.
 *
 * Services mocked:
 * - getFlowTableAll, createFlows
 */

import FlowsPage from '@/pages/Flows';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/flows', search: '' });
  return umi.createUmiMock();
});

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

const getMockAntdMessage = () => jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

jest.mock('@ant-design/pro-table', () => require('@/tests/mocks/proTable').createProTableMock());

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ tooltip, onClick }: any) => {
      const { toText } = require('../../helpers/nodeToText');
      return (
        <button type='button' onClick={onClick}>
          {toText(tooltip) || 'button'}
        </button>
      );
    },
  };
});

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: () => <button type='button'>contribute</button>,
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <span>export</span>,
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: ({ onJsonData }: any) => (
    <button type='button' onClick={() => onJsonData?.([])}>
      import
    </button>
  ),
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: ({ onChange }: any) => (
    <select onChange={(event) => onChange?.(event.target.value)}>
      <option value='all'>all</option>
      <option value='mine'>mine</option>
    </select>
  ),
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: () => <button type='button'>delete-flow</button>,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: () => <button type='button'>edit-flow</button>,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => <button type='button'>view-flow</button>,
}));

jest.mock('@/pages/Flows/Components/form', () => {
  const React = require('react');
  const { __ProFormContext } = jest.requireMock('@ant-design/pro-components');

  const FlowFormMock = ({
    propertyDataSource = [],
    onPropertyDataCreate,
    onData,
    onTabChange,
  }: any) => {
    const context = React.useContext(__ProFormContext) ?? {
      values: {},
      setFieldValue: () => {},
    };

    React.useEffect(() => {
      onTabChange?.('flowInformation');
    }, []);

    React.useEffect(() => {
      onData?.();
    }, []);

    const values = context.values ?? {};

    const baseName = values?.flowInformation?.dataSetInformation?.name?.baseName ?? '';
    const flowType = values?.modellingAndValidation?.LCIMethod?.typeOfDataSet ?? '';
    const classificationSelection =
      values?.flowInformation?.dataSetInformation?.classificationInformation?.selection ?? {};

    const updateField = (path: any[], value: any) => {
      context.setFieldValue?.(path, value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='flow-base-name'>Base name</label>
        <input
          id='flow-base-name'
          value={baseName}
          onChange={(event) =>
            updateField(
              ['flowInformation', 'dataSetInformation', 'name', 'baseName'],
              event.target.value,
            )
          }
        />
        <label htmlFor='flow-type-select'>Flow type</label>
        <select
          id='flow-type-select'
          value={flowType}
          onChange={(event) =>
            updateField(
              ['modellingAndValidation', 'LCIMethod', 'typeOfDataSet'],
              event.target.value,
            )
          }
        >
          <option value=''>Select type</option>
          <option value='Product flow'>Product flow</option>
          <option value='Elementary flow'>Elementary flow</option>
        </select>
        <label htmlFor='flow-classification'>Classification</label>
        <select
          id='flow-classification'
          value={classificationSelection?.showValue ?? ''}
          onChange={(event) => {
            const selected = event.target.value;
            updateField(
              ['flowInformation', 'dataSetInformation', 'classificationInformation', 'selection'],
              {
                id: ['root', selected],
                value: ['Root', selected],
                showValue: selected,
              },
            );
          }}
        >
          <option value=''>Select classification</option>
          <option value='class-a'>Class A</option>
          <option value='class-b'>Class B</option>
        </select>
        <button
          type='button'
          onClick={() => {
            onData?.();
            onPropertyDataCreate?.({
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'fp-1',
                '@version': '1.0.0',
              },
              meanValue: '1.23',
              quantitativeReference: propertyDataSource.length === 0,
            });
          }}
        >
          Add flow property
        </button>
        <ul data-testid='flow-property-list'>
          {propertyDataSource.map((row: any) => (
            <li
              key={
                row['@dataSetInternalID'] ?? row?.referenceToFlowPropertyDataSet?.['@refObjectId']
              }
            >
              {row?.referenceToFlowPropertyDataSet?.['@refObjectId']}
              {row?.quantitativeReference ? '(ref)' : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return {
    __esModule: true,
    FlowForm: FlowFormMock,
  };
});

const mockGetFlowTableAll = jest.fn(async () => ({
  data: [] as any[],
  success: true,
  total: 0,
})) as jest.Mock<any, any[]>;

const mockCreateFlows = jest.fn(async () => ({
  data: [{ id: 'flow-created', version: '1.0.0.001' }],
})) as jest.Mock<any, any[]>;

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowTableAll: (...args: any[]) => mockGetFlowTableAll(...args),
  getFlowTablePgroongaSearch: jest.fn(),
  flow_hybrid_search: jest.fn(),
  getFlowDetail: jest.fn(),
  createFlows: (...args: any[]) => mockCreateFlows(...args),
  updateFlows: jest.fn(),
  deleteFlows: jest.fn(),
}));

const mockGetDataSource = jest.fn(() => 'my') as jest.Mock<any, any[]>;
const mockGetLang = jest.fn(() => 'en') as jest.Mock<any, any[]>;
const mockGetLangText = jest.fn((value: any) => {
  if (typeof value === 'string') return value;
  if (value?.en) return value.en;
  return '';
}) as jest.Mock<any, any[]>;
const mockGetDataTitle = jest.fn(() => 'My Data') as jest.Mock<any, any[]>;
const mockFormatDateTime = jest.fn(() => '2024-01-01T00:00:00Z') as jest.Mock<any, any[]>;

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
  formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({ data: [] })),
}));

describe('Flows workflow', () => {
  const renderFlows = async () => {
    await act(async () => {
      renderWithProviders(<FlowsPage />);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowTableAll.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    });
    mockCreateFlows.mockResolvedValue({
      data: [{ id: 'flow-created', version: '1.0.0.001' }],
    });
    Object.values(getMockAntdMessage()).forEach((fn) => fn.mockClear());
  });

  it('creates a flow with classification and property association', async () => {
    await renderFlows();

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Create' }));

    const drawer = await screen.findByRole('dialog', { name: 'Flows Create' });

    const baseNameInput = within(drawer).getByLabelText('Base name');
    await user.clear(baseNameInput);
    await user.type(baseNameInput, 'Battery flow');

    const flowTypeSelect = within(drawer).getByLabelText('Flow type');
    await user.selectOptions(flowTypeSelect, 'Product flow');

    const classificationSelect = within(drawer).getByLabelText('Classification');
    await user.selectOptions(classificationSelect, 'class-a');

    await user.click(within(drawer).getByRole('button', { name: 'Add flow property' }));

    await waitFor(() => expect(within(drawer).getByText('fp-1(ref)')).toBeInTheDocument());

    await user.click(within(drawer).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreateFlows).toHaveBeenCalledTimes(1));

    const [createdId, payload] = mockCreateFlows.mock.calls[0];
    expect(typeof createdId).toBe('string');
    expect(createdId.length).toBeGreaterThan(0);

    expect(payload?.flowInformation?.dataSetInformation?.name?.baseName).toBe('Battery flow');
    expect(
      payload?.flowInformation?.dataSetInformation?.classificationInformation?.selection?.showValue,
    ).toBe('class-a');
    expect(payload?.modellingAndValidation?.LCIMethod?.typeOfDataSet).toBe('Product flow');

    const properties = payload?.flowProperties?.flowProperty ?? [];
    expect(properties).toHaveLength(1);
    expect(properties[0]?.referenceToFlowPropertyDataSet?.['@refObjectId']).toBe('fp-1');
    expect(properties[0]?.quantitativeReference).toBe(true);
    expect(properties[0]?.['@dataSetInternalID']).toBe('0');

    expect(getMockAntdMessage().success).toHaveBeenCalledWith('Created successfully!');

    await waitFor(() => expect(mockGetFlowTableAll).toHaveBeenCalledTimes(2));
  });
});
