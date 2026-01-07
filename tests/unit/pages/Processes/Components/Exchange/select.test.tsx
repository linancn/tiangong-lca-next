// @ts-nocheck
import ExchangeSelect from '@/pages/Processes/Components/Exchange/select';
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

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => defaultMessage ?? id,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span data-testid='quantitative-icon'>{String(value)}</span>,
}));

jest.mock('@/pages/Processes/Components/Exchange/view', () => ({
  __esModule: true,
  default: () => <div data-testid='exchange-view'>view</div>,
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
  genProcessExchangeTableData: jest.fn((data: any[]) =>
    data.map((item) => ({
      dataSetInternalID: item['@dataSetInternalID'],
      referenceToFlowDataSet: item.referenceToFlowDataSet,
    })),
  ),
}));

jest.mock('antd', () => {
  const React = require('react');

  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon ? <span data-testid='button-icon'>{icon}</span> : null}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, footer, children }: any) => {
    if (!open) return null;
    const label = toText(title) || 'drawer';
    return (
      <section role='dialog' aria-label={label}>
        <header>{extra}</header>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    );
  };

  const Space = ({ children }: any) => <div>{children}</div>;
  const Card = ({ title, children }: any) => (
    <article>
      <h2>{toText(title)}</h2>
      <div>{children}</div>
    </article>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;

  return {
    __esModule: true,
    Button,
    Tooltip,
    Drawer,
    Space,
    Card,
    Row,
    Col,
  };
});

jest.mock('@ant-design/pro-components', () => {
  const React = require('react');

  const ProTable = ({ dataSource = [], rowSelection, actionRef, loading }: any) => {
    React.useEffect(() => {
      if (actionRef) {
        actionRef.current = {
          reload: jest.fn(),
        };
      }
    }, [actionRef]);

    return (
      <div data-testid='pro-table' data-loading={loading}>
        {dataSource.map((row: any) => (
          <div key={row.dataSetInternalID ?? row.key}>
            <span>{row.referenceToFlowDataSet}</span>
            <button
              type='button'
              onClick={() => {
                rowSelection?.onChange?.([row.dataSetInternalID], [row]);
              }}
            >
              select-{row.dataSetInternalID}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return {
    __esModule: true,
    ProTable,
  };
});

describe('ExchangeSelect', () => {
  const baseProps = {
    id: 'edge-1',
    buttonType: 'icon',
    optionType: 'create',
    lang: 'en',
    sourceProcessId: 'source-id',
    sourceProcessVersion: 'v1',
    targetProcessId: 'target-id',
    targetProcessVersion: 'v2',
    sourceRowKeys: ['source-1'],
    targetRowKeys: ['target-1'],
    onData: jest.fn(),
  };

  const sourceExchange = {
    '@dataSetInternalID': 'source-1',
    exchangeDirection: 'output',
    referenceToFlowDataSet: 'Source Flow',
  };
  const targetExchange = {
    '@dataSetInternalID': 'target-1',
    exchangeDirection: 'input',
    referenceToFlowDataSet: 'Target Flow',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetProcessDetail.mockReset();
    mockGenProcessFromData.mockReset();

    mockGetProcessDetail.mockImplementationOnce(() =>
      Promise.resolve({
        data: { json: { processDataSet: { type: 'source' } } },
      }),
    );
    mockGetProcessDetail.mockImplementationOnce(() =>
      Promise.resolve({
        data: { json: { processDataSet: { type: 'target' } } },
      }),
    );

    mockGenProcessFromData.mockImplementation((data: any) => {
      if (data.type === 'source') {
        return { exchanges: { exchange: [sourceExchange] } };
      }
      if (data.type === 'target') {
        return { exchanges: { exchange: [targetExchange] } };
      }
      return { exchanges: { exchange: [] } };
    });
  });

  it('opens drawer and loads process exchanges for source and target', async () => {
    render(<ExchangeSelect {...baseProps} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(2));

    expect(mockGetProcessDetail).toHaveBeenNthCalledWith(1, 'source-id', 'v1');
    expect(mockGetProcessDetail).toHaveBeenNthCalledWith(2, 'target-id', 'v2');

    expect(screen.getByRole('dialog', { name: 'Create exchange relation' })).toBeInTheDocument();
    expect(screen.getAllByTestId('pro-table')).toHaveLength(2);
  });

  it('submits selected exchanges and closes drawer', async () => {
    const onData = jest.fn();
    render(<ExchangeSelect {...baseProps} onData={onData} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onData).toHaveBeenCalledWith({
      id: 'edge-1',
      selectedSource: sourceExchange,
      selectedTarget: targetExchange,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Create exchange relation' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('disables submit button when selections are missing', async () => {
    render(<ExchangeSelect {...baseProps} sourceRowKeys={[]} targetRowKeys={[]} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledTimes(2));

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    expect(submitButton).toBeDisabled();
  });
});
