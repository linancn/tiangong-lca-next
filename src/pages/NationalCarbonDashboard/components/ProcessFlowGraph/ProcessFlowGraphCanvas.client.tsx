import { useEffect, useMemo, useRef, useState } from 'react';
import { ProcessFlowGraphEngine } from './graphEngine';
import { getProcessFlowGraphNode } from './graphSelection';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphInteractionMode,
  ProcessFlowGraphLayoutName,
  ProcessFlowGraphMapBackground,
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
  geoMapBackground,
  interactionMode,
  layoutMode,
  onNodeClick,
  selection,
}: {
  data: ProcessFlowGraphData;
  geoMapBackground?: ProcessFlowGraphMapBackground;
  interactionMode: ProcessFlowGraphInteractionMode;
  layoutMode: ProcessFlowGraphLayoutName;
  onNodeClick: (nodeId: string) => void;
  selection: ProcessFlowGraphSelection;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ProcessFlowGraphEngine | null>(null);
  const graphStateRef = useRef({ data, layoutMode, selection });
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
      interactionMode,
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
    const engine = engineRef.current;
    if (!engine) {
      graphStateRef.current = { data, layoutMode, selection };
      return;
    }

    const previousState = graphStateRef.current;
    const dataChanged = previousState.data !== data;
    const layoutChanged = previousState.layoutMode !== layoutMode;
    const selectionChanged = previousState.selection !== selection;

    if (dataChanged || layoutChanged) {
      engine.setDataLayoutAndSelection(data, layoutMode, selection);
    } else if (selectionChanged) {
      engine.setSelection(selection);
    }

    graphStateRef.current = { data, layoutMode, selection };
  }, [data, layoutMode, selection]);

  useEffect(() => {
    engineRef.current?.setInteractionMode(interactionMode);
  }, [interactionMode]);

  const geoMapBackgroundKey = geoMapBackground
    ? `${geoMapBackground.scope}:${geoMapBackground.width}:${geoMapBackground.height}:${geoMapBackground.paths.length}`
    : undefined;

  return (
    <div className={styles.canvasHost} ref={containerRef}>
      {layoutMode === 'geoMap2d' && geoMapBackground ? (
        <div
          className={[
            styles.geoMapBackdrop,
            geoMapBackground.scope === 'china'
              ? styles.geoMapBackdropChina
              : styles.geoMapBackdropWorld,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden='true'
          key={geoMapBackgroundKey}
        >
          <svg
            key={geoMapBackgroundKey}
            preserveAspectRatio='none'
            viewBox={`0 0 ${geoMapBackground.width} ${geoMapBackground.height}`}
          >
            {geoMapBackground.paths.map((mapPath) => (
              <path d={mapPath.path} data-code={mapPath.code} key={mapPath.id} pathLength={1}>
                <title>{mapPath.label}</title>
              </path>
            ))}
          </svg>
        </div>
      ) : (
        <div className={styles.canvasGrid} aria-hidden='true' />
      )}
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
