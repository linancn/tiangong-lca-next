// @ts-nocheck
import FlowsEdit from '@/pages/Flows/Components/edit';
import { render, screen, waitFor } from '@testing-library/react';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

let mockValidateFields: jest.Mock;

beforeEach(() => {
  mockValidateFields = jest.fn(() => Promise.resolve());
});

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  FormOutlined: () => <span>edit</span>,
}));

jest.mock('@/components/ValidationIssueModal', () => ({
  __esModule: true,
  showValidationIssueModal: jest.fn(),
}));

const { showValidationIssueModal: mockShowValidationIssueModal } = jest.requireMock(
  '@/components/ValidationIssueModal',
);

jest.mock('@/components/AISuggestion', () => ({
  __esModule: true,
  default: () => <div>suggestion</div>,
}));

jest.mock('@/components/RefsOfNewVersionDrawer', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('antd', () => {
  const React = require('react');
  const message = {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
  };

  const Button = ({ children, onClick, disabled, icon, ...rest }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick} {...rest}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, footer, children, onClose }: any) => {
    if (!open) return null;
    return (
      <div role='dialog' aria-label={toText(title) || 'drawer'}>
        <div>{extra}</div>
        <div>{children}</div>
        <div>{footer}</div>
        <button type='button' onClick={onClose}>
          close-drawer
        </button>
      </div>
    );
  };

  const Tooltip = ({ children }: any) => <>{children}</>;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Drawer,
    Tooltip,
    Space,
    Spin,
    message,
  };
});

const { message: mockMessage } = jest.requireMock('antd');

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProForm = ({ formRef, initialValues = {}, onFinish, children }: any) => {
    const [values, setValues] = React.useState<any>(initialValues ?? {});

    React.useEffect(() => {
      if (!formRef) return;
      formRef.current = {
        submit: async () => onFinish?.(),
        setFieldsValue: (next: any) => {
          setValues((prev: any) => ({ ...prev, ...next }));
        },
        resetFields: () => {
          setValues(initialValues ?? {});
        },
        getFieldsValue: () => ({ ...values }),
        validateFields: mockValidateFields,
      };
    }, [formRef, initialValues, onFinish, values]);

    return <form>{children}</form>;
  };

  return {
    __esModule: true,
    ProForm,
  };
});

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: {
    footer_right: 'footer_right',
  },
}));

jest.mock('@/contexts/refCheckContext', () => {
  const React = require('react');
  const refCheckContextValue = { refCheckData: [] };
  const RefCheckContext = React.createContext(refCheckContextValue);
  return {
    __esModule: true,
    RefCheckContext,
    useRefCheckContext: () => refCheckContextValue,
  };
});

jest.mock('@/pages/Utils/updateReference', () => ({
  __esModule: true,
  getRefsOfCurrentVersion: jest.fn(async () => ({ oldRefs: [] })),
  getRefsOfNewVersion: jest.fn(async () => ({ newRefs: [], oldRefs: [] })),
  updateRefsData: jest.fn((data: any) => data),
}));

const mockValidateDatasetWithSdk = jest.fn(() => ({ success: true, issues: [] }));
const mockBuildValidationIssues = jest.fn(() => []);

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  buildValidationIssues: (...args: any[]) => mockBuildValidationIssues(...args),
  checkData: jest.fn(),
  getErrRefTab: jest.fn(() => ''),
  ReffPath: jest.fn(() => ({
    findProblemNodes: () => [],
  })),
  validateDatasetWithSdk: (...args: any[]) => mockValidateDatasetWithSdk(...args),
}));

const mockGetFlowDetail = jest.fn(async () => ({
  data: {
    stateCode: 10,
    version: '01.01.000',
    json: {
      flowDataSet: {},
    },
  },
}));
const mockUpdateFlows = jest.fn(async () => ({
  data: [{ rule_verification: false }],
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
  updateFlows: (...args: any[]) => mockUpdateFlows(...args),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: jest.fn((payload: any) => payload ?? {}),
  genFlowJsonOrdered: jest.fn((id: string, data: any) => ({ id, ...data })),
}));

jest.mock('@/services/flowproperties/api', () => ({
  __esModule: true,
  getFlowpropertyDetail: jest.fn(async () => ({ success: false })),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  jsonToList: (value: any) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  },
}));

jest.mock('@/pages/Flows/Components/form', () => ({
  __esModule: true,
  FlowForm: ({ showRules }: any) => (
    <div data-testid='flow-show-rules'>{String(Boolean(showRules))}</div>
  ),
}));

describe('FlowsEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateFields.mockClear();
    mockValidateDatasetWithSdk.mockReturnValue({ success: true, issues: [] });
    mockBuildValidationIssues.mockReturnValue([]);
    mockGetFlowDetail.mockResolvedValue({
      data: {
        stateCode: 10,
        version: '01.01.000',
        json: {
          flowDataSet: {},
        },
      },
    });
    mockUpdateFlows.mockResolvedValue({
      data: [{ rule_verification: false }],
    });
  });

  it('auto checks silently when required flag opens the drawer and reapplies validation after showRules is enabled', async () => {
    render(
      <FlowsEdit
        id='flow-123'
        version='01.01.000'
        lang='en'
        buttonType='icon'
        autoOpen={true}
        autoCheckRequired={true}
      />,
    );

    const drawer = await screen.findByRole('dialog', { name: 'Edit' });

    await waitFor(() => {
      expect(mockUpdateFlows).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(drawer).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(mockValidateFields).toHaveBeenCalledTimes(2);
    });

    expect(mockShowValidationIssueModal).not.toHaveBeenCalled();
    expect(mockMessage.error).not.toHaveBeenCalled();
  });
});
