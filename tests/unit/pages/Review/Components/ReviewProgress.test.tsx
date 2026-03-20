// @ts-nocheck
import ReviewProgress from '@/pages/Review/Components/ReviewProgress';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  CloseOutlined: () => <span data-testid='icon-close' />,
  DeleteOutlined: () => <span data-testid='icon-delete' />,
  FileSyncOutlined: () => <span data-testid='icon-sync' />,
}));

jest.mock('@/pages/Review/Components/SelectReviewer', () => ({
  __esModule: true,
  default: () => <div data-testid='select-reviewer-stub' />,
}));

jest.mock('@/pages/Review/Components/RejectReview', () => ({
  __esModule: true,
  default: () => <div data-testid='reject-review-stub' />,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => {
    const restProps = { ...rest } as Record<string, any>;
    delete restProps.danger;
    return (
      <button
        type='button'
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        {...restProps}
      >
        {icon}
        {toText(children)}
      </button>
    );
  };

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, children, title, extra, footer, onClose }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' data-testid='drawer-close' onClick={onClose}>
          close-drawer
        </button>
      </section>
    ) : null;

  const Tag = ({ children }: any) => <span data-testid='tag'>{children}</span>;

  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;

  const Spin = ({ children, spinning }: any) =>
    spinning ? <div data-testid='spin'>Loading...</div> : <>{children}</>;

  const Modal = {
    confirm: jest.fn((config: any) => {
      config?.onOk?.();
      return {
        destroy: jest.fn(),
      };
    }),
  };

  const Input: any = (props: any) => <input {...props} />;
  Input.TextArea = (props: any) => <textarea {...props} />;

  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const theme = {
    useToken: () => ({ token: { colorPrimary: '#1677ff' } }),
  };

  return {
    __esModule: true,
    Button,
    Drawer,
    Input,
    Modal,
    Space,
    Spin,
    Tag,
    Tooltip,
    message,
    theme,
  };
});

const ProTable = ({ columns, request, actionRef, rowKey, toolBarRender }: any) => {
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    const reload = jest.fn(async () => {
      const result = await request?.();
      setRows(result?.data ?? []);
    });
    if (actionRef) {
      actionRef.current = { reload };
    }
    reload();
  }, [actionRef, request]);

  return (
    <div data-testid='protable'>
      <div data-testid='protable-toolbar'>{toolBarRender?.()}</div>
      {rows.map((row: any) => (
        <div key={row[rowKey]}>
          {columns.map((column: any, index: number) => {
            if (column.dataIndex === 'actions' && column.render) {
              const rendered = column.render(null, row);
              const element = Array.isArray(rendered) ? rendered[0] : rendered;
              let onClick: (() => void) | undefined;
              let candidate = element;
              if (
                React.isValidElement(candidate) &&
                candidate.props?.children &&
                !candidate.props?.onClick
              ) {
                const child = Array.isArray(candidate.props.children)
                  ? candidate.props.children[0]
                  : candidate.props.children;
                if (React.isValidElement(child)) {
                  candidate = child;
                }
              }
              if (React.isValidElement(candidate)) {
                onClick = candidate.props?.onClick;
              }
              return (
                <button
                  key={`action-${index}`}
                  type='button'
                  data-testid={`remove-${row[rowKey]}`}
                  onClick={onClick}
                >
                  remove
                </button>
              );
            }
            if (column.render) {
              const rendered = column.render(row[column.dataIndex], row);
              return (
                <span key={String(column.dataIndex) ?? index}>
                  {Array.isArray(rendered) ? rendered : rendered}
                </span>
              );
            }
            return <span key={String(column.dataIndex) ?? index}>{row[column.dataIndex]}</span>;
          })}
        </div>
      ))}
    </div>
  );
};

jest.mock('@ant-design/pro-components', () => ({
  __esModule: true,
  ProTable: (props: any) => <ProTable {...props} />,
}));

const mockGetCommentApi = jest.fn();
const mockUpdateCommentApi = jest.fn();
const mockUpdateCommentByreviewerApi = jest.fn();

jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  getCommentApi: (...args: any[]) => mockGetCommentApi(...args),
  updateCommentApi: (...args: any[]) => mockUpdateCommentApi(...args),
  updateCommentByreviewerApi: (...args: any[]) => mockUpdateCommentByreviewerApi(...args),
}));

const mockUpdateReviewApi = jest.fn();

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  updateReviewApi: (...args: any[]) => mockUpdateReviewApi(...args),
}));

const mockGetUsersByIds = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUsersByIds: (...args: any[]) => mockGetUsersByIds(...args),
}));

const mockGetNewReviewJson = jest.fn(() => Promise.resolve({}));

jest.mock('@/pages/Review/Components/reviewProcess', () => ({
  __esModule: true,
  getNewReviewJson: (...args: any[]) => mockGetNewReviewJson(...args),
}));

const mockGetRefData = jest.fn();
const mockUpdateStateCodeApi = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getRefData: (...args: any[]) => mockGetRefData(...args),
  updateStateCodeApi: (...args: any[]) => mockUpdateStateCodeApi(...args),
}));

const mockGetLifeCycleModelDetail = jest.fn();
const mockUpdateLifeCycleModelJsonApi = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCycleModelDetail: (...args: any[]) => mockGetLifeCycleModelDetail(...args),
  updateLifeCycleModelJsonApi: (...args: any[]) => mockUpdateLifeCycleModelJsonApi(...args),
}));

const mockGetProcessDetail = jest.fn();
const mockGetProcessDetailByIdAndVersion = jest.fn();
const mockUpdateProcessApi = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessDetailByIdAndVersion: (...args: any[]) => mockGetProcessDetailByIdAndVersion(...args),
  updateProcessApi: (...args: any[]) => mockUpdateProcessApi(...args),
}));

const mockGetUserTeamId = jest.fn();

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

const mockGetAllRefObj = jest.fn(() => []);
const mockGetRefTableName = jest.fn(() => 'processes');

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: jest.fn((task: any) => task()),
    waitForAll: jest.fn(() => Promise.resolve()),
  })),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRefTableName: (...args: any[]) => mockGetRefTableName(...args),
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    footer_right: 'footer_right',
  },
}));

const { message, Modal } = require('antd');

describe('ReviewProgress component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: 0,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([{ id: 'user-2', display_name: 'Reviewer Two' }]);
    mockUpdateCommentApi.mockResolvedValue({ error: null });
    mockUpdateCommentByreviewerApi.mockResolvedValue({ error: null });
    mockUpdateReviewApi.mockResolvedValue({ data: [{}] });
    mockGetRefData.mockResolvedValue({ success: true, data: { stateCode: 100 } });
    mockUpdateStateCodeApi.mockResolvedValue({ error: null });
    mockGetLifeCycleModelDetail.mockResolvedValue({ success: true, data: { stateCode: 100 } });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({ ok: true, lifecycleModel: {} });
    mockGetProcessDetail.mockResolvedValue({ success: true, data: { stateCode: 100 } });
    mockUpdateProcessApi.mockResolvedValue({ error: null });
    mockGetUserTeamId.mockResolvedValue('team-1');
    mockGetNewReviewJson.mockResolvedValue({});
    mockGetAllRefObj.mockReturnValue([]);
    mockGetRefTableName.mockImplementation(() => 'processes');
    message.success.mockReset();
    message.error.mockReset();
    Modal.confirm.mockClear();
  });

  it('revokes reviewer assignments after confirmation', async () => {
    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => expect(mockGetCommentApi).toHaveBeenCalled());
    await waitFor(() => screen.getByTestId('protable'));

    const removeButton = screen.getByTestId('remove-user-2');
    fireEvent.click(removeButton);

    await waitFor(() =>
      expect(mockUpdateCommentByreviewerApi).toHaveBeenCalledWith('review-1', 'user-2', {
        state_code: -2,
      }),
    );
    expect(mockUpdateReviewApi).toHaveBeenCalledWith(['review-1'], {
      reviewer_id: [],
    });
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith('Successfully revoked the auditor'),
    );
  });

  it('shows an error toast when reviewer revocation fails', async () => {
    mockUpdateCommentByreviewerApi.mockResolvedValue({ error: { message: 'failed' } });
    mockUpdateReviewApi.mockResolvedValue({ data: [] });

    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));

    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Failed to revoke the auditor'));
  });

  it('keeps the remaining reviewer ids when revoking one reviewer from a larger list', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: 0,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-2',
          reviewer_id: 'user-3',
          reviewer_name: '',
          state_code: 0,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-2', display_name: 'Reviewer Two' },
      { id: 'user-3', display_name: 'Reviewer Three' },
    ]);

    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() =>
      expect(mockUpdateReviewApi).toHaveBeenCalledWith(['review-1'], {
        reviewer_id: ['user-3'],
      }),
    );
  });

  it('logs revocation failures thrown by reviewer update calls', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateCommentByreviewerApi.mockRejectedValue(new Error('revoke failed'));

    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByTestId('remove-user-2'));

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to revoke reviewer:', expect.any(Error)),
    );
    consoleErrorSpy.mockRestore();
  });

  it('renders reviewer rejection comments from JSON payloads', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: {
            comment: JSON.stringify({ message: 'Needs revision' }),
          },
        },
        {
          id: 'row-2',
          reviewer_id: 'user-3',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-3',
          reviewer_id: 'user-4',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: { comment: '{}' },
        },
        {
          id: 'row-4',
          reviewer_id: 'user-5',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: { comment: {} },
        },
      ],
    });

    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    expect(await screen.findByText('Needs revision')).toBeInTheDocument();
    expect(screen.queryByText('undefined')).not.toBeInTheDocument();
    expect(screen.queryByText('{}')).not.toBeInTheDocument();
  });

  it('renders an empty reviewer table when no assigned reviewers exist', async () => {
    mockGetCommentApi.mockResolvedValue({ data: [] });

    render(<ReviewProgress reviewId='review-1' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    expect(await screen.findByTestId('protable')).toBeInTheDocument();
    expect(screen.queryByTestId('remove-user-2')).not.toBeInTheDocument();
  });

  it('renders reviewed and unknown statuses and parses object comments safely', async () => {
    mockGetCommentApi.mockResolvedValue({
      data: [
        {
          id: 'row-reviewed',
          reviewer_id: 'user-1',
          reviewer_name: '',
          state_code: 1,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-unknown',
          reviewer_id: 'user-2',
          reviewer_name: '',
          state_code: 99,
          updated_at: '2024-01-01T00:00:00Z',
          json: {},
        },
        {
          id: 'row-object',
          reviewer_id: 'user-3',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: { comment: { message: 'Object comment' } },
        },
        {
          id: 'row-invalid',
          reviewer_id: 'user-4',
          reviewer_name: '',
          state_code: -3,
          updated_at: '2024-01-01T00:00:00Z',
          json: { comment: '{bad json' },
        },
      ],
    });
    mockGetUsersByIds.mockResolvedValue([
      { id: 'user-1', display_name: 'Reviewer One' },
      { id: 'user-2', display_name: 'Reviewer Two' },
      { id: 'user-3', display_name: 'Reviewer Three' },
      { id: 'user-4', display_name: 'Reviewer Four' },
    ]);

    render(<ReviewProgress reviewId='review-2' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    expect(await screen.findByText('Reviewed')).toBeInTheDocument();
    expect(screen.getByText('Unknown Status')).toBeInTheDocument();
    expect(screen.getByText('Object comment')).toBeInTheDocument();
    expect(screen.queryByText('{bad json')).not.toBeInTheDocument();
  });

  it('falls back to an empty reviewer table when fetching reviewers fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetCommentApi.mockRejectedValue(new Error('boom'));

    render(<ReviewProgress reviewId='review-3' />);

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
    expect(await screen.findByTestId('protable')).toBeInTheDocument();
    expect(screen.queryByTestId('remove-user-2')).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('approves process reviews and publishes the reviewed process state', async () => {
    const reload = jest.fn();
    const actionRef = { current: { reload } };

    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetProcessDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'process-1',
        version: '1.0.0',
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
    });

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='process-1'
        dataVersion='1.0.0'
        actionType='process'
        tabType='assigned'
        actionRef={actionRef}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateProcessApi).toHaveBeenCalledWith(
        'process-1',
        '1.0.0',
        expect.objectContaining({
          json_ordered: expect.objectContaining({
            processDataSet: expect.objectContaining({
              modellingAndValidation: expect.objectContaining({
                validation: { review: [{ id: 'review-note' }] },
                complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
              }),
            }),
          }),
        }),
      ),
    );
    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith('process-1', '1.0.0', 'processes', 100),
    );
    expect(mockUpdateCommentApi).toHaveBeenCalledWith('review-1', { state_code: 2 }, 'assigned');
    expect(mockUpdateReviewApi).toHaveBeenCalledWith(
      ['review-1'],
      expect.objectContaining({ state_code: 2 }),
    );
    expect(message.success).toHaveBeenCalledWith('Review approved successfully');
    expect(reload).toHaveBeenCalled();
  });

  it('walks process references recursively before publishing public state', async () => {
    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetProcessDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'process-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          kind: 'root',
          processDataSet: {
            modellingAndValidation: {
              validation: { review: [] },
              complianceDeclarations: { compliance: [] },
            },
          },
        },
      },
    });
    mockGetAllRefObj.mockImplementation((json: any) => {
      if (json?.kind === 'root') {
        return [
          { '@refObjectId': 'ref-proc', '@version': '1.0.0', '@type': 'process data set' },
          { '@refObjectId': 'ref-proc', '@version': '1.0.0', '@type': 'process data set' },
          { '@refObjectId': 'ref-model', '@version': '2.0.0', '@type': 'lifeCycleModel data set' },
          {},
        ];
      }
      if (json?.kind === 'ref-proc') {
        return [
          { '@refObjectId': 'nested-proc', '@version': '1.0.0', '@type': 'process data set' },
        ];
      }
      return [];
    });
    mockGetRefData.mockImplementation(async (id: string) => {
      if (id === 'ref-proc') {
        return { success: true, data: { stateCode: 10, json: { kind: 'ref-proc' } } };
      }
      if (id === 'nested-proc') {
        return { success: true, data: { stateCode: 100, json: { kind: 'nested' } } };
      }
      if (!id) {
        return { success: true, data: { stateCode: 10, json: { kind: 'blank' } } };
      }
      return { success: true, data: { stateCode: 10, json: { kind: 'model' } } };
    });
    mockGetRefTableName.mockImplementation((type: string) =>
      type === 'lifeCycleModel data set' ? 'lifeCycleModels' : 'processes',
    );

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='process-1'
        dataVersion='1.0.0'
        actionType='process'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith('ref-proc', '1.0.0', 'processes', 100),
    );
    expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
      'ref-model',
      '2.0.0',
      'lifeCycleModels',
      100,
    );
    expect(mockUpdateStateCodeApi).toHaveBeenCalledWith('', '', 'processes', 100);
    expect(mockGetRefData.mock.calls.filter(([id]) => id === 'ref-proc').length).toBe(1);
  });

  it('approves model reviews and propagates review data to the model and related processes', async () => {
    const reload = jest.fn();
    const actionRef = { current: { reload } };

    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: { review: [] },
              complianceDeclarations: { compliance: [] },
            },
          },
        },
        json_tg: {
          submodels: [{ id: 'submodel-proc' }],
        },
      },
    });
    mockGetProcessDetail.mockImplementation(async (id: string) => ({
      success: true,
      data: {
        id,
        version: '1.0.0',
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
    }));
    mockGetProcessDetailByIdAndVersion.mockResolvedValue({
      data: [
        {
          id: 'model-1',
          version: '1.0.0',
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
        },
        {
          id: 'submodel-proc',
          version: '1.0.0',
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
        },
      ],
    });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({
      ok: true,
      lifecycleModel: {
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            validation: { review: [{ id: 'review-note' }] },
            complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
          },
        },
      },
    });

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={actionRef}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateLifeCycleModelJsonApi).toHaveBeenCalledWith(
        'model-1',
        '1.0.0',
        expect.objectContaining({
          lifeCycleModelDataSet: expect.objectContaining({
            modellingAndValidation: expect.objectContaining({
              validation: { review: [{ id: 'review-note' }] },
              complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
            }),
          }),
        }),
        {
          commentReview: [{ id: 'review-note' }],
          commentCompliance: [{ id: 'compliance-note' }],
        },
      ),
    );
    await waitFor(() =>
      expect(mockGetProcessDetailByIdAndVersion).toHaveBeenCalledWith([
        { id: 'model-1', version: '1.0.0' },
      ]),
    );
    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith('model-1', '1.0.0', 'processes', 100),
    );
    expect(mockUpdateCommentApi).toHaveBeenCalledWith('review-1', { state_code: 2 }, 'assigned');
    expect(mockUpdateReviewApi).toHaveBeenCalledWith(['review-1'], { state_code: 2 });
    expect(message.success).toHaveBeenCalledWith('Review approved successfully');
    expect(reload).toHaveBeenCalled();
  });

  it('merges singular and falsy review fields for models and related processes', async () => {
    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: { review: { id: 'existing-model-review' } },
              complianceDeclarations: { compliance: { id: 'existing-model-compliance' } },
            },
          },
        },
        json_tg: {
          submodels: [{ id: 'submodel-proc' }, { id: 'missing-proc' }, { id: 'absent-proc' }],
        },
      },
    });
    mockGetProcessDetail.mockImplementation(async (id: string) => {
      if (id === 'submodel-proc') {
        return {
          success: true,
          data: {
            id,
            version: '1.0.0',
            stateCode: 10,
            json: {
              processDataSet: {
                modellingAndValidation: {
                  validation: { review: '' },
                  complianceDeclarations: { compliance: '' },
                },
              },
            },
          },
        };
      }
      if (id === 'missing-proc') {
        return {
          success: true,
          data: {
            id,
            version: '1.0.0',
            stateCode: 10,
            json: {
              processDataSet: {
                modellingAndValidation: {},
              },
            },
          },
        };
      }
      if (id === 'absent-proc') {
        return { success: true, data: undefined };
      }
      return {
        success: true,
        data: {
          id,
          version: '1.0.0',
          stateCode: 10,
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: { id: 'existing-process-review' } },
                complianceDeclarations: { compliance: { id: 'existing-process-compliance' } },
              },
            },
          },
        },
      };
    });
    mockGetProcessDetailByIdAndVersion.mockResolvedValue({
      data: [{ id: 'model-1', version: '1.0.0', json: {} }],
    });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({
      ok: true,
      lifecycleModel: {
        kind: 'no-refs',
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            validation: { review: [{ id: 'merged-model-review' }] },
            complianceDeclarations: { compliance: [{ id: 'merged-model-compliance' }] },
          },
        },
      },
    });

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateLifeCycleModelJsonApi).toHaveBeenCalledWith(
        'model-1',
        '1.0.0',
        expect.objectContaining({
          lifeCycleModelDataSet: expect.objectContaining({
            modellingAndValidation: expect.objectContaining({
              validation: { review: [{ id: 'existing-model-review' }, { id: 'review-note' }] },
              complianceDeclarations: {
                compliance: [{ id: 'existing-model-compliance' }, { id: 'compliance-note' }],
              },
            }),
          }),
        }),
        {
          commentReview: [{ id: 'review-note' }],
          commentCompliance: [{ id: 'compliance-note' }],
        },
      ),
    );
    expect(mockUpdateProcessApi).toHaveBeenCalledWith(
      'model-1',
      '1.0.0',
      expect.objectContaining({
        json_ordered: expect.objectContaining({
          processDataSet: expect.objectContaining({
            modellingAndValidation: expect.objectContaining({
              validation: {
                review: [{ id: 'existing-process-review' }, { id: 'review-note' }],
              },
              complianceDeclarations: {
                compliance: [{ id: 'existing-process-compliance' }, { id: 'compliance-note' }],
              },
            }),
          }),
        }),
      }),
    );
    expect(mockUpdateProcessApi.mock.calls.filter(([id]) => id === 'submodel-proc').length).toBe(0);
    expect(mockUpdateProcessApi.mock.calls.filter(([id]) => id === 'missing-proc').length).toBe(0);
    expect(mockUpdateProcessApi.mock.calls.filter(([id]) => id === 'absent-proc').length).toBe(0);
  });

  it('merges falsy model review fields into arrays during model approval', async () => {
    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: { review: '' },
              complianceDeclarations: { compliance: '' },
            },
          },
        },
      },
    });
    mockGetProcessDetail.mockResolvedValue({ success: true, data: undefined });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({
      ok: true,
      lifecycleModel: {
        kind: 'no-refs',
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            validation: { review: [{ id: 'merged-model-review' }] },
            complianceDeclarations: { compliance: [{ id: 'merged-model-compliance' }] },
          },
        },
      },
    });

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateLifeCycleModelJsonApi).toHaveBeenCalledWith(
        'model-1',
        '1.0.0',
        expect.objectContaining({
          lifeCycleModelDataSet: expect.objectContaining({
            modellingAndValidation: expect.objectContaining({
              validation: { review: [{ id: 'review-note' }] },
              complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
            }),
          }),
        }),
        {
          commentReview: [{ id: 'review-note' }],
          commentCompliance: [{ id: 'compliance-note' }],
        },
      ),
    );
  });

  it('returns early in model publish when no assigned comment payload exists', async () => {
    mockGetCommentApi.mockResolvedValue({ data: [] });

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith('review-1', { state_code: 2 }, 'assigned'),
    );
    expect(mockUpdateLifeCycleModelJsonApi).not.toHaveBeenCalled();
  });

  it('skips submodel process updates when assigned comments contain no review payload', async () => {
    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {},
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: { review: [] },
              complianceDeclarations: { compliance: [] },
            },
          },
        },
        json_tg: {
          submodels: [{ id: 'submodel-proc' }],
        },
      },
    });
    mockGetProcessDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
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
    });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({
      ok: true,
      lifecycleModel: {
        kind: 'new-model',
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            validation: { review: [] },
            complianceDeclarations: { compliance: [] },
          },
        },
      },
    });
    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockUpdateLifeCycleModelJsonApi).toHaveBeenCalledWith(
        'model-1',
        '1.0.0',
        expect.any(Object),
        {
          commentReview: [],
          commentCompliance: [],
        },
      ),
    );
    expect(mockGetProcessDetailByIdAndVersion).not.toHaveBeenCalled();
  });

  it('stops review approval when lifecycle model bundle persistence fails', async () => {
    let resolveMutation: (value: any) => void = () => undefined;
    const mutationPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });

    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
        stateCode: 10,
        json: {
          lifeCycleModelDataSet: {
            modellingAndValidation: {
              validation: { review: [] },
              complianceDeclarations: { compliance: [] },
            },
          },
        },
        json_tg: {
          submodels: [{ id: 'submodel-proc' }],
        },
      },
    });
    mockUpdateLifeCycleModelJsonApi.mockReturnValueOnce(mutationPromise);

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() => expect(screen.getByTestId('spin')).toBeInTheDocument());
    resolveMutation({ ok: false, message: 'Bundle failed' });

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('Bundle failed'));
    await waitFor(() => expect(screen.queryByTestId('spin')).not.toBeInTheDocument());
    expect(mockUpdateCommentApi).not.toHaveBeenCalled();
    expect(mockUpdateReviewApi).not.toHaveBeenCalled();
  });

  it('recursively updates model and process references before publishing a model review', async () => {
    mockGetCommentApi.mockImplementation(async (_reviewId: string, state?: string) => {
      if (state === 'assigned') {
        return {
          data: [
            {
              id: 'row-1',
              reviewer_id: 'user-2',
              reviewer_name: '',
              state_code: 0,
              updated_at: '2024-01-01T00:00:00Z',
              json: {
                modellingAndValidation: {
                  validation: { review: [{ id: 'review-note' }] },
                  complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
                },
              },
            },
          ],
        };
      }
      return { data: [] };
    });
    mockGetLifeCycleModelDetail.mockImplementation(async (id: string) => {
      if (id === 'proc-ref') {
        return {
          success: true,
          data: {
            id: 'same-model-for-proc',
            version: '9.0.0',
            stateCode: 10,
            kind: 'same-model-for-proc',
          },
        };
      }
      return {
        success: true,
        data: {
          id: 'model-1',
          version: '1.0.0',
          stateCode: 10,
          json: {
            lifeCycleModelDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
          json_tg: {
            submodels: [{ id: 'submodel-proc' }],
          },
        },
      };
    });
    mockGetProcessDetail.mockResolvedValue({
      success: true,
      data: {
        id: 'model-1',
        version: '1.0.0',
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
    });
    mockGetProcessDetailByIdAndVersion.mockResolvedValue({
      data: [
        {
          id: 'model-1',
          version: '1.0.0',
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
        },
        {
          id: 'proc-ref',
          version: '2.0.0',
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
        },
        {
          id: 'submodel-proc',
          version: '1.0.0',
          json: {
            processDataSet: {
              modellingAndValidation: {
                validation: { review: [] },
                complianceDeclarations: { compliance: [] },
              },
            },
          },
        },
      ],
    });
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({
      ok: true,
      lifecycleModel: {
        kind: 'new-model',
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            validation: { review: [{ id: 'review-note' }] },
            complianceDeclarations: { compliance: [{ id: 'compliance-note' }] },
          },
        },
      },
    });
    mockGetAllRefObj.mockImplementation((value: any) => {
      if (value?.kind === 'new-model') {
        return [
          { '@refObjectId': 'proc-ref', '@version': '2.0.0', '@type': 'process data set' },
          { '@refObjectId': 'proc-ref', '@version': '2.0.0', '@type': 'process data set' },
          {
            '@refObjectId': 'model-ref',
            '@version': '3.0.0',
            '@type': 'lifeCycleModel data set',
          },
        ];
      }
      if (value?.kind === 'proc-ref-json') {
        return [
          {
            '@refObjectId': 'nested-model-ref',
            '@version': '4.0.0',
            '@type': 'lifeCycleModel data set',
          },
        ];
      }
      if (value?.kind === 'same-model-for-proc') {
        return [
          {
            '@refObjectId': 'same-model-child',
            '@version': '5.0.0',
            '@type': 'lifeCycleModel data set',
          },
          {
            '@refObjectId': 'same-model-child',
            '@version': '5.0.0',
            '@type': 'lifeCycleModel data set',
          },
        ];
      }
      return [];
    });
    mockGetRefData.mockImplementation(async (id: string) => {
      if (id === 'proc-ref') {
        return {
          success: true,
          data: {
            id: 'proc-ref',
            version: '2.0.0',
            stateCode: 10,
            json: { kind: 'proc-ref-json' },
          },
        };
      }
      if (id === 'nested-model-ref') {
        return {
          success: true,
          data: {
            id: 'nested-model-ref',
            version: '4.0.0',
            stateCode: 10,
            json: { kind: 'nested-model-json' },
          },
        };
      }
      if (id === 'same-model-child') {
        return {
          success: true,
          data: {
            id: 'same-model-child',
            version: '5.0.0',
            stateCode: 10,
            json: { kind: 'same-model-child-json' },
          },
        };
      }
      return {
        success: true,
        data: {
          id,
          version: '3.0.0',
          stateCode: 200,
          json: { kind: 'public-ref' },
        },
      };
    });
    mockGetRefTableName.mockImplementation((type: string) =>
      type === 'lifeCycleModel data set' ? 'lifeCycleModels' : 'processes',
    );

    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='model-1'
        dataVersion='1.0.0'
        actionType='model'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    await waitFor(() => screen.getByTestId('protable'));
    fireEvent.click(screen.getByRole('button', { name: /approve review/i }));

    await waitFor(() =>
      expect(mockGetRefData).toHaveBeenCalledWith('proc-ref', '2.0.0', 'processes', 'team-1'),
    );
    expect(mockGetRefData).toHaveBeenCalledWith(
      'nested-model-ref',
      '4.0.0',
      'lifeCycleModels',
      'team-1',
    );
    expect(mockGetRefData).toHaveBeenCalledWith(
      'same-model-child',
      '5.0.0',
      'lifeCycleModels',
      'team-1',
    );
    expect(mockGetRefData.mock.calls.filter(([id]) => id === 'proc-ref').length).toBe(1);
    await waitFor(() =>
      expect(mockUpdateStateCodeApi).toHaveBeenCalledWith(
        'same-model-for-proc',
        '9.0.0',
        'lifeCycleModels',
        100,
      ),
    );
  });

  it('renders toolbar controls and supports both drawer close actions', async () => {
    render(
      <ReviewProgress
        reviewId='review-1'
        dataId='process-1'
        dataVersion='1.0.0'
        actionType='process'
        tabType='assigned'
        actionRef={{ current: { reload: jest.fn() } }}
      />,
    );

    const [openButton] = screen.getAllByRole('button');
    fireEvent.click(openButton);

    expect(await screen.findByTestId('select-reviewer-stub')).toBeInTheDocument();
    expect(screen.getByTestId('reject-review-stub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('icon-close').closest('button')!);
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();

    const [reopenButton] = screen.getAllByRole('button');
    fireEvent.click(reopenButton);
    await screen.findByTestId('drawer');

    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });
});
