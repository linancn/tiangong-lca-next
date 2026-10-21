import BatchReviewActions from '@/pages/Review/Components/BatchReviewActions';
import { getCommentApi } from '@/services/comments/api';
import {
  getReviewBatchEligibility,
  submitAdminReviewBatchDecision,
  submitReviewerBatchDecision,
} from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mockConfirm = jest.fn();
const mockResetFields = jest.fn();
const mockValidateFields = jest.fn();
const mockSuccess = jest.fn();
const mockWarning = jest.fn();
const mockError = jest.fn();

jest.mock('@ant-design/icons', () => ({
  FileExcelOutlined: () => <span data-testid='batch-reject-icon' />,
  SafetyCertificateOutlined: () => <span data-testid='batch-approve-icon' />,
}));

jest.mock('@/services/reviews/api', () => ({
  getReviewBatchEligibility: jest.fn(),
  submitAdminReviewBatchDecision: jest.fn(),
  submitReviewerBatchDecision: jest.fn(),
}));

jest.mock('@/services/comments/api', () => ({ getCommentApi: jest.fn() }));

jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: (
      { defaultMessage }: { defaultMessage: string },
      values?: Record<string, number>,
    ) =>
      Object.entries(values ?? {}).reduce(
        (message, [key, value]) => message.replace(`{${key}}`, String(value)),
        defaultMessage,
      ),
  }),
}));

jest.mock('antd', () => {
  const Form = ({ children }: { children: import('react').ReactNode }) => <form>{children}</form>;
  Form.useForm = () => [
    {
      validateFields: mockValidateFields,
      resetFields: mockResetFields,
    },
  ];
  Form.Item = ({ children, label }: { children: import('react').ReactNode; label?: string }) => (
    <label>
      {label}
      {children}
    </label>
  );

  const Modal = ({
    children,
    open,
    title,
    width,
    okText,
    onCancel,
    onOk,
  }: {
    children: import('react').ReactNode;
    open?: boolean;
    title?: string;
    width?: number;
    okText?: string;
    onCancel?: () => void;
    onOk?: () => void;
  }) =>
    open ? (
      <section aria-label={title} data-modal-width={width} data-ok-text={okText}>
        {children}
        <button type='button' onClick={onCancel}>
          cancel
        </button>
        <button type='button' onClick={onOk}>
          confirm reject
        </button>
      </section>
    ) : null;
  const message = {
    success: (...args: unknown[]) => mockSuccess(...args),
    warning: (...args: unknown[]) => mockWarning(...args),
    error: (...args: unknown[]) => mockError(...args),
  };
  const modal = {
    confirm: (options: { onOk?: () => void }) => mockConfirm(options),
  };
  const App = { useApp: () => ({ message, modal }) };

  return {
    Alert: ({
      description,
      title,
    }: {
      description?: import('react').ReactNode;
      title?: string;
    }) => (
      <div>
        {title}: {description}
      </div>
    ),
    App,
    Button: ({
      children,
      disabled,
      icon,
      onClick,
      type,
      size,
      shape,
      style,
      danger,
      'aria-label': ariaLabel,
    }: {
      children: import('react').ReactNode;
      disabled?: boolean;
      icon?: import('react').ReactNode;
      onClick?: () => void;
      type?: string;
      size?: string;
      shape?: string;
      style?: import('react').CSSProperties;
      danger?: boolean;
      'aria-label'?: string;
    }) => (
      <button
        type='button'
        disabled={disabled}
        onClick={onClick}
        aria-label={ariaLabel}
        data-button-type={type}
        data-button-size={size}
        data-button-shape={shape}
        data-button-danger={danger ? 'true' : 'false'}
        style={style}
      >
        {icon}
        {children}
      </button>
    ),
    Form,
    Input: {
      TextArea: ({ placeholder }: { placeholder?: string }) => (
        <textarea aria-label='review-reason' placeholder={placeholder} />
      ),
    },
    message,
    Modal,
    Space: ({ children, size }: { children: import('react').ReactNode; size?: number }) => (
      <div data-space-size={size}>{children}</div>
    ),
    theme: {
      useToken: () => ({
        token: {
          marginXS: 8,
          controlHeightSM: 24,
          controlHeight: 32,
        },
      }),
    },
    Tooltip: ({ children, title }: { children: import('react').ReactNode; title?: string }) => (
      <span title={title}>{children}</span>
    ),
  };
});

const adminDecisionMock = jest.mocked(submitAdminReviewBatchDecision);
const reviewerDecisionMock = jest.mocked(submitReviewerBatchDecision);
const eligibilityMock = jest.mocked(getReviewBatchEligibility);
const commentMock = jest.mocked(getCommentApi);

const successfulResult = (reviewIds: string[]) => ({
  ok: true,
  command: 'admin_review_batch_decision',
  batchId: 'batch-1',
  summary: { total: reviewIds.length, succeeded: reviewIds.length, failed: 0 },
  results: reviewIds.map((reviewId) => ({ reviewId, ok: true })),
});

describe('BatchReviewActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockImplementation(({ onOk }: { onOk?: () => void }) => onOk?.());
    mockValidateFields.mockResolvedValue({ reason: 'insufficient evidence' });
    commentMock.mockResolvedValue({ data: [], error: null });
    eligibilityMock.mockImplementation(async (reviewIds) => ({
      data: reviewIds.map((reviewId, ordinal) => ({
        ordinal,
        review_id: String(reviewId),
        eligible: true,
        reviewer_count: 1,
        submitted_opinion_count: 1,
        approve_opinion_count: 1,
        reject_opinion_count: 0,
      })),
      error: null,
    }));
  });

  it('submits a successful admin batch approval and refreshes the table', async () => {
    const onFinished = jest.fn();
    adminDecisionMock.mockResolvedValue({
      data: [successfulResult(['review-1', 'review-2'])],
      error: null,
    } as never);

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1', 'review-2']}
        allowApprove
        onFinished={onFinished}
      />,
    );
    const approveButton = screen.getByRole('button', { name: 'Batch approve' });
    expect(screen.getByTestId('batch-approve-icon')).toBeInTheDocument();
    expect(approveButton).toHaveAttribute('data-button-type', 'text');
    expect(approveButton).toHaveAttribute('data-button-size', 'large');
    expect(approveButton).not.toHaveAttribute('data-button-shape');
    expect(approveButton).toHaveAttribute('data-button-danger', 'false');
    expect(approveButton).toHaveStyle({ width: '24px', height: '32px', paddingInline: 0 });
    expect(approveButton.parentElement?.parentElement).toHaveAttribute('data-space-size', '8');
    fireEvent.click(approveButton);

    await waitFor(() =>
      expect(adminDecisionMock).toHaveBeenCalledWith(
        ['review-1', 'review-2'],
        'approve',
        undefined,
      ),
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ onOk: expect.any(Function) }),
    );
    expect(mockSuccess).toHaveBeenCalledWith('2 reviews processed successfully.');
    expect(mockResetFields).toHaveBeenCalled();
    expect(onFinished).toHaveBeenCalledWith([]);
  });

  it('retains ineligible selections after processing the eligible batch scope', async () => {
    const onFinished = jest.fn();
    eligibilityMock.mockResolvedValueOnce({
      data: [
        {
          ordinal: 0,
          review_id: 'review-1',
          eligible: true,
          reviewer_count: 1,
          submitted_opinion_count: 1,
          approve_opinion_count: 1,
          reject_opinion_count: 0,
        },
        {
          ordinal: 1,
          review_id: 'review-2',
          eligible: false,
          reason_code: 'OPINIONS_PENDING',
          reviewer_count: 1,
          submitted_opinion_count: 0,
          approve_opinion_count: 0,
          reject_opinion_count: 0,
        },
      ],
      error: null,
    });
    adminDecisionMock.mockResolvedValue({
      data: [successfulResult(['review-1'])],
      error: null,
    } as never);

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1', 'review-2']}
        allowApprove
        onFinished={onFinished}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch approve' }));

    await waitFor(() =>
      expect(adminDecisionMock).toHaveBeenCalledWith(['review-1'], 'approve', undefined),
    );
    expect(onFinished).toHaveBeenCalledWith(['review-2']);
  });

  it('skips all-rejected tasks during admin batch approval', async () => {
    const onFinished = jest.fn();
    eligibilityMock.mockResolvedValueOnce({
      data: [
        {
          ordinal: 0,
          review_id: 'all-rejected',
          eligible: true,
          reviewer_count: 2,
          submitted_opinion_count: 2,
          approve_opinion_count: 0,
          reject_opinion_count: 2,
        },
        {
          ordinal: 1,
          review_id: 'mixed-opinions',
          eligible: true,
          reviewer_count: 3,
          submitted_opinion_count: 2,
          approve_opinion_count: 1,
          reject_opinion_count: 1,
        },
      ],
      error: null,
    });
    adminDecisionMock.mockResolvedValue({
      data: [successfulResult(['mixed-opinions'])],
      error: null,
    } as never);

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={['all-rejected', 'mixed-opinions']}
        allowApprove
        onFinished={onFinished}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch approve' }));

    await waitFor(() =>
      expect(adminDecisionMock).toHaveBeenCalledWith(['mixed-opinions'], 'approve', undefined),
    );
    expect(onFinished).toHaveBeenCalledWith(['all-rejected']);
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Approve 1 selected reviews?' }),
    );
    const preview = mockConfirm.mock.calls[0][0].content;
    const { container } = render(preview);
    expect(container).toHaveTextContent(
      'At least one assigned reviewer must approve before final approval.',
    );
  });

  it('submits a reviewer rejection as an advisory opinion and reports partial results', async () => {
    const onFinished = jest.fn();
    reviewerDecisionMock.mockResolvedValue({
      data: [
        {
          ...successfulResult(['review-1', 'review-2']),
          command: 'reviewer_review_batch_decision',
          summary: { total: 2, succeeded: 1, failed: 1 },
          results: [
            { reviewId: 'review-1', ok: true },
            { reviewId: 'review-2', ok: false, code: 'NOT_APPLICABLE' },
          ],
        },
      ],
      error: null,
    } as never);

    render(
      <BatchReviewActions
        role='reviewer'
        reviewIds={['review-1', 'review-2']}
        allowApprove={false}
        disabled={false}
        onFinished={onFinished}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Batch approve' })).not.toBeInTheDocument();
    expect(screen.getByTestId('batch-reject-icon')).toBeInTheDocument();
    const rejectButton = screen.getByRole('button', { name: 'Batch reject' });
    expect(rejectButton).toHaveAttribute('data-button-type', 'text');
    expect(rejectButton).toHaveAttribute('data-button-size', 'large');
    expect(rejectButton).not.toHaveAttribute('data-button-shape');
    expect(rejectButton).toHaveAttribute('data-button-danger', 'false');
    expect(rejectButton).toHaveStyle({ width: '24px', height: '32px', paddingInline: 0 });
    fireEvent.click(rejectButton);
    expect(
      await screen.findByRole('region', { name: 'Reject 2 selected reviews' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Reject 2 selected reviews' })).toHaveAttribute(
      'data-ok-text',
      'Batch reject 2 items',
    );
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));
    fireEvent.click(await screen.findByRole('button', { name: 'confirm reject' }));

    await waitFor(() =>
      expect(reviewerDecisionMock).toHaveBeenCalledWith(
        ['review-1', 'review-2'],
        'reject',
        'insufficient evidence',
      ),
    );
    expect(mockWarning).toHaveBeenCalledWith('1 succeeded and 1 failed.');
    expect(onFinished).toHaveBeenCalledWith(['review-2']);
  });

  it('reports command and malformed-response failures without refreshing', async () => {
    const onFinished = jest.fn();
    adminDecisionMock.mockResolvedValue({ data: null, error: new Error('denied') } as never);
    reviewerDecisionMock.mockResolvedValue({ data: [], error: null } as never);

    const { rerender } = render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1']}
        allowApprove
        disabled={false}
        onFinished={onFinished}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch approve' }));
    await waitFor(() => expect(mockError).toHaveBeenCalledTimes(1));

    rerender(
      <BatchReviewActions
        role='reviewer'
        reviewIds={['review-2']}
        allowApprove
        disabled={false}
        onFinished={onFinished}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch approve' }));
    await waitFor(() => expect(mockError).toHaveBeenCalledTimes(2));
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('reports eligibility failures before opening a confirmation', async () => {
    eligibilityMock
      .mockResolvedValueOnce({
        data: [],
        error: new Error('approve preflight failed'),
      } as never)
      .mockResolvedValueOnce({
        data: [],
        error: new Error('reject preflight failed'),
      } as never);

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1']}
        allowApprove
        onFinished={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Batch approve' }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith('Unable to check the selected review scope.'),
    );
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(adminDecisionMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));

    await waitFor(() => expect(mockError).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(adminDecisionMock).not.toHaveBeenCalled();
  });

  it('shows each skipped item with a readable reason and does not submit an empty eligible scope', async () => {
    eligibilityMock.mockResolvedValueOnce({
      data: [
        {
          ordinal: 1,
          review_id: 'review-1',
          eligible: false,
          reason_code: null,
          reviewer_count: 0,
          submitted_opinion_count: 0,
          approve_opinion_count: 0,
          reject_opinion_count: 0,
        },
        {
          ordinal: 2,
          review_id: 'review-2',
          eligible: false,
          reason_code: 'REVIEW_ALREADY_COMPLETED',
          reviewer_count: 1,
          submitted_opinion_count: 1,
          approve_opinion_count: 1,
          reject_opinion_count: 0,
        },
      ],
      error: null,
    });

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1', 'review-2']}
        allowApprove
        getReviewName={(reviewId) => (reviewId === 'review-2' ? 'Data B' : undefined)}
        onFinished={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));

    const dialog = await screen.findByRole('region', { name: 'Reject 2 selected reviews' });
    expect(dialog).toHaveAttribute('data-modal-width', '760');
    expect(dialog).toHaveAttribute('data-ok-text', 'Batch reject 0 items');
    expect(within(dialog).getByRole('textbox', { name: 'review-reason' })).toHaveAttribute(
      'placeholder',
      'Enter a reject reason for the 0 eligible tasks',
    );
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('1.Review name unavailableThis review cannot be processed.');
    expect(rows[1]).toHaveTextContent('2.Data BThis review is already completed.');
    expect(rows[1].querySelectorAll('span')[1]).toHaveAttribute('title', 'Data B');
    expect(rows[1].querySelectorAll('span')[2]).toHaveAttribute(
      'title',
      'This review is already completed.',
    );
    expect(rows[0]).not.toHaveTextContent('review-1');
    expect(rows[0].parentElement).toHaveStyle({ maxHeight: '208px', overflowY: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: 'confirm reject' }));

    await waitFor(() =>
      expect(mockWarning).toHaveBeenCalledWith('None of the selected reviews can be processed.'),
    );
    expect(adminDecisionMock).not.toHaveBeenCalled();
  });

  it('explains each ineligible admin review by name in the batch preview', async () => {
    const reasons = [
      ['REVIEW_NOT_FOUND', 'Review not found or unavailable.'],
      ['REVIEW_NOT_IN_PROGRESS', 'This review is not in progress.'],
      ['REVIEWER_REQUIRED', 'No reviewer is assigned, or you are not assigned to this review.'],
      ['REVIEWER_OPINIONS_PENDING', 'Some reviewers have not submitted their opinions.'],
      [
        'REVIEWER_APPROVAL_REQUIRED',
        'At least one assigned reviewer must approve before final approval.',
      ],
    ] as const;
    eligibilityMock.mockResolvedValueOnce({
      data: reasons.map(([reason_code], ordinal) => ({
        ordinal: ordinal + 1,
        review_id: `review-${ordinal + 1}`,
        eligible: false,
        reason_code,
        reviewer_count: 1,
        submitted_opinion_count: 0,
        approve_opinion_count: 0,
        reject_opinion_count: 0,
      })),
      error: null,
    });

    render(
      <BatchReviewActions
        role='admin'
        reviewIds={reasons.map((_, index) => `review-${index + 1}`)}
        allowApprove
        getReviewName={(reviewId) => `Data ${reviewId.slice(-1)}`}
        onFinished={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));

    const dialog = await screen.findByRole('region', {
      name: `Reject ${reasons.length} selected reviews`,
    });
    const rows = within(dialog).getAllByRole('listitem');
    reasons.forEach(([, description], index) => {
      expect(rows[index]).toHaveTextContent(`${index + 1}.Data ${index + 1}${description}`);
    });
  });

  it('shows the current reviewer opinion for already submitted items, without inferring from totals', async () => {
    eligibilityMock.mockResolvedValueOnce({
      data: [
        {
          ordinal: 1,
          review_id: 'approved',
          eligible: false,
          reason_code: 'OPINION_ALREADY_SUBMITTED',
          reviewer_count: 3,
          submitted_opinion_count: 3,
          approve_opinion_count: 1,
          reject_opinion_count: 2,
        },
        {
          ordinal: 2,
          review_id: 'rejected',
          eligible: false,
          reason_code: 'OPINION_ALREADY_SUBMITTED',
          reviewer_count: 3,
          submitted_opinion_count: 3,
          approve_opinion_count: 2,
          reject_opinion_count: 1,
        },
        {
          ordinal: 3,
          review_id: 'unknown',
          eligible: false,
          reason_code: 'OPINION_ALREADY_SUBMITTED',
          reviewer_count: 1,
          submitted_opinion_count: 1,
          approve_opinion_count: 1,
          reject_opinion_count: 0,
        },
      ],
      error: null,
    });
    commentMock.mockImplementation(async (reviewId) => {
      if (reviewId === 'unknown') return { data: [], error: true };
      return {
        data: [
          {
            review_id: reviewId,
            reviewer_id: 'me',
            state_code: reviewId === 'approved' ? 1 : -3,
            json: {},
          },
        ],
        error: null,
      };
    });

    render(
      <BatchReviewActions
        role='reviewer'
        reviewIds={['approved', 'rejected', 'unknown']}
        allowApprove={false}
        getReviewName={(id) => ({ approved: 'Data A', rejected: 'Data B', unknown: 'Data C' })[id]}
        onFinished={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));
    const dialog = await screen.findByRole('region', { name: 'Reject 3 selected reviews' });
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('1.Data AYou already submitted an approve opinion.');
    expect(rows[1]).toHaveTextContent('2.Data BYou already submitted a reject opinion.');
    expect(rows[2]).toHaveTextContent(
      '3.Data COpinion submitted; its outcome is temporarily unavailable.',
    );
    expect(commentMock).toHaveBeenCalledTimes(3);
  });

  it('shows a safe fallback when a submitted opinion lookup fails or has changed', async () => {
    eligibilityMock.mockResolvedValueOnce({
      data: ['failed', 'missing', 'changed'].map((reviewId, ordinal) => ({
        ordinal: ordinal + 1,
        review_id: reviewId,
        eligible: false,
        reason_code: 'OPINION_ALREADY_SUBMITTED',
        reviewer_count: 1,
        submitted_opinion_count: 1,
        approve_opinion_count: 0,
        reject_opinion_count: 1,
      })),
      error: null,
    });
    commentMock.mockImplementation(async (reviewId) => {
      if (reviewId === 'failed') throw new Error('temporary lookup failure');
      if (reviewId === 'missing') return { data: [], error: null } as never;
      return { data: [{ state_code: 0 }], error: null } as never;
    });

    render(
      <BatchReviewActions
        role='reviewer'
        reviewIds={['failed', 'missing', 'changed']}
        allowApprove={false}
        getReviewName={(reviewId) => `Data ${reviewId}`}
        onFinished={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));

    const dialog = await screen.findByRole('region', { name: 'Reject 3 selected reviews' });
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(
      '1.Data failedOpinion submitted; its outcome is temporarily unavailable.',
    );
    expect(rows[1]).toHaveTextContent(
      '2.Data missingOpinion submitted; its outcome is temporarily unavailable.',
    );
    expect(rows[2]).toHaveTextContent(
      '3.Data changedYour opinion status has changed; you cannot submit again.',
    );
  });

  it('disables actions for explicit disablement and empty selections', () => {
    const { rerender } = render(
      <BatchReviewActions
        role='admin'
        reviewIds={['review-1']}
        allowApprove
        disabled
        onFinished={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Batch approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batch reject' })).toBeDisabled();

    rerender(
      <BatchReviewActions role='admin' reviewIds={[]} allowApprove onFinished={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Batch approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batch reject' })).toBeDisabled();
  });
});
