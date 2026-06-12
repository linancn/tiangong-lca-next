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

type CanvasIdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
};

const overviewGeometryPrewarmTimeoutMs = 3200;
const chinaInsetPathCode = '100000_JD';
const chinaInsetFocusPathCodes = new Set(['460000', chinaInsetPathCode]);
const svgPathNumberPattern = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

type SvgPathBounds = {
  height: number;
  minX: number;
  minY: number;
  width: number;
};

function getSvgPathBounds(
  paths: ProcessFlowGraphMapBackground['paths'],
  paddingRatio = 0.12,
): SvgPathBounds | undefined {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  paths.forEach((mapPath) => {
    const values = mapPath.path.match(svgPathNumberPattern)?.map(Number) ?? [];

    for (let index = 0; index < values.length - 1; index += 2) {
      const x = values[index];
      const y = values[index + 1];

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY) ||
    maxX <= minX ||
    maxY <= minY
  ) {
    return undefined;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height) * paddingRatio;

  return {
    height: height + padding * 2,
    minX: minX - padding,
    minY: minY - padding,
    width: width + padding * 2,
  };
}

function scheduleCanvasIdleWork(callback: () => void, timeoutMs: number): () => void {
  const idleWindow = window as CanvasIdleWindow;

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(timeoutId);
}

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
  const geoMapScope = geoMapBackground?.scope;
  const graphStateRef = useRef({ data, geoMapScope, layoutMode, selection });
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
      geoMapScope,
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
      graphStateRef.current = { data, geoMapScope, layoutMode, selection };
      return;
    }

    const previousState = graphStateRef.current;
    const dataChanged = previousState.data !== data;
    const geoMapScopeChanged = previousState.geoMapScope !== geoMapScope;
    const layoutChanged = previousState.layoutMode !== layoutMode;
    const selectionChanged = previousState.selection !== selection;

    if (dataChanged || layoutChanged || geoMapScopeChanged) {
      engine.setDataLayoutAndSelection(data, layoutMode, selection, geoMapScope);
    } else if (selectionChanged) {
      engine.setSelection(selection);
    }

    graphStateRef.current = { data, geoMapScope, layoutMode, selection };
  }, [data, geoMapScope, layoutMode, selection]);

  useEffect(() => {
    engineRef.current?.setInteractionMode(interactionMode);
  }, [interactionMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || data.geoMapFrame) {
      return undefined;
    }

    let cancelled = false;
    const cancelPrewarm = scheduleCanvasIdleWork(() => {
      if (cancelled) {
        return;
      }

      engine.prewarmOverviewLayoutGeometry('sphere3d');
      engine.prewarmOverviewLayoutGeometry('expanded2d');
    }, overviewGeometryPrewarmTimeoutMs);

    return () => {
      cancelled = true;
      cancelPrewarm();
    };
  }, [data]);

  const geoMapBackgroundKey = geoMapBackground
    ? `${geoMapBackground.scope}:${geoMapBackground.width}:${geoMapBackground.height}:${geoMapBackground.paths.length}`
    : undefined;
  const chinaInsetMapPaths = useMemo(
    () => (geoMapBackground?.scope === 'china' ? geoMapBackground.paths : []),
    [geoMapBackground],
  );
  const chinaInsetFocusPaths = useMemo(
    () =>
      chinaInsetMapPaths.filter(
        (mapPath) =>
          (mapPath.code ? chinaInsetFocusPathCodes.has(mapPath.code) : false) ||
          mapPath.id.includes(chinaInsetPathCode),
      ),
    [chinaInsetMapPaths],
  );
  const chinaInsetBounds = useMemo(() => {
    const bounds = getSvgPathBounds(
      chinaInsetFocusPaths.length ? chinaInsetFocusPaths : chinaInsetMapPaths,
    );
    const hainanBounds = getSvgPathBounds(
      chinaInsetMapPaths.filter((mapPath) => mapPath.code === '460000'),
      0,
    );

    if (!bounds || !hainanBounds) {
      return bounds;
    }

    const bottom = bounds.minY + bounds.height;
    const top = Math.max(
      bounds.minY,
      hainanBounds.minY - Math.max(bounds.width, bounds.height) * 0.08,
    );

    return {
      ...bounds,
      height: bottom - top,
      minY: top,
    };
  }, [chinaInsetFocusPaths, chinaInsetMapPaths]);
  const chinaInsetViewBox = chinaInsetBounds
    ? `${chinaInsetBounds.minX} ${chinaInsetBounds.minY} ${chinaInsetBounds.width} ${chinaInsetBounds.height}`
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
            className={styles.geoMapBackdropMap}
            key={geoMapBackgroundKey}
            preserveAspectRatio='none'
            viewBox={`0 0 ${geoMapBackground.width} ${geoMapBackground.height}`}
          >
            {geoMapBackground.paths.map((mapPath, pathIndex) => (
              <path
                d={mapPath.path}
                data-code={mapPath.code}
                key={`${mapPath.id}:${pathIndex}`}
                pathLength={1}
              >
                <title>{mapPath.label}</title>
              </path>
            ))}
          </svg>
          {geoMapBackground.scope === 'china' &&
          chinaInsetBounds &&
          chinaInsetViewBox &&
          chinaInsetMapPaths.length ? (
            <div className={styles.geoMapChinaInset}>
              <svg
                className={styles.geoMapInsetMap}
                preserveAspectRatio='xMidYMid meet'
                viewBox={chinaInsetViewBox}
              >
                <rect
                  className={styles.geoMapInsetSea}
                  height={chinaInsetBounds.height}
                  width={chinaInsetBounds.width}
                  x={chinaInsetBounds.minX}
                  y={chinaInsetBounds.minY}
                />
                {chinaInsetMapPaths.map((mapPath, pathIndex) => (
                  <path
                    d={mapPath.path}
                    data-code={mapPath.code}
                    key={`inset-${mapPath.id}:${pathIndex}`}
                    pathLength={1}
                  >
                    <title>{mapPath.label}</title>
                  </path>
                ))}
              </svg>
            </div>
          ) : null}
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
