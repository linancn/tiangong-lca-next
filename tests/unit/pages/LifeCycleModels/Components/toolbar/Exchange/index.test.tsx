// @ts-nocheck
import EdgeExchange from '@/pages/LifeCycleModels/Components/toolbar/Exchange/index';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../../../../helpers/testUtils';

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  ArrowRightOutlined: () => <span>arrow-right</span>,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/Exchange/view', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid='edge-exchange-view'>
      {[
        props.drawerVisible,
        props.sourceProcessId,
        props.sourceProcessVersion,
        props.targetProcessId,
        props.targetProcessVersion,
        props.sourceOutputFlowID,
        props.targetInputFlowID,
      ].join('|')}
    </div>
  ),
}));

jest.mock('antd', () => {
  const { toText } = require('../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Tooltip = ({ children }: any) => <>{children}</>;

  return {
    __esModule: true,
    Button,
    Tooltip,
  };
});

describe('LifeCycleModelEdgeExchangeButton', () => {
  const edge = {
    data: {
      node: {
        sourceProcessId: 'process-source',
        sourceProcessVersion: '1.0.0',
        targetProcessId: 'process-target',
        targetProcessVersion: '2.0.0',
      },
      connection: {
        outputExchange: {
          '@flowUUID': 'flow-source',
          downstreamProcess: {
            '@flowUUID': 'flow-target',
          },
        },
      },
    },
  };

  it('opens the edge exchange drawer and passes edge identifiers through', async () => {
    render(<EdgeExchange lang='en' disabled={false} edge={edge as any} />);

    expect(screen.getByTestId('edge-exchange-view')).toHaveTextContent(
      'false|process-source|1.0.0|process-target|2.0.0|flow-source|flow-target',
    );

    await userEvent.click(screen.getByRole('button', { name: 'arrow-right' }));

    expect(screen.getByTestId('edge-exchange-view')).toHaveTextContent(
      'true|process-source|1.0.0|process-target|2.0.0|flow-source|flow-target',
    );
  });

  it('keeps the drawer closed while the trigger is disabled', async () => {
    render(<EdgeExchange lang='en' disabled edge={edge as any} />);

    await userEvent.click(screen.getByRole('button', { name: 'arrow-right' }));

    expect(screen.getByTestId('edge-exchange-view')).toHaveTextContent('false|process-source');
  });
});
