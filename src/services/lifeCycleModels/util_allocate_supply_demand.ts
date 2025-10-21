/**
 * zh-CN: 供需最大流分配器（Edmonds–Karp）。
 * 概览流程：
 *  1) 参数校验与默认容量：检查非负，计算 totalSupply/totalDemand，设置默认边容量 defaultEdgeCap；
 *  2) 构建容量图(buildCapacityGraph)：SOURCE→供给节点；需求节点→SINK；加入业务边与容量；
 *  3) 运行最大流(edmondsKarp)：BFS 增广，支持 prioritizeBalance 启发式（优先用尽小供给/补齐小需求，反向边靠后）；
 *  4) 汇总分配(summarizeFlow)：基于输入业务边生成 allocations、remaining_supply/demand、total_delivered；
 *  5) 返回结果：四元组 { allocations, remaining_supply, remaining_demand, total_delivered }。
 *
 * en-US: Supply-to-demand allocator via Edmonds–Karp.
 * Pipeline:
 *  1) Validate inputs and set defaultEdgeCap using max(totalSupply, totalDemand);
 *  2) Build capacity graph: SOURCE→supplies, demands→SINK, add business edges with capacities;
 *  3) Run max-flow (BFS augmenting paths) with optional prioritizeBalance heuristic;
 *  4) Summarize flow on business edges to allocations/remaining/total;
 *  5) Return { allocations, remaining_supply, remaining_demand, total_delivered }.
 *
 * 契约/Contract:
 * - 输入 Inputs: supplies/demands≥0; edges 为允许的供给→需求；edgeCapacities 以 edgeKey(u→v) 为键；
 * - 输出 Outputs: allocations 仅覆盖业务边；remaining_* 为逐节点；
 * - 复杂度 Complexity: Edmonds–Karp O(V·E²)；构建与汇总近线性；
 * - 注意 Notes: prioritizeBalance 仅影响等长路径选择顺序，不改变最大流最优性；edgeKey 使用箭头 `${u}→${v}`。
 * - 容差 Tolerance: 支持绝对容差 tolerance 与相对容差 relTolerance，共同形成 eps = max(tolerance, relTolerance * scale)，
 *   其中 scale 默认取 max(totalSupply, totalDemand)。若数量级很小，请将 tolerance/relTolerance 设置为更小以保留有效流量。
 */
export type Edge = [string, string];
export type Allocation = Record<string, Record<string, number>>;

type CapacityGraph = Record<string, Record<string, number>>;

const SOURCE = '__source__';
const SINK = '__sink__';
const ARROW = '\u2192';

function edgeKey(u: string, v: string): string {
  // use an arrow to avoid key collision with node names containing '-'
  return `${u}${ARROW}${v}`;
}

function uniqueEdgesPreserveOrder(edges: Iterable<Edge>): Edge[] {
  const seen = new Set<string>();
  const ordered: Edge[] = [];
  for (const [u, v] of edges) {
    const k = edgeKey(u, v);
    if (seen.has(k)) continue;
    seen.add(k);
    ordered.push([u, v]);
  }
  return ordered;
}

export type EdgeCapacities = Map<string, number> | Record<string, number>;

/**
 * getEdgeCapacity
 * zh-CN：读取边 (u→v) 的容量，未指定时返回 defaultCap；支持 Map/Record，键为 edgeKey(u→v)。
 * en-US: Read capacity of edge (u→v); fallback to defaultCap. Supports Map/Record keyed by edgeKey(u→v).
 */
function getEdgeCapacity(
  caps: EdgeCapacities | undefined,
  u: string,
  v: string,
  defaultCap: number,
): number {
  if (!caps) return defaultCap;
  const strKey = edgeKey(u, v);
  // Map<string, number> keyed by edgeKey(u→v)
  if (caps instanceof Map) {
    const val = caps.get(strKey);
    return typeof val === 'number' ? val : defaultCap;
  }
  // Record<string, number> keyed by edgeKey
  const val = (caps as Record<string, number>)[strKey];
  return typeof val === 'number' ? val : defaultCap;
}

/**
 * buildCapacityGraph
 * zh-CN：构建最大流容量图：SOURCE→供给；需求→SINK；加入业务边容量（默认= max(totalSupply,totalDemand)）。
 * en-US: Build capacity graph: SOURCE→supplies; demands→SINK; add business edges with default or custom capacities.
 */
function buildCapacityGraph(
  supplies: Record<string, number>,
  demands: Record<string, number>,
  edges: Iterable<Edge>,
  edgeCapacities?: EdgeCapacities,
  tolerance: number = 1e-9,
): { capacity: CapacityGraph; source: string; sink: string; edgeList: Edge[] } {
  // basic numeric validation
  if (Object.values(supplies).some((a) => !Number.isFinite(a) || a < 0)) {
    throw new Error('Supply amounts must be non-negative');
  }
  if (Object.values(demands).some((a) => !Number.isFinite(a) || a < 0)) {
    throw new Error('Demand amounts must be non-negative');
  }

  const totalSupply = Object.values(supplies).reduce((a, b) => a + b, 0);
  const totalDemand = Object.values(demands).reduce((a, b) => a + b, 0);
  let defaultEdgeCap = Math.max(totalSupply, totalDemand);

  const capacity: CapacityGraph = {};

  // source -> supply nodes
  capacity[SOURCE] = {};
  const sourceCaps = capacity[SOURCE];
  for (const [node, amount] of Object.entries(supplies)) {
    if (amount > tolerance) {
      sourceCaps[node] = amount;
    }
  }

  // demand nodes -> sink
  for (const [node, amount] of Object.entries(demands)) {
    if (amount > tolerance) {
      if (!capacity[node]) capacity[node] = {};
      capacity[node][SINK] = amount;
    }
  }

  if (totalSupply === 0 && totalDemand === 0) {
    defaultEdgeCap = 0;
  } else if (defaultEdgeCap === 0) {
    defaultEdgeCap = Math.max(totalSupply, totalDemand, 1);
  }

  const edgeList = uniqueEdgesPreserveOrder(edges);
  for (const [u, v] of edgeList) {
    const cap = getEdgeCapacity(edgeCapacities, u, v, defaultEdgeCap);
    if (cap <= tolerance) continue; // skip zero/near-zero capacity edges
    const row = (capacity[u] = capacity[u] || {});
    row[v] = cap;
  }

  return { capacity, source: SOURCE, sink: SINK, edgeList };
}

/**
 * summarizeFlow
 * zh-CN：将最大流结果转为 allocations（仅业务边）、remaining_* 与 total_delivered。
 * en-US: Convert raw max-flow into allocations (business edges only), remaining_* and total_delivered.
 */
function summarizeFlow(
  flow: CapacityGraph,
  supplies: Record<string, number>,
  demands: Record<string, number>,
  edgeList: Iterable<Edge>,
  tolerance: number = 1e-9,
): {
  allocations: Allocation;
  remaining_supply: Record<string, number>;
  remaining_demand: Record<string, number>;
  total_delivered: number;
} {
  const allocations: Allocation = {};
  const supplyUsed: Record<string, number> = Object.fromEntries(
    Object.keys(supplies).map((n) => [n, 0]),
  );
  const demandMet: Record<string, number> = Object.fromEntries(
    Object.keys(demands).map((n) => [n, 0]),
  );

  for (const [u, v] of edgeList) {
    const amount = flow[u]?.[v] ?? 0;
    if (amount > tolerance) {
      if (!allocations[u]) allocations[u] = {};
      allocations[u][v] = amount;
      if (u in supplyUsed) supplyUsed[u] += amount;
      if (v in demandMet) demandMet[v] += amount;
    }
  }

  const remaining_supply: Record<string, number> = {};
  for (const n of Object.keys(supplies)) {
    const rem = (supplies[n] ?? 0) - (supplyUsed[n] ?? 0);
    remaining_supply[n] = rem > tolerance ? rem : 0;
  }
  const remaining_demand: Record<string, number> = {};
  for (const n of Object.keys(demands)) {
    const rem = (demands[n] ?? 0) - (demandMet[n] ?? 0);
    remaining_demand[n] = rem > tolerance ? rem : 0;
  }
  const total_delivered = Object.values(demandMet).reduce((a, b) => a + b, 0);

  return { allocations, remaining_supply, remaining_demand, total_delivered };
}

/**
 * Classic Edmonds-Karp max-flow implementation.
 * zh-CN：可选 prioritizeBalance 启发式：优先用尽小供给/补齐小需求，反向边靠后；仅影响等长路径顺序。
 * en-US: Optional prioritizeBalance heuristic prefers smaller supplies/demands; reverse edges last; optimality unchanged.
 */
function edmondsKarp(
  capacity: CapacityGraph,
  source: string,
  sink: string,
  opts?: { prioritizeBalance?: boolean; tolerance?: number },
): { maxFlow: number; flow: CapacityGraph } {
  const residual: Record<string, Record<string, number>> = {};
  const neighbors: Record<string, Set<string>> = {};
  const initial: CapacityGraph = {};

  const ensureResidual = (u: string, v?: string) => {
    if (!residual[u]) residual[u] = {};
    if (v !== undefined && residual[u][v] === undefined) residual[u][v] = 0;
  };
  const ensureNeighbors = (n: string) => {
    if (!neighbors[n]) neighbors[n] = new Set<string>();
  };

  for (const [u, edges] of Object.entries(capacity)) {
    initial[u] = {};
    ensureResidual(u);
    ensureNeighbors(u);
    for (const [v, cap] of Object.entries(edges)) {
      if (cap < 0) throw new Error(`Negative capacity detected on edge ${u}->${v}`);
      ensureResidual(u, v);
      residual[u][v] += cap;
      ensureResidual(v);
      ensureResidual(v, u); // reverse edge exists in residual
      ensureNeighbors(v);
      neighbors[u].add(v);
      neighbors[v].add(u);
      initial[u][v] = cap;
    }
  }

  let maxFlow = 0;
  const eps = Number.isFinite(opts?.tolerance ?? NaN) ? Math.max(0, opts!.tolerance!) : 1e-9;
  const prioritizeBalance = opts?.prioritizeBalance === true;

  // 根据启发式为相邻节点排序：偏向用尽小供给/补齐小需求，反向边靠后。
  // Order with heuristic: prefer small remaining supply/demand; deprioritize reverse edges.
  const orderedNeighbors = (u: string): string[] => {
    const base = Array.from(neighbors[u]);
    if (!prioritizeBalance) return base;
    const score = (from: string, to: string): number => {
      const isForward = (initial[from] && initial[from][to] !== undefined) || false;
      // 将回退边放到最后，避免无必要的回流
      if (!isForward) return 1e6;
      // SOURCE -> 供给节点：优先用尽小供给（residual[SOURCE][u] 小优先）
      if (from === source && initial[from][to] !== undefined) {
        return residual[from]?.[to] ?? Number.POSITIVE_INFINITY;
      }
      // 供给 -> 需求：优先补齐小需求（residual[需求节点][SINK] 小优先）
      if (
        initial[from] &&
        initial[from][to] !== undefined &&
        initial[to] &&
        initial[to][sink] !== undefined
      ) {
        const remDemand = residual[to]?.[sink];
        return remDemand === undefined ? Number.POSITIVE_INFINITY : remDemand;
      }
      // 其他情况保持稳定顺序
      return 0;
    };
    return base.sort((a, b) => score(u, a) - score(u, b));
  };

  while (true) {
    const parent: Record<string, string | null | undefined> = { [source]: null };
    const queue: string[] = [source];

    while (queue.length > 0 && parent[sink] === undefined) {
      const u = queue.shift()!;
      const neighs = orderedNeighbors(u);
      for (const v of neighs) {
        if (parent[v] !== undefined) continue;
        if ((residual[u]?.[v] ?? 0) > eps) {
          parent[v] = u;
          queue.push(v);
        }
      }
    }

    if (parent[sink] === undefined) break;

    // find bottleneck
    let pathFlow = Number.POSITIVE_INFINITY;
    {
      let cur: string = sink;
      // parent[source] === null 是路径起点的哨兵
      while (parent[cur] !== null) {
        const prev = parent[cur];
        if (typeof prev !== 'string') break; // 保护：理论上不发生
        pathFlow = Math.min(pathFlow, residual[prev]?.[cur] ?? 0);
        cur = prev;
      }
    }

    // update residuals
    {
      let cur: string = sink;
      while (parent[cur] !== null) {
        const prev = parent[cur];
        if (typeof prev !== 'string') break;
        const fwd = (residual[prev][cur] ?? 0) - pathFlow;
        const rev = (residual[cur][prev] ?? 0) + pathFlow;
        // clamp tiny residuals to zero to reduce numerical noise
        residual[prev][cur] = fwd > eps ? fwd : 0;
        residual[cur][prev] = rev > eps ? rev : 0;
        neighbors[cur].add(prev);
        neighbors[prev].add(cur);
        cur = prev;
      }
    }

    maxFlow += pathFlow;
  }

  const flow: CapacityGraph = {};
  for (const [u, edges] of Object.entries(initial)) {
    flow[u] = {};
    for (const [v, cap] of Object.entries(edges)) {
      const used = cap - (residual[u]?.[v] ?? 0);
      if (used > eps) {
        flow[u][v] = used;
      }
    }
  }

  return { maxFlow, flow };
}

/**
 * allocateSupplyToDemand
 * zh-CN：在给定 supplies/demands/edges 下，使用最大流计算分配；可选 edgeCapacities、prioritizeBalance。
 * en-US: Compute allocation using max-flow over given supplies/demands/edges; optional edgeCapacities, prioritizeBalance.
 */
export function allocateSupplyToDemand(
  supplies: Record<string, number>,
  demands: Record<string, number>,
  edges: Iterable<Edge>,
  edgeCapacities?: EdgeCapacities,
  opts?: { prioritizeBalance?: boolean; tolerance?: number; relTolerance?: number },
): {
  allocations: Allocation;
  remaining_supply: Record<string, number>;
  remaining_demand: Record<string, number>;
  total_delivered: number;
} {
  const absTol = Number.isFinite(opts?.tolerance ?? NaN) ? Math.max(0, opts!.tolerance!) : 1e-9;
  const relTol = Number.isFinite(opts?.relTolerance ?? NaN) ? Math.max(0, opts!.relTolerance!) : 0;

  // Early return if trivial
  const totalSupply = Object.values(supplies).reduce((a, b) => a + b, 0);
  const totalDemand = Object.values(demands).reduce((a, b) => a + b, 0);
  const scale = Math.max(totalSupply, totalDemand, 0);
  const tolerance = Math.max(absTol, relTol * scale);

  if (totalSupply <= tolerance || totalDemand <= tolerance) {
    return {
      allocations: {},
      remaining_supply: { ...supplies },
      remaining_demand: { ...demands },
      total_delivered: 0,
    };
  }

  const { capacity, source, sink, edgeList } = buildCapacityGraph(
    supplies,
    demands,
    edges,
    edgeCapacities,
    tolerance,
  );

  const prioritizeBalance = opts?.prioritizeBalance === true;

  const { flow } = edmondsKarp(capacity, source, sink, { prioritizeBalance, tolerance });

  const { allocations, remaining_supply, remaining_demand, total_delivered } = summarizeFlow(
    flow,
    supplies,
    demands,
    edgeList,
    tolerance,
  );

  return {
    allocations,
    remaining_supply,
    remaining_demand,
    total_delivered,
  };
}
