// @ts-nocheck
import FlowsPage from '@/pages/Flows';
import LifeCycleModelsPage from '@/pages/LifeCycleModels';
import ProcessesPage from '@/pages/Processes';
import UnitgroupsPage from '@/pages/Unitgroups';
import { getFlowTableAll } from '@/services/flows/api';
import { attachStateCodesToRows } from '@/services/general/api';
import { getLifeCycleModelTableAll } from '@/services/lifeCycleModels/api';
import { getProcessTableAll } from '@/services/processes/api';
import { getUnitGroupTableAll } from '@/services/unitgroups/api';
import { renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

let mockLocation = {
  pathname: '/mydata/unitgroups',
  search: '?tid=team-1',
};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
  useLocation: () => mockLocation,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Card = ({ children }: any) => <div>{children}</div>;
  const ConfigProvider = ({ children }: any) => <>{children}</>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Checkbox = ({ children }: any) => <label>{children}</label>;
  const Search = ({ onSearch, enterButton, ...rest }: any) => {
    void onSearch;
    void enterButton;
    return <input aria-label='search' {...rest} />;
  };
  const Select = ({ children, defaultValue, onChange, style }: any) => (
    <select
      aria-label='select'
      defaultValue={defaultValue}
      onChange={(event) => onChange?.(event.target.value)}
      style={style}
    >
      {children}
    </select>
  );
  Select.Option = ({ children, value }: any) => <option value={value}>{children}</option>;

  return {
    __esModule: true,
    Card,
    Checkbox,
    Col,
    ConfigProvider,
    Input: { Search },
    Row,
    Select,
    Space,
    Tooltip,
    message: {
      success: jest.fn(),
      error: jest.fn(),
    },
    theme: {
      useToken: () => ({
        token: {
          colorPrimary: '#1677ff',
          red: '#ff4d4f',
          fontSize: 12,
        },
      }),
    },
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request, columns = [], actionRef, toolBarRender }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: jest.fn(),
          reloadAndRest: jest.fn(),
          setPageInfo: jest.fn(),
        };
      }
    }, [actionRef]);

    React.useEffect(() => {
      let mounted = true;
      const load = async () => {
        const result = await request?.({ current: 1, pageSize: 10 }, {});
        if (mounted) {
          setRows(result?.data ?? []);
        }
      };
      void load();
      return () => {
        mounted = false;
      };
    }, [request]);

    const optionColumn = columns.find((column: any) => column.dataIndex === 'option');
    const toolbarNodes = toolBarRender?.() ?? [];
    const toolbar = Array.isArray(toolbarNodes) ? toolbarNodes : [toolbarNodes];

    return (
      <div data-testid='pro-table'>
        <div>{toolbar}</div>
        {rows.map((row, index) => (
          <div key={`${row.id}-${row.version}-${index}`}>
            {optionColumn?.render?.(undefined, row, index)}
          </div>
        ))}
      </div>
    );
  };

  const PageContainer = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    PageContainer,
    ProTable,
  };
});

jest.mock('@ant-design/pro-table', () => ({
  __esModule: true,
  TableDropdown: () => <div data-testid='table-dropdown' />,
}));

jest.mock('@/components/AllVersions', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ContributeData', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ExportData', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ImportData', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/TableFilter', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Unitgroups/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Unitgroups/Components/delete', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='unitgroup-delete' disabled={disabled}>
      delete
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/edit', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='unitgroup-edit' disabled={disabled}>
      edit
    </button>
  ),
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Processes/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Processes/Components/delete', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='process-delete' disabled={disabled}>
      delete
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='process-edit' disabled={disabled}>
      edit
    </button>
  ),
}));

jest.mock('@/pages/Processes/Components/lcaSolveToolbar', () => ({
  __esModule: true,
  default: () => <div data-testid='lca-toolbar' />,
}));

jest.mock('@/pages/Processes/Components/ReviewDetail', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/LifeCycleModels/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/LifeCycleModels/Components/delete', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='lifecyclemodel-delete' disabled={disabled}>
      delete
    </button>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='lifecyclemodel-edit' disabled={disabled}>
      edit
    </button>
  ),
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flows/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='flow-delete' disabled={disabled}>
      delete
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: ({ disabled }: any) => (
    <button type='button' data-testid='flow-edit' disabled={disabled}>
      edit
    </button>
  ),
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) =>
    rows.map((row) => ({
      ...row,
      stateCode: 20,
    })),
  ),
  contributeSource: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (pathname: string) => (pathname.includes('/mydata/') ? 'my' : 'tg'),
  getLang: () => 'en',
  getLangText: (value: any) => (typeof value === 'string' ? value : (value?.en ?? '')),
  getUnitData: jest.fn(async (_type: string, data: any[]) => data),
  isDataUnderReview: (stateCode?: number | null) =>
    typeof stateCode === 'number' && stateCode >= 20 && stateCode < 100,
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getRoleByUserId: jest.fn(() =>
    Promise.resolve([
      {
        team_id: '00000000-0000-0000-0000-000000000000',
        role: 'admin',
      },
    ]),
  ),
}));

jest.mock('@/services/teams/api', () => ({
  __esModule: true,
  getTeamById: jest.fn(() =>
    Promise.resolve({
      data: [
        {
          json: {
            title: 'Team 1',
          },
        },
      ],
    }),
  ),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: jest.fn(),
  getUnitGroupTablePgroongaSearch: jest.fn(),
  unitgroup_hybrid_search: jest.fn(),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  contributeProcess: jest.fn(),
  getProcessTableAll: jest.fn(),
  getProcessTablePgroongaSearch: jest.fn(),
  process_hybrid_search: jest.fn(),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  contributeSource: jest.fn(),
  flow_hybrid_search: jest.fn(),
  getFlowTableAll: jest.fn(),
  getFlowTablePgroongaSearch: jest.fn(),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  contributeLifeCycleModel: jest.fn(),
  getLifeCycleModelTableAll: jest.fn(),
  getLifeCycleModelTablePgroongaSearch: jest.fn(),
  lifeCycleModel_hybrid_search: jest.fn(),
}));

const mockAttachStateCodesToRows = attachStateCodesToRows as jest.MockedFunction<any>;
const mockGetFlowTableAll = getFlowTableAll as jest.MockedFunction<any>;
const mockGetUnitGroupTableAll = getUnitGroupTableAll as jest.MockedFunction<any>;
const mockGetProcessTableAll = getProcessTableAll as jest.MockedFunction<any>;
const mockGetLifeCycleModelTableAll = getLifeCycleModelTableAll as jest.MockedFunction<any>;

describe('under review list actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttachStateCodesToRows.mockImplementation(async (_table: string, rows: any[]) =>
      rows.map((row) => ({
        ...row,
        stateCode: 20,
      })),
    );
  });

  it('disables unit group edit and delete buttons for rows under review', async () => {
    mockLocation = {
      pathname: '/mydata/unitgroups',
      search: '?tid=team-1',
    };
    mockGetUnitGroupTableAll.mockResolvedValue({
      data: [
        {
          id: 'unitgroup-1',
          version: '01.00.000',
          name: 'Unit Group 1',
          classification: 'classification',
          refUnitName: 'kg',
          refUnitGeneralComment: '',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(mockAttachStateCodesToRows).toHaveBeenCalledWith(
        'unitgroups',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'unitgroup-1',
            version: '01.00.000',
          }),
        ]),
      ),
    );
    expect(screen.getByTestId('unitgroup-edit')).toBeDisabled();
    expect(screen.getByTestId('unitgroup-delete')).toBeDisabled();
  });

  it('disables process edit and delete buttons for process rows under review', async () => {
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1',
    };
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'process-1',
          version: '01.00.000',
          name: 'Process 1',
          generalComment: '',
          classification: 'classification',
          referenceYear: '2024',
          location: 'CN',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
          modelId: '',
          typeOfDataSet: 'Unit process',
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() =>
      expect(mockAttachStateCodesToRows).toHaveBeenCalledWith(
        'processes',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'process-1',
            version: '01.00.000',
          }),
        ]),
      ),
    );
    expect(screen.getByTestId('process-edit')).toBeDisabled();
    expect(screen.getByTestId('process-delete')).toBeDisabled();
    expect(screen.queryByTestId('lifecyclemodel-edit')).not.toBeInTheDocument();
  });

  it('disables lifecycle model edit and process delete buttons for process rows linked to models under review', async () => {
    mockLocation = {
      pathname: '/mydata/processes',
      search: '?tid=team-1',
    };
    mockGetProcessTableAll.mockResolvedValue({
      data: [
        {
          id: 'process-2',
          version: '01.00.000',
          name: 'Process 2',
          generalComment: '',
          classification: 'classification',
          referenceYear: '2024',
          location: 'CN',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
          modelId: 'model-1',
          typeOfDataSet: 'Unit process',
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<ProcessesPage />);

    await waitFor(() =>
      expect(mockAttachStateCodesToRows).toHaveBeenCalledWith(
        'processes',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'process-2',
            version: '01.00.000',
          }),
        ]),
      ),
    );
    expect(screen.getByTestId('lifecyclemodel-edit')).toBeDisabled();
    expect(screen.getByTestId('process-delete')).toBeDisabled();
    expect(screen.queryByTestId('process-edit')).not.toBeInTheDocument();
  });

  it('disables lifecycle model edit and delete buttons for lifecycle model rows under review', async () => {
    mockLocation = {
      pathname: '/mydata/models',
      search: '?tid=team-1',
    };
    mockGetLifeCycleModelTableAll.mockResolvedValue({
      data: [
        {
          id: 'model-1',
          version: '01.00.000',
          name: 'Model 1',
          generalComment: '',
          classification: 'classification',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() =>
      expect(mockAttachStateCodesToRows).toHaveBeenCalledWith(
        'lifecyclemodels',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'model-1',
            version: '01.00.000',
          }),
        ]),
      ),
    );
    expect(screen.getByTestId('lifecyclemodel-edit')).toBeDisabled();
    expect(screen.getByTestId('lifecyclemodel-delete')).toBeDisabled();
  });

  it('disables flow edit and delete buttons for rows under review', async () => {
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1',
    };
    mockGetFlowTableAll.mockResolvedValue({
      data: [
        {
          id: 'flow-1',
          version: '01.00.000',
          name: 'Flow 1',
          synonyms: '',
          flowType: 'Elementary flow',
          classification: 'classification',
          CASNumber: '',
          locationOfSupply: '',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });

    renderWithProviders(<FlowsPage />);

    await waitFor(() =>
      expect(mockAttachStateCodesToRows).toHaveBeenCalledWith(
        'flows',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'flow-1',
            version: '01.00.000',
          }),
        ]),
      ),
    );
    expect(screen.getByTestId('flow-edit')).toBeDisabled();
    expect(screen.getByTestId('flow-delete')).toBeDisabled();
  });
});
