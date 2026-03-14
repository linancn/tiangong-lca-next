// @ts-nocheck
import {
  Control,
  ControlEnum,
} from '@/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/control';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../../../helpers/testUtils';

let graphZoom = 1;
let scaleHandler: any;
let mockGraph: any;

const mockApplyDagreLayoutWithHistory = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  useGraphEvent: jest.fn((event: string, handler: any) => {
    if (event === 'scale') {
      scaleHandler = handler;
    }
  }),
  useGraphInstance: () => mockGraph,
}));

jest.mock('@/pages/LifeCycleModels/Components/toolbar/utils/layout', () => ({
  __esModule: true,
  applyDagreLayoutWithHistory: (...args: any[]) => mockApplyDagreLayoutWithHistory(...args),
}));

jest.mock('@ant-design/icons', () => ({
  __esModule: true,
  AimOutlined: () => <span>aim</span>,
  CompressOutlined: () => <span>compress</span>,
  ExpandOutlined: () => <span>expand</span>,
  PartitionOutlined: () => <span>partition</span>,
  ZoomInOutlined: () => <span>zoom-in</span>,
  ZoomOutOutlined: () => <span>zoom-out</span>,
}));

jest.mock('antd', () => {
  const React = require('react');
  const { toText } = require('../../../../../../../helpers/nodeToText');

  const Button = ({ children, onClick, disabled = false, icon }: any) => (
    <button type='button' disabled={disabled} onClick={disabled ? undefined : onClick}>
      {icon}
      {toText(children)}
    </button>
  );

  const Space = ({ children, direction, size }: any) => (
    <div data-testid={size === 'middle' ? 'space-root' : 'space-nested'} data-direction={direction}>
      {children}
    </div>
  );

  const Tooltip = ({ children, title, placement }: any) => (
    <div data-placement={placement}>
      <div>{children}</div>
      <div>{title}</div>
    </div>
  );

  return {
    __esModule: true,
    Button,
    Space,
    Tooltip,
  };
});

describe('ReviewLifeCycleModelToolbarControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    graphZoom = 1;
    scaleHandler = undefined;
    mockGraph = {
      zoom: jest.fn((delta?: number) => {
        if (typeof delta === 'number') {
          graphZoom = Number((graphZoom + delta).toFixed(2));
        }
        return graphZoom;
      }),
      zoomTo: jest.fn((nextZoom: number) => {
        graphZoom = nextZoom;
      }),
      zoomToFit: jest.fn(() => {
        graphZoom = 1;
      }),
    };
  });

  it('renders vertical controls and updates button state from scale events', () => {
    render(
      <Control
        items={[ControlEnum.ZoomTo, ControlEnum.ZoomIn, ControlEnum.ZoomOut, 'unknown' as any]}
      />,
    );

    expect(screen.getByTestId('space-root')).toHaveAttribute('data-direction', 'vertical');
    expect(screen.getAllByRole('button', { name: '100%' })[0]).toBeInTheDocument();

    act(() => {
      scaleHandler?.({ sx: 1.5 });
    });
    expect(screen.getByRole('button', { name: 'zoom-in' })).toBeDisabled();

    act(() => {
      scaleHandler?.({ sx: 0.5 });
    });
    expect(screen.getByRole('button', { name: 'zoom-out' })).toBeDisabled();
  });

  it('runs zoom and layout operations for supported tools', async () => {
    mockApplyDagreLayoutWithHistory.mockReturnValueOnce(true).mockReturnValueOnce(false);

    render(
      <Control
        items={[
          ControlEnum.ZoomTo,
          ControlEnum.ZoomIn,
          ControlEnum.ZoomOut,
          ControlEnum.ZoomToFit,
          ControlEnum.ZoomToOrigin,
          ControlEnum.AutoLayoutLR,
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'zoom-in' }));
    await userEvent.click(screen.getByRole('button', { name: 'zoom-out' }));
    await userEvent.click(screen.getAllByRole('button', { name: '100%' })[0]);
    await userEvent.click(screen.getByRole('button', { name: '150%' }));
    await userEvent.click(screen.getByRole('button', { name: 'compress' }));
    await userEvent.click(screen.getByRole('button', { name: 'expand' }));
    await userEvent.click(screen.getByRole('button', { name: 'partition' }));
    await userEvent.click(screen.getByRole('button', { name: 'partition' }));

    expect(mockGraph.zoom).toHaveBeenCalledWith(0.25);
    expect(mockGraph.zoom).toHaveBeenCalledWith(-0.25);
    expect(mockGraph.zoomTo).toHaveBeenCalledWith(0.5);
    expect(mockGraph.zoomTo).toHaveBeenCalledWith(1.5);
    expect(mockGraph.zoomTo).toHaveBeenCalledWith(1);
    expect(mockApplyDagreLayoutWithHistory).toHaveBeenNthCalledWith(1, mockGraph, 'LR');
    expect(mockApplyDagreLayoutWithHistory).toHaveBeenNthCalledWith(2, mockGraph, 'LR');
    await waitFor(() => expect(mockGraph.zoomToFit).toHaveBeenCalledTimes(2));
    expect(mockGraph.zoomToFit).toHaveBeenNthCalledWith(1, { maxScale: 1 });
  });
});
