import { useGraphStore } from '@/contexts/graphContext';
import { Graph } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Transform } from '@antv/x6-plugin-transform';
import { useEffect, useRef } from 'react';

interface X6GraphProps {
  zoomable?: boolean;
  pannable?: boolean;
  minScale?: number;
  selectOptions?: any;
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
}

const X6GraphComponent = ({
  zoomable = true,
  pannable = true,
  minScale = 0.5,
  selectOptions,
  connectionOptions,
  gridOptions,
  transformOptions,
}: X6GraphProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const setGraph = useGraphStore((state) => state.setGraph);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
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
                color: gridOptions?.color ?? '#595959',
                thickness: gridOptions?.thickness ?? 1,
              },
            }
          : false,
      highlighting: {
        magnetAvailable: {
          name: 'stroke',
          args: {
            attrs: {
              fill: '#fff',
              stroke: '#47C769',
            },
          },
        },
      },
    });

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
          multiple: true,
          rubberband: false,
          movable: true,
          showNodeSelectionBox: false,
          showEdgeSelectionBox: false,
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
