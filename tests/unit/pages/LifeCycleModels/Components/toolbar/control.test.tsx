// @ts-nocheck
import { Control, ControlEnum } from '@/pages/LifeCycleModels/Components/toolbar/control';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '../../../../../helpers/testUtils';

let graphZoom = 1;
let mockEventHandlers: Record<string, any>;
let mockGraph: any;

const mockApplyDagreLayoutWithHistory = jest.fn();

jest.mock('umi', () => ({
  __esModule: true,
  FormattedMessage: ({ defaultMessage, id }: any) => <span>{defaultMessage ?? id}</span>,
}));

jest.mock('@/contexts/graphContext', () => ({
  __esModule: true,
  useGraphEvent: jest.fn((event: string, handler: any) => {
    mockEventHandlers[event] = handler;
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
  CopyOutlined: () => <span>copy</span>,
  ExpandOutlined: () => <span>expand</span>,
  PartitionOutlined: () => <span>partition</span>,
  RedoOutlined: () => <span>redo</span>,
  SnippetsOutlined: () => <span>paste</span>,
  UndoOutlined: () => <span>undo</span>,
  ZoomInOutlined: () => <span>zoom-in</span>,
  ZoomOutOutlined: () => <span>zoom-out</span>,
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

describe('LifeCycleModelToolbarControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    graphZoom = 1;
    mockEventHandlers = {};
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
      canUndo: jest.fn(() => false),
      canRedo: jest.fn(() => false),
      isClipboardEmpty: jest.fn(() => true),
      batchUpdate: jest.fn((_name: string, callback: () => void) => callback()),
    };
  });

  it('renders horizontal controls and updates button state from scale events', () => {
    render(
      <Control
        items={[ControlEnum.ZoomTo, ControlEnum.ZoomIn, ControlEnum.ZoomOut, 'unknown' as any]}
      />,
    );

    expect(screen.getByTestId('space-root')).toHaveAttribute('data-direction', 'horizontal');
    expect(screen.getAllByRole('button', { name: '100%' })[0]).toBeInTheDocument();

    act(() => {
      mockEventHandlers['scale']?.({ sx: 1.5 });
    });
    expect(screen.getByRole('button', { name: 'zoom-in' })).toBeDisabled();

    act(() => {
      mockEventHandlers['scale']?.({ sx: 0.5 });
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

  it('runs auto layout without native graph batching when history helper is used', async () => {
    mockApplyDagreLayoutWithHistory.mockReturnValueOnce(true);

    render(<Control items={[ControlEnum.AutoLayoutLR]} />);

    await userEvent.click(screen.getByRole('button', { name: 'partition' }));

    expect(mockApplyDagreLayoutWithHistory).toHaveBeenCalledWith(mockGraph, 'LR');
    expect(mockGraph.zoomToFit).toHaveBeenCalledWith({ maxScale: 1 });
  });

  it('refreshes editor command state and dispatches editing actions', async () => {
    const editorActions = {
      undo: jest.fn(),
      redo: jest.fn(),
      paste: jest.fn(),
      duplicate: jest.fn(),
    };

    const { rerender } = render(
      <Control
        items={[ControlEnum.Undo, ControlEnum.Redo, ControlEnum.Paste, ControlEnum.Duplicate]}
        editorActions={editorActions}
        canDuplicate={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'paste' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'copy' })).toBeDisabled();

    mockGraph.canUndo.mockReturnValue(true);
    mockGraph.canRedo.mockReturnValue(true);
    mockGraph.isClipboardEmpty.mockReturnValue(false);

    act(() => {
      mockEventHandlers['history:change']?.({});
      mockEventHandlers['clipboard:changed']?.({});
    });

    expect(screen.getByRole('button', { name: 'undo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'redo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'paste' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'copy' })).toBeDisabled();

    rerender(
      <Control
        items={[ControlEnum.Undo, ControlEnum.Redo, ControlEnum.Paste, ControlEnum.Duplicate]}
        editorActions={editorActions}
        canDuplicate={true}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'undo' }));
    await userEvent.click(screen.getByRole('button', { name: 'redo' }));
    await userEvent.click(screen.getByRole('button', { name: 'paste' }));
    await userEvent.click(screen.getByRole('button', { name: 'copy' }));

    expect(editorActions.undo).toHaveBeenCalledTimes(1);
    expect(editorActions.redo).toHaveBeenCalledTimes(1);
    expect(editorActions.paste).toHaveBeenCalledTimes(1);
    expect(editorActions.duplicate).toHaveBeenCalledTimes(1);
  });

  it('falls back to disabled command state when no graph instance is available', () => {
    mockGraph = null;

    render(
      <Control
        items={[ControlEnum.Undo, ControlEnum.Redo, ControlEnum.Paste, ControlEnum.Duplicate]}
        canDuplicate={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'paste' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'copy' })).toBeDisabled();
  });

  it('no-ops action handlers when a visible control is clicked without a graph instance', async () => {
    mockGraph = null;

    render(<Control items={[ControlEnum.ZoomIn, ControlEnum.ZoomOut, ControlEnum.ZoomToFit]} />);

    await userEvent.click(screen.getByRole('button', { name: 'zoom-in' }));
    await userEvent.click(screen.getByRole('button', { name: 'zoom-out' }));
    await userEvent.click(screen.getByRole('button', { name: 'compress' }));

    expect(mockApplyDagreLayoutWithHistory).not.toHaveBeenCalled();
  });
});
