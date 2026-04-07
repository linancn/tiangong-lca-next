// @ts-nocheck
import ReviewProcessDetail from '@/pages/Review/Components/reviewProcess';
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

jest.mock('umi', () => ({
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

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
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
  const Drawer = ({ open, children, footer, extra, title, getContainer, onClose }: any) =>
    open ? (
      <section data-testid='drawer'>
        <div data-testid='drawer-container'>
          {getContainer?.() === globalThis.document?.body ? 'body' : 'custom'}
        </div>
        <header>{toText(title)}</header>
        <button type='button' data-testid='drawer-on-close' onClick={() => onClose?.()}>
          drawer-close
        </button>
        <div>{extra}</div>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

  const FormItem = ({ children }: any) => <div>{children}</div>;
  const FormComponent = ({ children }: any) => <div>{children}</div>;
  FormComponent.Item = FormItem;

  const Input = (props: any) => <input {...props} />;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <>{children}</>;

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
    Input,
    Space,
    Spin,
    Tooltip,
    message,
  };
});

const ProFormMock = ({ children, formRef, onFinish, onValuesChange, submitter }: any) => {
  if (!proFormApi) {
    proFormApi = {
      submit: jest.fn(),
      resetFields: jest.fn(),
      setFieldsValue: jest.fn(),
      getFieldsValue: jest.fn(),
    };
  }

  proFormApi.submit.mockImplementation(async () => onFinish?.());
  proFormApi.getFieldsValue.mockImplementation(() => proFormValues);
  const api = proFormApi;
  React.useImperativeHandle(formRef, () => api, [api]);

  return (
    <form data-testid='proform' onSubmit={(event) => event.preventDefault()}>
      <div onChange={() => onValuesChange?.({}, proFormValues)}>
        {typeof children === 'function' ? children({}) : children}
      </div>
      <button
        type='button'
        data-testid='trigger-values-change'
        onClick={() => onValuesChange?.({}, proFormValues)}
      >
        trigger-values-change
      </button>
      <div data-testid='submitter-render'>{submitter?.render?.() ?? null}</div>
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
  TabsDetail: ({ rejectedComments, onData, onExchangeData, onTabChange }: any) => (
    <div data-testid='tabs-detail'>
      {JSON.stringify(rejectedComments)}
      <button type='button' data-testid='trigger-on-data' onClick={() => onData?.()}>
        trigger-on-data
      </button>
      <button
        type='button'
        data-testid='trigger-on-exchange-data'
        onClick={() => onExchangeData?.([{ id: 'exchange-1' }])}
      >
        trigger-on-exchange-data
      </button>
      <button type='button' onClick={() => onTabChange?.('processInformation')}>
        switch-tab
      </button>
    </div>
  ),
}));

const mockCheckReferences = jest.fn();
const mockGetAllRefObj = jest.fn(() => []);
const mockGetRejectedComments = jest.fn();
const mockReffPathFindProblemNodes = jest.fn(() => []);

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRejectedComments: (...args: any[]) => mockGetRejectedComments(...args),
  ReffPath: jest.fn().mockImplementation(() => ({
    findProblemNodes: (...args: any[]) => mockReffPathFindProblemNodes(...args),
  })),
}));

const mockGetCommentApi = jest.fn();
const mockSaveReviewCommentDraftApi = jest.fn();
const mockSubmitReviewCommentApi = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
  saveReviewCommentDraftApi: (...args: any[]) => mockSaveReviewCommentDraftApi(...args),
  submitReviewCommentApi: (...args: any[]) => mockSubmitReviewCommentApi(...args),
}));

const mockGetProcessDetail = jest.fn();
jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
}));

const mockGenProcessFromData = jest.fn();
jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
}));

const mockGetUserTeamId = jest.fn();
jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
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

  beforeEach(() => {
    jest.clearAllMocks();
    proFormApi = null;
    proFormValues = {
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    };
    mockGetProcessDetail.mockResolvedValue(baseProcessDetail);
    mockGetCommentApi.mockResolvedValue({ data: [], error: null });
    mockGetRejectedComments.mockResolvedValue([]);
    mockGenProcessFromData.mockReturnValue({
      processInformation: {},
      exchanges: { exchange: [] },
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    });
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [],
    });
    mockGetAllRefObj.mockReturnValue([]);
    mockReffPathFindProblemNodes.mockReturnValue([]);
    mockSaveReviewCommentDraftApi.mockResolvedValue({ data: [{}], error: null });
    mockSubmitReviewCommentApi.mockResolvedValue({ data: [{}], error: null });
    mockGetUserTeamId.mockResolvedValue('team-1');
    message.success.mockReset();
    message.error.mockReset();
  });

  const renderComponent = (props: any = {}) => {
    const actionRef = props.actionRef ?? { current: { reload: jest.fn() } };

    render(
      <ReviewProcessDetail
        id='process-1'
        reviewId='review-1'
        version='01'
        lang='en'
        actionRef={actionRef}
        type='edit'
        tabType='review'
        {...props}
      />,
    );

    return { actionRef };
  };

  it('temporarily saves review comment drafts through the comment command boundary', async () => {
    const { actionRef } = renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '01'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Temporary Save' }));
    });

    expect(mockSaveReviewCommentDraftApi).toHaveBeenCalledWith('review-1', {
      modellingAndValidation: {
        complianceDeclarations: { compliance: [] },
        validation: { review: [] },
      },
    });
    expect(message.success).toHaveBeenCalledWith('Temporary save successfully');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('submits review comments through the command boundary when reference checks pass', async () => {
    const { actionRef } = renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockGetAllRefObj).toHaveBeenCalled();
    expect(mockGetUserTeamId).toHaveBeenCalled();
    expect(mockSubmitReviewCommentApi).toHaveBeenCalledWith('review-1', {
      modellingAndValidation: {
        complianceDeclarations: { compliance: [] },
        validation: { review: [] },
      },
    });
    expect(message.success).toHaveBeenCalledWith('Review submitted successfully');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('submits reviewer rejections with the reviewer-rejected state', async () => {
    const { actionRef } = renderComponent();

    proFormValues = {
      modellingAndValidation: {
        validation: { review: [{ id: 'review-item' }] },
        complianceDeclarations: { compliance: [{ id: 'compliance-item' }] },
      },
    };

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reject Stub' }));
    });

    expect(mockSubmitReviewCommentApi).toHaveBeenCalledWith(
      'review-1',
      {
        modellingAndValidation: {
          complianceDeclarations: { compliance: [{ id: 'compliance-item' }] },
          validation: { review: [{ id: 'review-item' }] },
        },
        comment: {
          message: 'Need more evidence',
        },
      },
      -3,
    );
    expect(message.success).toHaveBeenCalledWith('Rejected successfully!');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('blocks submission when reference checking reports under-review dependencies', async () => {
    mockCheckReferences.mockImplementation(async (...args: any[]) => {
      args[4].push({
        '@refObjectId': 'ref-2',
        '@version': '2.0.0',
      });
      return {
        findProblemNodes: () => [],
      };
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockSubmitReviewCommentApi).not.toHaveBeenCalled();
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('loads rejected comments for under-review processes', async () => {
    mockGetRejectedComments.mockResolvedValue([{ message: 'Needs revision' }]);

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGetRejectedComments).toHaveBeenCalledWith('process-1', '01'));
    expect(screen.getByTestId('tabs-detail')).toHaveTextContent('Needs revision');
  });

  it('opens in view mode without review footer actions', async () => {
    renderComponent({ type: 'view', tabType: 'assigned' });

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    expect(screen.getByText('View review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Temporary Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject Stub' })).not.toBeInTheDocument();
  });

  it('merges saved review data and default compliance templates when opening review mode', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
        json: {
          processDataSet: {
            modellingAndValidation: {
              validation: { review: [{ id: 'existing-review' }] },
              complianceDeclarations: { compliance: [{ id: 'existing-compliance' }] },
            },
          },
        },
      },
      success: true,
    });
    mockGetCommentApi.mockResolvedValueOnce({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: { review: [{ id: 'saved-review' }] },
              complianceDeclarations: { compliance: [{ id: 'saved-compliance' }] },
            },
          },
        },
        {
          json: null,
        },
      ],
      error: null,
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const merged = mockGenProcessFromData.mock.calls.at(-1)?.[0];
    expect(merged.modellingAndValidation.validation.review).toEqual([{ id: 'saved-review' }]);
    expect(merged.modellingAndValidation.complianceDeclarations.compliance).toHaveLength(6);
    expect(proFormApi.resetFields).toHaveBeenCalled();
    expect(proFormApi.setFieldsValue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'process-1',
      }),
    );
    expect(mockGetRejectedComments).not.toHaveBeenCalled();
  });

  it('merges persisted review data into non-review tabs instead of replacing it', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
        json: {
          processDataSet: {
            modellingAndValidation: {
              validation: { review: { id: 'existing-review' } },
              complianceDeclarations: { compliance: { id: 'existing-compliance' } },
            },
          },
        },
      },
      success: true,
    });
    mockGetCommentApi.mockResolvedValueOnce({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: { review: [{ id: 'saved-review' }] },
              complianceDeclarations: { compliance: [{ id: 'saved-compliance' }] },
            },
          },
        },
      ],
      error: null,
    });

    renderComponent({ type: 'view', tabType: 'assigned' });

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const merged = mockGenProcessFromData.mock.calls.at(-1)?.[0];
    expect(merged.modellingAndValidation.validation.review).toEqual([
      { id: 'existing-review' },
      { id: 'saved-review' },
    ]);
    expect(merged.modellingAndValidation.complianceDeclarations.compliance).toEqual([
      { id: 'existing-compliance' },
      { id: 'saved-compliance' },
    ]);
  });

  it('falls back to default review and compliance placeholders when saved review comments are empty', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
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
    });
    mockGetCommentApi.mockResolvedValueOnce({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: { review: [] },
              complianceDeclarations: { compliance: [] },
            },
          },
        },
      ],
      error: null,
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const merged = mockGenProcessFromData.mock.calls.at(-1)?.[0];
    expect(merged.modellingAndValidation.validation.review).toEqual([
      {
        'common:scope': [{ '@name': undefined }],
      },
    ]);
    expect(merged.modellingAndValidation.complianceDeclarations.compliance).toEqual([{}]);
  });

  it('merges persisted review arrays into existing non-review arrays', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
        json: {
          processDataSet: {
            modellingAndValidation: {
              validation: { review: [{ id: 'existing-review' }] },
              complianceDeclarations: { compliance: [{ id: 'existing-compliance' }] },
            },
          },
        },
      },
      success: true,
    });
    mockGetCommentApi.mockResolvedValueOnce({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: { review: [{ id: 'saved-review' }] },
              complianceDeclarations: { compliance: [{ id: 'saved-compliance' }] },
            },
          },
        },
      ],
      error: null,
    });

    renderComponent({ type: 'view', tabType: 'assigned' });

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const merged = mockGenProcessFromData.mock.calls.at(-1)?.[0];
    expect(merged.modellingAndValidation.validation.review).toEqual([
      { id: 'existing-review' },
      { id: 'saved-review' },
    ]);
    expect(merged.modellingAndValidation.complianceDeclarations.compliance).toEqual([
      { id: 'existing-compliance' },
      { id: 'saved-compliance' },
    ]);
  });

  it('falls back to saved review arrays when the current non-review payload is missing review data', async () => {
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
        json: {
          processDataSet: {
            modellingAndValidation: {},
          },
        },
      },
      success: true,
    });
    mockGetCommentApi.mockResolvedValueOnce({
      data: [
        {
          json: {
            modellingAndValidation: {
              validation: { review: [{ id: 'saved-review' }] },
              complianceDeclarations: { compliance: [{ id: 'saved-compliance' }] },
            },
          },
        },
      ],
      error: null,
    });

    renderComponent({ type: 'view', tabType: 'assigned' });

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());

    const merged = mockGenProcessFromData.mock.calls.at(-1)?.[0];
    expect(merged.modellingAndValidation.validation.review).toEqual([{ id: 'saved-review' }]);
    expect(merged.modellingAndValidation.complianceDeclarations.compliance).toEqual([
      { id: 'saved-compliance' },
    ]);
  });

  it('runs tab/update hooks and supports both close actions', async () => {
    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('trigger-on-data'));
    fireEvent.click(screen.getByTestId('trigger-on-exchange-data'));
    fireEvent.click(screen.getByRole('button', { name: 'switch-tab' }));
    fireEvent.click(screen.getByTestId('trigger-values-change'));

    fireEvent.click(screen.getByTestId('icon-close').closest('button') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(screen.getByTestId('drawer')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('drawer-on-close'));
    await waitFor(() => expect(screen.queryByTestId('drawer')).not.toBeInTheDocument());
  });

  it('falls back to empty process datasets, updates tab snapshots, and accepts missing reference paths', async () => {
    proFormValues = {
      processInformation: { title: 'Updated process' },
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    };
    mockGetProcessDetail.mockResolvedValueOnce({
      data: {
        id: 'process-1',
        version: '01',
        stateCode: 100,
        json: {},
      },
      success: true,
    });
    mockCheckReferences.mockResolvedValueOnce(undefined);

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalledWith({}));
    await waitFor(() =>
      expect(proFormApi.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'process-1',
        }),
      ),
    );

    fireEvent.click(screen.getByTestId('trigger-on-data'));
    await waitFor(() => expect(proFormApi.getFieldsValue).toHaveBeenCalled());

    proFormValues = {
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    };

    fireEvent.click(screen.getByTestId('trigger-on-data'));
    fireEvent.click(screen.getByTestId('trigger-on-exchange-data'));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    await waitFor(() =>
      expect(mockSubmitReviewCommentApi).toHaveBeenCalledWith('review-1', {
        modellingAndValidation: {
          complianceDeclarations: {
            compliance: [],
          },
          validation: {
            review: [],
          },
        },
      }),
    );
  });

  it('falls back to an empty exchange list when generated process data omits exchanges', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      processInformation: {},
      modellingAndValidation: {
        validation: { review: [] },
        complianceDeclarations: { compliance: [] },
      },
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenCalled());
    await waitFor(() =>
      expect(proFormApi.setFieldsValue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'process-1',
        }),
      ),
    );

    expect(screen.getByTestId('tabs-detail')).toBeInTheDocument();
  });

  it('logs temporary save failures when the draft command returns an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockSaveReviewCommentDraftApi.mockResolvedValueOnce({
      data: [],
      error: new Error('save failed'),
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Temporary Save' }));
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('blocks submission when reference checking returns problem nodes', async () => {
    mockCheckReferences.mockResolvedValueOnce({
      findProblemNodes: () => [
        {
          '@refObjectId': 'problem-ref',
          '@version': '03.00.000',
          ruleVerification: false,
          nonExistent: true,
        },
      ],
    });

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(mockSubmitReviewCommentApi).not.toHaveBeenCalled();
    expect(screen.getByTestId('drawer')).toBeInTheDocument();
  });

  it('logs submit failures after reference checks pass', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockSubmitReviewCommentApi.mockRejectedValueOnce(new Error('submit failed'));

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('shows an error when rejecting through the review command fails', async () => {
    mockSubmitReviewCommentApi.mockRejectedValueOnce(new Error('reject failed'));

    renderComponent();

    fireEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalled());

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reject Stub' }));
    });

    expect(message.error).toHaveBeenCalledWith('Failed to reject, please try again!');
  });
});
