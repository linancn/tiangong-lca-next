import { executeX6HistoryCommand } from '@/components/X6Graph/history';
import { useGraphStore } from '@/contexts/graphContext';
import { Clipboard, Graph, History, Keyboard, Selection, Snapline, Transform } from '@antv/x6';
import { theme } from 'antd';
import { useEffect, useRef } from 'react';

interface X6GraphProps {
  zoomable?: boolean;
  pannable?: boolean;
  minScale?: number;
  selectOptions?: {
    enabled?: boolean;
    multiple?: boolean;
    movable?: boolean;
    showNodeSelectionBox?: boolean;
    showEdgeSelectionBox?: boolean;
    pointerEvents?: 'none' | 'auto';
  };
  connectionOptions?: {
    snap?: boolean;
    allowBlank?: boolean;
    allowLoop?: boolean;
    allowMulti?: string | boolean;
    allowNode?: boolean;
    allowEdge?: boolean;
    router?: {
      name: string;
      args?: any;
    };
    connector?: {
      name: string;
      args?: any;
    };
  };
  gridOptions?: {
    type?: string;
    size?: number;
    color?: string;
    thickness?: number;
    visible?: boolean;
  };
  transformOptions?: {
    resizing?: boolean;
    rotating?: boolean;
  };
  historyOptions?: {
    enabled?: boolean;
    stackSize?: number;
    beforeAddCommand?: (event: string, args: any) => any;
    executeCommand?: (cmd: any, revert: boolean, options: Record<string, any>) => any;
  };
  clipboardOptions?: {
    enabled?: boolean;
    useLocalStorage?: boolean;
  };
  keyboardOptions?: {
    enabled?: boolean;
    global?: boolean;
  };
}

const X6GraphComponent = ({
  zoomable = true,
  pannable = true,
  minScale = 0.5,
  selectOptions,
  connectionOptions,
  gridOptions,
  transformOptions,
  historyOptions,
  clipboardOptions,
  keyboardOptions,
}: X6GraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const setGraph = useGraphStore((state) => state.setGraph);
  const { token } = theme.useToken();
  const defaultGridColor = token.colorTextTertiary;
  const hasTransformHandles = !!(transformOptions?.resizing || transformOptions?.rotating);

  useEffect(() => {
    const graph = new Graph({
      container: containerRef.current!,
      autoResize: true,
      async: false,
      panning: pannable,
      mousewheel: zoomable
        ? {
            enabled: true,
            minScale: minScale,
            maxScale: 1.5,
          }
        : false,
      connecting: {
        snap: connectionOptions?.snap ?? true,
        allowBlank: connectionOptions?.allowBlank ?? false,
        allowLoop: connectionOptions?.allowLoop ?? false,
        allowMulti:
          connectionOptions?.allowMulti === 'withPort'
            ? 'withPort'
            : !!connectionOptions?.allowMulti,
        allowNode: connectionOptions?.allowNode ?? false,
        allowEdge: connectionOptions?.allowEdge ?? false,
        router: connectionOptions?.router?.name ?? 'manhattan',
        connector: connectionOptions?.connector?.name ?? 'rounded',
      },
      grid:
        gridOptions?.visible !== false
          ? {
              size: gridOptions?.size ?? 10,
              visible: true,
              type: (gridOptions?.type as any) ?? 'dot',
              args: {
                color: gridOptions?.color ?? defaultGridColor,
                thickness: gridOptions?.thickness ?? 1,
              },
            }
          : false,
      highlighting: {
        magnetAvailable: {
          name: 'stroke',
          args: {
            attrs: {
              fill: token.colorBgContainer,
              stroke: token.colorSuccess,
            },
          },
        },
      },
    });

    if (historyOptions?.enabled) {
      const userBeforeAddCommand = historyOptions.beforeAddCommand;
      const userExecuteCommand = historyOptions.executeCommand;
      graph.use(
        new History({
          ...historyOptions,
          enabled: true,
          beforeAddCommand: (event, args) => {
            const historyEventArgs = args as { options?: Record<string, any> } | undefined;
            if (historyEventArgs?.options?.ignoreHistory) {
              return false;
            }

            if (typeof userBeforeAddCommand === 'function') {
              return userBeforeAddCommand(event, args);
            }

            return true;
          },
          executeCommand: (cmd, revert, options) => {
            if (executeX6HistoryCommand(graph, cmd, revert, options)) {
              return;
            }

            if (typeof userExecuteCommand === 'function') {
              return userExecuteCommand(cmd, revert, options);
            }
          },
        }),
      );
    }

    if (clipboardOptions?.enabled) {
      graph.use(
        new Clipboard({
          enabled: true,
          useLocalStorage: clipboardOptions.useLocalStorage ?? false,
        }),
      );
    }

    if (keyboardOptions?.enabled) {
      graph.use(
        new Keyboard({
          enabled: true,
          global: keyboardOptions.global ?? false,
        }),
      );
    }

    // 启用 snapline 插件
    graph.use(
      new Snapline({
        enabled: true,
      }),
    );

    // 如果需要选择功能
    if (selectOptions?.enabled !== false) {
      graph.use(
        new Selection({
          enabled: true,
          multiple: selectOptions?.multiple ?? true,
          rubberband: false,
          movable: selectOptions?.movable ?? true,
          showNodeSelectionBox: selectOptions?.showNodeSelectionBox ?? !hasTransformHandles,
          showEdgeSelectionBox: selectOptions?.showEdgeSelectionBox ?? false,
          pointerEvents: selectOptions?.pointerEvents ?? (hasTransformHandles ? 'auto' : 'none'),
        }),
      );
    }

    // 如果需要 transform 功能
    if (transformOptions?.resizing || transformOptions?.rotating) {
      graph.use(
        new Transform({
          resizing: transformOptions.resizing ?? false,
          rotating: transformOptions.rotating ?? false,
        }),
      );
    }

    setGraph(graph);

    return () => {
      graph.dispose();
      setGraph(null);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

export default X6GraphComponent;
