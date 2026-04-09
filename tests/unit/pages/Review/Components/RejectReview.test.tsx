// @ts-nocheck
import RejectReview from '@/pages/Review/Components/RejectReview';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
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
  FileExcelOutlined: () => <span data-testid='icon-file' />,
}));

let formApi: any = null;

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Modal = ({ open, children, onCancel, onOk, okText, cancelText, confirmLoading }: any) => {
    if (!open) return null;

    return (
      <div data-testid='modal'>
        <div>{children}</div>
        <button type='button' onClick={onOk} disabled={confirmLoading}>
          {toText(okText) || 'ok'}
        </button>
        <button type='button' onClick={onCancel}>
          {toText(cancelText) || 'cancel'}
        </button>
      </div>
    );
  };

  const FormComponent = React.forwardRef((props: any, ref: any) => {
    const { children } = props;
    const apiRef = React.useRef({
      validateFields: jest.fn(() => Promise.resolve({})),
      resetFields: jest.fn(),
      setFieldsValue: jest.fn(),
    });

    formApi = apiRef.current;
    React.useImperativeHandle(ref, () => apiRef.current, []);

    return <form data-testid='form'>{children}</form>;
  });

  FormComponent.Item = ({ children, label }: any) => (
    <label>
      <span>{toText(label)}</span>
      {typeof children === 'function' ? children({}) : children}
    </label>
  );

  const Input: any = ({ value = '', onChange, ...rest }: any) => (
    <input value={value} onChange={(event) => onChange?.(event)} {...rest} />
  );
  Input.TextArea = ({ value = '', onChange, ...rest }: any) => {
    const restProps = { ...rest } as Record<string, any>;
    delete restProps.showCount;
    return <textarea value={value} onChange={(event) => onChange?.(event)} {...restProps} />;
  };

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  return {
    __esModule: true,
    Button,
    Form: FormComponent,
    FormInstance: {},
    Input,
    Modal,
    Tooltip,
    message,
  };
});

const mockRejectReviewApi = jest.fn();
jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  rejectReviewApi: (...args: any[]) => mockRejectReviewApi(...args),
}));

const { message } = require('antd');

describe('RejectReview component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formApi = null;
    mockRejectReviewApi.mockResolvedValue({
      data: [{ review: { id: 'review-1' } }],
      error: null,
    });
    message.success.mockReset();
    message.error.mockReset();
  });

  const renderComponent = (props: any = {}) => {
    const reload = props.actionRef?.current?.reload ?? jest.fn();

    render(
      <RejectReview
        reviewId='review-1'
        dataId='process-1'
        dataVersion='01'
        isModel={false}
        actionRef={{ current: { reload } }}
        buttonType='text'
        {...props}
      />,
    );

    return { reload };
  };

  it('submits process rejections through the review workflow command boundary', async () => {
    const { reload } = renderComponent();
    reload.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.resetFields.mockClear();
    formApi.validateFields.mockResolvedValue({ reason: 'Not acceptable' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));
    });

    expect(mockRejectReviewApi).toHaveBeenCalledWith('review-1', 'processes', 'Not acceptable');
    expect(message.success).toHaveBeenCalledWith('Rejected successfully!');
    await waitFor(() => expect(formApi.resetFields).toHaveBeenCalled());
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('uses lifecyclemodels as the target table for model rejections', async () => {
    const { reload } = renderComponent({
      isModel: true,
      buttonType: 'icon',
      dataId: 'model-1',
      dataVersion: '03',
    });
    reload.mockClear();

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockResolvedValue({ reason: 'Model rejected' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));
    });

    expect(mockRejectReviewApi).toHaveBeenCalledWith(
      'review-1',
      'lifecyclemodels',
      'Model rejected',
    );
    expect(screen.getByTestId('icon-file')).toBeInTheDocument();
  });

  it('delegates to a custom onOk handler without calling the review service', async () => {
    const onOk = jest.fn().mockResolvedValue(undefined);
    const { reload } = renderComponent({ onOk });
    reload.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockResolvedValue({ reason: 'Custom rejection' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));
    });

    expect(onOk).toHaveBeenCalledWith('Custom rejection');
    expect(mockRejectReviewApi).not.toHaveBeenCalled();
    await waitFor(() => expect(reload).toHaveBeenCalled());
  });

  it('shows an error when validation fails', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockRejectedValue(new Error('failed'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));
    });

    expect(mockRejectReviewApi).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalledWith('Failed to reject, please try again!');
  });

  it('shows an error when the command returns an error payload', async () => {
    mockRejectReviewApi.mockResolvedValueOnce({
      data: [],
      error: new Error('failed'),
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockResolvedValue({ reason: 'Not acceptable' });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));
    });

    expect(message.error).toHaveBeenCalledWith('Failed to reject, please try again!');
  });

  it('closes the modal from the cancel action without calling the review service', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
    expect(mockRejectReviewApi).not.toHaveBeenCalled();
  });

  it('uses the default icon trigger when buttonType is omitted and tolerates missing action refs', async () => {
    render(
      <RejectReview reviewId='review-1' dataId='process-1' dataVersion='01' isModel={false} />,
    );

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByTestId('modal')).toBeInTheDocument());
    expect(screen.getByTestId('icon-file')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
  });
});
