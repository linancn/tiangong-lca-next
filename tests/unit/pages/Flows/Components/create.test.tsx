// @ts-nocheck
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import FlowsCreate from '@/pages/Flows/Components/create';

const toText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toText).join('');
  if (node?.props?.defaultMessage) return node.props.defaultMessage;
  if (node?.props?.id) return node.props.id;
  if (node?.props?.children) return toText(node.props.children);
  return '';
};

// eslint-disable-next-line no-var
var mockMessage: any;
const mockCreateFlows = jest.fn();
const mockGetFlowDetail = jest.fn();
const mockGenFlowFromData = jest.fn();
const mockFormatDateTime = jest.fn(() => 'formatted-time');
let mockUuid = 0;

const mockSetFlowFormProps = jest.fn();
const mockFlowFormActions: Record<string, () => void> = {};

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
  useIntl: () => ({
    formatMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
  }),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span data-testid='icon-close' />,
  CopyOutlined: () => <span data-testid='icon-copy' />,
  PlusOutlined: () => <span data-testid='icon-plus' />,
}));

jest.mock('antd', () => {
  const React = require('react');
  mockMessage = {
    success: jest.fn(),
    error: jest.fn(),
  };
  const Button = ({ children, onClick, icon, disabled = false }: any) => (
    <button type='button' onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );
  const Drawer = ({ open, children, extra, footer }: any) =>
    open ? (
      <div data-testid='drawer'>
        {extra}
        {children}
        <div data-testid='drawer-footer'>{footer}</div>
      </div>
    ) : null;
  const Space = ({ children }: any) => <div>{children}</div>;
  const Tooltip = ({ children }: any) => <>{children}</>;
  const Spin = ({ spinning, children }: any) =>
    spinning ? <div data-testid='spin'>{children}</div> : <div>{children}</div>;
  return {
    __esModule: true,
    Button,
    Drawer,
    Space,
    Tooltip,
    Spin,
    message: mockMessage,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');
  const ProForm = ({ formRef, onValuesChange, onFinish, children }: any) => {
    const instance = {
      values: {},
      setFieldsValue: jest.fn((vals: any) => {
        instance.values = { ...instance.values, ...vals };
      }),
      getFieldsValue: jest.fn(() => instance.values),
      resetFields: jest.fn(() => {
        instance.values = {};
      }),
      validateFields: jest.fn(() => Promise.resolve(true)),
      submit: jest.fn(() => onFinish?.()),
      setFieldValue: jest.fn(),
    };
    formRef.current = instance;

    return (
      <div
        data-testid='proform'
        onClick={() => onValuesChange?.({}, { flowInformation: { name: 'changed' } })}
      >
        {children}
      </div>
    );
  };
  return { __esModule: true, ProForm };
});

jest.mock('@/components/ToolBarButton', () => ({
  __esModule: true,
  default: ({ tooltip, onClick }: any) => (
    <button type='button' onClick={onClick}>
      {toText(tooltip) || 'toolbar-button'}
    </button>
  ),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  createFlows: (...args: any[]) => mockCreateFlows(...args),
  getFlowDetail: (...args: any[]) => mockGetFlowDetail(...args),
}));

jest.mock('@/services/flows/util', () => ({
  __esModule: true,
  genFlowFromData: (...args: any[]) => mockGenFlowFromData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  formatDateTime: (...args: any[]) => mockFormatDateTime(...args),
}));

jest.mock('uuid', () => ({
  __esModule: true,
  v4: () => {
    mockUuid += 1;
    return `uuid-${mockUuid}`;
  },
}));

jest.mock('@/style/custom.less', () => ({
  __esModule: true,
  default: { footer_right: 'footer-right' },
}));

jest.mock('@/pages/Flows/Components/form', () => ({
  __esModule: true,
  FlowForm: (props: any) => {
    mockSetFlowFormProps(props);
    mockFlowFormActions.onData = props.onData;
    mockFlowFormActions.onPropertyData = () => props.onPropertyData([{ id: 'prop-1' }]);
    mockFlowFormActions.onPropertyDataCreate = () =>
      props.onPropertyDataCreate({ id: 'prop-new', ref: true });
    mockFlowFormActions.onTabChange = () => props.onTabChange('modellingAndValidation');
    return (
      <div>
        <div data-testid='flowform-active-tab'>{props.activeTabKey}</div>
        <div data-testid='flowform-drawer-visible'>{String(props.drawerVisible)}</div>
        <div data-testid='flowform-property-count'>{props.propertyDataSource?.length ?? 0}</div>
        <div data-testid='flowform-flow-type'>{props.flowType ?? ''}</div>
        <button type='button' onClick={() => mockFlowFormActions.onPropertyDataCreate?.()}>
          add-property
        </button>
        <button type='button' onClick={() => mockFlowFormActions.onPropertyData?.()}>
          set-properties
        </button>
        <button type='button' onClick={() => mockFlowFormActions.onTabChange?.()}>
          switch-tab
        </button>
        <button type='button' onClick={() => mockFlowFormActions.onData?.()}>
          sync-data
        </button>
      </div>
    );
  },
}));

describe('FlowsCreate (src/pages/Flows/Components/create.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUuid = 0;
    mockFormatDateTime.mockReturnValue('formatted-time');
    mockGenFlowFromData.mockImplementation((data: any) => data || {});
    mockGetFlowDetail.mockResolvedValue({
      data: { json: { flowDataSet: { from: 'detail' } }, version: 'v1' },
    });
    mockCreateFlows.mockResolvedValue({ data: {} });
  });

  const renderComponent = (props: any = {}) => {
    const actionRef = { current: { reload: jest.fn() } };
    const onClose = jest.fn();
    const utils = render(
      <FlowsCreate lang='en' actionRef={actionRef as any} onClose={onClose} {...props} />,
    );
    return { actionRef, onClose, ...utils };
  };

  it('opens drawer for create flow and seeds default data, then cleans on close', async () => {
    const { onClose } = renderComponent();

    fireEvent.click(screen.getByText('Create'));

    expect(screen.getByTestId('drawer')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('flowform-drawer-visible').textContent).toBe('true');
    });
    expect(mockSetFlowFormProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ activeTabKey: 'flowInformation' }),
    );

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
  });

  it('auto-opens with import data and populates properties and flow type', async () => {
    mockGenFlowFromData.mockReturnValue({
      flowProperties: { flowProperty: [{ id: 'p1' }, { id: 'p2' }] },
      modellingAndValidation: { LCIMethod: { typeOfDataSet: 'Product flow' } },
    });

    renderComponent({
      importData: [{ flowDataSet: { id: 'imported' } }],
    });

    await waitFor(() => {
      expect(screen.getByTestId('flowform-property-count').textContent).toBe('2');
    });
    expect(screen.getByTestId('flowform-flow-type').textContent).toBe('Product flow');
  });

  it('loads existing data when copying or creating new version', async () => {
    mockGenFlowFromData.mockReturnValue({
      flowProperties: { flowProperty: [{ id: 'copy' }] },
      administrativeInformation: {
        publicationAndOwnership: { 'common:dataSetVersion': 'old-version' },
      },
      modellingAndValidation: { LCIMethod: { typeOfDataSet: 'Waste flow' } },
    });

    renderComponent({
      actionType: 'createVersion',
      id: 'flow-1',
      version: '1.0',
      newVersion: '2.0',
    });

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => {
      expect(mockGetFlowDetail).toHaveBeenCalledWith('flow-1', '1.0');
    });
    expect(mockGenFlowFromData).toHaveBeenCalledWith({ from: 'detail' });
    await waitFor(() => {
      expect(screen.getByTestId('flowform-property-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('flowform-flow-type').textContent).toBe('Waste flow');
  });

  it('submits successfully, resets state, and reloads table', async () => {
    const { actionRef } = renderComponent();

    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByTestId('drawer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('add-property'));
    await waitFor(() => {
      expect(screen.getByTestId('flowform-property-count').textContent).toBe('1');
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateFlows).toHaveBeenCalled();
    });
    const [calledId, payload] = mockCreateFlows.mock.calls[0];
    expect(calledId).toBe('uuid-1');
    expect(payload.flowProperties.flowProperty).toHaveLength(1);
    expect(mockMessage.success).toHaveBeenCalled();
    expect(actionRef.current.reload).toHaveBeenCalled();
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument();
    expect(mockSetFlowFormProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ activeTabKey: 'flowInformation' }),
    );
  });

  it('shows error toast when submission fails', async () => {
    mockCreateFlows.mockResolvedValueOnce({ error: { message: 'failed' } });
    renderComponent();

    fireEvent.click(screen.getByText('Create'));
    await waitFor(() => {
      expect(screen.getByTestId('drawer')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockMessage.error).toHaveBeenCalledWith('failed');
    });
  });
});
