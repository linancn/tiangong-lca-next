// @ts-nocheck
/**
 * Integration tests for the review workflow components
 * Paths under test:
 * - src/pages/Review/index.tsx
 * - src/pages/Review/Components/AssignmentReview.tsx
 * - src/pages/Review/Components/ReviewMember.tsx
 */

import React from 'react';

jest.mock('@/services/reviews/api', () => ({
  getReviewsTableDataOfReviewAdmin: jest.fn(),
  getReviewsTableDataOfReviewMember: jest.fn(),
}));

jest.mock('@/services/roles/api', () => ({
  getReviewUserRoleApi: jest.fn(),
  getUserManageTableData: jest.fn(),
  updateRoleApi: jest.fn(),
  delRoleApi: jest.fn(),
}));

jest.mock('@/pages/Review/Components/RejectReview', () => ({
  __esModule: true,
  default: ({ reviewId }) => (
    <button type='button' data-testid={`reject-review-${reviewId}`}>
      Reject
    </button>
  ),
}));

jest.mock('@/pages/Review/Components/reviewLifeCycleModels', () => ({
  __esModule: true,
  default: ({ reviewId }) => <span data-testid={`lcm-${reviewId}`}>LCM</span>,
}));

jest.mock('@/pages/Review/Components/reviewProcess', () => ({
  __esModule: true,
  default: ({ reviewId }) => <span data-testid={`process-${reviewId}`}>Process</span>,
}));

jest.mock('@/pages/Review/Components/ReviewProgress', () => ({
  __esModule: true,
  default: ({ reviewId }) => <span data-testid={`progress-${reviewId}`}>Progress</span>,
}));

jest.mock('@/pages/Review/Components/SelectReviewer', () => ({
  __esModule: true,
  default: ({ reviewIds = [] }) => (
    <div data-testid={`select-reviewer-${reviewIds.length}`}>SelectReviewer</div>
  ),
}));

jest.mock('@/pages/Account/view', () => ({
  __esModule: true,
  default: ({ userId }) => <span data-testid={`account-${userId}`}>Account</span>,
}));

jest.mock('@/pages/LifeCycleModels/Components/view', () => ({
  __esModule: true,
  default: ({ id }) => <span data-testid={`lcm-view-${id}`}>LCMView</span>,
}));

jest.mock('@/pages/Processes/Components/view', () => ({
  __esModule: true,
  default: ({ id }) => <span data-testid={`process-view-${id}`}>ProcessView</span>,
}));

jest.mock('@/pages/Review/Components/AddMemberModal', () => ({
  __esModule: true,
  default: ({ open }) => (open ? <div data-testid='add-member-modal' /> : null),
}));

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ defaultMessage, id }) => (
    <span data-testid={`fmt-${id}`}>{defaultMessage ?? id}</span>
  ),
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  CloseOutlined: () => <span data-testid='icon-close' />,
  CrownOutlined: () => <span data-testid='icon-crown' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  PlusOutlined: () => <span data-testid='icon-plus' />,
  UserOutlined: () => <span data-testid='icon-user' />,
}));

jest.mock('antd', () => {
  const React = require('react');
  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };
  const ModalComponent = ({ open, onCancel, onOk, children }) =>
    open ? (
      <div data-testid='modal'>
        <div>{children}</div>
        <button type='button' onClick={onCancel}>
          close
        </button>
        <button type='button' onClick={onOk}>
          ok
        </button>
      </div>
    ) : null;
  ModalComponent.confirm = jest.fn();
  const Drawer = ({ open, children, extra }) =>
    open ? (
      <div data-testid='drawer'>
        <div>{extra}</div>
        {children}
      </div>
    ) : null;
  const Button = React.forwardRef((props, ref) => {
    const { onClick, children, disabled, icon, loading: _loading, ...rest } = props ?? {};
    void _loading;
    return (
      <button ref={ref} type='button' onClick={onClick} disabled={disabled} {...rest}>
        {icon}
        {children}
      </button>
    );
  });
  const Tabs = ({ items, activeKey, onChange }) => (
    <div data-testid='tabs'>
      {(items ?? []).map((item) => (
        <div key={item.key}>
          <button
            type='button'
            data-testid={`tab-${item.key}`}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
          {item.key === activeKey ? <div>{item.children}</div> : null}
        </div>
      ))}
    </div>
  );
  const Spin = ({ spinning, children }) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );
  const ConfigProvider = ({ children }) => <>{children}</>;
  const Card = ({ children }) => <div data-testid='card'>{children}</div>;
  const Row = ({ children }) => <div data-testid='row'>{children}</div>;
  const Col = ({ children }) => <div data-testid='col'>{children}</div>;
  const Space = ({ children }) => <div data-testid='space'>{children}</div>;
  const Tooltip = ({ children }) => <>{children}</>;
  const Flex = ({ children }) => <div data-testid='flex'>{children}</div>;
  const Input = ({ value, onChange, ...rest }) => (
    <input
      data-testid='input'
      value={value ?? ''}
      onChange={(event) => onChange?.(event)}
      {...rest}
    />
  );
  Input.Search = ({ onSearch, placeholder }) => (
    <div data-testid='input-search'>
      <input placeholder={placeholder} data-testid='search-input' />
      <button type='button' onClick={() => onSearch?.('')}>
        search
      </button>
    </div>
  );
  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Card,
    Col,
    Drawer,
    Flex,
    Input,
    Modal: ModalComponent,
    Row,
    Space,
    Spin,
    Tabs,
    Tooltip,
    message,
    ConfigProvider,
    theme,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({
    request,
    actionRef,
    columns = [],
    rowKey = 'id',
    pagination,
    toolBarRender,
    headerTitle,
  }) => {
    const [rows, setRows] = React.useState([]);
    const paramsRef = React.useRef({
      current: pagination?.current ?? 1,
      pageSize: pagination?.pageSize ?? 10,
    });
    const requestRef = React.useRef(request);

    const runRequest = React.useCallback(async (override = {}) => {
      paramsRef.current = { ...paramsRef.current, ...override };
      const result = await requestRef.current?.(paramsRef.current, {});
      setRows(result?.data ?? []);
      return result;
    }, []);

    React.useEffect(() => {
      requestRef.current = request;
    }, [request]);

    React.useEffect(() => {
      runRequest();
      // We intentionally call once on mount; subsequent reloads use actionRef.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: () => runRequest(),
          setPageInfo: (info) => runRequest(info ?? {}),
        };
      }
    }, [actionRef, runRequest]);

    const renderContent = (content, keyPrefix) => {
      if (Array.isArray(content)) {
        return content.map((item, index) => (
          <React.Fragment key={`${keyPrefix}-${index}`}>{item}</React.Fragment>
        ));
      }
      return content;
    };

    const header = typeof headerTitle === 'function' ? headerTitle() : headerTitle;
    const toolbar = toolBarRender?.() ?? [];

    return (
      <div data-testid='pro-table'>
        <div data-testid='pro-table-header'>{header}</div>
        <div data-testid='pro-table-toolbar'>
          {Array.isArray(toolbar)
            ? toolbar.map((node, index) => (
                <React.Fragment key={`toolbar-${index}`}>{node}</React.Fragment>
              ))
            : toolbar}
        </div>
        {rows.map((row, rowIndex) => {
          const rowIdentifier = rowKey && row[rowKey] ? row[rowKey] : rowIndex;
          return (
            <div data-testid={`pro-table-row-${rowIdentifier}`} key={`row-${rowIdentifier}`}>
              {(columns ?? []).map((column, columnIndex) => {
                const dataIndex = column.dataIndex;
                const value = dataIndex ? row[dataIndex] : undefined;
                const rendered = column.render
                  ? column.render(value, row, rowIndex)
                  : (value ?? column.title ?? null);
                return (
                  <div
                    key={`cell-${columnIndex}`}
                    data-testid={`pro-table-cell-${dataIndex ?? columnIndex}-${rowIdentifier}`}
                  >
                    {renderContent(rendered, `render-${columnIndex}`)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const PageContainer = ({ title, children }) => (
    <div data-testid='page-container'>
      <div data-testid='page-container-title'>{title}</div>
      <div>{children}</div>
    </div>
  );

  return {
    __esModule: true,
    ProTable,
    PageContainer,
  };
});

import Review from '@/pages/Review';
import AssignmentReview from '@/pages/Review/Components/AssignmentReview';
import ReviewMember from '@/pages/Review/Components/ReviewMember';
import {
  getReviewsTableDataOfReviewAdmin,
  getReviewsTableDataOfReviewMember,
} from '@/services/reviews/api';
import { getReviewUserRoleApi, getUserManageTableData, updateRoleApi } from '@/services/roles/api';
import { message } from 'antd';
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../helpers/testUtils';

const mockGetReviewsTableDataOfReviewAdmin = jest.mocked(getReviewsTableDataOfReviewAdmin);
const mockGetReviewsTableDataOfReviewMember = jest.mocked(getReviewsTableDataOfReviewMember);
const mockGetReviewUserRoleApi = jest.mocked(getReviewUserRoleApi);
const mockGetUserManageTableData = jest.mocked(getUserManageTableData);
const mockUpdateRoleApi = jest.mocked(updateRoleApi);

describe('Review workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewsTableDataOfReviewAdmin.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    } as any);
    mockGetReviewsTableDataOfReviewMember.mockResolvedValue({
      data: [],
      success: true,
      total: 0,
    } as any);
    mockGetReviewUserRoleApi.mockResolvedValue({
      user_id: 'user-admin',
      role: 'review-admin',
    } as any);
    mockGetUserManageTableData.mockResolvedValue({ data: [], success: true, total: 0 } as any);
  });

  it('loads admin review queues and refreshes when switching tabs', async () => {
    renderWithProviders(<Review />);

    await waitFor(() => {
      expect(mockGetReviewUserRoleApi).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        mockGetReviewsTableDataOfReviewAdmin.mock.calls.some(
          ([, , type, lang]) => type === 'unassigned' && lang === 'en',
        ),
      ).toBe(true);
    });

    fireEvent.click(screen.getByTestId('tab-assigned'));

    await waitFor(() => {
      expect(
        mockGetReviewsTableDataOfReviewAdmin.mock.calls.some(([, , type]) => type === 'assigned'),
      ).toBe(true);
    });
  });

  it('defaults review members to the reviewed tab and requests reviewed queue data', async () => {
    mockGetReviewUserRoleApi.mockResolvedValueOnce({
      user_id: 'member-007',
      role: 'review-member',
    } as any);

    renderWithProviders(<Review />);

    await waitFor(() => {
      expect(
        mockGetReviewsTableDataOfReviewMember.mock.calls.some(
          ([, , type, lang]) => type === 'reviewed' && lang === 'en',
        ),
      ).toBe(true);
    });

    expect(screen.queryByTestId('tab-unassigned')).not.toBeInTheDocument();
    expect(screen.getByTestId('tab-reviewed')).toBeInTheDocument();
  });

  it('passes explicit reviewer id when loading queues from member drawer context', async () => {
    const actionRef = React.createRef<any>();
    const userData = { user_id: 'reviewer-99', role: 'review-member' } as const;

    renderWithProviders(
      <AssignmentReview
        actionRef={actionRef}
        tableType='pending'
        userData={userData}
        actionFrom='reviewMember'
      />,
    );

    await waitFor(() => {
      expect(
        mockGetReviewsTableDataOfReviewMember.mock.calls.some(
          ([, , type, lang, filter]) =>
            type === 'pending' &&
            lang === 'en' &&
            typeof filter === 'object' &&
            filter?.user_id === userData.user_id,
        ),
      ).toBe(true);
    });
  });

  it('opens reviewed drawer entries with member-specific filters', async () => {
    const memberRecord = {
      email: 'member@example.com',
      pendingCount: 3,
      reviewedCount: 5,
      display_name: 'Reviewer Zero',
      role: 'review-member',
      user_id: 'member-123',
      team_id: 'team-xyz',
    };

    mockGetUserManageTableData.mockResolvedValueOnce({
      data: [memberRecord],
      success: true,
      total: 1,
    } as any);

    renderWithProviders(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    const reviewedCell = await screen.findByTestId(
      'pro-table-cell-reviewedCount-member@example.com',
    );
    fireEvent.click(within(reviewedCell).getByText('5'));

    await screen.findByTestId('drawer');

    await waitFor(() => {
      expect(
        mockGetReviewsTableDataOfReviewMember.mock.calls.some(
          ([, , type, lang, filter]) =>
            type === 'reviewed' &&
            lang === 'en' &&
            typeof filter === 'object' &&
            filter?.user_id === memberRecord.user_id,
        ),
      ).toBe(true);
    });
  });

  it('promotes members to admin and reloads the table on success', async () => {
    const memberRecord = {
      email: 'member@example.com',
      pendingCount: 3,
      reviewedCount: 5,
      display_name: 'Reviewer Zero',
      role: 'review-member',
      user_id: 'member-123',
      team_id: 'team-xyz',
    };

    mockGetUserManageTableData
      .mockResolvedValueOnce({
        data: [memberRecord],
        success: true,
        total: 1,
      } as any)
      .mockResolvedValue({
        data: [memberRecord],
        success: true,
        total: 1,
      } as any);

    mockUpdateRoleApi.mockResolvedValue({ error: null } as any);

    renderWithProviders(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

    const memberRow = await screen.findByTestId('pro-table-row-member@example.com');
    const promoteButton = within(memberRow).getByTestId('icon-crown').closest('button');
    expect(promoteButton).toBeTruthy();
    fireEvent.click(promoteButton!);

    await waitFor(() => {
      expect(mockUpdateRoleApi).toHaveBeenCalledWith(
        memberRecord.team_id,
        memberRecord.user_id,
        'review-admin',
      );
    });

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Action success!');
    });

    await waitFor(() => {
      expect(mockGetUserManageTableData).toHaveBeenCalledTimes(2);
    });
  });

  test.failing(
    'reloading members table after opening drawer keeps main table action ref intact',
    async () => {
      const memberRecord = {
        email: 'member@example.com',
        pendingCount: 3,
        reviewedCount: 5,
        display_name: 'Reviewer Zero',
        role: 'review-member',
        user_id: 'member-123',
        team_id: 'team-xyz',
      };

      mockGetUserManageTableData.mockResolvedValueOnce({
        data: [memberRecord],
        success: true,
        total: 1,
      } as any);

      renderWithProviders(<ReviewMember userData={{ user_id: 'admin-1', role: 'review-admin' }} />);

      await waitFor(() => {
        expect(mockGetUserManageTableData).toHaveBeenCalledTimes(1);
      });

      const pendingCell = await screen.findByTestId(
        'pro-table-cell-pendingCount-member@example.com',
      );
      fireEvent.click(within(pendingCell).getByText('3'));

      await waitFor(() => {
        expect(
          mockGetReviewsTableDataOfReviewMember.mock.calls.some(
            ([, , type, lang, filter]) =>
              type === 'pending' && lang === 'en' && filter?.user_id === memberRecord.user_id,
          ),
        ).toBe(true);
      });

      await waitFor(() => {
        expect(mockGetUserManageTableData).toHaveBeenCalledTimes(2);
      });
    },
  );
});
