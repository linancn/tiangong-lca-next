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

  const Drawer = ({ open, children, title, extra }: any) =>
    open ? (
      <section data-testid='drawer'>
        <header>{toText(title)}</header>
        <div>{extra}</div>
        <div>{children}</div>
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

const ProTable = ({ columns, request, actionRef, rowKey }: any) => {
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

jest.mock('@/pages/Review/Components/reviewProcess', () => ({
  __esModule: true,
  getNewReviewJson: jest.fn(() => Promise.resolve({})),
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
const mockUpdateProcessApi = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  updateProcessApi: (...args: any[]) => mockUpdateProcessApi(...args),
}));

const mockGetUserTeamId = jest.fn();

jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    waitForAll: jest.fn(() => Promise.resolve()),
  })),
  getAllRefObj: jest.fn(() => []),
  getRefTableName: jest.fn(() => 'processes'),
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
    mockUpdateLifeCycleModelJsonApi.mockResolvedValue({ data: {} });
    mockGetProcessDetail.mockResolvedValue({ success: true, data: { stateCode: 100 } });
    mockUpdateProcessApi.mockResolvedValue({ error: null });
    mockGetUserTeamId.mockResolvedValue('team-1');
    message.success.mockReset();
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
});
