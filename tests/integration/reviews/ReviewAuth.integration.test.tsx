// @ts-nocheck
/**
 * Integration tests for review authentication states
 * Paths under test:
 * - src/pages/Review/index.tsx
 */

import Review from '@/pages/Review';
import { getReviewUserRoleApi } from '@/services/roles/api';
import { fireEvent, renderWithProviders, screen, waitFor } from '../../helpers/testUtils';

const assignmentReloads = {};

jest.mock('@umijs/max', () => ({
  FormattedMessage: ({ id, defaultMessage }) => (
    <span data-testid={`fmt-${id}`}>{defaultMessage ?? id}</span>
  ),
}));

jest.mock('@ant-design/pro-components', () => ({
  PageContainer: ({ title, children }) => (
    <div data-testid='page-container'>
      <div data-testid='page-title'>{title}</div>
      <div>{children}</div>
    </div>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Spin = ({ spinning, children }) => (
    <div data-testid='spin' data-spinning={spinning ? 'true' : 'false'}>
      {children}
    </div>
  );

  const Tabs = ({ items = [], activeKey, onChange }) => (
    <div data-testid='tabs'>
      {(items ?? []).map((item) => (
        <div key={item.key} data-testid={`tab-wrapper-${item.key}`}>
          <button
            type='button'
            data-testid={`tab-${item.key}`}
            onClick={() => onChange?.(item.key)}
          >
            {item.label}
          </button>
          {item.key === activeKey ? (
            <div data-testid={`tab-panel-${item.key}`}>{item.children}</div>
          ) : null}
        </div>
      ))}
    </div>
  );

  const ConfigProvider = ({ children }) => <>{children}</>;
  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  };

  return {
    __esModule: true,
    ConfigProvider,
    message,
    Spin,
    Tabs,
  };
});

jest.mock('@/pages/Review/Components/AssignmentReview', () => {
  const React = require('react');

  const AssignmentReviewMock = ({ actionRef, tableType, userData }) => {
    const reloadRef = React.useRef(null);
    if (!reloadRef.current) {
      reloadRef.current = jest.fn();
    }
    const reload = reloadRef.current;
    if (actionRef) {
      actionRef.current = { reload };
    }
    assignmentReloads[tableType] = reload;
    return (
      <div data-testid={`assignment-${tableType}`}>
        <span data-testid={`assignment-role-${tableType}`}>{userData?.role ?? 'unknown'}</span>
      </div>
    );
  };

  return {
    __esModule: true,
    default: AssignmentReviewMock,
  };
});

jest.mock('@/pages/Review/Components/ReviewMember', () => ({
  __esModule: true,
  default: ({ userData }) => (
    <div data-testid='review-member-view'>{userData?.role ?? 'unknown'}</div>
  ),
}));

jest.mock('@/services/roles/api', () => ({
  getReviewUserRoleApi: jest.fn(),
}));

const mockGetReviewUserRoleApi = jest.mocked(getReviewUserRoleApi);

describe('Review page authentication workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(assignmentReloads).forEach((key) => {
      delete assignmentReloads[key];
    });
  });

  it('loads admin queues and exposes table switch actions for admins', async () => {
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'admin-1', role: 'review-admin' });

    renderWithProviders(<Review />);

    await waitFor(() => expect(mockGetReviewUserRoleApi).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(assignmentReloads.unassigned).toBeDefined());
    expect(screen.getByTestId('assignment-role-unassigned')).toHaveTextContent('review-admin');

    fireEvent.click(screen.getByTestId('tab-assigned'));

    await waitFor(() => expect(screen.getByTestId('assignment-assigned')).toBeInTheDocument());
    expect(assignmentReloads.assigned).toBeDefined();
  });

  it('defaults review members to the reviewed tab with drawer-ready action refs', async () => {
    mockGetReviewUserRoleApi.mockResolvedValue({ user_id: 'member-1', role: 'review-member' });

    renderWithProviders(<Review />);

    await waitFor(() => expect(mockGetReviewUserRoleApi).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(screen.getByTestId('tab-panel-reviewed')).toBeInTheDocument());
    expect(screen.queryByTestId('tab-unassigned')).not.toBeInTheDocument();
    expect(assignmentReloads.reviewed).toBeDefined();
  });

  it('stops spinning and surfaces console errors when the role lookup fails', async () => {
    const error = new Error('network down');
    mockGetReviewUserRoleApi.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<Review />);

    await waitFor(() =>
      expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(assignmentReloads.unassigned).toBeUndefined();

    consoleSpy.mockRestore();
  });
});
