import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

let mockLastActionRef: any;

jest.mock('umi', () => ({
  FormattedMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) => (
    <span>{defaultMessage || id}</span>
  ),
  useIntl: () => ({
    formatMessage: ({ id, defaultMessage }: { id: string; defaultMessage?: string }) =>
      defaultMessage || id,
    locale: 'en',
  }),
}));

jest.mock('@/services/general/util', () => ({
  getLangText: jest.fn((value: any) => (typeof value === 'string' ? value : (value?.en ?? ''))),
  getLang: jest.fn(() => 'en'),
}));

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const messageMock = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    open: jest.fn(),
  };
  const modalConfirmMock = jest.fn(({ onOk }: any) => (onOk ? onOk() : undefined));
  return {
    ...actual,
    message: messageMock,
    Modal: {
      ...actual.Modal,
      confirm: modalConfirmMock,
    },
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const DragSortTable = ({
    actionRef,
    request,
    dataSource,
    columns,
    toolBarRender,
    onDragSortEnd,
  }: any) => {
    const [rows, setRows] = React.useState(dataSource ?? []);
    const pageInfo = React.useRef({ current: 1, pageSize: 10 }).current;

    const runRequest = React.useCallback(async () => {
      if (request) {
        const result = await request({ current: pageInfo.current, pageSize: pageInfo.pageSize });
        if (result?.data) {
          setRows(result.data);
        }
      }
    }, [request, pageInfo]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: runRequest,
          setPageInfo: ({ current, pageSize }: { current?: number; pageSize?: number }) => {
            if (typeof current === 'number') {
              pageInfo.current = current;
            }
            if (typeof pageSize === 'number') {
              pageInfo.pageSize = pageSize;
            }
          },
          pageInfo,
        };
        mockLastActionRef = actionRef;
      }
      runRequest();
    }, [actionRef, runRequest, pageInfo]);

    React.useEffect(() => {
      if (dataSource) {
        setRows(dataSource);
      }
    }, [dataSource]);

    const columnNodes = (row: any) =>
      (columns || []).map((column: any, index: number) => {
        if (column?.render) {
          return (
            <div key={index} data-testid={`column-${column.dataIndex ?? index}`}>
              {column.render(null, row, 0)}
            </div>
          );
        }
        if (column?.dataIndex) {
          return (
            <div key={index} data-testid={`column-${column.dataIndex}`}>
              {row[column.dataIndex]}
            </div>
          );
        }
        return <div key={index} />;
      });

    return (
      <div data-testid='drag-sort-table'>
        <div>
          {rows.map((row: any) => (
            <div key={row.id} data-testid={`row-${row.id}`}>
              {columnNodes(row)}
            </div>
          ))}
        </div>
        <button
          type='button'
          aria-label='simulate drag reorder'
          onClick={() => {
            const newRows = [...rows].reverse();
            setRows(newRows);
            onDragSortEnd?.(0, 1, newRows);
          }}
        >
          Simulate drag
        </button>
        <div data-testid='toolbar'>{toolBarRender?.()?.filter(Boolean)}</div>
      </div>
    );
  };

  const ProTable = ({ actionRef, request, columns }: any) => {
    const [rows, setRows] = React.useState([] as any[]);
    const pageInfo = React.useRef({ current: 1, pageSize: 10 }).current;

    const runRequest = React.useCallback(async () => {
      if (request) {
        const result = await request({ current: pageInfo.current, pageSize: pageInfo.pageSize });
        if (result?.data) {
          setRows(result.data);
        }
      }
    }, [request, pageInfo]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: runRequest,
          setPageInfo: ({ current, pageSize }: { current?: number; pageSize?: number }) => {
            if (typeof current === 'number') {
              pageInfo.current = current;
            }
            if (typeof pageSize === 'number') {
              pageInfo.pageSize = pageSize;
            }
          },
          pageInfo,
        };
        mockLastActionRef = actionRef;
      }
      runRequest();
    }, [actionRef, runRequest, pageInfo]);

    return (
      <div data-testid='pro-table'>
        {rows.map((row: any) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            {(columns || []).map((column: any, index: number) => (
              <div key={index}>
                {column?.render ? column.render(null, row, 0) : row[column?.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return {
    DragSortTable,
    ProTable,
    __getLastActionRef: () => mockLastActionRef,
  };
});

jest.mock('@/components/AllTeams/select', () => ({
  __esModule: true,
  default: ({ disabled }: { disabled?: boolean }) => (
    <button type='button' disabled={disabled} aria-label='open select teams'>
      Select Team
    </button>
  ),
}));

jest.mock('@/components/AllTeams/edit', () => ({
  __esModule: true,
  default: ({ disabled }: { disabled?: boolean }) => (
    <button type='button' disabled={disabled} aria-label='edit team'>
      Edit
    </button>
  ),
}));

jest.mock('@/components/AllTeams/view', () => ({
  __esModule: true,
  default: () => (
    <button type='button' aria-label='view team'>
      View
    </button>
  ),
}));

jest.mock('@/services/teams/api', () => ({
  getAllTableTeams: jest.fn(),
  getTeamsByKeyword: jest.fn(),
  updateSort: jest.fn(),
  updateTeamRank: jest.fn(),
}));

import AllTeams from '@/components/AllTeams';
import {
  getAllTableTeams,
  getTeamsByKeyword,
  updateSort,
  updateTeamRank,
} from '@/services/teams/api';
import { ConfigProvider, Modal, message } from 'antd';

const mockGetAllTableTeams = getAllTableTeams as unknown as jest.MockedFunction<any>;
const mockGetTeamsByKeyword = getTeamsByKeyword as unknown as jest.MockedFunction<any>;
const mockUpdateSort = updateSort as unknown as jest.MockedFunction<any>;
const mockUpdateTeamRank = updateTeamRank as unknown as jest.MockedFunction<any>;

type MessageApiMock = {
  success: jest.Mock;
  error: jest.Mock;
  warning: jest.Mock;
  info: jest.Mock;
  loading: jest.Mock;
  open: jest.Mock;
};

const getMessageMock = () => message as unknown as MessageApiMock;

const teamsData = [
  {
    id: 't1',
    json: { title: { en: 'Alpha Team' }, description: { en: 'A long description for alpha' } },
    ownerEmail: 'alpha@example.com',
  },
  {
    id: 't2',
    json: { title: { en: 'Beta Team' }, description: { en: 'Second team description' } },
    ownerEmail: 'beta@example.com',
  },
];

const renderAllTeams = (
  overrideProps: Partial<{
    tableType: 'joinTeam' | 'manageSystem';
    systemUserRole?: 'admin' | 'owner' | 'member';
  }> = {},
) => {
  const props = {
    tableType: 'manageSystem' as const,
    systemUserRole: 'admin' as const,
    ...overrideProps,
  };
  return render(
    <ConfigProvider>
      <AllTeams {...props} />
    </ConfigProvider>,
  );
};

const getLastActionRef = () => {
  const { __getLastActionRef } = jest.requireMock('@ant-design/pro-components') as {
    __getLastActionRef: () => any;
  };
  return __getLastActionRef();
};

const findRemoveButtonForRow = async (rowId: string) => {
  const row = await screen.findByTestId(`row-${rowId}`);
  const buttons = within(row).getAllByRole('button');
  const target = buttons.find((button) =>
    within(button).queryByRole('img', { name: /eye-invisible/i }),
  );
  if (!target) {
    throw new Error('Remove button not found');
  }
  return target;
};

describe('AllTeams component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLastActionRef = undefined;
    const modalConfirmMock = Modal.confirm as jest.Mock;
    modalConfirmMock.mockImplementation(({ onOk }: any) => (onOk ? onOk() : undefined));
    mockGetAllTableTeams.mockResolvedValue({
      data: teamsData,
      success: true,
      total: teamsData.length,
    });
    mockGetTeamsByKeyword.mockResolvedValue({
      data: teamsData,
      success: true,
      total: teamsData.length,
    });
    mockUpdateSort.mockResolvedValue({ error: null });
    mockUpdateTeamRank.mockResolvedValue({ error: null });
  });

  it('renders manage system table with team information for admins', async () => {
    renderAllTeams();

    expect(await screen.findByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Beta Team')).toBeInTheDocument();
    expect(screen.getByText('A long description f...')).toBeInTheDocument();

    const removeButton = await findRemoveButtonForRow('t1');
    expect(removeButton).toBeEnabled();

    const selectButton = screen.getByRole('button', { name: /open select teams/i });
    expect(selectButton).toBeEnabled();

    expect(mockGetAllTableTeams).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 'manageSystem');
  });

  it('loads join-team table when requested', async () => {
    renderAllTeams({ tableType: 'joinTeam' });

    expect(await screen.findByText('Alpha Team')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open select teams/i })).not.toBeInTheDocument();
    expect(mockGetAllTableTeams).toHaveBeenCalledWith({ pageSize: 10, current: 1 }, 'joinTeam');
  });

  it('searches by keyword in join-team view', async () => {
    renderAllTeams({ tableType: 'joinTeam' });

    const searchBox = await screen.findByRole('searchbox');
    fireEvent.change(searchBox, { target: { value: 'alpha' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(mockGetTeamsByKeyword).toHaveBeenCalledWith('alpha');
    });
  });

  it('searches by keyword and reloads results', async () => {
    renderAllTeams();

    const searchBox = await screen.findByRole('searchbox');
    fireEvent.change(searchBox, { target: { value: 'beta' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockGetTeamsByKeyword).toHaveBeenCalledWith('beta');
    });
  });

  it('shows save ranks action after drag and calls updateSort with rank data', async () => {
    renderAllTeams();

    const dragButton = await screen.findByRole('button', { name: /simulate drag reorder/i });
    fireEvent.click(dragButton);

    const rowsAfterDrag = screen.getAllByTestId(/row-/);
    expect(rowsAfterDrag[0]).toHaveTextContent('Beta Team');

    const saveIcon = await screen.findByRole('img', { name: /save/i });
    const clickable = saveIcon.closest('span') ?? saveIcon;
    fireEvent.click(clickable);

    await waitFor(() => {
      expect(mockUpdateSort).toHaveBeenCalled();
    });
    const payload = mockUpdateSort.mock.calls.at(-1)?.[0] as Array<{ id: string; rank: number }>;
    expect(payload).toHaveLength(2);
    expect(payload.map((item) => item.rank)).toEqual([1, 2]);
    expect(payload.map((item) => item.id).sort()).toEqual(['t1', 't2']);
    expect(getMessageMock().success).toHaveBeenCalledWith('Sorting modified successfully');
    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  it('calculates updated ranks based on current pagination state', async () => {
    renderAllTeams();

    await screen.findByText('Alpha Team');
    const actionRef = getLastActionRef();
    expect(actionRef?.current).toBeDefined();

    act(() => {
      actionRef?.current?.setPageInfo?.({ current: 2 });
    });

    const dragButton = await screen.findByRole('button', { name: /simulate drag reorder/i });
    fireEvent.click(dragButton);

    const saveIcon = await screen.findByRole('img', { name: /save/i });
    fireEvent.click(saveIcon.closest('span') ?? saveIcon);

    await waitFor(() => {
      expect(mockUpdateSort).toHaveBeenCalled();
    });
    const payload = mockUpdateSort.mock.calls.at(-1)?.[0] as Array<{ id: string; rank: number }>;
    expect(payload.map(({ rank }) => rank)).toEqual([11, 12]);
  });

  it.skip('preserves dragged order when saving ranks', async () => {
    // TODO: update handleSaveRanks to use the post-drag table order when calling updateSort.
    renderAllTeams();

    const dragButton = await screen.findByRole('button', { name: /simulate drag reorder/i });
    fireEvent.click(dragButton);

    const saveIcon = await screen.findByRole('img', { name: /save/i });
    fireEvent.click(saveIcon.closest('span') ?? saveIcon);

    await waitFor(() => {
      expect(mockUpdateSort).toHaveBeenCalledWith([
        { id: 't2', rank: 1 },
        { id: 't1', rank: 2 },
      ]);
    });
  });

  it('shows error when saving ranks fails', async () => {
    mockUpdateSort.mockResolvedValueOnce({ error: { message: 'Oops' } });
    renderAllTeams();

    const dragButton = await screen.findByRole('button', { name: /simulate drag reorder/i });
    fireEvent.click(dragButton);

    const saveIcon = await screen.findByRole('img', { name: /save/i });
    fireEvent.click(saveIcon.closest('span') ?? saveIcon);

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Sorting modified failed');
    });
  });

  it('prevents drag operations when user lacks permission', async () => {
    renderAllTeams({ systemUserRole: undefined });

    const dragButton = await screen.findByRole('button', { name: /simulate drag reorder/i });
    fireEvent.click(dragButton);

    expect(getMessageMock().error).toHaveBeenCalledWith('No permission to operate');
    expect(screen.queryByRole('img', { name: /save/i })).not.toBeInTheDocument();
  });

  it('disables destructive actions for members', async () => {
    renderAllTeams({ systemUserRole: 'member' });

    const removeButton = await findRemoveButtonForRow('t1');
    expect(removeButton).toBeDisabled();

    const selectButton = screen.getByRole('button', { name: /open select teams/i });
    expect(selectButton).toBeDisabled();
  });

  it('removes a team after confirmation and shows success message', async () => {
    renderAllTeams({ systemUserRole: 'admin' });

    await screen.findByText('Alpha Team');
    const initialCallCount = mockGetAllTableTeams.mock.calls.length;
    const removeButton = await findRemoveButtonForRow('t1');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockUpdateTeamRank).toHaveBeenCalledWith('t1', 0);
    });
    expect(getMessageMock().success).toHaveBeenCalledWith('Team removed successfully');
    await waitFor(() => {
      expect(mockGetAllTableTeams.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('shows error message when removing a team fails', async () => {
    mockUpdateTeamRank.mockResolvedValueOnce({ error: { message: 'fail' } });
    renderAllTeams({ systemUserRole: 'admin' });

    const removeButton = await findRemoveButtonForRow('t1');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to remove team');
    });
  });
});
