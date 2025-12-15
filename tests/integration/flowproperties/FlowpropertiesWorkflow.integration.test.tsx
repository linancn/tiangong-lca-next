/**
 * Flowproperties CRUD workflow integration test.
 * Covers page at: src/pages/Flowproperties/index.tsx
 *
 * Journey:
 * 1. Owner opens My Data / Flow Properties list (ProTable request -> getFlowpropertyTableAll).
 * 2. Owner creates a new flow property (FlowpropertiesCreate -> createFlowproperties -> reload).
 * 3. Owner triggers edit workflow (FlowpropertiesEdit -> updateFlowproperties -> reload).
 * 4. Owner deletes an existing flow property (FlowpropertiesDelete -> deleteFlowproperties -> reload).
 *
 * Services mocked:
 * - getFlowpropertyTableAll, createFlowproperties, updateFlowproperties, deleteFlowproperties
 */

import FlowpropertiesPage from '@/pages/Flowproperties';
import userEvent from '@testing-library/user-event';
import { act, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';
jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/flowproperties', search: '' });
  return umi.createUmiMock();
});

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-flowproperty-id'),
}));

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

jest.mock('@ant-design/pro-table', () => require('@/tests/mocks/proTable').createProTableMock());

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ tooltip, onClick }: any) => (
      <button type='button' onClick={onClick}>
        {require('../../helpers/nodeToText').toText(tooltip) || 'button'}
      </button>
    ),
  };
});

jest.mock('@/components/AllVersions', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => <div>{children}</div>,
  };
});

jest.mock('@/components/ContributeData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <button type='button'>contribute</button>,
  };
});

jest.mock('@/components/ExportData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => <span>export</span>,
  };
});

jest.mock('@/components/ImportData', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onJsonData }: any) => (
      <button type='button' onClick={() => onJsonData?.([])}>
        import
      </button>
    ),
  };
});

jest.mock('@/components/TableFilter', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onChange }: any) => (
      <select onChange={(event) => onChange?.(event.target.value)}>
        <option value='all'>all</option>
        <option value='100'>state 100</option>
      </select>
    ),
  };
});

jest.mock('@/pages/Flowproperties/Components/form', () => {
  const React = require('react');
  const { useState, useEffect } = React;
  return {
    __esModule: true,
    FlowpropertyForm: ({ formRef, onData }: any) => {
      const [name, setName] = useState('');
      useEffect(() => {
        formRef.current?.setFieldsValue({
          flowPropertiesInformation: {
            dataSetInformation: {
              'common:name': [{ '#text': name, '@lang': 'en' }],
            },
          },
        });
      }, [formRef, name]);
      useEffect(() => {
        onData?.();
      }, [onData]);
      return (
        <div>
          <label htmlFor='flowproperty-name-input'>Flow property name</label>
          <input
            id='flowproperty-name-input'
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      );
    },
  };
});

const mockCreateFlowproperties = jest.fn(async () => ({
  data: [{ id: 'fp-created', version: '1.0.0' }],
})) as jest.Mock<any, any[]>;
const mockUpdateFlowproperties = jest.fn(async () => [
  { rule_verification: true, nonExistent: false },
]) as jest.Mock<any, any[]>;
const mockDeleteFlowproperties = jest.fn(async () => ({ status: 204 })) as jest.Mock<any, any[]>;
const mockGetFlowpropertyTableAll = jest.fn(async () => ({
  data: [] as any[],
  success: true,
  total: 0,
})) as jest.Mock<any, any[]>;

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyTableAll: (...args: any[]) => mockGetFlowpropertyTableAll(...args),
  createFlowproperties: (...args: any[]) => mockCreateFlowproperties(...args),
  updateFlowproperties: (...args: any[]) => mockUpdateFlowproperties(...args),
  deleteFlowproperties: (...args: any[]) => mockDeleteFlowproperties(...args),
  getFlowpropertyDetail: jest.fn(async () => ({
    data: {
      json: {
        flowPropertyDataSet: {},
      },
      version: '1.0.0',
    },
  })),
  flowproperty_hybrid_search: jest.fn(),
  getFlowpropertyTablePgroongaSearch: jest.fn(),
}));

const mockGenFlowpropertyFromData = jest.fn(async (payload: any) => payload ?? {}) as jest.Mock<
  any,
  any[]
>;

jest.mock('@/services/flowproperties/util', () => ({
  __esModule: true,
  genFlowpropertyFromData: (...args: any[]) => mockGenFlowpropertyFromData(...args),
  genFlowpropertyJsonOrdered: jest.fn((id: string, data: any) => ({ id, ...data })),
}));

const mockGetDataSource = jest.fn(() => 'my') as jest.Mock<any, any[]>;
const mockGetLang = jest.fn(() => 'en') as jest.Mock<any, any[]>;
const mockGetLangText = jest.fn((value: any) => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : (first?.['#text'] ?? '');
  }
  if (value?.en) return value.en;
  return value?.['#text'] ?? '';
}) as jest.Mock<any, any[]>;
const mockGetDataTitle = jest.fn(() => 'My Data') as jest.Mock<any, any[]>;
const mockFormatDateTime = jest.fn(() => '2024-01-01T00:00:00Z') as jest.Mock<any, any[]>;
const mockGetUnitData = jest.fn(async (_type: string, rows: any[]) =>
  rows.map((row) => ({
    ...row,
    refUnitRes: row.refUnitRes ?? {
      name: { en: 'kilogram' },
      refUnitGeneralComment: { en: 'mass unit' },
      refUnitName: 'kg',
    },
  })),
) as jest.Mock<any, any[]>;

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (...args: any[]) => mockGetDataSource(...args),
  getLang: (...args: any[]) => mockGetLang(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  getDataTitle: (...args: any[]) => mockGetDataTitle(...args),
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
  formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  getRefData: jest.fn(async () => ({ data: {} })),
  getTeamIdByUserId: jest.fn(),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({ data: [] })),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ id, version }: any) => <button type='button'>{`view ${id}:${version}`}</button>,
  };
});

jest.mock('@/pages/Flowproperties/Components/edit', () => {
  const React = require('react');
  const { message } = jest.requireMock('antd');
  const { updateFlowproperties } = jest.requireMock('@/services/flowproperties/api');
  return {
    __esModule: true,
    default: ({ id, version, actionRef }: any) => (
      <button
        type='button'
        onClick={async () => {
          await updateFlowproperties(id, version, { updated: true });
          message.success?.('Saved successfully!');
          actionRef?.current?.reload?.();
        }}
      >
        {`edit ${id}`}
      </button>
    ),
  };
});

jest.mock('@/pages/Flowproperties/Components/delete', () => {
  const React = require('react');
  const { deleteFlowproperties } = jest.requireMock('@/services/flowproperties/api');
  const { message } = jest.requireMock('antd');
  return {
    __esModule: true,
    default: ({ id, version, actionRef }: any) => (
      <button
        type='button'
        onClick={async () => {
          await deleteFlowproperties(id, version);
          message.success?.('Deleted');
          actionRef?.current?.reload?.();
        }}
      >
        {`delete ${id}`}
      </button>
    ),
  };
});

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => value,
}));

const baseRow = {
  id: 'fp-1',
  name: 'Water mass',
  classification: 'Mass',
  generalComment: 'Reference mass flow property',
  refUnitGroupId: 'ug-1',
  refUnitGroup: 'Mass unit group',
  refUnitRes: {
    name: { en: 'kilogram' },
    refUnitGeneralComment: { en: 'unit comment' },
    refUnitName: 'kg',
  },
  version: '1.0.0',
  modifiedAt: '2024-01-02T00:00:00Z',
  teamId: null,
};

describe('Flowproperties workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFlowpropertyTableAll.mockResolvedValue({
      data: [baseRow],
      success: true,
      total: 1,
    });
    mockCreateFlowproperties.mockResolvedValue({
      data: [{ id: 'fp-created', version: '1.0.0' }],
    });
    mockUpdateFlowproperties.mockResolvedValue([{ rule_verification: true, nonExistent: false }]);
    mockDeleteFlowproperties.mockResolvedValue({ status: 204 });
  });

  const renderFlowproperties = async () => {
    await act(async () => {
      renderWithProviders(<FlowpropertiesPage />);
    });
  };

  it('completes CRUD workflow', async () => {
    await renderFlowproperties();

    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Water mass')).toBeInTheDocument();

    const createButton = within(screen.getByTestId('pro-table-toolbar')).getByRole('button', {
      name: /create/i,
    });

    await userEvent.click(createButton);

    const nameInput = await screen.findByLabelText(/flow property name/i);
    await userEvent.type(nameInput, 'New Flow Property');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(saveButton);

    await waitFor(() =>
      expect(mockCreateFlowproperties).toHaveBeenCalledWith(
        'generated-flowproperty-id',
        expect.any(Object),
      ),
    );
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(2));

    const editButton = screen.getByRole('button', { name: /edit fp-1/i });
    await userEvent.click(editButton);
    await waitFor(() =>
      expect(mockUpdateFlowproperties).toHaveBeenCalledWith('fp-1', '1.0.0', { updated: true }),
    );
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(3));

    const deleteButton = screen.getByRole('button', { name: /delete fp-1/i });
    await userEvent.click(deleteButton);
    await waitFor(() => expect(mockDeleteFlowproperties).toHaveBeenCalledWith('fp-1', '1.0.0'));
    await waitFor(() => expect(mockGetFlowpropertyTableAll).toHaveBeenCalledTimes(4));
  });
});
