// @ts-nocheck
import AssignmentReview from '@/pages/Review/Components/AssignmentReview';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../helpers/testUtils';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@/pages/Account/view', () => ({
  __esModule: true,
  default: ({ userId }: any) => <span data-testid='account-view'>{userId}</span>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span data-testid='lifecycle-view'>{`${id}:${version}`}</span>,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span data-testid='process-view'>{`${id}:${version}`}</span>,
}));

jest.mock('@/pages/Review/Components/RejectReview', () => ({
  __esModule: true,
  default: ({ reviewId }: any) => <span data-testid='reject-review'>{reviewId}</span>,
}));

jest.mock('@/pages/Review/Components/reviewLifeCycleModels', () => ({
  __esModule: true,
  default: ({ type, tabType, reviewId }: any) => (
    <span data-testid='review-lifecycle-detail'>{`${type}:${tabType}:${reviewId}`}</span>
  ),
}));

jest.mock('@/pages/Review/Components/reviewProcess', () => ({
  __esModule: true,
  default: ({ type, tabType, reviewId, hideButton }: any) => (
    <span data-testid='review-process-detail'>
      {`${type}:${tabType}:${reviewId}:${hideButton ? 'hide' : 'show'}`}
    </span>
  ),
}));

jest.mock('@/pages/Review/Components/ReviewProgress', () => ({
  __esModule: true,
  default: ({ reviewId, actionType }: any) => (
    <span data-testid='review-progress'>{`${reviewId}:${actionType}`}</span>
  ),
}));

jest.mock('@/pages/Review/Components/SelectReviewer', () => ({
  __esModule: true,
  default: ({ reviewIds, tabType }: any) => (
    <div data-testid='select-reviewer'>{`${tabType}:${JSON.stringify(reviewIds)}`}</div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ children }: any) => <div>{children}</div>;
  const Table = ({ columns = [], dataSource = [] }: any) => (
    <div data-testid='subtable'>
      {dataSource.map((row: any) => (
        <div key={row.id}>
          {columns.map((column: any, index: number) => (
            <div key={index}>
              {column.render
                ? column.render(row[column.dataIndex], row, index)
                : row[column.dataIndex]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const Search = ({ placeholder }: any) => (
    <input data-testid='search-input' placeholder={placeholder} />
  );
  const Input: any = {};
  Input.Search = Search;

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff', fontSize: 14 } }),
  };

  return {
    __esModule: true,
    Card,
    Col,
    Input,
    Row,
    Space,
    Spin,
    Table,
    theme,
  };
});

const MockProTable = ({
  request,
  actionRef,
  rowSelection,
  toolBarRender,
  headerTitle,
  columns,
  expandable,
}: any) => {
  const React = require('react');
  const [rows, setRows] = React.useState<any[]>([]);
  const requestRef = React.useRef(request);
  const actionRefRef = React.useRef(actionRef);

  requestRef.current = request;
  actionRefRef.current = actionRef;

  React.useEffect(() => {
    const reload = jest.fn(async () => {
      const result = await requestRef.current?.({ pageSize: 10, current: 1 }, {});
      setRows(result?.data ?? []);
      return result;
    });

    if (actionRefRef.current) {
      actionRefRef.current.current = { reload };
    }

    reload();
  }, []);

  return (
    <section data-testid='protable'>
      <div data-testid='header-title'>{headerTitle}</div>
      <div data-testid='toolbar'>{toolBarRender?.()}</div>
      {rows.map((row) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {columns.map((column: any, index: number) => (
            <div key={index}>
              {column.render
                ? column.render(row[column.dataIndex], row, index)
                : row[column.dataIndex]}
            </div>
          ))}
          {rowSelection && (
            <button type='button' onClick={() => rowSelection.onChange?.([row.id])}>
              {`select-${row.id}`}
            </button>
          )}
          {expandable?.rowExpandable?.(row) && (
            <button type='button' onClick={() => expandable.onExpand?.(true, row)}>
              {`expand-${row.id}`}
            </button>
          )}
          {expandable?.expandedRowKeys?.includes(row.id) && (
            <div data-testid={`expanded-${row.id}`}>{expandable.expandedRowRender?.(row)}</div>
          )}
        </div>
      ))}
    </section>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <MockProTable {...props} />,
}));

const mockGetLifeCycleModelSubTableDataBatch = jest.fn();
const mockGetReviewsTableDataOfReviewAdmin = jest.fn();
const mockGetReviewsTableDataOfReviewMember = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getLifeCycleModelSubTableDataBatch: (...args: any[]) =>
    mockGetLifeCycleModelSubTableDataBatch(...args),
  getReviewsTableDataOfReviewAdmin: (...args: any[]) =>
    mockGetReviewsTableDataOfReviewAdmin(...args),
  getReviewsTableDataOfReviewMember: (...args: any[]) =>
    mockGetReviewsTableDataOfReviewMember(...args),
}));

describe('AssignmentReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLifeCycleModelSubTableDataBatch.mockResolvedValue({
      success: true,
      data: {
        'review-1': [
          {
            id: 'process-1',
            name: 'Process 1',
            version: '1.0.0',
            sourceType: 'processInstance',
          },
        ],
      },
    });
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'review-1',
          name: 'Model Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          modelData: { id: 'model-1', version: '1.0.0' },
          json: {
            data: { id: 'model-1', version: '1.0.0' },
            user: { id: 'user-0' },
          },
        },
      ],
      total: 1,
    });
    mockGetReviewsTableDataOfReviewMember.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'review-2',
          name: 'Process Review',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          json: {
            data: { id: 'process-2', version: '2.0.0' },
            user: { id: 'user-2' },
          },
        },
      ],
      total: 1,
    });
  });

  it('loads unassigned admin data, shows reviewer selection toolbar, and expands preloaded sub tables', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='unassigned'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewAdmin).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'unassigned',
        'en',
      ),
    );
    await waitFor(() =>
      expect(mockGetLifeCycleModelSubTableDataBatch).toHaveBeenCalledWith(
        [
          {
            reviewId: 'review-1',
            modelData: { id: 'model-1', version: '1.0.0' },
          },
        ],
        'en',
      ),
    );

    expect(screen.getByTestId('search-input')).toHaveAttribute(
      'placeholder',
      'pages.search.keyWord',
    );
    expect(screen.getByTestId('reject-review')).toHaveTextContent('review-1');

    await userEvent.click(screen.getByRole('button', { name: 'select-review-1' }));
    expect(screen.getByTestId('select-reviewer')).toHaveTextContent('unassigned:["review-1"]');

    await userEvent.click(screen.getByRole('button', { name: 'expand-review-1' }));
    await waitFor(() => expect(screen.getByText('Process 1')).toBeInTheDocument());
  });

  it('loads reviewer pending data without the top search card and renders process review actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='pending'
        actionRef={actionRef}
        actionFrom='reviewMember'
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewMember).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'pending',
        'en',
        { user_id: 'member-1' },
      ),
    );

    await waitFor(() => expect(screen.getByTestId('row-review-2')).toBeInTheDocument());
    expect(screen.queryByTestId('search-input')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('review-process-detail')[0]).toHaveTextContent(
      'edit:review:review-2:show',
    );
    expect(screen.getAllByTestId('review-process-detail')[1]).toHaveTextContent(
      'view:review:review-2:hide',
    );
  });

  it('loads assigned admin data and renders lifecycle review progress actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-3',
          name: 'Assigned Model Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          comments: [{ state_code: 0 }, { state_code: 1 }, { state_code: -1 }],
          json: {
            data: { id: 'model-3', version: '3.0.0' },
            user: { id: 'user-3' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='assigned'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewAdmin).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'assigned',
        'en',
      ),
    );

    await waitFor(() => expect(screen.getByTestId('row-review-3')).toBeInTheDocument());
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByTestId('review-lifecycle-detail')).toHaveTextContent(
      'view:assigned:review-3',
    );
    expect(screen.getByTestId('review-progress')).toHaveTextContent('review-3:model');
  });

  it('renders rejected review tables as view-only actions for reviewer members', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-4',
          name: 'Rejected Process Review',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          json: {
            data: { id: 'process-4', version: '4.0.0' },
            user: { id: 'user-4' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewer-rejected'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewMember).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'reviewer-rejected',
        'en',
        undefined,
      ),
    );

    await waitFor(() => expect(screen.getByTestId('row-review-4')).toBeInTheDocument());
    expect(screen.getByTestId('review-process-detail')).toHaveTextContent(
      'view:reviewer-rejected:review-4:hide',
    );
  });

  it('renders admin rejected lifecycle items as view-only actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-5',
          name: 'Rejected Model Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          json: {
            data: { id: 'model-5', version: '5.0.0' },
            user: { id: 'user-5' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='admin-rejected'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewAdmin).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'admin-rejected',
        'en',
      ),
    );

    await waitFor(() => expect(screen.getByTestId('row-review-5')).toBeInTheDocument());
    expect(screen.getByTestId('review-lifecycle-detail')).toHaveTextContent(
      'view:admin-rejected:review-5',
    );
  });

  it('returns an empty table without hitting review APIs when user role is missing', async () => {
    const actionRef = { current: { reload: jest.fn() } };

    render(<AssignmentReview userData={null} tableType='pending' actionRef={actionRef} />);

    await waitFor(() => expect(screen.getByTestId('protable')).toBeInTheDocument());
    expect(mockGetReviewsTableDataOfReviewAdmin).not.toHaveBeenCalled();
    expect(mockGetReviewsTableDataOfReviewMember).not.toHaveBeenCalled();
    expect(screen.queryByTestId('row-review-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('row-review-2')).not.toBeInTheDocument();
  });
});
