// @ts-nocheck
import EdgeExchangeView from '@/pages/LifeCycleModels/Components/toolbar/Exchange/view';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/components/QuantitativeReferenceIcon', () => ({
  __esModule: true,
  default: ({ value }: any) => <span>{value ? 'quantitative-yes' : 'quantitative-no'}</span>,
}));

jest.mock('@/pages/Flows/Components/select/description', () => ({
  __esModule: true,
  default: ({ title, data, lang }: any) => (
    <div data-testid='flow-description'>{`${lang}:${data?.['@refObjectId'] ?? 'none'}:${title?.props?.defaultMessage ?? title}`}</div>
  ),
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

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) =>
    open ? (
      <section
        role='dialog'
        aria-label={toText(title) || 'drawer'}
        data-container={getContainer?.() === globalThis.document?.body ? 'body' : 'unknown'}
      >
        <header>
          <div>{extra}</div>
          <button type='button' onClick={onClose}>
            close
          </button>
        </header>
        <div>{children}</div>
      </section>
    ) : null;

  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
      <div>{children}</div>
    </section>
  );

  const Row = ({ children }: any) => <div>{children}</div>;
  const Col = ({ children }: any) => <div>{children}</div>;
  const Spin = ({ children }: any) => <div>{children}</div>;

  const Descriptions = ({ children }: any) => <dl>{children}</dl>;
  Descriptions.Item = ({ label, children }: any) => (
    <div>
      <dt>{toText(label)}</dt>
      <dd>{children}</dd>
    </div>
  );

  const Divider = ({ children }: any) => <div>{toText(children)}</div>;

  return {
    __esModule: true,
    Button,
    Card,
    Col,
    Descriptions,
    Divider,
    Drawer,
    Row,
    Spin,
  };
});

describe('LifeCycleModelEdgeExchangeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcessDetail
      .mockResolvedValueOnce({
        data: {
          json: {
            processDataSet: {
              mocked: 'source',
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          json: {
            processDataSet: {
              mocked: 'target',
            },
          },
        },
      });

    mockGenProcessFromData
      .mockReturnValueOnce({
        exchanges: {
          exchange: [
            {
              exchangeDirection: 'output',
              referenceToFlowDataSet: [
                {
                  '@refObjectId': 'flow-output',
                },
              ],
              meanAmount: 10,
              resultingAmount: 12,
              dataDerivationTypeStatus: 'measured',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Output comment' }],
              quantitativeReference: true,
              functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': 'Output unit' }],
            },
          ],
        },
      })
      .mockReturnValueOnce({
        exchanges: {
          exchange: [
            {
              exchangeDirection: 'input',
              referenceToFlowDataSet: [
                {
                  '@refObjectId': 'flow-input',
                },
              ],
              meanAmount: 3,
              resultingAmount: 4,
              dataDerivationTypeStatus: 'estimated',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Input comment' }],
              quantitativeReference: false,
              functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': 'Input unit' }],
            },
          ],
        },
      });
  });

  it('loads source and target exchange data with array flow refs when the drawer is opened', async () => {
    const onDrawerClose = jest.fn();

    render(
      <EdgeExchangeView
        lang='en'
        sourceProcessId='process-source'
        sourceProcessVersion='1.0.0'
        targetProcessId='process-target'
        targetProcessVersion='2.0.0'
        sourceOutputFlowID='flow-output'
        targetInputFlowID='flow-input'
        drawerVisible
        onDrawerClose={onDrawerClose}
      />,
    );

    await waitFor(() =>
      expect(mockGetProcessDetail).toHaveBeenNthCalledWith(1, 'process-source', '1.0.0'),
    );
    await waitFor(() =>
      expect(mockGetProcessDetail).toHaveBeenNthCalledWith(2, 'process-target', '2.0.0'),
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getAllByTestId('flow-description')[0]).toHaveTextContent('en:flow-output:Flow');
    expect(screen.getAllByTestId('flow-description')[1]).toHaveTextContent('en:flow-input:Flow');
    expect(screen.getByText('quantitative-yes')).toBeInTheDocument();
    expect(screen.getByText('quantitative-no')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(onDrawerClose).toHaveBeenCalledTimes(1);
  });

  it('does not request exchange data while the drawer is closed', () => {
    render(
      <EdgeExchangeView
        lang='en'
        sourceProcessId='process-source'
        sourceProcessVersion='1.0.0'
        targetProcessId='process-target'
        targetProcessVersion='2.0.0'
        sourceOutputFlowID='flow-output'
        targetInputFlowID='flow-input'
        drawerVisible={false}
        onDrawerClose={jest.fn()}
      />,
    );

    expect(mockGetProcessDetail).not.toHaveBeenCalled();
  });

  it('falls back to placeholder values when process details do not include exchange data', async () => {
    mockGetProcessDetail.mockReset();
    mockGenProcessFromData.mockReset();
    mockGetProcessDetail
      .mockResolvedValueOnce({ data: { json: null } })
      .mockResolvedValueOnce({ data: { json: null } });
    mockGenProcessFromData.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

    render(
      <EdgeExchangeView
        lang='en'
        sourceProcessId='process-source'
        sourceProcessVersion='1.0.0'
        targetProcessId='process-target'
        targetProcessVersion='2.0.0'
        sourceOutputFlowID='flow-output'
        targetInputFlowID='flow-input'
        drawerVisible
        onDrawerClose={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenNthCalledWith(1, {}));
    await waitFor(() => expect(mockGenProcessFromData).toHaveBeenNthCalledWith(2, {}));

    expect(screen.getByRole('dialog')).toHaveAttribute('data-container', 'body');
    expect(screen.getAllByTestId('flow-description')[0]).toHaveTextContent('en:none:Flow');
    expect(screen.getAllByTestId('flow-description')[1]).toHaveTextContent('en:none:Flow');
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getAllByText('quantitative-no')).toHaveLength(2);
  });

  it('supports object flow references and ignores exchanges with missing directions before finding matches', async () => {
    mockGetProcessDetail.mockReset();
    mockGenProcessFromData.mockReset();
    mockGetProcessDetail
      .mockResolvedValueOnce({
        data: {
          json: {
            processDataSet: {
              mocked: 'source-object-ref',
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          json: {
            processDataSet: {
              mocked: 'target-object-ref',
            },
          },
        },
      });
    mockGenProcessFromData
      .mockReturnValueOnce({
        exchanges: {
          exchange: [
            {
              referenceToFlowDataSet: {
                '@refObjectId': 'wrong-flow',
              },
            },
            {
              exchangeDirection: 'output',
              referenceToFlowDataSet: {
                '@refObjectId': 'flow-output',
              },
              meanAmount: 11,
              resultingAmount: 13,
              dataDerivationTypeStatus: 'calculated',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Output object ref comment' }],
              quantitativeReference: true,
              functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': 'Output object ref unit' }],
            },
          ],
        },
      })
      .mockReturnValueOnce({
        exchanges: {
          exchange: [
            {
              referenceToFlowDataSet: {
                '@refObjectId': 'wrong-input',
              },
            },
            {
              exchangeDirection: 'input',
              referenceToFlowDataSet: {
                '@refObjectId': 'flow-input',
              },
              meanAmount: 5,
              resultingAmount: 6,
              dataDerivationTypeStatus: 'estimated',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Input object ref comment' }],
              quantitativeReference: false,
              functionalUnitOrOther: [{ '@xml:lang': 'en', '#text': 'Input object ref unit' }],
            },
          ],
        },
      });

    render(
      <EdgeExchangeView
        lang='en'
        sourceProcessId='process-source'
        sourceProcessVersion='1.0.0'
        targetProcessId='process-target'
        targetProcessVersion='2.0.0'
        sourceOutputFlowID='flow-output'
        targetInputFlowID='flow-input'
        drawerVisible
        onDrawerClose={jest.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText('11')).toBeInTheDocument());
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getAllByTestId('flow-description')[0]).toHaveTextContent('en:flow-output:Flow');
    expect(screen.getAllByTestId('flow-description')[1]).toHaveTextContent('en:flow-input:Flow');
  });
});
