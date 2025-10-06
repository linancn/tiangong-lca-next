import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
  getLangText: jest.fn((value: any) => (typeof value === 'string' ? value : value?.en || '')),
  getLang: jest.fn(() => 'en'),
}));

jest.mock('@/components/ToolBarButton', () => {
  const React = require('react') as typeof import('react');

  const extractText = (node: any): string => {
    if (node === null || node === undefined) {
      return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join('');
    }
    if (React.isValidElement(node)) {
      const elementProps = node.props as { children?: any };
      return extractText(elementProps.children);
    }
    return '';
  };

  return {
    __esModule: true,
    default: ({
      onClick,
      disabled,
      tooltip,
    }: {
      onClick: () => void;
      disabled?: boolean;
      tooltip?: any;
    }) => {
      const label = extractText(tooltip) || 'Select Team';
      return (
        <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled}>
          {label}
        </button>
      );
    },
  };
});

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  const React = require('react');
  const messageMock = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    open: jest.fn(),
  };
  const Drawer = ({ open, title, extra, footer, children }: any) => {
    if (!open) {
      return null;
    }
    return (
      <section role='dialog' aria-modal='true'>
        <header>
          <div>{typeof title === 'string' ? title : title}</div>
          <div>{extra}</div>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };
  return {
    ...actual,
    message: messageMock,
    Drawer,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react') as typeof import('react');

  const ProTable = ({ actionRef, request, columns = [], rowSelection }: any) => {
    const initialKeys = Array.isArray(rowSelection?.selectedRowKeys)
      ? (rowSelection.selectedRowKeys as string[])
      : [];
    const [rows, setRows] = React.useState<Record<string, any>[]>([]);
    const [selectedKeys, setSelectedKeys] = React.useState<string[]>(initialKeys);
    const pageInfoRef = React.useRef<{ current: number; pageSize: number }>({
      current: 1,
      pageSize: 10,
    });

    const reload = React.useCallback(async () => {
      if (request) {
        const result = await request(pageInfoRef.current);
        if (result?.data) {
          setRows(result.data);
        }
      }
    }, [request]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload,
          setPageInfo: ({ current, pageSize }: { current?: number; pageSize?: number }) => {
            if (typeof current === 'number') {
              pageInfoRef.current.current = current;
            }
            if (typeof pageSize === 'number') {
              pageInfoRef.current.pageSize = pageSize;
            }
          },
          pageInfo: pageInfoRef.current,
        };
      }
      void reload();
    }, [actionRef, reload]);

    React.useEffect(() => {
      if (rowSelection?.selectedRowKeys) {
        setSelectedKeys(rowSelection.selectedRowKeys as string[]);
      }
    }, [rowSelection?.selectedRowKeys]);

    const renderCell = (column: any, row: Record<string, any>) => {
      if (column?.render) {
        return column.render(null, row, 0);
      }
      if (column?.dataIndex) {
        return row[column.dataIndex];
      }
      return null;
    };

    const handleToggle = (row: Record<string, any>) => {
      const isSelected = selectedKeys.includes(row.id);
      const next = isSelected
        ? selectedKeys.filter((key: string) => key !== row.id)
        : [...selectedKeys, row.id];
      setSelectedKeys(next);
      rowSelection?.onChange?.(
        next,
        rows.filter((item: Record<string, any>) => next.includes(item.id)),
      );
    };

    return (
      <div>
        {rows.map((row: Record<string, any>) => {
          const titleColumn = columns.find((column: any) => column.dataIndex === 'title');
          const labelContent = renderCell(titleColumn, row);
          return (
            <div key={row.id}>
              <label>
                <input
                  type='checkbox'
                  checked={selectedKeys.includes(row.id)}
                  onChange={() => handleToggle(row)}
                />
                <span>{labelContent}</span>
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  return {
    ProTable,
  };
});

jest.mock('@/services/teams/api', () => ({
  getUnrankedTeams: jest.fn(),
  updateSort: jest.fn(),
}));

import SelectTeams from '@/components/AllTeams/select';
import { getUnrankedTeams, updateSort } from '@/services/teams/api';
import { message } from 'antd';

const mockGetUnrankedTeams = getUnrankedTeams as unknown as jest.MockedFunction<
  (params: { current: number; pageSize: number }) => Promise<any>
>;
const mockUpdateSort = updateSort as unknown as jest.MockedFunction<
  (updates: Array<{ id: string; rank: number }>) => Promise<any>
>;

type MessageApiMock = {
  success: jest.Mock;
  error: jest.Mock;
  warning: jest.Mock;
  info: jest.Mock;
  loading: jest.Mock;
  open: jest.Mock;
};

const getMessageMock = () => message as unknown as MessageApiMock;

const teamOptions = [
  {
    id: 'team-1',
    json: { title: { en: 'Alpha Team' }, description: { en: 'Alpha description' } },
    ownerEmail: 'alpha@example.com',
  },
  {
    id: 'team-2',
    json: { title: { en: 'Beta Team' }, description: { en: 'Beta description' } },
    ownerEmail: 'beta@example.com',
  },
];

type RenderSelectProps = Partial<{
  buttonType: 'default' | 'icon';
  disabled: boolean;
}>;

const renderSelectTeams = (props: RenderSelectProps = {}) => {
  const parentReload = jest.fn();
  const parentActionRef = {
    current: {
      reload: parentReload,
    },
  };

  render(<SelectTeams actionRef={parentActionRef as any} {...(props as any)} />);
  return { parentReload };
};

describe('SelectTeams component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUnrankedTeams.mockResolvedValue({
      data: teamOptions,
      success: true,
      total: teamOptions.length,
    });
    mockUpdateSort.mockResolvedValue({ error: null });
  });

  it('opens the drawer and loads unranked teams', async () => {
    const user = userEvent.setup();
    renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(mockGetUnrankedTeams).toHaveBeenCalledWith({ current: 1, pageSize: 10 });

    const alphaCheckbox = await screen.findByRole('checkbox', { name: 'Alpha Team' });
    const betaCheckbox = await screen.findByRole('checkbox', { name: 'Beta Team' });
    expect(alphaCheckbox).not.toBeChecked();
    expect(betaCheckbox).not.toBeChecked();
  });

  it('warns when confirming without any selection', async () => {
    const user = userEvent.setup();
    renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    expect(getMessageMock().warning).toHaveBeenCalledWith('Please select at least one team');
    expect(mockUpdateSort).not.toHaveBeenCalled();
  });

  it('adds selected teams and closes the drawer on success', async () => {
    const user = userEvent.setup();
    const { parentReload } = renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'Alpha Team' }));
    await user.click(await screen.findByRole('checkbox', { name: 'Beta Team' }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(mockUpdateSort).toHaveBeenCalledWith([
        { id: 'team-1', rank: 1 },
        { id: 'team-2', rank: 1 },
      ]);
    });

    expect(getMessageMock().success).toHaveBeenCalledWith('Team added successfully');
    expect(parentReload).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mockGetUnrankedTeams.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('shows an error message when the update fails', async () => {
    const user = userEvent.setup();
    mockUpdateSort.mockResolvedValueOnce({ error: { message: 'fail' } });
    renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'Alpha Team' }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('Failed to add team');
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles thrown errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateSort.mockRejectedValueOnce(new Error('network error'));
    renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'Alpha Team' }));
    await user.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(getMessageMock().error).toHaveBeenCalledWith('An error occurred during operation');
    });
    expect(getMessageMock().success).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('disables the icon button when not permitted', async () => {
    const user = userEvent.setup();
    renderSelectTeams({ buttonType: 'icon', disabled: true });

    const trigger = screen.getByRole('button', { name: /select team/i });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(mockGetUnrankedTeams).not.toHaveBeenCalled();
  });

  it('clears the selection when cancelled', async () => {
    const user = userEvent.setup();
    renderSelectTeams();

    await user.click(screen.getByRole('button', { name: /select team/i }));
    await user.click(await screen.findByRole('checkbox', { name: 'Alpha Team' }));
    await user.click(await screen.findByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /select team/i }));
    const alphaCheckbox = await screen.findByRole('checkbox', { name: 'Alpha Team' });
    expect(alphaCheckbox).not.toBeChecked();
  });
});
