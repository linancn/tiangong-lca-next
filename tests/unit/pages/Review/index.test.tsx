// @ts-nocheck
import ReviewPage from '@/pages/Review';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockGetReviewUserRoleApi = jest.fn();
const assignmentReloads: Record<string, jest.Mock> = {};

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ id, defaultMessage }: any) => defaultMessage ?? id,
}));

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getReviewUserRoleApi: (...args: any[]) => mockGetReviewUserRoleApi(...args),
}));

jest.mock('@/pages/Review/Components/AssignmentReview', () => ({
  __esModule: true,
  default: ({ actionRef, tableType, userData }: any) => {
    const reload = assignmentReloads[tableType] ?? jest.fn();
    assignmentReloads[tableType] = reload;
    if (actionRef) {
      actionRef.current = { reload };
    }
    return (
      <div data-testid={`assignment-${tableType}`}>
        {`${tableType}:${userData?.role ?? 'none'}`}
      </div>
    );
  },
}));

jest.mock('@/pages/Review/Components/ReviewMember', () => ({
  __esModule: true,
  default: ({ userData }: any) => <div data-testid='review-member'>{userData?.role ?? 'none'}</div>,
}));

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  PageContainer: ({ title, children }: any) => (
    <section>
      <h1>{title}</h1>
      {children}
    </section>
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Spin = ({ children }: any) => <div data-testid='spin'>{children}</div>;
  const Tabs = ({ items = [], activeKey, onChange }: any) => {
    const currentItem = items.find((item: any) => item.key === activeKey) ?? items[0];

    return (
      <div>
        <div>
          {items.map((item: any) => (
            <button key={item.key} type='button' onClick={() => onChange?.(item.key)}>
              {typeof item.label === 'string' ? item.label : item.label}
            </button>
          ))}
        </div>
        <div data-testid='active-tab'>{currentItem?.children}</div>
      </div>
    );
  };

  return {
    __esModule: true,
    Spin,
    Tabs,
  };
});

describe('Review page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(assignmentReloads).forEach((key) => delete assignmentReloads[key]);
  });

  it('renders review-admin tabs and switches between them', async () => {
    mockGetReviewUserRoleApi.mockResolvedValueOnce({ user_id: 'user-1', role: 'review-admin' });

    render(<ReviewPage />);

    expect(await screen.findByTestId('assignment-unassigned')).toHaveTextContent(
      'unassigned:review-admin',
    );
    expect(screen.getByRole('button', { name: 'pages.review.tabs.assigned' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'pages.review.tabs.rejectedTask' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pages.review.tabs.members' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.assigned' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-assigned')).toHaveTextContent('assigned:review-admin');
    });

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.rejectedTask' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-admin-rejected')).toHaveTextContent(
        'admin-rejected:review-admin',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.members' }));

    expect(await screen.findByTestId('review-member')).toHaveTextContent('review-admin');

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.unassigned' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-unassigned')).toHaveTextContent(
        'unassigned:review-admin',
      );
      expect(assignmentReloads.unassigned).toHaveBeenCalled();
    });
  });

  it('forces review members onto the reviewed tab and reloads that table', async () => {
    mockGetReviewUserRoleApi.mockResolvedValueOnce({ user_id: 'user-2', role: 'review-member' });

    render(<ReviewPage />);

    await waitFor(() => {
      expect(screen.getByTestId('assignment-reviewed')).toHaveTextContent('reviewed:review-member');
    });
    await waitFor(() => {
      expect(assignmentReloads.reviewed).toHaveBeenCalled();
    });

    expect(
      screen.queryByRole('button', { name: 'pages.review.tabs.unassigned' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'pages.review.tabs.pending' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.pending' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-pending')).toHaveTextContent('pending:review-member');
    });

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.rejected' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-reviewer-rejected')).toHaveTextContent(
        'reviewer-rejected:review-member',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'pages.review.tabs.reviewed' }));

    await waitFor(() => {
      expect(screen.getByTestId('assignment-reviewed')).toHaveTextContent('reviewed:review-member');
      expect(assignmentReloads.reviewed).toHaveBeenCalledTimes(2);
    });
  });

  it('logs errors from role loading and still clears the spinner wrapper', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetReviewUserRoleApi.mockRejectedValueOnce(new Error('load failed'));

    render(<ReviewPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
    expect(screen.getByTestId('spin')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
