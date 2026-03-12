// @ts-nocheck
import ReviewProcessDetail, { getNewReviewJson } from '@/pages/Review/Components/reviewProcess';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

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
  AuditOutlined: () => <span data-testid='icon-audit' />,
  CloseOutlined: () => <span data-testid='icon-close' />,
  ProfileOutlined: () => <span data-testid='icon-profile' />,
}));

let proFormApi: any;
let proFormValues: any = {};

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick} disabled={disabled} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, children, footer, extra, title }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

  const Space = ({ children }: any) => <div>{children}</div>;

  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <>{children}</>;

  const Input = (props: any) => <input {...props} />;

  const FormItem = ({ children }: any) => <div>{children}</div>;

  const FormComponent = ({ children }: any) => <div>{children}</div>;
  FormComponent.Item = FormItem;

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
    Drawer,
    Form: FormComponent,
    FormItem,
    Input,
    Space,
    Spin,
    Tooltip,
    message,
  };
});

const ProFormMock = ({ children, formRef, onFinish, onValuesChange }: any) => {
  const api = {
    submit: jest.fn(async () => {
      return await onFinish?.();
    }),
    resetFields: jest.fn(),
    setFieldsValue: jest.fn(),
    getFieldsValue: jest.fn(() => proFormValues),
  };
  proFormApi = api;
  React.useImperativeHandle(formRef, () => api, [api]);

  const handleChange = (event: any) => {
    onValuesChange?.({}, proFormValues);
    event?.preventDefault?.();
  };

  return (
    <form data-testid='proform' onSubmit={(event) => event.preventDefault()}>
      <div onChange={handleChange}>{typeof children === 'function' ? children({}) : children}</div>
    </form>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProForm: (props: any) => <ProFormMock {...props} />,
  ProFormInstance: {},
}));

jest.mock('@/pages/Review/Components/RejectReview', () => ({
  __esModule: true,
  default: ({ onOk }: any) => (
    <button type='button' onClick={() => onOk?.('Need more evidence')}>
      Reject Stub
    </button>
  ),
}));

jest.mock('@/pages/Review/Components/reviewProcess/tabsDetail', () => ({
  __esModule: true,
  TabsDetail: ({ onTabChange, rejectedComments, activeTabKey, type }: any) => (
    <div data-testid='tabs-detail'>
      {JSON.stringify({ rejectedComments, activeTabKey, type })}
      <button type='button' onClick={() => onTabChange?.('processInformation')}>
        switch-tab
      </button>
    </div>
  ),
}));

const mockCheckReferences = jest.fn(() =>
  Promise.resolve({
    findProblemNodes: () => [],
  }),
);
const mockGetAllRefObj = jest.fn(() => []);
const mockGetRejectedComments = jest.fn(() => Promise.resolve([]));
const mockUpdateUnReviewToUnderReview = jest.fn(() => Promise.resolve());
const mockUpdateReviewDataToPublic = jest.fn(() => Promise.resolve());

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  updateUnReviewToUnderReview: (...args: any[]) => mockUpdateUnReviewToUnderReview(...args),
  ReffPath: function () {
    return { addChild: jest.fn(), findProblemNodes: () => [] };
  },
  updateReviewDataToPublic: (...args: any[]) => mockUpdateReviewDataToPublic(...args),
  getRefTableName: jest.fn(() => 'processes'),
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: jest.fn(async (fn: any) => fn()),
    waitForAll: jest.fn(() => Promise.resolve()),
  })),
  getRejectedComments: (...args: any[]) => mockGetRejectedComments(...args),
}));

const mockGetCommentApi = jest.fn();
const mockUpdateCommentApi = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
  updateCommentApi: (...args: any[]) => mockUpdateCommentApi(...args),
}));

const mockGetProcessDetail = jest.fn();
const mockUpdateProcessApi = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  updateProcessApi: (...args: any[]) => mockUpdateProcessApi(...args),
}));

const mockGenProcessFromData = jest.fn();

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
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

describe('ReviewProcessDetail component', () => {
  const baseProcessDetail = {
    data: {
      id: 'process-1',
      version: '01',
      stateCode: 10,
      json: {
        processDataSet: {
          modellingAndValidation: {
            validation: { review: [] },
            complianceDeclarations: { compliance: [] },
          },
        },
      },
    },
    success: true,
  };

  const assignedCommentData = [
    {
      review_id: 'review-1',
      state_code: 1,
      json: {
        modellingAndValidation: {
          validation: {
            review: [
              {
                '@type': 'type',
                'common:scope': [{ '@name': 'scope', 'common:method': { '@name': 'method' } }],
                'common:reviewDetails': ['detail'],
              },
            ],
          },
          complianceDeclarations: {
            compliance: [
              {
                key: 'ref',
                'common:referenceToComplianceSystem': { '@refObjectId': 'sys' },
                foo: 'bar',
              },
            ],
          },
        },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    proFormApi = null;
    proFormValues = {};
    mockGetProcessDetail.mockResolvedValue(baseProcessDetail);
    mockGenProcessFromData.mockReturnValue({
      processInformation: {},
      exchanges: { exchange: [] },
    });
    mockGetCommentApi.mockResolvedValue({ data: assignedCommentData, error: null });
    mockUpdateCommentApi.mockResolvedValue({ error: null });
    mockUpdateProcessApi.mockResolvedValue({ success: true });
    mockUpdateReviewApi.mockResolvedValue({ error: null });
    mockGetUserTeamId.mockResolvedValue('team-1');
    mockGetUserId.mockResolvedValue('user-1');
    mockGetUsersByIds.mockResolvedValue([{ id: 'user-1', display_name: 'Reviewer' }]);
    mockGetReviewsDetail.mockResolvedValue({ json: { logs: [] } });
    mockGetRejectedComments.mockResolvedValue([]);
    mockUpdateReviewDataToPublic.mockResolvedValue(undefined);
    message.success.mockReset();
    message.error.mockReset();
  });

  const renderComponent = (props: any) => {
    const actionRef = props.actionRef ?? { current: { reload: jest.fn() } };
    render(
      <ReviewProcessDetail
        id='process-1'
        reviewId='review-1'
        version='01'
        lang='en'
        actionRef={actionRef}
        {...props}
      />,
    );
    return { actionRef };
  };

  it('builds review json logs with the current user context', async () => {
    const result = await getNewReviewJson('submit_comments', 'review-1');

    expect(mockGetUserId).toHaveBeenCalled();
    expect(mockGetUsersByIds).toHaveBeenCalledWith(['user-1']);
    expect(mockGetReviewsDetail).toHaveBeenCalledWith('review-1');
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0]).toEqual(
      expect.objectContaining({
        action: 'submit_comments',
        user: {
          id: 'user-1',
          display_name: 'Reviewer',
        },
      }),
    );
  });

  it('submits review form when reviewer saves', async () => {
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [],
    });
    mockGetAllRefObj.mockReturnValue([]);
    proFormValues = {
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    };

    renderComponent({ type: 'edit', tabType: 'review' });

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());
    await waitFor(() => expect(proFormApi).not.toBeNull());

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith(
        'review-1',
        expect.objectContaining({
          json: expect.objectContaining({
            modellingAndValidation: expect.any(Object),
          }),
          state_code: 1,
        }),
        'review',
      ),
    );
    expect(mockUpdateReviewApi).toHaveBeenCalled();
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith('Review submitted successfully'),
    );
  });

  it('temporarily saves review comments and refreshes the parent table', async () => {
    proFormValues = {
      modellingAndValidation: {
        validation: { review: [{ '@type': 'peer-review' }] },
        complianceDeclarations: { compliance: [{ foo: 'bar' }] },
      },
    };
    const { actionRef } = renderComponent({ type: 'edit', tabType: 'review' });

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Temporary Save' }));
    });

    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith(
        'review-1',
        {
          json: {
            modellingAndValidation: {
              validation: { review: [{ '@type': 'peer-review' }] },
              complianceDeclarations: { compliance: [{ foo: 'bar' }] },
            },
          },
        },
        'review',
      ),
    );
    expect(mockUpdateReviewApi).toHaveBeenCalledWith(
      ['review-1'],
      expect.objectContaining({
        json: expect.objectContaining({
          logs: expect.any(Array),
        }),
      }),
    );
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith('Temporary save successfully'),
    );
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('rejects a review with the provided reason and reloads the parent table', async () => {
    const { actionRef } = renderComponent({ type: 'edit', tabType: 'review' });

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reject Stub' }));
    });

    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith(
        'review-1',
        {
          json: expect.objectContaining({
            modellingAndValidation: expect.any(Object),
            comment: { message: 'Need more evidence' },
          }),
          state_code: -3,
        },
        'review',
      ),
    );
    expect(message.success).toHaveBeenCalledWith('Rejected successfully!');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('stops submission when reference checking returns problem nodes', async () => {
    proFormValues = {
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    };
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [
        {
          '@refObjectId': 'ref-1',
          '@version': '1.0.0',
          ruleVerification: true,
          nonExistent: false,
        },
      ],
    });

    renderComponent({ type: 'edit', tabType: 'review' });

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() => expect(mockCheckReferences).toHaveBeenCalled());
    expect(mockUpdateCommentApi).not.toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({ state_code: 1 }),
      'review',
    );
    expect(mockUpdateUnReviewToUnderReview).not.toHaveBeenCalled();
  });

  it('seeds default review data for empty review comments and loads rejected comments', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [{ review_id: 'review-1' }],
      error: null,
    });
    mockGetRejectedComments.mockResolvedValue([{ message: 'Needs revision' }]);

    renderComponent({ type: 'edit', tabType: 'review' });

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGetRejectedComments).toHaveBeenCalledWith('process-1', '01'));
    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const processData = mockGenProcessFromData.mock.calls[0][0];
    expect(processData.modellingAndValidation.complianceDeclarations.compliance).toHaveLength(5);
    expect(processData.modellingAndValidation.validation.review).toEqual([
      {
        'common:scope': [{ '@name': undefined }],
      },
    ]);
    expect(screen.getByTestId('tabs-detail')).toHaveTextContent('Needs revision');
  });

  it('opens in view mode without reviewer action footer controls', async () => {
    renderComponent({ type: 'view', tabType: 'assigned' });

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    expect(screen.getByText('View review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Temporary Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject Stub' })).not.toBeInTheDocument();
  });
});
