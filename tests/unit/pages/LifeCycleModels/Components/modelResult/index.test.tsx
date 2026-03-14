// @ts-nocheck
import ModelResult from '@/pages/LifeCycleModels/Components/modelResult';
import userEvent from '@testing-library/user-event';
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

const mockGetProcessesByIdAndVersion = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProductOutlined: () => <span>product-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const ConfigProvider = ({ children }: any) => <div>{children}</div>;

  const Button = ({ children, onClick, disabled = false, icon, ...rest }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ title, children }: any) => {
    const label = toText(title);
    if (React.isValidElement(children)) {
      return React.cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      });
    }
    return <span title={label}>{children}</span>;
  };

  const Drawer = ({ open, title, extra, children, onClose }: any) => {
    if (!open) return null;
    return (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
        <button type='button' onClick={onClose}>
          mask-close
        </button>
      </section>
    );
  };

  return {
    __esModule: true,
    Button,
    ConfigProvider,
    Drawer,
    Tooltip,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ actionRef, request, columns = [], headerTitle }: any) => {
    const [rows, setRows] = React.useState<any[]>([]);

    const load = React.useCallback(async () => {
      const result = await request({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
    }, [request]);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: load,
          setPageInfo: jest.fn(),
        };
      }
      void load();
    }, [actionRef, load]);

    return (
      <section data-testid='pro-table'>
        <h2>{toText(headerTitle)}</h2>
        {rows.map((row, rowIndex) => (
          <div key={`${row.id}-${rowIndex}`}>
            {columns.map((column: any, columnIndex: number) => (
              <div key={`${row.id}-${columnIndex}`}>
                {column.render ? column.render(undefined, row) : row[column.dataIndex]}
              </div>
            ))}
          </div>
        ))}
      </section>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('@/pages/Processes/Components/edit', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <div data-testid='process-edit'>{`edit:${id}:${version}`}</div>
  ),
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => (
    <div data-testid='process-view'>{`view:${id}:${version}`}</div>
  ),
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessesByIdAndVersion: (...args: any[]) => mockGetProcessesByIdAndVersion(...args),
}));

describe('ModelResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcessesByIdAndVersion.mockImplementation(async (items: any[], lang: string) => ({
      data: items.map((item) => ({
        id: item.id,
        version: item.id === 'model-1' ? undefined : item.version,
        name: `${lang}-${item.id}`,
        generalComment: `comment-${item.id}`,
        modifiedAt: '2024-01-01 00:00',
      })),
      success: true,
    }));
  });

  it('loads main and sub process tables and renders edit actions in edit mode', async () => {
    renderWithProviders(
      <ModelResult
        submodels={[
          { id: 'model-1', version: '0.9.0' },
          { id: 'sub-1', version: '0.8.0' },
          { id: 'sub-2', version: '0.7.0' },
        ]}
        modelId='model-1'
        modelVersion='1.0.0'
        lang='en'
        actionType='edit'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /model result/i }));

    expect(screen.getByRole('dialog', { name: /model results/i })).toBeInTheDocument();

    await waitFor(() => expect(mockGetProcessesByIdAndVersion).toHaveBeenCalledTimes(2));
    expect(mockGetProcessesByIdAndVersion).toHaveBeenNthCalledWith(
      1,
      [{ id: 'model-1', version: '1.0.0' }],
      'en',
    );
    expect(mockGetProcessesByIdAndVersion).toHaveBeenNthCalledWith(
      2,
      [
        { id: 'sub-1', version: '1.0.0' },
        { id: 'sub-2', version: '1.0.0' },
      ],
      'en',
    );

    await waitFor(() => expect(screen.getAllByTestId('process-view')).toHaveLength(3));
    expect(screen.getAllByTestId('process-edit')).toHaveLength(3);
    expect(screen.getByText('view:model-1:1.0.0')).toBeInTheDocument();
    expect(screen.getByText('edit:sub-2:1.0.0')).toBeInTheDocument();
  });

  it('renders view-only actions in view mode and closes cleanly', async () => {
    renderWithProviders(
      <ModelResult
        submodels={[
          { id: 'model-1', version: '0.9.0' },
          { id: 'sub-1', version: '0.8.0' },
        ]}
        modelId='model-1'
        modelVersion='1.0.0'
        lang='en'
        actionType='view'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /model result/i }));
    expect(await screen.findByRole('dialog', { name: /model results/i })).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByTestId('process-view')).toHaveLength(2));
    expect(screen.queryByTestId('process-edit')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /close-icon/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requests an empty submodel table when only the main model is present', async () => {
    renderWithProviders(
      <ModelResult
        submodels={[{ id: 'model-1', version: '0.9.0' }]}
        modelId='model-1'
        modelVersion='1.0.0'
        lang='en'
        actionType='view'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /model result/i }));

    expect(await screen.findByRole('dialog', { name: /model results/i })).toBeInTheDocument();

    await waitFor(() => expect(mockGetProcessesByIdAndVersion).toHaveBeenCalledTimes(2));
    expect(mockGetProcessesByIdAndVersion).toHaveBeenNthCalledWith(
      1,
      [{ id: 'model-1', version: '1.0.0' }],
      'en',
    );
    expect(mockGetProcessesByIdAndVersion).toHaveBeenNthCalledWith(2, [], 'en');

    await waitFor(() => expect(screen.getAllByTestId('process-view')).toHaveLength(1));
    expect(screen.queryByTestId('process-edit')).not.toBeInTheDocument();
  });

  it('reloads both tables again when reopened after closing', async () => {
    renderWithProviders(
      <ModelResult
        submodels={[
          { id: 'model-1', version: '0.9.0' },
          { id: 'sub-1', version: '0.8.0' },
        ]}
        modelId='model-1'
        modelVersion='1.0.0'
        lang='en'
        actionType='view'
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /model result/i }));
    expect(await screen.findByRole('dialog', { name: /model results/i })).toBeInTheDocument();
    await waitFor(() => expect(mockGetProcessesByIdAndVersion).toHaveBeenCalledTimes(2));

    await userEvent.click(screen.getByRole('button', { name: /mask-close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /model result/i }));
    expect(await screen.findByRole('dialog', { name: /model results/i })).toBeInTheDocument();

    await waitFor(() => expect(mockGetProcessesByIdAndVersion).toHaveBeenCalledTimes(6));
  });
});
