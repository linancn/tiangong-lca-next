// @ts-nocheck
import TargetAmount from '@/pages/LifeCycleModels/Components/toolbar/viewTargetAmount';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  CloseOutlined: () => <span>close</span>,
  StarOutlined: () => <span>star</span>,
}));

jest.mock('@/pages/Flows/Components/view', () => ({
  __esModule: true,
  default: ({ id, version }: any) => <span>{`flow-view:${id}:${version}`}</span>,
}));

jest.mock('@/components/LangTextItem/description', () => ({
  __esModule: true,
  default: ({ data }: any) => <div data-testid='lang-text'>{JSON.stringify(data)}</div>,
}));

jest.mock('@/pages/Unitgroups/Components/select/descriptionMini', () => ({
  __esModule: true,
  default: ({ id, version, idType }: any) => (
    <div data-testid='unit-group-mini'>{`${idType}:${id}:${version}`}</div>
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
  const { toText } = require('../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  const Drawer = ({ open, title, extra, children, onClose, getContainer }: any) => {
    const container = getContainer?.();
    return open ? (
      <section
        role='dialog'
        aria-label={toText(title) || 'drawer'}
        data-container={container?.nodeName === 'BODY' ? 'body' : 'other'}
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
  };

  const Space = ({ children }: any) => <div>{children}</div>;

  const Card = ({ children, title }: any) => (
    <section>
      <header>{toText(title)}</header>
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

  return {
    __esModule: true,
    Button,
    Card,
    Descriptions,
    Divider,
    Drawer,
    Space,
    Tooltip,
  };
});

describe('ViewTargetAmount', () => {
  const refNode = {
    data: {
      id: 'process-1',
      version: '1.0.0',
      targetAmount: 10,
      originalAmount: 5,
      scalingFactor: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProcessDetail.mockResolvedValue({
      data: {
        json: {
          processDataSet: {
            mocked: true,
          },
        },
      },
    });
    mockGenProcessFromData.mockReturnValue({
      processInformation: {
        quantitativeReference: {
          referenceToReferenceFlow: 'ex-1',
        },
        dataSetInformation: {
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Ref process' }],
          },
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Process comment' }],
        },
      },
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'ex-1',
            referenceToFlowDataSet: {
              '@refObjectId': 'flow-1',
              '@version': '2.0.0',
              '@type': 'flow data set',
              '@uri': '../flows/flow-1.xml',
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Reference flow' }],
            },
          },
        ],
      },
    });
  });

  it('opens from the trigger button when a reference node exists', async () => {
    const setDrawerVisible = jest.fn();

    render(
      <TargetAmount
        refNode={refNode as any}
        drawerVisible={false}
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /star/i }));

    expect(setDrawerVisible).toHaveBeenCalledWith(true);
  });

  it('loads process detail and renders ref flow information when the drawer is visible', async () => {
    const setDrawerVisible = jest.fn();

    render(
      <TargetAmount
        refNode={refNode as any}
        drawerVisible
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0'));
    expect(screen.getByRole('dialog', { name: 'Target amount' })).toHaveAttribute(
      'data-container',
      'body',
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('flow-1')).toBeInTheDocument();
    expect(screen.getByText('flow data set')).toBeInTheDocument();
    expect(screen.getByText('../flows/flow-1.xml')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
    expect(screen.getByText('flow-view:flow-1:2.0.0')).toBeInTheDocument();
    expect(screen.getByTestId('unit-group-mini')).toHaveTextContent('flow:flow-1:2.0.0');

    await userEvent.click(screen.getAllByRole('button', { name: /close/i })[0]);

    expect(setDrawerVisible).toHaveBeenCalledWith(false);
  });

  it('disables the trigger without a ref node and falls back to placeholder values when process detail is sparse', async () => {
    const setDrawerVisible = jest.fn();
    mockGetProcessDetail.mockResolvedValueOnce({ data: { json: {} } });
    mockGenProcessFromData.mockReturnValueOnce({});

    const { rerender } = render(
      <TargetAmount
        refNode={undefined as any}
        drawerVisible={false}
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /star/i })).toBeDisabled();

    rerender(
      <TargetAmount
        refNode={{ data: {} } as any}
        drawerVisible
        lang='en'
        setDrawerVisible={setDrawerVisible}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('', ''));
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText(/flow-view:/)).not.toBeInTheDocument();
  });

  it('uses the first array reference flow entry and falls back to an empty version for the flow viewer', async () => {
    mockGenProcessFromData.mockReturnValueOnce({
      processInformation: {
        quantitativeReference: {
          referenceToReferenceFlow: 'ex-1',
        },
        dataSetInformation: {
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Ref process' }],
          },
          'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Process comment' }],
        },
      },
      exchanges: {
        exchange: [
          {
            '@dataSetInternalID': 'ex-1',
            referenceToFlowDataSet: [
              {
                '@refObjectId': 'flow-array',
                '@type': 'flow data set',
                '@uri': '../flows/flow-array.xml',
                'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Reference flow' }],
              },
              {
                '@refObjectId': 'flow-second',
                '@version': '9.9.9',
              },
            ],
          },
        ],
      },
    });

    render(
      <TargetAmount
        refNode={refNode as any}
        drawerVisible
        lang='en'
        setDrawerVisible={jest.fn()}
        onData={jest.fn()}
      />,
    );

    await waitFor(() => expect(mockGetProcessDetail).toHaveBeenCalledWith('process-1', '1.0.0'));
    expect(screen.getByText('flow-array')).toBeInTheDocument();
    expect(screen.getByText('flow-view:flow-array:')).toBeInTheDocument();
    expect(screen.getByTestId('unit-group-mini')).toHaveTextContent('flow:flow-array:');
  });
});
