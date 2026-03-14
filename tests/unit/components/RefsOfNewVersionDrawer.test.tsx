// @ts-nocheck
import RefsOfNewVersionDrawer from '@/components/RefsOfNewVersionDrawer';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLang: jest.fn(() => 'en'),
  getLangText: jest.fn((value: any) =>
    Array.isArray(value) ? (value[0]?.['#text'] ?? '') : (value?.['#text'] ?? value ?? ''),
  ),
}));

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
}));

jest.mock('antd', () => ({
  __esModule: true,
  Button: ({ children, onClick, disabled, icon }: any) => (
    <button
      type='button'
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick?.();
        }
      }}
    >
      {children ?? icon}
    </button>
  ),
  Drawer: ({ open, title, extra, children, footer, onClose }: any) =>
    open ? (
      <div role='dialog'>
        <h1>{title}</h1>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={() => onClose?.()}>
          drawer-close
        </button>
      </div>
    ) : null,
  Space: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: ({ dataSource = [], rowSelection, columns = [] }: any) => (
    <div data-testid='pro-table'>
      <button type='button' onClick={() => rowSelection?.onSelectAll?.(true, dataSource)}>
        select-all
      </button>
      {dataSource.map((row: any) => {
        const selected = rowSelection?.selectedRowKeys?.includes(row.key);
        return (
          <div key={row.key} data-testid={`row-${row.key}`}>
            <button
              type='button'
              onClick={() => rowSelection?.onSelect?.(row, !selected)}
            >{`${selected ? 'unselect' : 'select'}-${row.key}`}</button>
            {columns.map((column: any, index: number) => (
              <div key={index}>
                {column.render
                  ? column.render(row[column.dataIndex], row, index)
                  : row[column.dataIndex]}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  ),
}));

const rows = [
  {
    key: 'contact-v1',
    id: 'contact-1',
    type: 'contact',
    currentVersion: '01.00.000',
    newVersion: '01.00.001',
    description: [{ '@xml:lang': 'en', '#text': 'Contact v1' }],
  },
  {
    key: 'contact-v2',
    id: 'contact-1',
    type: 'contact',
    currentVersion: '01.00.001',
    newVersion: '01.00.002',
    description: [{ '@xml:lang': 'en', '#text': 'Contact v2' }],
  },
  {
    key: 'source-v1',
    id: 'source-1',
    type: 'source',
    currentVersion: '02.00.000',
    newVersion: '02.00.001',
    description: [{ '@xml:lang': 'en', '#text': 'Source v1' }],
  },
];

describe('RefsOfNewVersionDrawer', () => {
  it('does not render the drawer content when closed', () => {
    render(
      <RefsOfNewVersionDrawer
        open={false}
        dataSource={rows}
        onCancel={jest.fn()}
        onKeep={jest.fn()}
        onUpdate={jest.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders rows, handles close and keep actions, and enables updates only after selection', () => {
    const onCancel = jest.fn();
    const onKeep = jest.fn();

    render(
      <RefsOfNewVersionDrawer
        open
        dataSource={rows}
        onCancel={onCancel}
        onKeep={onKeep}
        onUpdate={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('References Newer Versions')).toBeInTheDocument();
    expect(screen.getByText('Contact v1')).toBeInTheDocument();

    const updateButton = screen.getByRole('button', { name: 'Update to latest versions' });
    expect(updateButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Keep current versions' }));
    expect(onKeep).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'drawer-close' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('replaces older selections with newer rows that share the same id before updating', () => {
    const onUpdate = jest.fn();

    render(
      <RefsOfNewVersionDrawer
        open
        dataSource={rows}
        onCancel={jest.fn()}
        onKeep={jest.fn()}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'select-contact-v1' }));
    fireEvent.click(screen.getByRole('button', { name: 'select-contact-v2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update to latest versions' }));

    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'contact-v2',
        id: 'contact-1',
      }),
    ]);
  });

  it('deduplicates rows by id when selecting all versions at once', () => {
    const onUpdate = jest.fn();

    render(
      <RefsOfNewVersionDrawer
        open
        dataSource={rows}
        onCancel={jest.fn()}
        onKeep={jest.fn()}
        onUpdate={onUpdate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'select-all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update to latest versions' }));

    expect(onUpdate).toHaveBeenCalledWith([
      expect.objectContaining({ key: 'contact-v2', id: 'contact-1' }),
      expect.objectContaining({ key: 'source-v1', id: 'source-1' }),
    ]);
  });
});
