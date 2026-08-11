import BatchReviewActions from '@/pages/Review/Components/BatchReviewActions';
import {
  submitAdminReviewBatchDecision,
  submitReviewerBatchDecision,
} from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockConfirm = jest.fn();
const mockResetFields = jest.fn();
const mockValidateFields = jest.fn();
const mockSuccess = jest.fn();
const mockWarning = jest.fn();
const mockError = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  submitAdminReviewBatchDecision: jest.fn(),
  submitReviewerBatchDecision: jest.fn(),
}));

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
    onCancel,
    onOk,
  }: {
    children: import('react').ReactNode;
    open?: boolean;
    title?: string;
    onCancel?: () => void;
    onOk?: () => void;
  }) =>
    open ? (
      <section aria-label={title}>
        {children}
        <button type='button' onClick={onCancel}>
          cancel
        </button>
        <button type='button' onClick={onOk}>
          confirm reject
        </button>
      </section>
    ) : null;
  Modal.useModal = () => [
    { confirm: (options: { onOk?: () => void }) => mockConfirm(options) },
    <span key='modal-context' data-testid='modal-context' />,
  ];

  return {
    Button: ({
      children,
      disabled,
      onClick,
    }: {
      children: import('react').ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }) => (
      <button type='button' disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
    Form,
    Input: { TextArea: () => <textarea aria-label='review-reason' /> },
    message: {
      success: (...args: unknown[]) => mockSuccess(...args),
      warning: (...args: unknown[]) => mockWarning(...args),
      error: (...args: unknown[]) => mockError(...args),
    },
    Modal,
    Space: ({ children }: { children: import('react').ReactNode }) => <div>{children}</div>,
  };
});

const adminDecisionMock = jest.mocked(submitAdminReviewBatchDecision);
const reviewerDecisionMock = jest.mocked(submitReviewerBatchDecision);

describe('BatchReviewActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockImplementation(({ onOk }: { onOk?: () => void }) => onOk?.());
    mockValidateFields.mockResolvedValue({ reason: 'insufficient evidence' });
  });

  it('submits a successful admin batch approval and refreshes the table', async () => {
    const onFinished = jest.fn();
    adminDecisionMock.mockResolvedValue({
      data: [{ summary: { succeeded: 2, failed: 0 }, items: [] }],
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
    expect(onFinished).toHaveBeenCalled();
    expect(screen.getByTestId('modal-context')).toBeInTheDocument();
  });

  it('submits a reviewer rejection as an advisory opinion and reports partial results', async () => {
    const onFinished = jest.fn();
    reviewerDecisionMock.mockResolvedValue({
      data: [{ summary: { succeeded: 1, failed: 1 }, items: [] }],
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
    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));
    expect(screen.getByRole('region', { name: 'Reject 2 selected reviews' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Batch reject' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm reject' }));

    await waitFor(() =>
      expect(reviewerDecisionMock).toHaveBeenCalledWith(
        ['review-1', 'review-2'],
        'reject',
        'insufficient evidence',
      ),
    );
    expect(mockWarning).toHaveBeenCalledWith('1 succeeded and 1 failed.');
    expect(onFinished).toHaveBeenCalled();
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
