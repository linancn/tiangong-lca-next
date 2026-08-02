// @ts-nocheck
import AssignmentReview, {
  isReferenceMatchingReviewTab,
} from '@/pages/Review/Components/AssignmentReview';
import { LOCALE_CAPABILITY_MATRIX } from '@/services/general/localeCapabilities';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../helpers/testUtils';

let mockLocale = 'en-US';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useIntl: () => ({
    locale: mockLocale,
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

jest.mock('@/pages/Review/Components/SimpleReviewActions', () => ({
  __esModule: true,
  default: ({ reviewId, role, targetTable, actionRef }: any) => (
    <button
      type='button'
      data-testid='simple-review-actions'
      onClick={() => actionRef?.current?.reload?.()}
    >
      {`${reviewId}:${role}:${targetTable}`}
    </button>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Card = ({ children }: any) => <section>{children}</section>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Row = ({ children }: any) => <div>{children}</div>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ children }: any) => <div data-testid='spin'>{children}</div>;
  const Table = ({ columns = [], dataSource = [] }: any) => (
    <div data-testid='subtable'>
      {dataSource.map((row: any) => (
        <div
          key={row.id ?? row.reference_review_id}
          data-testid={`subrow-${row.id ?? row.reference_review_id}`}
        >
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

  const Search = ({ placeholder, onSearch }: any) => (
    <div>
      <input data-testid='search-input' placeholder={placeholder} />
      <button type='button' onClick={() => onSearch?.('keyword', {}, { source: 'manual' })}>
        trigger-search
      </button>
    </div>
  );
  const Input: any = {};
  Input.Search = Search;

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff', fontSize: 14 } }),
  };
  const Tag = ({ children, color }: any) => <span data-color={color}>{children}</span>;

  return {
    __esModule: true,
    Card,
    Col,
    Input,
    Row,
    Space,
    Spin,
    Table,
    Tag,
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
            <button
              type='button'
              disabled={rowSelection.getCheckboxProps?.(row)?.disabled}
              onClick={() => rowSelection.onChange?.([row.id])}
            >
              {`select-${row.id}`}
            </button>
          )}
          {expandable?.rowExpandable?.(row) && (
            <button type='button' onClick={() => expandable.onExpand?.(true, row)}>
              {`expand-${row.id}`}
            </button>
          )}
          {expandable?.expandedRowKeys?.includes(row.id) && (
            <div data-testid={`expanded-${row.id}`}>
              {expandable.expandedRowRender?.(row)}
              <button type='button' onClick={() => expandable.onExpand?.(false, row)}>
                {`collapse-${row.id}`}
              </button>
            </div>
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

const mockGetRootReviewReferenceProgress = jest.fn();
const mockGetReviewsTableDataOfReviewAdmin = jest.fn();
const mockGetReviewsTableDataOfReviewMember = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getRootReviewReferenceProgress: (...args: any[]) => mockGetRootReviewReferenceProgress(...args),
  getReviewsTableDataOfReviewAdmin: (...args: any[]) =>
    mockGetReviewsTableDataOfReviewAdmin(...args),
  getReviewsTableDataOfReviewMember: (...args: any[]) =>
    mockGetReviewsTableDataOfReviewMember(...args),
}));

describe('AssignmentReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = 'en-US';
    mockGetRootReviewReferenceProgress.mockResolvedValue({
      data: [
        {
          reference_review_id: 'reference-review-1',
          target_table: 'flows',
          data_id: 'flow-1',
          data_version: '1.0.0',
          data_name: {
            baseName: { en: 'Reference Flow' },
          },
          state_code: 1,
          completed_reviewer_count: 1,
          reviewer_count: 2,
          relation_paths: [{ path: ['process', 'flow'] }],
        },
      ],
      error: null,
    });
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'review-1',
          name: 'Model Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          reviewKind: 'root',
          targetTable: 'lifecyclemodels',
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
          reviewKind: 'root',
          targetTable: 'processes',
          json: {
            data: { id: 'process-2', version: '2.0.0' },
            user: { id: 'user-2' },
          },
        },
      ],
      total: 1,
    });
  });

  it.each([
    ['unassigned', { state_code: 0 }, true],
    ['assigned', { state_code: 1 }, true],
    ['admin-rejected', { state_code: -1 }, true],
    ['pending', { state_code: 1, actor_comment_state_code: 0 }, true],
    ['pending', { state_code: 0, actor_comment_state_code: 0 }, false],
    ['reviewed', { state_code: 1, actor_comment_state_code: 1 }, true],
    ['reviewed', { state_code: 0, actor_comment_state_code: 1 }, false],
    ['reviewer-rejected', { state_code: -1, actor_comment_state_code: -1 }, true],
    ['reviewer-rejected', { state_code: 1, actor_comment_state_code: -1 }, false],
    ['unsupported', { state_code: 1 }, false],
  ])('matches reference state against the %s tab', (tableType, record, expected) => {
    expect(isReferenceMatchingReviewTab(record as any, tableType as any)).toBe(expected);
  });

  it.each(
    LOCALE_CAPABILITY_MATRIX.map(({ appLocale, contentLanguage }) => [appLocale, contentLanguage]),
  )(
    'uses registry content language %s -> %s for review requests',
    async (appLocale, languageCode) => {
      mockLocale = appLocale;
      render(
        <AssignmentReview
          userData={{ user_id: 'admin-1', role: 'review-admin' }}
          tableType='unassigned'
          actionRef={{ current: { reload: jest.fn() } }}
        />,
      );

      await waitFor(() =>
        expect(mockGetReviewsTableDataOfReviewAdmin).toHaveBeenCalledWith(
          { pageSize: 10, current: 1 },
          {},
          'unassigned',
          languageCode,
        ),
      );
    },
  );

  it('reloads the same table instance and clears root-reference expansion after locale changes', async () => {
    const actionRef = { current: undefined };
    const { rerender } = render(
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
    await userEvent.click(await screen.findByRole('button', { name: 'expand-review-1' }));
    await waitFor(() =>
      expect(mockGetRootReviewReferenceProgress).toHaveBeenCalledWith('review-1'),
    );
    expect(screen.getByTestId('expanded-review-1')).toBeInTheDocument();

    mockLocale = 'de-DE';
    rerender(
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
        'de',
      ),
    );
    expect(screen.getAllByTestId('protable')).toHaveLength(1);
    await waitFor(() => expect(screen.queryByTestId('expanded-review-1')).not.toBeInTheDocument());
  });

  it('loads unassigned admin data, shows reviewer selection toolbar, and expands references', async () => {
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
    expect(screen.getByTestId('search-input')).toHaveAttribute(
      'placeholder',
      'pages.search.keyWord',
    );
    await userEvent.click(screen.getByRole('button', { name: 'trigger-search' }));
    expect(screen.getByTestId('reject-review')).toHaveTextContent('review-1');

    await userEvent.click(screen.getByRole('button', { name: 'select-review-1' }));
    expect(screen.getByTestId('select-reviewer')).toHaveTextContent('unassigned:["review-1"]');

    await userEvent.click(screen.getByRole('button', { name: 'expand-review-1' }));
    await waitFor(() =>
      expect(mockGetRootReviewReferenceProgress).toHaveBeenCalledWith('review-1'),
    );
    expect(screen.getByText('flows')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('In review')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.queryByText('{"path":["process","flow"]}')).not.toBeInTheDocument();
  });

  it('keeps a root in the unassigned tab for a matching child while isolating root actions', async () => {
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'root-assigned-child-unassigned',
          name: 'Assigned root',
          userName: 'Owner',
          isFromLifeCycle: false,
          reviewKind: 'root',
          targetTable: 'processes',
          rootMatchesStatus: false,
          json: {
            data: { id: 'process-root', version: '1.0.0' },
            user: { id: 'owner-1' },
          },
        },
      ],
      total: 1,
    });
    mockGetRootReviewReferenceProgress.mockResolvedValueOnce({
      data: [
        {
          reference_review_id: 'reference-unassigned-only',
          target_table: 'flows',
          data_id: 'flow-unassigned',
          data_version: '1.0.0',
          data_name: { baseName: { en: 'Unassigned flow' } },
          state_code: 0,
          completed_reviewer_count: 0,
          reviewer_count: 0,
        },
      ],
      error: null,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='unassigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const rootSelection = await screen.findByRole('button', {
      name: 'select-root-assigned-child-unassigned',
    });
    expect(rootSelection).toBeDisabled();
    expect(screen.queryByTestId('reject-review')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'expand-root-assigned-child-unassigned' }),
    );

    expect(await screen.findByText('Current tab')).toBeInTheDocument();
    expect(screen.getByTestId('select-reviewer')).toHaveTextContent(
      'unassigned:["reference-unassigned-only"]',
    );
    expect(screen.getByTestId('reject-review')).toHaveTextContent('reference-unassigned-only');
  });

  it('renders one shared reference review under each related root with the same review id', async () => {
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: ['root-a', 'root-b'].map((id) => ({
        id,
        name: id,
        userName: 'Owner',
        isFromLifeCycle: false,
        reviewKind: 'root',
        targetTable: 'processes',
        rootMatchesStatus: false,
        json: {
          data: { id: `process-${id}`, version: '1.0.0' },
          user: { id: 'owner-1' },
        },
      })),
      total: 2,
    });
    mockGetRootReviewReferenceProgress.mockImplementation(async () => ({
      data: [
        {
          reference_review_id: 'shared-reference-review',
          target_table: 'sources',
          data_id: 'shared-source',
          data_version: '2.0.0',
          data_name: { baseName: { en: 'Shared source' } },
          state_code: 1,
          completed_reviewer_count: 0,
          reviewer_count: 1,
        },
      ],
      error: null,
    }));

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'expand-root-a' }));
    await userEvent.click(screen.getByRole('button', { name: 'expand-root-b' }));

    await waitFor(() =>
      expect(screen.getAllByTestId('subrow-shared-reference-review')).toHaveLength(2),
    );
    expect(mockGetRootReviewReferenceProgress).toHaveBeenNthCalledWith(1, 'root-a');
    expect(mockGetRootReviewReferenceProgress).toHaveBeenNthCalledWith(2, 'root-b');
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
          comments: [{ state_code: 0 }, { state_code: 1 }, { state_code: -3 }, { state_code: -2 }],
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
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByTestId('review-lifecycle-detail')).toHaveTextContent(
      'view:assigned:review-3',
    );
    expect(screen.getByTestId('review-progress')).toHaveTextContent('review-3:model');
  });

  it('loads assigned process reviews, falls back to zero progress without comments, and renders process actions', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-3b',
          name: 'Assigned Process Review',
          userName: 'Owner',
          isFromLifeCycle: false,
          json: {
            data: { id: 'process-3b', version: '3.1.0' },
            user: { id: 'user-3b' },
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

    await waitFor(() => expect(screen.getByTestId('row-review-3b')).toBeInTheDocument());
    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByTestId('review-process-detail')).toHaveTextContent(
      'view:assigned:review-3b:show',
    );
    expect(screen.getByTestId('review-progress')).toHaveTextContent('review-3b:process');
  });

  it('renders simple root-data actions for an assigned admin review', async () => {
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-contact',
          name: 'Contact Review',
          userName: 'Owner',
          isFromLifeCycle: false,
          reviewKind: 'root',
          targetTable: 'contacts',
          json: {
            data: { id: 'contact-1', version: '1.0.0' },
            user: { id: 'contact-owner' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    expect(await screen.findByTestId('simple-review-actions')).toHaveTextContent(
      'review-contact:admin:contacts',
    );
    expect(screen.getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/mydata/contacts?id=contact-1&version=1.0.0&mode=view',
    );
  });

  it('renders simple actions for a pending reference review', async () => {
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'root-for-flow-reference',
          name: 'Process root',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          reviewKind: 'root',
          targetTable: 'processes',
          rootMatchesStatus: false,
          rootCanRead: false,
          json: {
            data: { id: 'process-1', version: '2.0.0' },
            user: { id: 'process-owner' },
          },
        },
      ],
      total: 1,
    });
    mockGetRootReviewReferenceProgress.mockResolvedValueOnce({
      data: [
        {
          reference_review_id: 'review-flow-reference',
          target_table: 'flows',
          data_id: 'flow-1',
          data_version: '2.0.0',
          data_name: { baseName: { en: 'Flow Reference Review' } },
          state_code: 1,
          actor_comment_state_code: 0,
          completed_reviewer_count: 0,
          reviewer_count: 1,
        },
      ],
      error: null,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='pending'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'expand-root-for-flow-reference' }),
    );
    expect(await screen.findByTestId('simple-review-actions')).toHaveTextContent(
      'review-flow-reference:reviewer:flows',
    );
    await userEvent.click(screen.getByTestId('simple-review-actions'));
    await waitFor(() => expect(mockGetReviewsTableDataOfReviewMember).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('expanded-root-for-flow-reference')).not.toBeInTheDocument();
  });

  it('renders reviewer actions for a matching simple root review', async () => {
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'pending-contact-root',
          name: 'Contact root',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          reviewKind: 'root',
          targetTable: 'contacts',
          rootMatchesStatus: true,
          json: {
            data: { id: 'contact-1', version: '1.0.0' },
            user: { id: 'contact-owner' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='pending'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    expect(await screen.findByTestId('simple-review-actions')).toHaveTextContent(
      'pending-contact-root:reviewer:contacts',
    );
  });

  it('keeps reviewed and rejected simple reviews view-only', async () => {
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-source-reference',
          name: 'Source Reference Review',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          reviewKind: 'reference',
          targetTable: 'sources',
          json: {
            data: { id: 'source-1', version: '3.0.0' },
            user: { id: 'source-owner' },
          },
        },
      ],
      total: 1,
    });

    const { unmount } = render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewed'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    await screen.findByTestId('row-review-source-reference');
    expect(screen.queryByTestId('simple-review-actions')).not.toBeInTheDocument();
    unmount();

    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-source-rejected',
          name: 'Rejected Source Reference',
          userName: 'Reviewer',
          isFromLifeCycle: false,
          reviewKind: 'reference',
          targetTable: 'sources',
          json: {
            data: { id: 'source-2', version: '3.0.0' },
            user: { id: 'source-owner' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewer-rejected'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    await screen.findByTestId('row-review-source-rejected');
    expect(screen.queryByTestId('simple-review-actions')).not.toBeInTheDocument();
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
        {
          id: 'review-5-context-only',
          name: 'Context-only rejected root',
          userName: 'Owner',
          isFromLifeCycle: false,
          reviewKind: 'root',
          targetTable: 'processes',
          rootMatchesStatus: false,
          json: {
            data: { id: 'process-context', version: '1.0.0' },
            user: { id: 'user-context' },
          },
        },
      ],
      total: 2,
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

  it('renders the reviewed subtitle for reviewed member tables', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetRootReviewReferenceProgress.mockResolvedValueOnce({
      data: [
        {
          reference_review_id: 'reviewed-reference',
          target_table: 'sources',
          data_id: 'source-reviewed',
          data_version: '1.0.0',
          state_code: 1,
          actor_comment_state_code: 1,
          completed_reviewer_count: 1,
          reviewer_count: 1,
        },
      ],
      error: null,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewed'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewMember).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'reviewed',
        'en',
        undefined,
      ),
    );

    expect(screen.getByTestId('header-title')).toHaveTextContent('Review Management / Reviewed');
    await userEvent.click(await screen.findByRole('button', { name: 'expand-review-2' }));
    expect(await screen.findByText('Current tab')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('uses zh review APIs when the locale is zh-CN', async () => {
    mockLocale = 'zh-CN';
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-zh', role: 'review-admin' }}
        tableType='unassigned'
        actionRef={actionRef}
      />,
    );

    await waitFor(() =>
      expect(mockGetReviewsTableDataOfReviewAdmin).toHaveBeenCalledWith(
        { pageSize: 10, current: 1 },
        {},
        'unassigned',
        'zh',
      ),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'expand-review-1' }));
    await waitFor(() =>
      expect(mockGetRootReviewReferenceProgress).toHaveBeenCalledWith('review-1'),
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

  it('renders reviewed lifecycle rows and hides the edit action when hideReviewButton is true', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-8',
          name: 'Reviewed Lifecycle Review',
          userName: 'Reviewer',
          isFromLifeCycle: true,
          json: {
            data: { id: 'model-8', version: '8.0.0' },
            user: { id: 'user-8' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewed'
        actionRef={actionRef}
        hideReviewButton={true}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('row-review-8')).toBeInTheDocument());
    expect(screen.getByTestId('review-lifecycle-detail')).toHaveTextContent('view:review:review-8');
    expect(screen.queryByText('edit:review:review-8')).not.toBeInTheDocument();
  });

  it('renders reviewed lifecycle rows with edit and view actions when review buttons are enabled', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetReviewsTableDataOfReviewMember.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-8b',
          name: 'Editable Lifecycle Review',
          userName: 'Reviewer',
          isFromLifeCycle: true,
          json: {
            data: { id: 'model-8b', version: '8.1.0' },
            user: { id: 'user-8b' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='reviewed'
        actionRef={actionRef}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('row-review-8b')).toBeInTheDocument());
    const details = screen.getAllByTestId('review-lifecycle-detail');
    expect(details[0]).toHaveTextContent('edit:review:review-8b');
    expect(details[1]).toHaveTextContent('view:review:review-8b');
  });

  it('logs reference query failures, shows loading, and supports collapsing root rows', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let resolveReferenceRequest: (result: unknown) => void = () => undefined;
    mockGetRootReviewReferenceProgress.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReferenceRequest = resolve;
      }),
    );
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-6',
          name: 'Model Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          reviewKind: 'root',
          targetTable: 'lifecyclemodels',
          modelData: { id: 'model-6', version: '6.0.0' },
          json: {
            data: { id: 'model-6', version: '6.0.0' },
            user: { id: 'user-6' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='unassigned'
        actionRef={actionRef}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'expand-review-6' }));
    expect(await screen.findByTestId('spin')).toBeInTheDocument();
    resolveReferenceRequest({ data: [], error: new Error('reference query failed') });
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load reference review data:',
        expect.any(Error),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'collapse-review-6' }));
    await waitFor(() => expect(screen.queryByTestId('expanded-review-6')).not.toBeInTheDocument());

    errorSpy.mockRestore();
  });

  it('renders every reference status, prioritizes the matching child, and omits relation paths', async () => {
    const actionRef = { current: { reload: jest.fn() } };
    mockGetRootReviewReferenceProgress.mockResolvedValueOnce({
      data: [
        {
          reference_review_id: 'reference-approved',
          target_table: 'processes',
          data_id: 'process-reference',
          data_version: '1.0.0',
          data_name: { baseName: { en: 'Approved reference' } },
          state_code: 2,
          completed_reviewer_count: 2,
          reviewer_count: 2,
          relation_paths: [],
        },
        {
          reference_review_id: 'reference-rejected',
          target_table: 'sources',
          data_id: 'source-reference',
          data_version: '2.0.0',
          data_name: { baseName: { en: 'Rejected reference' } },
          state_code: -1,
          completed_reviewer_count: 1,
          reviewer_count: 1,
          relation_paths: null,
        },
        {
          reference_review_id: 'reference-unassigned',
          target_table: 'contacts',
          data_id: 'contact-reference',
          data_version: '3.0.0',
          data_name: { baseName: { en: 'Unassigned reference' } },
          state_code: 0,
          completed_reviewer_count: 0,
          reviewer_count: 0,
          relation_paths: [{ source: 'reviewer-added' }],
        },
      ],
      error: null,
    });
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 'review-7',
          name: 'Lifecycle Review',
          userName: 'Owner',
          isFromLifeCycle: true,
          reviewKind: 'root',
          targetTable: 'lifecyclemodels',
          modelData: { id: 'model-7', version: '7.0.0' },
          json: {
            data: { id: 'model-7', version: '7.0.0' },
            user: { id: 'user-7' },
          },
        },
      ],
      total: 1,
    });

    render(
      <AssignmentReview
        userData={{ user_id: 'admin-1', role: 'review-admin' }}
        tableType='unassigned'
        actionRef={actionRef}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'expand-review-7' }));

    expect(await screen.findByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();
    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('Current tab')).toBeInTheDocument();
    expect(screen.queryByText('{"source":"reviewer-added"}')).not.toBeInTheDocument();
    const subtable = screen.getByTestId('subtable');
    expect(subtable.firstElementChild).toHaveAttribute(
      'data-testid',
      'subrow-reference-unassigned',
    );
  });

  it('returns an empty success payload when the table type is unsupported and falls back on request errors', async () => {
    const unsupportedActionRef = { current: { reload: jest.fn() } };
    render(
      <AssignmentReview
        userData={{ user_id: 'user-x', role: 'guest' }}
        tableType={'other' as any}
        actionRef={unsupportedActionRef}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('protable')).toBeInTheDocument());
    expect(mockGetReviewsTableDataOfReviewAdmin).not.toHaveBeenCalled();
    expect(mockGetReviewsTableDataOfReviewMember).not.toHaveBeenCalled();

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetReviewsTableDataOfReviewMember.mockRejectedValueOnce(new Error('request failed'));

    render(
      <AssignmentReview
        userData={{ user_id: 'member-1', role: 'review-member' }}
        tableType='pending'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(expect.any(Error)));
    expect(screen.queryByTestId('row-review-2')).not.toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
