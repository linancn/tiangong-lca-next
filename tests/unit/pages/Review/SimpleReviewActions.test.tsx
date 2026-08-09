import SimpleReviewActions from '@/pages/Review/Components/SimpleReviewActions';
import { approveReviewApi, submitSimpleReviewDecision } from '@/services/reviews/api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockMessageError = jest.fn();
const mockMessageSuccess = jest.fn();
const mockResetFields = jest.fn();
const mockValidateFields = jest.fn();
const mockConfirm = jest.fn();
const mockRejectReview = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  approveReviewApi: jest.fn(),
  submitSimpleReviewDecision: jest.fn(),
}));

jest.mock('@ant-design/icons', () => ({
  FileExcelOutlined: () => <span>reject-icon</span>,
  SafetyCertificateOutlined: () => <span>approve-icon</span>,
}));

jest.mock('@umijs/max', () => ({
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  }),
}));

jest.mock('@/pages/Review/Components/RejectReview', () => (props: unknown) => {
  mockRejectReview(props);
  return <button type='button'>admin-reject</button>;
});

jest.mock('antd', () => {
  const Form = ({
    children,
  }: {
    children: import('react').ReactNode;
    form?: unknown;
    layout?: string;
  }) => <form>{children}</form>;
  Form.useForm = () => [
    {
      validateFields: mockValidateFields,
      resetFields: mockResetFields,
    },
  ];
  Form.Item = ({
    children,
    label,
  }: {
    children: import('react').ReactNode;
    label?: import('react').ReactNode;
    name?: string;
    rules?: unknown[];
  }) => (
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
    title?: import('react').ReactNode;
    onCancel?: () => void;
    onOk?: () => void;
    confirmLoading?: boolean;
  }) =>
    open ? (
      <section aria-label={String(title)}>
        {children}
        <button type='button' onClick={onCancel}>
          cancel-rejection
        </button>
        <button type='button' onClick={onOk}>
          confirm-rejection
        </button>
      </section>
    ) : null;
  Modal.confirm = (options: { onOk?: () => void }) => mockConfirm(options);

  return {
    Button: ({
      icon,
      onClick,
      shape,
      size,
      type,
      danger,
    }: {
      icon?: import('react').ReactNode;
      onClick?: () => void;
      loading?: boolean;
      size?: string;
      shape?: string;
      type?: string;
      danger?: boolean;
    }) => (
      <button
        type='button'
        data-button-shape={shape}
        data-button-size={size}
        data-button-type={type ?? 'default'}
        data-button-danger={danger ? 'true' : 'false'}
        onClick={onClick}
      >
        {icon}
      </button>
    ),
    Form,
    Input: {
      TextArea: () => <textarea aria-label='review-reason' />,
    },
    message: {
      error: (...args: unknown[]) => mockMessageError(...args),
      success: (...args: unknown[]) => mockMessageSuccess(...args),
    },
    Modal,
    Space: ({ children }: { children: import('react').ReactNode }) => <div>{children}</div>,
    Tooltip: ({
      children,
      title,
    }: {
      children: import('react').ReactNode;
      title?: import('react').ReactNode;
    }) => <span aria-label={String(title)}>{children}</span>,
  };
});

const approveReviewApiMock = jest.mocked(approveReviewApi);
const submitSimpleReviewDecisionMock = jest.mocked(submitSimpleReviewDecision);

describe('SimpleReviewActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockImplementation(({ onOk }: { onOk?: () => void }) => onOk?.());
    mockValidateFields.mockResolvedValue({ reason: 'needs correction' });
  });

  it('lets an admin approve and exposes the existing admin rejection action', async () => {
    const reload = jest.fn();
    approveReviewApiMock.mockResolvedValue({ data: null, error: null } as never);

    render(
      <SimpleReviewActions
        reviewId='review-id'
        targetTable='lifecyclemodels'
        role='admin'
        actionRef={{ current: { reload } }}
      />,
    );

    const approveButton = screen.getByText('approve-icon').closest('button');
    expect(approveButton).toHaveAttribute('data-button-shape', 'circle');
    expect(approveButton).toHaveAttribute('data-button-size', 'small');
    expect(approveButton).toHaveAttribute('data-button-type', 'default');
    fireEvent.click(approveButton!);

    await waitFor(() =>
      expect(approveReviewApiMock).toHaveBeenCalledWith('review-id', 'lifecyclemodels'),
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Review approved.');
    expect(reload).toHaveBeenCalled();
    expect(mockRejectReview).toHaveBeenCalledWith(
      expect.objectContaining({
        reviewId: 'review-id',
        dataId: '',
        dataVersion: '',
        isModel: true,
        targetTable: 'lifecyclemodels',
      }),
    );
    expect(screen.getByRole('button', { name: 'admin-reject' })).toBeInTheDocument();
  });

  it('reports admin approval errors and supports a non-model target', async () => {
    approveReviewApiMock.mockResolvedValue({
      data: null,
      error: new Error('rejected'),
    } as never);

    render(
      <SimpleReviewActions
        reviewId='review-id'
        targetTable='contacts'
        role='admin'
        actionRef={null}
      />,
    );
    fireEvent.click(screen.getByText('approve-icon'));

    await waitFor(() =>
      expect(mockMessageError).toHaveBeenCalledWith('Unable to submit the review decision.'),
    );
    expect(mockRejectReview).toHaveBeenCalledWith(expect.objectContaining({ isModel: false }));
  });

  it('lets a reviewer approve without an opinion or a reload target', async () => {
    submitSimpleReviewDecisionMock.mockResolvedValue({ data: null, error: null } as never);

    render(
      <SimpleReviewActions
        reviewId='review-id'
        targetTable='flows'
        role='reviewer'
        actionRef={{}}
      />,
    );
    fireEvent.click(screen.getByText('approve-icon'));

    await waitFor(() =>
      expect(submitSimpleReviewDecisionMock).toHaveBeenCalledWith('review-id', 'approve'),
    );
    expect(mockMessageSuccess).toHaveBeenCalledWith('Review approved.');
  });

  it('requires and submits a reviewer rejection reason', async () => {
    const reload = jest.fn();
    submitSimpleReviewDecisionMock.mockResolvedValue({ data: null, error: null } as never);

    render(
      <SimpleReviewActions
        reviewId='review-id'
        targetTable='sources'
        role='reviewer'
        actionRef={{ current: { reload } }}
      />,
    );

    const rejectButton = screen.getByText('reject-icon').closest('button');
    expect(rejectButton).toHaveAttribute('data-button-shape', 'circle');
    expect(rejectButton).toHaveAttribute('data-button-size', 'small');
    expect(rejectButton).toHaveAttribute('data-button-type', 'default');
    expect(rejectButton).toHaveAttribute('data-button-danger', 'false');
    fireEvent.click(rejectButton!);
    fireEvent.click(screen.getByRole('button', { name: 'cancel-rejection' }));
    fireEvent.click(screen.getByText('reject-icon'));
    fireEvent.click(screen.getByRole('button', { name: 'confirm-rejection' }));

    await waitFor(() =>
      expect(submitSimpleReviewDecisionMock).toHaveBeenCalledWith(
        'review-id',
        'reject',
        'needs correction',
      ),
    );
    expect(mockResetFields).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
    expect(mockMessageSuccess).toHaveBeenCalledWith('Review rejection submitted.');
  });

  it('keeps the reviewer rejection modal open when submission fails', async () => {
    submitSimpleReviewDecisionMock.mockResolvedValue({
      data: null,
      error: new Error('rejected'),
    } as never);

    render(
      <SimpleReviewActions
        reviewId='review-id'
        targetTable='flowproperties'
        role='reviewer'
        actionRef={undefined}
      />,
    );

    fireEvent.click(screen.getByText('reject-icon'));
    fireEvent.click(screen.getByRole('button', { name: 'confirm-rejection' }));

    await waitFor(() =>
      expect(mockMessageError).toHaveBeenCalledWith('Unable to submit the review decision.'),
    );
    expect(screen.getByLabelText('Reject Review')).toBeInTheDocument();
  });
});
