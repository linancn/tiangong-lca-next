// @ts-nocheck
import ReviewProgress from '@/pages/Review/Components/ReviewProgress';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  ProfileOutlined: () => <span data-testid='icon-view-progress' />,
}));

jest.mock('antd', () => {
  const Button = ({ children, onClick, icon, shape, size, type, ...rest }: any) => (
    <button
      type='button'
      onClick={onClick}
      data-shape={shape}
      data-size={size}
      data-type={type}
      {...rest}
    >
      {icon}
      {toText(children)}
    </button>
  );
  const Tooltip = ({ children, title }: any) => <span title={toText(title)}>{children}</span>;
  const Drawer = ({ open, children, title, extra, footer, onClose }: any) =>
    open ? (
      <section data-testid='drawer' data-footer-present={String(Boolean(footer))}>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
        <button type='button' data-testid='drawer-close' onClick={onClose}>
          close-drawer
        </button>
      </section>
    ) : null;
  return {
    __esModule: true,
    Button,
    Drawer,
    Tag: ({ children }: any) => <span data-testid='tag'>{children}</span>,
    Tooltip,
  };
});

let latestColumns: any[] = [];
let latestTableProps: any;
const ProTable = ({ columns, request, rowKey, toolBarRender, ...props }: any) => {
  const [rows, setRows] = React.useState<any[]>([]);
  latestColumns = columns;
  latestTableProps = { ...props, toolBarRender };
  React.useEffect(() => {
    void request?.().then((result: any) => setRows(result?.data ?? []));
  }, []);
  return (
    <div data-testid='reviewer-table'>
      {toolBarRender?.()}
      {rows.map((row) => (
        <div key={row[rowKey]} data-testid={`reviewer-row-${row.reviewer_id}`}>
          {columns.map((column: any, index: number) => (
            <span key={index}>
              {column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex]}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <ProTable {...props} />,
}));

const mockGetCommentApi = jest.fn();
jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
}));

const mockGetUsersByIds = jest.fn();
jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

describe('ReviewProgress read-only drawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestColumns = [];
    latestTableProps = undefined;
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-pending',
          reviewer_id: 'user-pending',
          state_code: 0,
          modified_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-rejected',
          reviewer_id: 'user-rejected',
          state_code: -3,
          modified_at: '2024-01-02T00:00:00Z',
          json: { comment: { message: 'Detailed rejection note' } },
        },
        {
          id: 'row-revoked',
          reviewer_id: 'user-revoked',
          state_code: -2,
          json: {},
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-pending', display_name: 'Reviewer One' },
      { id: 'user-rejected', display_name: 'Reviewer Two' },
    ]);
  });

  const open = () => {
    render(<ReviewProgress reviewId='review-1' />);
    const viewButton = screen.getByRole('button', { name: 'View review progress' });
    expect(viewButton).toHaveAttribute('data-shape', 'circle');
    expect(viewButton).toHaveAttribute('data-type', 'text');
    expect(screen.getByTestId('icon-view-progress')).toBeInTheDocument();
    fireEvent.click(viewButton);
  };

  it('shows current reviewer status, rejection reason, and time without edit controls', async () => {
    open();

    await waitFor(() => expect(screen.getByText('Reviewer One')).toBeInTheDocument());
    expect(mockGetCommentApi).toHaveBeenCalledWith('review-1', 'assigned');
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-pending', 'user-rejected']);
    expect(screen.getByText('Reviewer Two')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Detailed rejection note')).toBeInTheDocument();
    expect(screen.queryByTestId('reviewer-row-user-revoked')).not.toBeInTheDocument();
    expect(latestColumns.map((column) => column.dataIndex)).toEqual([
      'index',
      'reviewer_name',
      'state_code',
      'comment',
      'modified_at',
    ]);
    expect(latestTableProps).toMatchObject({ search: false, pagination: false, options: false });
    expect(latestTableProps.toolBarRender).toBeUndefined();
    expect(screen.getByTestId('drawer')).toHaveAttribute('data-footer-present', 'false');
    expect(screen.queryByRole('button', { name: 'Approve Review' })).not.toBeInTheDocument();
    expect(screen.queryByText('Assign for review')).not.toBeInTheDocument();
  });

  it('keeps the status and rejection-comment display branches', async () => {
    open();
    await waitFor(() => expect(latestColumns).toHaveLength(5));
    const statusRender = latestColumns.find((column) => column.dataIndex === 'state_code').render;
    const commentRender = latestColumns.find((column) => column.dataIndex === 'comment').render;

    expect(toText(statusRender(null, { state_code: -3 }))).toBe('Rejected');
    expect(toText(statusRender(null, { state_code: 1 }))).toBe('Approved');
    expect(toText(statusRender(null, { state_code: 99 }))).toBe('Unknown Status');
    expect(
      commentRender(null, { state_code: 0, json: { comment: { message: 'ignored' } } }),
    ).toBeNull();
    expect(commentRender(null, { state_code: -3, json: { comment: null } })).toBeNull();
    expect(
      toText(
        commentRender(null, { state_code: -3, json: { comment: '{"message":"String note"}' } }),
      ),
    ).toContain('String note');
    expect(
      toText(
        commentRender(null, { state_code: -3, json: { comment: { message: 'Object note' } } }),
      ),
    ).toContain('Object note');
    expect(
      toText(commentRender(null, { state_code: -3, json: { reason: 'Simple review note' } })),
    ).toContain('Simple review note');
    expect(commentRender(null, { state_code: -3, json: { comment: '{}' } })).toBeNull();
    expect(commentRender(null, { state_code: -3, json: { comment: {} } })).toBeNull();
    expect(commentRender(null, { state_code: -3, json: { comment: 'invalid json' } })).toBeNull();
  });

  it('limits long review opinions to a scrollable tooltip without changing the table preview', async () => {
    open();
    await waitFor(() => expect(latestColumns).toHaveLength(5));
    const commentRender = latestColumns.find((column) => column.dataIndex === 'comment').render;
    const longOpinion = 'Long rejection opinion '.repeat(100);
    const tooltip = commentRender(null, {
      state_code: -3,
      json: { comment: { message: longOpinion } },
    });

    expect(tooltip.props.styles.root.maxWidth).toBe('min(420px, calc(100vw - 32px))');
    expect(tooltip.props.title.props.style).toMatchObject({
      maxHeight: 'min(360px, 50vh)',
      overflowY: 'auto',
      overflowWrap: 'anywhere',
      whiteSpace: 'pre-wrap',
    });
    expect(tooltip.props.title.props.children).toBe(longOpinion);
    expect(tooltip.props.children.props.style).toMatchObject({
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });
  });

  it('handles empty and failed loads and closes by either control', async () => {
    mockGetCommentApi.mockResolvedValueOnce({ data: [] });
    open();
    await waitFor(() => expect(mockGetCommentApi).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Reviewer One')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('icon-close').closest('button') as HTMLButtonElement);
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCommentApi.mockRejectedValueOnce(new Error('load failed'));
    fireEvent.click(screen.getByRole('button', { name: 'View review progress' }));
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));
    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
