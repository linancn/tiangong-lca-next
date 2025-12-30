// @ts-nocheck
import RejectReview from '@/pages/Review/Components/RejectReview';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

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
    FormItem: {},
    Input,
    Modal,
    Tooltip,
    message,
  };
});

const mockConcurrencyAdd = jest.fn((task: any) => Promise.resolve(task()));
const mockConcurrencyWait = jest.fn(() => Promise.resolve());
const mockDealProcress = jest.fn();
const mockDealModel = jest.fn();
const mockGetAllRefObj = jest.fn(() => []);
const mockGetRefTableName = jest.fn(() => 'processes');
const mockUpdateUnderReviewToUnReview = jest.fn(() => Promise.resolve());

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: (...args: any[]) => mockConcurrencyAdd(...args),
    waitForAll: (...args: any[]) => mockConcurrencyWait(...args),
  })),
  dealProcress: (...args: any[]) => mockDealProcress(...args),
  dealModel: (...args: any[]) => mockDealModel(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRefTableName: (...args: any[]) => mockGetRefTableName(...args),
  updateUnderReviewToUnReview: (...args: any[]) => mockUpdateUnderReviewToUnReview(...args),
}));

const mockGetCommentApi = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
}));

const mockGetRefData = jest.fn();
const mockUpdateDateToReviewState = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: (...args: any[]) => mockGetRefData(...args),
  updateDateToReviewState: (...args: any[]) => mockUpdateDateToReviewState(...args),
}));

const mockGetLifeCycleModelDetail = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
}));

const mockGetProcessDetail = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGetReviewsDetail = jest.fn();
const mockUpdateReviewApi = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  getReviewsDetail: (...args: any[]) => mockGetReviewsDetail(...args),
  updateReviewApi: (...args: any[]) => mockUpdateReviewApi(...args),
}));

const mockGetUserTeamId = jest.fn();

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

const mockGetUserId = jest.fn();
const mockGetUsersByIds = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId(...args),
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

const { message } = require('antd');

describe('RejectReview component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    formApi = null;
    mockGetCommentApi.mockReset();
    mockGetRefData.mockReset();
    mockUpdateDateToReviewState.mockReset();
    mockGetLifeCycleModelDetail.mockReset();
    mockGetProcessDetail.mockReset();
    mockGetReviewsDetail.mockReset();
    mockUpdateReviewApi.mockReset();
    mockGetUserTeamId.mockReset();
    mockGetUserId.mockReset();
    mockGetUsersByIds.mockReset();
    mockDealProcress.mockReset();
    mockDealModel.mockReset();
    mockGetAllRefObj.mockReset();
    mockUpdateUnderReviewToUnReview.mockReset();
    mockConcurrencyAdd.mockClear();
    mockConcurrencyWait.mockClear();
    mockGetCommentApi.mockResolvedValue({ data: [], error: null });
    mockUpdateUnderReviewToUnReview.mockResolvedValue(undefined);
    message.success.mockReset();
    message.error.mockReset();
  });

  const renderComponent = () =>
    render(
      <RejectReview
        reviewId='review-1'
        dataId='process-1'
        dataVersion='01'
        isModel={false}
        actionRef={{ current: { reload: jest.fn() } }}
        buttonType='text'
      />,
    );

  it('submits rejection and updates related references', async () => {
    mockGetReviewsDetail.mockResolvedValue({
      json: { logs: [] },
      state_code: 0,
    });
    mockGetUserId.mockResolvedValue('user-1');
    mockGetUsersByIds.mockResolvedValue([{ display_name: 'Reviewer', email: 'a@b.com' }]);
    mockUpdateReviewApi.mockResolvedValue({ error: null });
    mockGetProcessDetail.mockResolvedValue({
      success: true,
      data: { id: 'process-1', version: '01', stateCode: 30 },
    });
    mockGetAllRefObj.mockReturnValue([]);
    mockUpdateUnderReviewToUnReview.mockResolvedValue(undefined);
    mockGetUserTeamId.mockResolvedValue('team-1');
    mockDealProcress.mockImplementation(() => undefined);
    mockGetCommentApi.mockResolvedValue({ data: [], error: null });

    renderComponent();

    const trigger = screen.getByRole('button', { name: /Reject Review/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockResolvedValue({ reason: 'Not acceptable' });

    const confirmButton = screen.getByRole('button', { name: /Confirm Reject/i });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(mockUpdateReviewApi).toHaveBeenCalled());
    expect(mockUpdateReviewApi).toHaveBeenCalledWith(
      ['review-1'],
      expect.objectContaining({
        state_code: -1,
        json: expect.objectContaining({
          comment: { message: 'Not acceptable' },
        }),
      }),
    );
    await waitFor(() => expect(mockDealProcress).toHaveBeenCalled());
    await waitFor(() => expect(formApi.resetFields).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('modal')).not.toBeInTheDocument());
    await waitFor(() => expect(message.success).toHaveBeenCalled());
    expect(message.success.mock.calls[0][0]).toBe('Rejected successfully!');
    expect(message.error).not.toHaveBeenCalled();
  });

  it('shows error when validation fails', async () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Reject Review/i }));
    await waitFor(() => expect(formApi).not.toBeNull());
    formApi.validateFields.mockRejectedValue(new Error('failed'));

    fireEvent.click(screen.getByRole('button', { name: /Confirm Reject/i }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(mockUpdateReviewApi).not.toHaveBeenCalled();
  });
});
