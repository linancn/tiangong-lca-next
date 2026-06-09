import type {
  ProcessFlowGraphData,
  ProcessFlowGraphLayout,
  ProcessFlowGraphNode,
} from './graphTypes';

type LayoutPoint = {
  x: number;
  y: number;
  z: number;
};

type PositionedNode = {
  base: LayoutPoint;
  node: ProcessFlowGraphNode;
  normalized: {
    x: number;
    y: number;
  };
};

type ClusterLayout = {
  centroidX: number;
  centroidY: number;
  id: string;
  nodes: PositionedNode[];
  order: number;
};

type FillPoint = {
  order: number;
  x: number;
  y: number;
};

type LayoutBounds = {
  centerX: number;
  centerY: number;
  height: number;
  minX: number;
  minY: number;
  width: number;
};

export type CategorizedExpandedLayoutSummary = {
  centralFilledCellRatio: number;
  clusterCount: number;
  filledCellRatio: number;
  height: number;
  meanClusterDistance: number;
  width: number;
};

const hilbertBits = 10;
const hilbertGridSize = 1 << hilbertBits;
const superellipseExponent = 2.65;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function hashToUnit(value: string): number {
  return hashString(value) / 0xffffffff;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'zh-Hans-CN');
}

function getFallbackPoint(node: ProcessFlowGraphNode, index: number, total: number): LayoutPoint {
  const radius =
    Math.sqrt((index + 0.5) / Math.max(1, total)) * Math.max(160, Math.sqrt(total) * 9);
  const angle = index * Math.PI * (3 - Math.sqrt(5)) + hashToUnit(node.id) * Math.PI * 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    z: node.kind === 'process' ? 6 : 0,
  };
}

function radicalInverse(index: number, base: number): number {
  let value = 0;
  let fraction = 1 / base;
  let remainingIndex = index;

  while (remainingIndex > 0) {
    value += fraction * (remainingIndex % base);
    remainingIndex = Math.floor(remainingIndex / base);
    fraction /= base;
  }

  return value;
}

function rotateHilbertQuadrant(size: number, x: number, y: number, rx: number, ry: number) {
  if (ry !== 0) {
    return { x, y };
  }

  let nextX = x;
  let nextY = y;

  if (rx === 1) {
    nextX = size - 1 - nextX;
    nextY = size - 1 - nextY;
  }

  return {
    x: nextY,
    y: nextX,
  };
}

function getHilbertIndex(xValue: number, yValue: number): number {
  let x = clamp(Math.floor(xValue * hilbertGridSize), 0, hilbertGridSize - 1);
  let y = clamp(Math.floor(yValue * hilbertGridSize), 0, hilbertGridSize - 1);
  let index = 0;

  for (let size = hilbertGridSize / 2; size > 0; size /= 2) {
    const rx = (x & size) > 0 ? 1 : 0;
    const ry = (y & size) > 0 ? 1 : 0;
    index += size * size * ((3 * rx) ^ ry);

    const rotated = rotateHilbertQuadrant(size, x, y, rx, ry);
    x = rotated.x;
    y = rotated.y;
  }

  return index;
}

function getNormalizedHilbertIndex(x: number, y: number): number {
  return getHilbertIndex(clamp((x + 1) / 2, 0, 1), clamp((y + 1) / 2, 0, 1));
}

function getLayoutPoint(
  layout: ProcessFlowGraphLayout,
  node: ProcessFlowGraphNode,
  index: number,
  total: number,
): LayoutPoint {
  const point = layout[node.id];

  if (point && point.every(isFiniteNumber)) {
    return {
      x: point[0],
      y: point[1],
      z: point[2],
    };
  }

  return getFallbackPoint(node, index, total);
}

function getBounds(points: LayoutPoint[]): LayoutBounds {
  const bounds = points.reduce(
    (nextBounds, point) => ({
      maxX: Math.max(nextBounds.maxX, point.x),
      maxY: Math.max(nextBounds.maxY, point.y),
      minX: Math.min(nextBounds.minX, point.x),
      minY: Math.min(nextBounds.minY, point.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);

  return {
    centerX: bounds.minX + width / 2,
    centerY: bounds.minY + height / 2,
    height,
    minX: bounds.minX,
    minY: bounds.minY,
    width,
  };
}

function buildClusterLayouts(
  data: ProcessFlowGraphData,
  positionedNodes: PositionedNode[],
): ClusterLayout[] {
  const clusterOrder = new Map(data.clusters.map((cluster, index) => [cluster.id, index] as const));
  const clustersById = positionedNodes.reduce<Map<string, PositionedNode[]>>((clusters, node) => {
    const nodes = clusters.get(node.node.clusterId) ?? [];
    nodes.push(node);
    clusters.set(node.node.clusterId, nodes);
    return clusters;
  }, new Map<string, PositionedNode[]>());
  return Array.from(clustersById.entries())
    .map(([id, nodes]) => {
      const centroid = nodes.reduce(
        (nextCentroid, item) => ({
          x: nextCentroid.x + item.normalized.x,
          y: nextCentroid.y + item.normalized.y,
        }),
        { x: 0, y: 0 },
      );
      const centroidX = centroid.x / nodes.length;
      const centroidY = centroid.y / nodes.length;
      const fallbackOrder =
        ((clusterOrder.get(id) ?? clustersById.size) + hashToUnit(id) * 0.2) /
        Math.max(1, clustersById.size);
      const order = Number.isFinite(centroidX + centroidY)
        ? getNormalizedHilbertIndex(centroidX, centroidY)
        : fallbackOrder;

      return {
        centroidX,
        centroidY,
        id,
        nodes,
        order,
      };
    })
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      const leftOrder = clusterOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = clusterOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return compareText(left.id, right.id);
    });
}

function getSortedClusterNodes(cluster: ClusterLayout): PositionedNode[] {
  return [...cluster.nodes].sort((left, right) => {
    const degreeDelta = right.node.degree - left.node.degree;

    if (degreeDelta !== 0) {
      return degreeDelta;
    }

    if (left.node.kind !== right.node.kind) {
      return left.node.kind === 'process' ? -1 : 1;
    }

    return compareText(left.node.id, right.node.id);
  });
}

function isInsideFilledOutline(x: number, y: number): boolean {
  return (
    Math.pow(Math.abs(x), superellipseExponent) + Math.pow(Math.abs(y), superellipseExponent) <= 1
  );
}

function createFilledOutlinePoints(count: number): FillPoint[] {
  const points: FillPoint[] = [];
  let candidateIndex = 1;

  while (points.length < count) {
    const x = radicalInverse(candidateIndex, 2) * 2 - 1;
    const y = radicalInverse(candidateIndex, 3) * 2 - 1;
    candidateIndex += 1;

    if (!isInsideFilledOutline(x, y)) {
      continue;
    }

    points.push({
      order: getNormalizedHilbertIndex(x, y),
      x,
      y,
    });
  }

  return points.sort((left, right) => left.order - right.order);
}

function getDraftCategorizedPositions(clusters: ClusterLayout[]): Record<string, LayoutPoint> {
  const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0);
  const targetPoints = createFilledOutlinePoints(totalNodes);
  let offset = 0;

  return clusters.reduce<Record<string, LayoutPoint>>((layout, cluster) => {
    const nodes = getSortedClusterNodes(cluster);
    const clusterPoints = targetPoints.slice(offset, offset + nodes.length);
    offset += nodes.length;
    const center = clusterPoints.reduce(
      (nextCenter, point) => ({
        x: nextCenter.x + point.x,
        y: nextCenter.y + point.y,
      }),
      { x: 0, y: 0 },
    );
    center.x /= Math.max(1, clusterPoints.length);
    center.y /= Math.max(1, clusterPoints.length);
    const sortedClusterPoints = [...clusterPoints].sort((left, right) => {
      const leftDistance = Math.hypot(left.x - center.x, left.y - center.y);
      const rightDistance = Math.hypot(right.x - center.x, right.y - center.y);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.order - right.order;
    });

    nodes.forEach((item, index) => {
      const point = sortedClusterPoints[index] ?? clusterPoints[index] ?? { x: 0, y: 0 };
      const outlineBlend = 0.04;

      layout[item.node.id] = {
        x: point.x * (1 - outlineBlend) + item.normalized.x * outlineBlend,
        y: point.y * (1 - outlineBlend) + item.normalized.y * outlineBlend,
        z: item.base.z,
      };
    });

    return layout;
  }, {});
}

function normalizeDraftBounds(draftLayout: Record<string, LayoutPoint>) {
  const draftPoints = Object.values(draftLayout);
  const rawBounds = draftPoints.reduce(
    (nextBounds, point) => ({
      maxX: Math.max(nextBounds.maxX, point.x),
      maxY: Math.max(nextBounds.maxY, point.y),
      minX: Math.min(nextBounds.minX, point.x),
      minY: Math.min(nextBounds.minY, point.y),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    },
  );
  const width = Math.max(0.001, rawBounds.maxX - rawBounds.minX);
  const height = Math.max(0.001, rawBounds.maxY - rawBounds.minY);
  const centerX = rawBounds.minX + width / 2;
  const centerY = rawBounds.minY + height / 2;
  const scaleX = Math.min(3.2, 1.86 / width);
  const scaleY = Math.min(3.2, 1.7 / height);

  return Object.fromEntries(
    Object.entries(draftLayout).map(([nodeId, point]) => [
      nodeId,
      {
        x: (point.x - centerX) * scaleX,
        y: (point.y - centerY) * scaleY,
        z: point.z,
      },
    ]),
  );
}

export function buildCategorizedExpandedLayout(data: ProcessFlowGraphData): ProcessFlowGraphLayout {
  if (!data.nodes.length) {
    return {};
  }

  const baseLayout = data.layouts.expanded2d;
  const totalNodes = data.nodes.length;
  const basePoints = data.nodes.map((node, index) =>
    getLayoutPoint(baseLayout, node, index, totalNodes),
  );
  const bounds = getBounds(basePoints);
  const positionedNodes = data.nodes.map<PositionedNode>((node, index) => {
    const base = basePoints[index];

    return {
      base,
      node,
      normalized: {
        x: ((base.x - bounds.centerX) / bounds.width) * 2,
        y: ((base.y - bounds.centerY) / bounds.height) * 2,
      },
    };
  });

  const clusters = buildClusterLayouts(data, positionedNodes);
  const draftLayout = normalizeDraftBounds(getDraftCategorizedPositions(clusters));

  return data.nodes.reduce<ProcessFlowGraphLayout>((layout, node) => {
    const draft = draftLayout[node.id];
    const base = getLayoutPoint(baseLayout, node, data.indexes.nodeById[node.id] ?? 0, totalNodes);

    layout[node.id] = [
      bounds.centerX + (draft?.x ?? 0) * (bounds.width / 2),
      bounds.centerY + (draft?.y ?? 0) * (bounds.height / 2),
      draft?.z ?? base.z,
    ];
    return layout;
  }, {});
}

function summarizeFilledCellRatio(points: LayoutPoint[], bounds: LayoutBounds) {
  const gridSize = 18;
  const occupiedCells = new Set<string>();

  points.forEach((point) => {
    const x = clamp(
      Math.floor(((point.x - bounds.minX) / bounds.width) * gridSize),
      0,
      gridSize - 1,
    );
    const y = clamp(
      Math.floor(((point.y - bounds.minY) / bounds.height) * gridSize),
      0,
      gridSize - 1,
    );
    occupiedCells.add(`${x}:${y}`);
  });

  let filledCells = 0;
  let eligibleCells = 0;
  let centralFilledCells = 0;
  let centralEligibleCells = 0;

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      const x = ((column + 0.5) / gridSize) * 2 - 1;
      const y = ((row + 0.5) / gridSize) * 2 - 1;
      const isEligible = isInsideFilledOutline(x / 0.94, y / 0.94);
      const isCentral = Math.abs(x) <= 0.42 && Math.abs(y) <= 0.42;

      if (!isEligible) {
        continue;
      }

      eligibleCells += 1;
      if (occupiedCells.has(`${column}:${row}`)) {
        filledCells += 1;
      }

      if (isCentral) {
        centralEligibleCells += 1;
        if (occupiedCells.has(`${column}:${row}`)) {
          centralFilledCells += 1;
        }
      }
    }
  }

  return {
    centralFilledCellRatio: centralFilledCells / Math.max(1, centralEligibleCells),
    filledCellRatio: filledCells / Math.max(1, eligibleCells),
  };
}

export function summarizeCategorizedExpandedLayout(
  data: ProcessFlowGraphData,
  layout: ProcessFlowGraphLayout,
): CategorizedExpandedLayoutSummary {
  const points = data.nodes.map((node, index) =>
    getLayoutPoint(layout, node, index, data.nodes.length),
  );
  const bounds = getBounds(points);
  const clusterCentroids = data.nodes.reduce<
    Record<string, { count: number; x: number; y: number }>
  >((centroids, node, index) => {
    const point = points[index];
    const centroid = centroids[node.clusterId] ?? { count: 0, x: 0, y: 0 };
    centroid.count += 1;
    centroid.x += point.x;
    centroid.y += point.y;
    centroids[node.clusterId] = centroid;
    return centroids;
  }, {});
  Object.values(clusterCentroids).forEach((centroid) => {
    centroid.x /= centroid.count;
    centroid.y /= centroid.count;
  });
  const meanClusterDistance =
    data.nodes.reduce((totalDistance, node, index) => {
      const point = points[index];
      const centroid = clusterCentroids[node.clusterId];
      return totalDistance + Math.hypot(point.x - centroid.x, point.y - centroid.y);
    }, 0) / Math.max(1, data.nodes.length);
  const filledCellSummary = summarizeFilledCellRatio(points, bounds);

  return {
    centralFilledCellRatio: filledCellSummary.centralFilledCellRatio,
    clusterCount: Object.keys(clusterCentroids).length,
    filledCellRatio: filledCellSummary.filledCellRatio,
    height: bounds.height,
    meanClusterDistance,
    width: bounds.width,
  };
}
