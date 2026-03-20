// @ts-nocheck
import ContactsPage from '@/pages/Contacts';
import FlowpropertiesPage from '@/pages/Flowproperties';
import FlowsPage from '@/pages/Flows';
import LifeCycleModelsPage from '@/pages/LifeCycleModels';
import SourcesPage from '@/pages/Sources';
import UnitgroupsPage from '@/pages/Unitgroups';
import { getContactTableAll } from '@/services/contacts/api';
import { getFlowpropertyTableAll } from '@/services/flowproperties/api';
import { getFlowTableAll } from '@/services/flows/api';
import { attachStateCodesToRows } from '@/services/general/api';
import { getLifeCycleModelTableAll } from '@/services/lifeCycleModels/api';
import { getSourceTableAll } from '@/services/sources/api';
import { getUnitGroupTableAll } from '@/services/unitgroups/api';
import { renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

let mockLocation = {
  pathname: '/mydata/contacts',
  search: '?tid=team-1&id=contact-1&version=01.00.000',
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
        const result = await request?.({ current: 1, pageSize: 10 }, {}, {});
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

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  toSuperscript: (value: string) => value,
}));

jest.mock('@/pages/Contacts/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Contacts/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Contacts/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version }: any) =>
    autoOpen ? (
      <div data-testid='contact-auto-open'>
        {id}:{version}
      </div>
    ) : (
      <button type='button' data-testid='contact-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/Contacts/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Sources/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Sources/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Sources/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version, autoCheckRequired }: any) =>
    autoOpen ? (
      <div data-testid='source-auto-open'>
        {id}:{version}:{autoCheckRequired ? 'required' : 'normal'}
      </div>
    ) : (
      <button type='button' data-testid='source-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/Sources/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Unitgroups/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Unitgroups/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Unitgroups/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version }: any) =>
    autoOpen ? (
      <div data-testid='unitgroup-auto-open'>
        {id}:{version}
      </div>
    ) : (
      <button type='button' data-testid='unitgroup-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/Unitgroups/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flowproperties/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flowproperties/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flowproperties/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version }: any) =>
    autoOpen ? (
      <div data-testid='flowproperty-auto-open'>
        {id}:{version}
      </div>
    ) : (
      <button type='button' data-testid='flowproperty-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/Flowproperties/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flows/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flows/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/Flows/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version }: any) =>
    autoOpen ? (
      <div data-testid='flow-auto-open'>
        {id}:{version}
      </div>
    ) : (
      <button type='button' data-testid='flow-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/LifeCycleModels/Components/create', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/LifeCycleModels/Components/delete', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/pages/LifeCycleModels/Components/edit', () => ({
  __esModule: true,
  default: ({ autoOpen, id, version }: any) =>
    autoOpen ? (
      <div data-testid='lifecyclemodel-auto-open'>
        {id}:{version}
      </div>
    ) : (
      <button type='button' data-testid='lifecyclemodel-edit'>
        edit
      </button>
    ),
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  attachStateCodesToRows: jest.fn(async (_table: string, rows: any[]) => rows),
  contributeSource: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getDataSource: (pathname: string) => (pathname.includes('/mydata/') ? 'my' : 'tg'),
  getLang: () => 'en',
  getLangText: (value: any) => (typeof value === 'string' ? value : (value?.en ?? '')),
  getUnitData: jest.fn(async (_type: string, data: any[]) => data),
  isDataUnderReview: () => false,
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

jest.mock('@/services/contacts/api', () => ({
  __esModule: true,
  contact_hybrid_search: jest.fn(),
  getContactTableAll: jest.fn(),
  getContactTablePgroongaSearch: jest.fn(),
}));

jest.mock('@/services/sources/api', () => ({
  __esModule: true,
  getSourceTableAll: jest.fn(),
  getSourceTablePgroongaSearch: jest.fn(),
  source_hybrid_search: jest.fn(),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  flowproperty_hybrid_search: jest.fn(),
  getFlowpropertyTableAll: jest.fn(),
  getFlowpropertyTablePgroongaSearch: jest.fn(),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  flow_hybrid_search: jest.fn(),
  getFlowTableAll: jest.fn(),
  getFlowTablePgroongaSearch: jest.fn(),
}));

jest.mock('@/services/unitgroups/api', () => ({
  __esModule: true,
  getUnitGroupTableAll: jest.fn(),
  getUnitGroupTablePgroongaSearch: jest.fn(),
  unitgroup_hybrid_search: jest.fn(),
}));

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  contributeLifeCycleModel: jest.fn(),
  getLifeCycleModelTableAll: jest.fn(),
  getLifeCycleModelTablePgroongaSearch: jest.fn(),
  lifeCycleModel_hybrid_search: jest.fn(),
}));

const mockAttachStateCodesToRows = attachStateCodesToRows as jest.MockedFunction<any>;
const mockGetContactTableAll = getContactTableAll as jest.MockedFunction<any>;
const mockGetSourceTableAll = getSourceTableAll as jest.MockedFunction<any>;
const mockGetFlowpropertyTableAll = getFlowpropertyTableAll as jest.MockedFunction<any>;
const mockGetFlowTableAll = getFlowTableAll as jest.MockedFunction<any>;
const mockGetUnitGroupTableAll = getUnitGroupTableAll as jest.MockedFunction<any>;
const mockGetLifeCycleModelTableAll = getLifeCycleModelTableAll as jest.MockedFunction<any>;

describe('my data list auto open edit drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAttachStateCodesToRows.mockImplementation(async (_table: string, rows: any[]) => rows);
    mockGetContactTableAll.mockResolvedValue({
      data: [
        {
          id: 'contact-1',
          version: '01.00.000',
          shortName: 'Contact 1',
          name: 'Contact 1',
          classification: 'classification',
          email: 'contact@example.com',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetSourceTableAll.mockResolvedValue({
      data: [
        {
          id: 'source-1',
          version: '01.00.000',
          shortName: 'Source 1',
          classification: 'classification',
          publicationType: 'book',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetFlowpropertyTableAll.mockResolvedValue({
      data: [
        {
          id: 'flowproperty-1',
          version: '01.00.000',
          name: 'Flow Property 1',
          generalComment: '',
          classification: 'classification',
          refUnitGroupId: 'unitgroup-1',
          refUnitGroupVersion: '01.00.000',
          refUnitRes: {
            name: 'Unit Group 1',
            refUnitGeneralComment: '',
            refUnitName: 'kg',
          },
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
        },
      ],
      success: true,
      total: 1,
    });
    mockGetFlowTableAll.mockResolvedValue({
      data: [
        {
          id: 'flow-1',
          version: '01.00.000',
          name: 'Flow 1',
          synonyms: '',
          classification: 'classification',
          CASNumber: '50-00-0',
          locationOfSupply: 'CN',
          modifiedAt: new Date().toISOString(),
          teamId: 'team-1',
          flowType: 'Elementary flow',
        },
      ],
      success: true,
      total: 1,
    });
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
  });

  it('auto opens contact edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/contacts',
      search: '?tid=team-1&id=contact-1&version=01.00.000',
    };

    renderWithProviders(<ContactsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('contact-auto-open')).toHaveTextContent('contact-1:01.00.000'),
    );
  });

  it('auto opens source edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/sources',
      search: '?tid=team-1&id=source-1&version=01.00.000',
    };

    renderWithProviders(<SourcesPage />);

    await waitFor(() =>
      expect(screen.getByTestId('source-auto-open')).toHaveTextContent('source-1:01.00.000'),
    );
  });

  it('passes required flag to source auto open edit drawer', async () => {
    mockLocation = {
      pathname: '/mydata/sources',
      search: '?tid=team-1&id=source-1&version=01.00.000&required=1',
    };

    renderWithProviders(<SourcesPage />);

    await waitFor(() =>
      expect(screen.getByTestId('source-auto-open')).toHaveTextContent(
        'source-1:01.00.000:required',
      ),
    );
  });

  it('auto opens flow property edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/flowproperties',
      search: '?tid=team-1&id=flowproperty-1&version=01.00.000',
    };

    renderWithProviders(<FlowpropertiesPage />);

    await waitFor(() =>
      expect(screen.getByTestId('flowproperty-auto-open')).toHaveTextContent(
        'flowproperty-1:01.00.000',
      ),
    );
  });

  it('auto opens flow edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/flows',
      search: '?tid=team-1&id=flow-1&version=01.00.000',
    };

    renderWithProviders(<FlowsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('flow-auto-open')).toHaveTextContent('flow-1:01.00.000'),
    );
  });

  it('auto opens unit group edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/unitgroups',
      search: '?tid=team-1&id=unitgroup-1&version=01.00.000',
    };

    renderWithProviders(<UnitgroupsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('unitgroup-auto-open')).toHaveTextContent('unitgroup-1:01.00.000'),
    );
  });

  it('auto opens lifecycle model edit drawer from id and version query params', async () => {
    mockLocation = {
      pathname: '/mydata/models',
      search: '?tid=team-1&id=model-1&version=01.00.000',
    };

    renderWithProviders(<LifeCycleModelsPage />);

    await waitFor(() =>
      expect(screen.getByTestId('lifecyclemodel-auto-open')).toHaveTextContent('model-1:01.00.000'),
    );
  });
});
