// @ts-nocheck
import ProcessView from '@/pages/Processes/Components/view';
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

const mockGetProcessDetail = jest.fn();
const mockGetProcessExchange = jest.fn();
const mockGetUnitData = jest.fn();
const mockGetFlowStateCode = jest.fn();
const mockGenProcessFromData = jest.fn();
const mockGenProcessExchangeTableData = jest.fn();
const mockProcessExchangeView = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetail: (...args: any[]) => mockGetProcessDetail(...args),
  getProcessExchange: (...args: any[]) => mockGetProcessExchange(...args),
}));

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessFromData: (...args: any[]) => mockGenProcessFromData(...args),
  genProcessExchangeTableData: (...args: any[]) => mockGenProcessExchangeTableData(...args),
}));

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  getLangText: () => 'text',
  getUnitData: (...args: any[]) => mockGetUnitData(...args),
}));

jest.mock('@/services/flows/api', () => ({
  __esModule: true,
  getFlowStateCodeByIdsAndVersions: (...args: any[]) => mockGetFlowStateCode(...args),
}));

jest.mock('@/components/AlignedNumber', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='aligned-number'>{value}</span>,
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: (props: any) => {
    mockProcessExchangeView(props);
    return <div data-testid='exchange-view' />;
  },
}));

jest.mock('@/pages/Processes/Components/Review/view', () => ({
  __esModule: true,
  default: () => <div data-testid='review-view'>review-view</div>,
}));

jest.mock('@/pages/Processes/Components/Compliance/view', () => ({
  __esModule: true,
  default: () => <div data-testid='compliance-view'>compliance-view</div>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-description'>{toText(data)}</div>,
}));

jest.mock('@/components/LevelTextItem/description', () => ({
  __esModule: true,
  default: () => <div data-testid='level-description'>level</div>,
}));

jest.mock('@/components/LocationTextItem/description', () => ({
  __esModule: true,
  default: () => <div data-testid='location-description'>location</div>,
}));

jest.mock('@/pages/Contacts/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='contact-description'>contact</div>,
}));

jest.mock('@/pages/Sources/Components/select/description', () => ({
  __esModule: true,
  default: () => <div data-testid='source-description'>source</div>,
}));

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ request }: any) => {
    if (request) {
      void request({ current: 1, pageSize: 10 });
    }

    return <div data-testid='pro-table'>table</div>;
  };

  return {
    __esModule: true,
    ProTable,
  };
});

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close-icon</span>,
  ProductOutlined: () => <span>product-icon</span>,
  ProfileOutlined: () => <span>profile-icon</span>,
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children }: any) =>
    open ? (
      <section role='dialog' aria-label={toText(title) || 'drawer'}>
        <header>{extra}</header>
        <div>{children}</div>
      </section>
    ) : null;

  const Spin = ({ spinning, children }: any) => (
    <div data-testid='spin' data-spinning={String(spinning)}>
      {children}
    </div>
  );

  const Card = ({ tabList = [], activeTabKey, onTabChange, children }: any) => (
    <div data-testid='card' data-active-key={activeTabKey}>
      {tabList.map((item: any) => (
        <button type='button' key={item.key} onClick={() => onTabChange?.(item.key)}>
          {toText(item.tab)}
        </button>
      ))}
      <div>{children}</div>
    </div>
  );

  const Collapse = ({ items = [] }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.key}>{item.children}</div>
      ))}
    </div>
  );

  const Space = ({ children }: any) => <div>{children}</div>;
  const Descriptions = ({ children }: any) => <div>{children}</div>;
  Descriptions.Item = ({ children }: any) => <div>{children}</div>;
  const Divider = ({ children }: any) => <div>{children}</div>;
  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Spin,
    Card,
    Collapse,
    Space,
    Descriptions,
    Divider,
    Input: {
      TextArea: ({ children, ...props }: any) => <textarea {...props}>{children}</textarea>,
    },
    theme: { defaultAlgorithm: {}, darkAlgorithm: {} },
  };
});

const defaultProps = {
  id: 'process-1',
  version: '1.0.0',
  lang: 'en',
  buttonType: 'icon',
  disabled: false,
};

const processDataSet = {
  processInformation: {
    dataSetInformation: {
      'common:UUID': 'uuid-123',
    },
  },
  exchanges: {
    exchange: [
      {
        '@dataSetInternalID': '0',
        referenceToFlowDataSet: {
          '@refObjectId': 'flow-1',
          '@version': '1.0',
        },
      },
    ],
  },
  LCIAResults: {
    LCIAResult: [{ key: 'lcia-1', meanAmount: 10 }],
  },
};

describe('ProcessView component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcessDetail.mockResolvedValue({
      data: { json: { processDataSet: processDataSet } },
    });
    mockGenProcessFromData.mockReturnValue(processDataSet);
    mockGenProcessExchangeTableData.mockReturnValue([{ id: 'row-1' }]);
    mockGetProcessExchange.mockResolvedValue({ data: [], success: true });
    mockGetUnitData.mockResolvedValue([]);
    mockGetFlowStateCode.mockResolvedValue({ error: null, data: [] });
  });

  it('opens drawer and fetches process detail', async () => {
    render(<ProcessView {...defaultProps} />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('dialog', { name: 'View process' })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0');
    });

    expect(screen.getByTestId('spin')).toHaveAttribute('data-spinning', 'false');
  });

  it('changes active tab when user selects new tab', async () => {
    render(<ProcessView {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    const lciaTab = screen.getByRole('button', { name: 'LCIA Results' });
    fireEvent.click(lciaTab);

    await waitFor(() => {
      expect(screen.getByTestId('card')).toHaveAttribute('data-active-key', 'lciaResults');
    });
  });

  it('disables the view button when disabled prop is true', () => {
    render(<ProcessView {...defaultProps} buttonType='toolIcon' disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
