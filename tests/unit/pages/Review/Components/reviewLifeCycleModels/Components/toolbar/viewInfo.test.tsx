// @ts-nocheck
import ToolbarViewInfo from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewInfo';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../../../helpers/testUtils';

let proFormApi: any = null;

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  InfoOutlined: () => <span>info</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='level-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/components/LocationTextItem/description', () => ({
  __esModule: true,
  default: ({ data, label }: any) => (
    <div data-testid='location-text'>{`${label?.props?.defaultMessage ?? label}:${data}`}</div>
  ),
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: ({ data, title }: any) => (
    <div data-testid='contact-description'>{`${data?.['@refObjectId'] ?? 'none'}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: ({ data, title }: any) => (
    <div data-testid='source-description'>{`${data?.['@refObjectId'] ?? 'none'}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
}));

jest.mock('@/pages/Review/Components/Compliance/form', () => ({
  __esModule: true,
  default: () => <div data-testid='compliance-form'>compliance-form</div>,
}));

jest.mock('@/pages/Review/Components/Compliance/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='compliance-view'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Review/Components/ReviewForm/form', () => ({
  __esModule: true,
  default: () => <div data-testid='review-form'>review-form</div>,
}));

jest.mock('@/pages/Review/Components/ReviewForm/view', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='review-view'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  return {
    __esModule: true,
    RefCheckContext: React.createContext({ refCheckData: [] }),
  };
});

const mockUpdateCommentApi = jest.fn();
jest.mock('@/services/comments/api', () => ({
  __esModule: true,
  updateCommentApi: (...args: any[]) => mockUpdateCommentApi(...args),
}));

const mockGetUserDetail = jest.fn();
jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserDetail: (...args: any[]) => mockGetUserDetail(...args),
}));

const mockGetUserTeamId = jest.fn();
jest.mock('@/services/roles/api', () => ({
  __esModule: true,
  getUserTeamId: (...args: any[]) => mockGetUserTeamId(...args),
}));

const mockCheckReferences = jest.fn();
const mockGetAllRefObj = jest.fn(() => []);
const mockUpdateUnReviewToUnderReview = jest.fn();
const mockReffPathFindProblemNodes = jest.fn(() => []);

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  checkReferences: (...args: any[]) => mockCheckReferences(...args),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  updateUnReviewToUnderReview: (...args: any[]) => mockUpdateUnReviewToUnderReview(...args),
  ReffPath: jest.fn().mockImplementation(() => ({
    findProblemNodes: (...args: any[]) => mockReffPathFindProblemNodes(...args),
  })),
}));

jest.mock('@/pages/Processes/Components/optiondata', () => ({
  __esModule: true,
  LCIMethodApproachOptions: [],
  LCIMethodPrincipleOptions: [],
  completenessElementaryFlowsTypeOptions: [],
  completenessElementaryFlowsValueOptions: [],
  completenessProductModelOptions: [],
  copyrightOptions: [{ value: 'true', label: 'Copyrighted' }],
  licenseTypeOptions: [{ value: 'open', label: 'Open License' }],
  processtypeOfDataSetOptions: [],
  uncertaintyDistributionTypeOptions: [],
  workflowAndPublicationStatusOptions: [],
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../../../helpers/nodeToText');

  const message = {
    success: jest.fn(),
    error: jest.fn(),
  };

  const Button = ({ children, onClick, disabled = false, icon, type }: any) => (
    <button
      type='button'
      data-button-type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null;

  const Card = ({ children, title, tabList, activeTabKey, onTabChange }: any) => (
    <section>
      <header>{toText(title)}</header>
      {tabList ? (
        <div>
          {tabList.map((tab: any) => (
            <button
              key={tab.key}
              type='button'
              data-active={String(activeTabKey === tab.key)}
              onClick={() => onTabChange?.(tab.key)}
            >
              {toText(tab.tab)}
            </button>
          ))}
        </div>
      ) : null}
      <div>{children}</div>
    </section>
  );

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;
  const Space = ({ children, className }: any) => <div className={className}>{children}</div>;
  const Spin = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Space,
    Spin,
    Tooltip,
    message,
  };
});

const mockMessage = jest.requireMock('antd').message as Record<string, jest.Mock>;

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const setNestedValue = (source: any, path: any[], value: any) => {
    const next = { ...(source ?? {}) };
    let cursor = next;
    path.forEach((key: string, index: number) => {
      if (index === path.length - 1) {
        cursor[key] = value;
      } else {
        cursor[key] = { ...(cursor[key] ?? {}) };
        cursor = cursor[key];
      }
    });
    return next;
  };

  const getNestedValue = (source: any, path: any[]) =>
    path.reduce((acc: any, key: string) => (acc ? acc[key] : undefined), source);

  const ProForm = ({ initialValues = {}, formRef, children, onFinish, submitter }: any) => {
    const valuesRef = React.useRef<any>(JSON.parse(JSON.stringify(initialValues ?? {})));

    const api = React.useMemo(() => {
      return {
        getFieldValue: jest.fn((path: any) => {
          const namePath = Array.isArray(path) ? path : [path];
          return getNestedValue(valuesRef.current, namePath);
        }),
        setFieldValue: jest.fn((path: any, value: any) => {
          const namePath = Array.isArray(path) ? path : [path];
          valuesRef.current = setNestedValue(valuesRef.current, namePath, value);
        }),
        getFieldsValue: jest.fn(() => valuesRef.current),
        setFieldsValue: jest.fn((next: any) => {
          valuesRef.current = { ...valuesRef.current, ...(next ?? {}) };
        }),
        submit: jest.fn(async () => onFinish?.()),
      };
    }, [onFinish]);

    React.useLayoutEffect(() => {
      if (formRef) {
        formRef.current = api;
      }
      proFormApi = api;
    }, [api, formRef]);

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onFinish?.();
        }}
      >
        {typeof children === 'function' ? children(valuesRef.current) : children}
        {submitter?.render?.() ?? null}
      </form>
    );
  };

  return {
    __esModule: true,
    ProForm,
    ProFormInstance: {},
  };
});

describe('ReviewLifeCycleModelToolbarViewInfo', () => {
  const baseData = {
    lifeCycleModelInformation: {
      dataSetInformation: {
        'common:UUID': 'uuid-1',
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Model name' }],
        },
      },
    },
    modellingAndValidation: {
      complianceDeclarations: {
        compliance: [{ id: 'compliance-1' }],
      },
      validation: {},
    },
    administrativeInformation: {},
  };

  const renderComponent = (props: any = {}) => {
    const actionRef = { current: { reload: jest.fn() } };

    render(
      <ToolbarViewInfo
        lang='en'
        data={baseData}
        type='edit'
        reviewId='review-1'
        tabType='review'
        actionRef={actionRef}
        {...props}
      />,
    );

    return { actionRef };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    proFormApi = null;
    mockGetUserDetail.mockResolvedValue({
      data: {
        contact: {
          '@refObjectId': 'contact-1',
          '@version': '1.0.0',
        },
      },
    });
    mockGetUserTeamId.mockResolvedValue('team-1');
    mockCheckReferences.mockResolvedValue({
      findProblemNodes: () => [],
    });
    mockUpdateUnReviewToUnderReview.mockResolvedValue(undefined);
    mockUpdateCommentApi.mockResolvedValue({ error: null });
  });

  it('initializes validation defaults and reviewer contact when edit validation tab is opened', async () => {
    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: /info/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Validation$/i }));

    await waitFor(() =>
      expect(proFormApi.getFieldValue).toHaveBeenCalledWith([
        'modellingAndValidation',
        'validation',
        'review',
      ]),
    );
    await waitFor(() =>
      expect(proFormApi.setFieldValue).toHaveBeenCalledWith(
        ['modellingAndValidation', 'validation', 'review'],
        [{ 'common:scope': [{}] }],
      ),
    );
    await waitFor(() =>
      expect(proFormApi.setFieldValue).toHaveBeenCalledWith(
        [
          'modellingAndValidation',
          'validation',
          'review',
          0,
          'common:referenceToNameOfReviewerAndInstitution',
        ],
        {
          '@refObjectId': 'contact-1',
          '@version': '1.0.0',
        },
      ),
    );
    expect(screen.getByTestId('review-form')).toBeInTheDocument();
  });

  it('temporarily saves review comments and reloads the parent table', async () => {
    const { actionRef } = renderComponent();

    await userEvent.click(screen.getByRole('button', { name: /info/i }));
    await userEvent.click(screen.getByRole('button', { name: /pages.button.temporarySave/i }));

    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith(
        'review-1',
        {
          json: {
            modellingAndValidation: {
              complianceDeclarations: {
                compliance: [{ id: 'compliance-1' }],
              },
              validation: {},
            },
          },
        },
        'review',
      ),
    );
    expect(mockMessage.success).toHaveBeenCalledWith('Temporary save successfully');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('submits the review when reference checks pass', async () => {
    const { actionRef } = renderComponent();

    await userEvent.click(screen.getByRole('button', { name: /info/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(mockGetAllRefObj).toHaveBeenCalled());
    await waitFor(() => expect(mockGetUserTeamId).toHaveBeenCalled());
    await waitFor(() => expect(mockUpdateUnReviewToUnderReview).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockUpdateCommentApi).toHaveBeenCalledWith(
        'review-1',
        expect.objectContaining({
          json: expect.any(Object),
          state_code: 1,
        }),
        'review',
      ),
    );
    expect(mockMessage.success).toHaveBeenCalledWith('Review submitted successfully');
    expect(actionRef.current.reload).toHaveBeenCalled();
  });

  it('blocks submit when reference checks report under-review items', async () => {
    mockCheckReferences.mockImplementationOnce(
      async (_refObjs: any, _cache: any, _teamId: any, _unReview: any[], underReview: any[]) => {
        underReview.push({
          '@refObjectId': 'process-2',
          '@version': '2.0.0',
          state_code: 30,
        });
        return {
          findProblemNodes: () => [],
        };
      },
    );

    renderComponent();

    await userEvent.click(screen.getByRole('button', { name: /info/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => expect(mockCheckReferences).toHaveBeenCalled());
    expect(mockUpdateCommentApi).not.toHaveBeenCalledWith(
      'review-1',
      expect.objectContaining({ state_code: 1 }),
      'review',
    );
  });
});
