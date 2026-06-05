import { useEffect, useMemo, useRef, useState } from 'react';
import { ProcessFlowGraphEngine } from './graphEngine';
import { getProcessFlowGraphNode } from './graphSelection';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphLayoutName,
  ProcessFlowGraphSelection,
} from './graphTypes';
import styles from './styles.module.less';

export type ProcessFlowGraphHoverState = {
  nodeId: string;
  x: number;
  y: number;
};

export default function ProcessFlowGraphCanvas({
  data,
  layoutMode,
  onNodeClick,
  selection,
}: {
  data: ProcessFlowGraphData;
  layoutMode: ProcessFlowGraphLayoutName;
  onNodeClick: (nodeId: string) => void;
  selection: ProcessFlowGraphSelection;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ProcessFlowGraphEngine | null>(null);
  const [hover, setHover] = useState<ProcessFlowGraphHoverState | null>(null);
  const hoveredNode = useMemo(() => getProcessFlowGraphNode(data, hover?.nodeId), [data, hover]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const engine = new ProcessFlowGraphEngine({
      callbacks: {
        onNodeClick,
        onNodeHover: (nodeId, position) => {
          setHover(nodeId && position ? { nodeId, x: position.x, y: position.y } : null);
        },
      },
      container,
      data,
      layoutMode,
    });
    const resizeObserver = new ResizeObserver(() => engine.resize());
    resizeObserver.observe(container);
    engineRef.current = engine;

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setCallbacks({
      onNodeClick,
      onNodeHover: (nodeId, position) => {
        setHover(nodeId && position ? { nodeId, x: position.x, y: position.y } : null);
      },
    });
  }, [onNodeClick]);

  useEffect(() => {
    engineRef.current?.setData(data);
  }, [data]);

  useEffect(() => {
    engineRef.current?.setLayoutMode(layoutMode);
  }, [layoutMode]);

  useEffect(() => {
    engineRef.current?.setSelection(selection);
  }, [selection]);

  return (
    <div className={styles.canvasHost} ref={containerRef}>
      <div className={styles.canvasGrid} aria-hidden='true' />
      {hover && hoveredNode && (
        <div
          className={styles.nodeTooltip}
          style={{
            left: hover.x,
            top: hover.y,
          }}
        >
          <span>{hoveredNode.kind === 'flow' ? 'Flow' : 'Process'}</span>
          <strong>{hoveredNode.name}</strong>
          <em>
            {hoveredNode.id} / {hoveredNode.version}
          </em>
        </div>
      )}
    </div>
  );
}
