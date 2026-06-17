/**
 * Unitgroups read-only workflow integration test.
 * Covers src/pages/Unitgroups/index.tsx with focus on:
 * - Initial table load via getUnitGroupTableAll.
 * - Search behaviour delegating to getUnitGroupTablePgroongaSearch.
 * - My Data unit groups expose existing rows without create/edit/delete controls.
 * - Open-data users land on /tgdata unit groups and only see the read-only source matrix.
 *
 * Service mocks:
 * - getUnitGroupTableAll, getUnitGroupTablePgroongaSearch
 * Ancillary mocks:
 * - getRoleByUserId (ensures admin access), getTeamById, contributeSource
 */

import UnitgroupsPage from '@/pages/Unitgroups';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

const setUnitgroupsLocation = (pathname: string, search = '') => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname, search: search ? `?${search}` : '' });
};

jest.mock('umi', () => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname: '/mydata/unitgroups', search: '' });
  return umi.createUmiMock();
});

jest.mock('uuid', () => ({
  __esModule: true,
  v4: jest.fn(() => 'generated-unit-group-id'),
}));

jest.mock('@ant-design/icons', () =>
  require('@/tests/mocks/antDesignIcons').createAntDesignIconsMock(),
);

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value}</span>,
  toSuperscript: (value: any) => value,
}));

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ icon, tooltip, onClick }: any) => (
      <button type='button' onClick={onClick}>
        {icon}
        {require('../../helpers/nodeToText').toText(tooltip) || 'Tool button'}
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
    default: ({ onOk }: any) => (
      <button type='button' onClick={() => onOk?.()}>
        contribute
      </button>
    ),
  };
});

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => <span>export</span>,
}));

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
    default: ({ onChange, disabled }: any) => (
      <select
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label='state-filter'
        defaultValue='all'
      >
        <option value='all'>All</option>
        <option value='100'>State 100</option>
      </select>
    ),
  };
});

jest.mock('@/pages/Unitgroups/Components/view', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ buttonType }: any) => (
      <button type='button'>{buttonType === 'icon' ? 'view' : 'View'}</button>
    ),
  };
});

jest.mock('@/pages/Unitgroups/Components/form', () => {
  const React = require('react');

  const UnitGroupForm = ({
    formRef,
    onData,
    onUnitData,
    onUnitDataCreate,
    onTabChange,
    unitDataSource = [],
  }: any) => {
    const [name, setName] = React.useState('');

    React.useEffect(() => {
      const existingName = formRef?.current?.getFieldsValue?.()?.unitGroupName;
      if (existingName !== undefined) {
        setName(existingName);
      }
    }, [formRef]);

    const handleName = (value: string) => {
      setName(value);
      formRef?.current?.setFieldValue?.(['unitGroupName'], value);
      onData?.();
    };

    return (
      <div>
        <label htmlFor='unit-group-name-input'>Unit group name</label>
        <input
          id='unit-group-name-input'
          value={name}
          onChange={(event) => handleName(event.target.value)}
        />
        <button
          type='button'
          onClick={() =>
            onUnitDataCreate?.({
              name: `Unit ${unitDataSource.length + 1}`,
              generalComment: { en: 'unit comment' },
              meanValue: '1',
              quantitativeReference: unitDataSource.length === 0,
            })
          }
        >
          Add Unit
        </button>
        <button
          type='button'
          onClick={() =>
            onUnitData?.(
              unitDataSource.map((unit: any, index: number) => ({
                ...unit,
                name: `${unit.name ?? `Unit ${index + 1}`} (edited)`,
              })),
            )
          }
        >
          Normalize Units
        </button>
        <button type='button' onClick={() => onTabChange?.('units')}>
          Switch Tab
        </button>
        <div>Units: {unitDataSource.length}</div>
      </div>
    );
  };

  return {
    __esModule: true,
    UnitGroupForm,
  };
});

jest.mock('@/services/unitgroups/util', () => ({
  __esModule: true,
  genUnitGroupFromData: jest.fn(),
  genUnitGroupJsonOrdered: jest.fn((id: string, data: any) => ({ id, data })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: jest.fn((pathname: string = '') => {
    if (pathname.includes('/mydata')) return 'my';
    if (pathname.includes('/tgdata')) return 'tg';
    if (pathname.includes('/codata')) return 'co';
    if (pathname.includes('/tedata')) return 'te';
    return '';
  }),
  getLang: jest.fn(() => 'en'),
  getLangText: jest.fn((value: any) => {
    if (typeof value === 'string') return value;
    if (!value) return '';
    if (value.en) return value.en;
    if (Array.isArray(value)) return value.map((item) => item?.name ?? '').join(',');
    return '';
  }),
  formatDateTime: jest.fn(() => '2023-09-01T00:00:00Z'),
  classificationToString: jest.fn((value: any) =>
    Array.isArray(value) ? value.join(' / ') : (value ?? ''),
  ),
  jsonToList: jest.fn((value: any) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [value];
  }),
  genClassificationZH: jest.fn((classifications: any) => classifications),
  getImportedId: jest.fn(() => undefined),
  isDataUnderReview: jest.fn(() => false),
  isSupabaseDuplicateKeyError: jest.fn(() => false),
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) => rows),
  contributeSource: jest.fn(async () => ({ data: {}, error: null })),
  getTeamIdByUserId: jest.fn(async () => 'team-1'),
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getRoleByUserId: jest.fn(async () => [
    {
      team_id: '00000000-0000-0000-0000-000000000000',
      role: 'admin',
    },
  ]),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(async () => ({
    data: [
      {
        json: {
          title: { en: 'Sustainability Team' },
        },
      },
    ],
  })),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: jest.fn(),
  getUnitGroupTablePgroongaSearch: jest.fn(),
  createUnitGroup: jest.fn(),
  updateUnitGroup: jest.fn(),
  deleteUnitGroup: jest.fn(),
  getUnitGroupDetail: jest.fn(),
}));

jest.mock('antd', () => require('@/tests/mocks/antd').createAntdMock());

jest.mock('@ant-design/pro-components', () =>
  require('@/tests/mocks/proComponents').createProComponentsMock(),
);

const { getUnitGroupTableAll, getUnitGroupTablePgroongaSearch } = jest.requireMock(
  '@/services/unitgroups/api',
);
const { genUnitGroupFromData: mockGenUnitGroupFromData } = jest.requireMock(
  '@/services/unitgroups/util',
);

const baseUnitGroupRow = {
  id: 'unitgroup-1',
  name: 'Electricity units',
  classification: 'Energy',
  refUnitId: 'unit-01',
  refUnitName: 'kWh',
  refUnitGeneralComment: 'Kilowatt hour',
  version: '1.0',
  modifiedAt: '2023-09-01T00:00:00Z',
  teamId: null,
};

describe('Unitgroups Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUnitgroupsLocation('/mydata/unitgroups');
    getUnitGroupTableAll.mockResolvedValue({
      data: [baseUnitGroupRow],
      success: true,
      total: 1,
    });
    getUnitGroupTablePgroongaSearch.mockResolvedValue({
      data: [
        {
          ...baseUnitGroupRow,
          id: 'unitgroup-search',
          name: 'Heat units',
        },
      ],
      success: true,
      total: 1,
    });
    mockGenUnitGroupFromData.mockReturnValue({
      id: 'unitgroup-1',
      unitGroupInformation: {
        dataSetInformation: {
          name: 'Electricity units',
        },
      },
      units: {
        unit: [
          {
            '@dataSetInternalID': '0',
            name: 'Electricity unit',
            quantitativeReference: true,
            generalComment: { en: 'Existing unit comment' },
            meanValue: '1',
          },
        ],
      },
    });
  });

  it('renders my-data unit groups read-only while preserving search and filters', async () => {
    const user = userEvent.setup();

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('state-filter')).not.toBeDisabled();
    });

    await waitFor(() => {
      expect(getUnitGroupTableAll).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Electricity units')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('pages.search.keyWord');
    await user.clear(searchInput);
    await user.type(searchInput, 'heat');
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Heat units')).toBeInTheDocument();
    });

    const toolbar = screen.getByTestId('pro-table-toolbar');
    expect(within(toolbar).queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'import' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /contribute/i })).not.toBeInTheDocument();

    const dataRow = screen.getByText('Heat units').closest('tr') as HTMLElement;
    expect(within(dataRow).getByRole('button', { name: 'view' })).toBeInTheDocument();
    expect(screen.getByText('export')).toBeInTheDocument();
    expect(within(dataRow).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(within(dataRow).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('state-filter'), '100');
    await waitFor(() => {
      expect(getUnitGroupTablePgroongaSearch).toHaveBeenLastCalledWith(
        { pageSize: 10, current: 1 },
        'en',
        'my',
        'heat',
        {},
        '100',
        '',
      );
    });
  });

  it('uses the open-data route matrix for tgdata unit groups', async () => {
    setUnitgroupsLocation('/tgdata/unitgroups', 'tid=team-open');

    getUnitGroupTableAll.mockResolvedValueOnce({
      data: [
        {
          ...baseUnitGroupRow,
          id: 'unitgroup-open',
          name: 'Open unit group',
          version: '1.0',
          teamId: null,
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() => {
      expect(getUnitGroupTableAll).toHaveBeenCalledTimes(1);
    });

    const firstCall = getUnitGroupTableAll.mock.calls[0];
    expect(firstCall[3]).toBe('tg');
    expect(firstCall[4]).toBe('team-open');

    expect(await screen.findByText('Open unit group')).toBeInTheDocument();
    expect(screen.getByTestId('pro-table-header')).toHaveTextContent('Open Data / Unit Groups');

    expect(
      within(screen.getByTestId('pro-table-toolbar')).queryByRole('button', { name: /create/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'import' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'view' })).toBeInTheDocument();
    expect(screen.getByText('export')).toBeInTheDocument();
  });
});
