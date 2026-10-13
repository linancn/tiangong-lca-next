// @ts-nocheck
import RejectionDetailsButton from '@/pages/Review/Components/RejectionDetailsButton';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@umijs/max', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='close-icon' />,
  MessageOutlined: () => <span data-testid='message-icon' />,
}));

jest.mock('antd', () => {
  const Button = ({ icon, children, onClick, danger, ...props }: any) => (
    <button type='button' onClick={onClick} data-danger={String(Boolean(danger))} {...props}>
      {icon}
      {children}
    </button>
  );
  const Drawer = ({ open, title, extra, children, onClose }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{title}</header>
        <button type='button' aria-label='Mock drawer close' onClick={onClose} />
        {extra}
        {children}
      </section>
    ) : null;
  const Descriptions = ({ items, styles }: any) => (
    <dl>
      {items.map((item: any) => (
        <div key={item.key}>
          <dt style={styles?.label}>{item.label}</dt>
          <dd>{item.children}</dd>
        </div>
      ))}
    </dl>
  );
  const Empty = ({ description }: any) => <div>{description}</div>;
  Empty.PRESENTED_IMAGE_SIMPLE = 'simple';
  const Typography = {
    Paragraph: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  };
  return {
    __esModule: true,
    Button,
    Descriptions,
    Drawer,
    Empty,
    Space: ({ children }: any) => <div>{children}</div>,
    Spin: ({ children }: any) => <div>{children}</div>,
    Tag: ({ children }: any) => <span>{children}</span>,
    Tooltip: ({ children, title }: any) => <span title={title}>{children}</span>,
    Typography,
  };
});

const mockGetReviewRejectionDetails = jest.fn();
jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getReviewRejectionDetails: (...args: any[]) => mockGetReviewRejectionDetails(...args),
}));

const mockGetUsersByIds = jest.fn();
jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

describe('RejectionDetailsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewRejectionDetails.mockResolvedValue({
      data: [
        {
          source: 'review-admin',
          actor_id: 'admin-1',
          reason: 'Admin final reason',
          submitted_at: '2026-09-28T10:00:00Z',
          reviewer_status: null,
        },
        {
          source: 'reviewer',
          actor_id: 'reviewer-1',
          reason: 'Reviewer reason',
          submitted_at: null,
          reviewer_status: 'revoked',
        },
      ],
      error: null,
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'admin-1', display_name: 'Admin A' },
      { id: 'reviewer-1', display_name: 'Reviewer B' },
    ]);
  });

  it('loads and renders visible role-scoped reasons without a count badge', async () => {
    render(<RejectionDetailsButton reviewId='review-1' />);
    const button = screen.getByRole('button', { name: 'View rejection reasons' });
    expect(screen.getByTestId('message-icon')).toBeInTheDocument();
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText('Admin final reason')).toBeInTheDocument());
    expect(mockGetReviewRejectionDetails).toHaveBeenCalledWith('review-1');
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['admin-1', 'reviewer-1']);
    expect(screen.getByText('Reviewer reason')).toBeInTheDocument();
    expect(screen.getByText('Admin A')).toBeInTheDocument();
    expect(screen.getByText('Reviewer B')).toBeInTheDocument();
    expect(screen.getByText('Assignment revoked')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    for (const label of ['Source', 'Reason', 'Submitted at']) {
      for (const element of screen.getAllByText(label)) {
        expect(element).toHaveStyle({ width: '96px', whiteSpace: 'nowrap' });
      }
    }
    expect(screen.getByText('Admin final reason')).toHaveStyle({
      lineHeight: '1.5715',
      maxHeight: '15.715em',
      overflowY: 'auto',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Close rejection reasons' }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();

    fireEvent.click(button);
    await waitFor(() => expect(screen.getByTestId('drawer')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Mock drawer close' }));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('shows the empty state when the scoped request fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetReviewRejectionDetails.mockResolvedValueOnce({ data: [], error: new Error('denied') });
    render(<RejectionDetailsButton reviewId='review-2' />);
    fireEvent.click(screen.getByRole('button', { name: 'View rejection reasons' }));

    await waitFor(() =>
      expect(screen.getByText('No visible rejection reason')).toBeInTheDocument(),
    );
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockGetUsersByIds).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('uses role fallbacks when rejection actors are not visible', async () => {
    mockGetReviewRejectionDetails.mockResolvedValueOnce({
      data: [
        {
          source: 'review-admin',
          actor_id: null,
          reason: 'Admin fallback reason',
          submitted_at: null,
          reviewer_status: null,
        },
        {
          source: 'reviewer',
          actor_id: null,
          reason: 'Reviewer fallback reason',
          submitted_at: null,
          reviewer_status: 'submitted',
        },
      ],
      error: null,
    });

    render(<RejectionDetailsButton reviewId='review-3' />);
    fireEvent.click(screen.getByRole('button', { name: 'View rejection reasons' }));

    await waitFor(() => expect(screen.getByText('Admin fallback reason')).toBeInTheDocument());
    expect(screen.getAllByText('Review admin')).toHaveLength(2);
    expect(screen.getAllByText('Reviewer')).toHaveLength(2);
    expect(mockGetUsersByIds).not.toHaveBeenCalled();
  });
});
