import BigNumber from 'bignumber.js';
import { v4 } from 'uuid';
import {
  comparePercentDesc,
  jsonToList,
  listToJson,
  mergeLangArrays,
  percentStringToNumber,
  removeEmptyObjects,
  toAmountNumber,
} from '../general/util';
import LCIAResultCalculation from '../lciaMethods/util';
import { supabase } from '../supabase';
import { Up2DownEdge } from './data';

/**
 * zh-CN: 交换方向常量，仅允许 'INPUT' | 'OUTPUT'。
 * - 与数据集字段 exchangeDirection 保持一致的取值范围与语义。
 *
 * en-US: Exchange direction constants, restricted to 'INPUT' | 'OUTPUT'.
 * - Aligned with the dataset field exchangeDirection in both domain and semantics.
 */
type Direction = 'INPUT' | 'OUTPUT';

/**
 * zh-CN: 数据库进程在内存中的标准化结构，供建图、索引与快速匹配使用。
 * - id/version: 唯一标识该数据库进程。
 * - exchanges: 该进程的交换项列表（已通过 jsonToList 展平）。
 * - refExchangeMap: 参考交换的快速访问信息（包含 exchangeId、flowId、方向与原始交换对象）。
 * - exIndex: 按方向与 flowId 建立的 O(1) 交换索引，便于缩放系数与连边时的快速匹配。
 *
 * en-US: Normalized in-memory shape for a database process used for graph building and lookups.
 * - id/version: uniquely identify the DB process.
 * - exchanges: flattened list of exchanges (via jsonToList).
 * - refExchangeMap: quick access to the quantitative reference exchange (exchangeId, flowId, direction, raw object).
 * - exIndex: O(1) exchange indices keyed by direction and flowId for fast matching during scaling/edge operations.
 *
 * 注意 / Notes:
 * - exIndex 为可选：通常在构建 dbProcessMap 时填充；某些最小数据或测试场景下可能不存在。
 * - Direction 仅允许 'INPUT' | 'OUTPUT'，与数据集中 exchangeDirection 的语义一致。
 */
interface DbProcessMapValue {
  /** 进程 ID / Process ID */
  id: string;
  /** 进程版本 / Process version */
  version: string;
  /** 交换项列表（展平）/ Flattened exchanges list */
  exchanges: any[];
  /** 参考交换信息（定量参考）/ Quantitative reference exchange info */
  refExchangeMap: {
    /** 参考交换在进程内的 ID / Reference exchange internal id */
    exchangeId: string;
    /** 参考交换对应的流 ID / Flow id of the reference exchange */
    flowId: string;
    /** 参考交换方向（INPUT/OUTPUT）/ Direction of the reference exchange */
    direction: Direction;
    /** 原始参考交换对象 / Raw reference exchange object */
    refExchange: any;
  };
  /**
   * 交换索引（按方向与 flowId）/ Exchange indices by direction and flowId
   * - inputByFlowId: INPUT 方向的 flowId -> exchange
   * - outputByFlowId: OUTPUT 方向的 flowId -> exchange
   */
  exIndex?: {
    inputByFlowId: Map<string, any>;
    outputByFlowId: Map<string, any>;
  };
}

/**
 * zh-CN: 构造数据库进程的 Map 键，格式为 `${id}@${version}`，用于快速查找与去重。
 * - 当 id 或 version 缺失时以空串占位，保证始终返回稳定字符串键。
 *
 * en-US: Build a stable map key for DB processes in the form `${id}@${version}`
 * for fast lookup and de-duplication.
 * - Falls back to empty string for missing id/version to ensure a consistent key.
 *
 * 参数 / Params:
 * - id?: string 进程 ID（通常为 referenceToProcess['@refObjectId']）。
 * - version?: string 进程版本（通常为 referenceToProcess['@version']）。
 *
 * 返回 / Returns:
 * - string 形如 `123@01.00.000` 的键；若二者皆空则为 `@`。
 *
 * 注意 / Notes:
 * - 若出现 id/version 为空的条目，多条记录可能映射到相同键 `@`，请确保上游数据完整或在调用处防止冲突。
 * - 本键格式在 buildEdgesAndIndices/calculateScalingFactor 等逻辑中保持一致性。
 */
const dbProcessKey = (id?: string, version?: string) => `${id ?? ''}@${version ?? ''}`;

/**
 * zh-CN: 在给定的数据库交换列表中，按方向与允许的 flow 集合筛选，选出分配比例(allocatedFraction)最大的 flowId。
 * - 单次线性扫描；比较时依赖 comparePercentDesc 处理百分数字符串（如 '50 %'、'0.5' 等）。
 * - 若没有匹配项或入参为空，返回空字符串。
 *
 * en-US: Among DB exchanges, filter by direction and allowed flow set, then pick the
 * flowId with the maximum allocatedFraction. Single pass using comparePercentDesc
 * to compare percent-like strings. Returns empty string when nothing matches.
 *
 * 参数 / Params:
 * - dbExchanges: any[] | undefined 进程的交换列表（通常来自 dbProcess.exchanges）。
 * - direction: Direction 方向过滤（'INPUT' | 'OUTPUT'）。
 * - allowedFlowIds: Set<string> 允许参与比较的 flowId 集合（用于与模型边/输出重叠）。
 *
 * 返回 / Returns:
 * - string 匹配到的最大分配比例对应的 flowId；若无则为 ''。
 *
 * 复杂度 / Complexity:
 * - O(N)，N 为 dbExchanges 的长度。
 *
 * 注意 / Notes:
 * - 当 comparePercentDesc 抛出异常时，采用保守策略：保持当前最佳值不变。
 * - 若出现并列（比较结果为 0），将保留先出现的项作为最佳（稳定性依赖输入顺序）。
 */
const selectMaxAllocatedFlowId = (
  dbExchanges: any[] | undefined,
  direction: Direction,
  allowedFlowIds: Set<string>,
): string => {
  if (!dbExchanges || dbExchanges.length === 0 || allowedFlowIds.size === 0) return '';
  let bestFlowId = '';
  let bestAF: any = undefined;
  for (const e of dbExchanges) {
    const dir = String(e?.exchangeDirection ?? '').toUpperCase();
    if (dir !== direction) continue;
    const flowId = e?.referenceToFlowDataSet?.['@refObjectId'];
    if (!flowId || !allowedFlowIds.has(flowId)) continue;
    const af = e?.allocations?.allocation?.['@allocatedFraction'];
    if (bestAF === undefined) {
      bestAF = af;
      bestFlowId = flowId;
      continue;
    }
    // comparePercentDesc sorts in descending order; if a should come before b, it returns < 0
    // So when comparePercentDesc(af, bestAF) < 0, af is larger than bestAF.
    try {
      if (comparePercentDesc(af, bestAF) < 0) {
        bestAF = af;
        bestFlowId = flowId;
      }
    } catch {
      // Fallback: keep current best on comparator issues
    }
  }
  return bestFlowId;
};

/**
 * zh-CN: 选择节点的“主输入流” flowUUID。
 * 规则：
 *  - 若无入边，返回空串 ''；若仅有一条入边，直接返回该边的 flowUUID。
 *  - 若存在多条入边且数据库参考交换(refExchange)方向为 INPUT，优先选择与参考流匹配的入边。
 *  - 否则，在数据库交换中按 INPUT 方向筛选出与当前入边集合重叠的 flowId，
 *    使用分配比例(allocatedFraction)最大者作为主输入流（调用 selectMaxAllocatedFlowId）。
 *
 * en-US: Pick the node's main INPUT flowUUID.
 * Rules:
 *  - If no incoming edges, return ''. If exactly one, return its flowUUID.
 *  - If multiple and DB ref exchange direction is INPUT, prefer the edge matching the ref flow.
 *  - Otherwise, among DB exchanges with INPUT direction, intersect with incoming edges' flowIds
 *    and choose the one with the maximum allocatedFraction (via selectMaxAllocatedFlowId).
 *
 * 参数 / Params:
 * - inputEdges: Up2DownEdge[] 该节点的入边列表（edgesByDownstream[nodeId]）。
 * - dbProccess: DbProcessMapValue | undefined 对应的数据库进程信息（可选）。
 *
 * 返回 / Returns:
 * - string 主输入流的 flowUUID；若无法判定则返回 ''。
 *
 * 复杂度 / Complexity:
 * - O(E + D)，E 为入边数量（收集 flowUUID），D 为遍历 DB 交换的线性扫描。
 *
 * 注意 / Notes:
 * - 当 dbProccess 或其 exchanges 缺失时，仅能命中“0/1 条入边”的快捷分支，否则回退为 ''。
 * - 若出现分配比例并列，将保留先出现的交换（稳定性依赖输入顺序）。
 */
const getMainInputFlowUUID = (
  inputEdges: Up2DownEdge[],
  dbProccess: DbProcessMapValue | undefined,
): string => {
  if (!inputEdges || inputEdges.length === 0) return '';
  if (inputEdges.length === 1) return inputEdges[0]?.flowUUID ?? '';

  const refExchange = dbProccess?.refExchangeMap;
  if (refExchange && refExchange.direction === 'INPUT') {
    const refEdge = inputEdges.find((ie) => ie.flowUUID === refExchange.flowId);
    if (refEdge) return refEdge.flowUUID ?? '';
  }

  const inputEdgeFlowIdSet = new Set(inputEdges.map((ie) => ie?.flowUUID ?? '').filter(Boolean));
  const best = selectMaxAllocatedFlowId(dbProccess?.exchanges ?? [], 'INPUT', inputEdgeFlowIdSet);
  return best ?? '';
};

/**
 * zh-CN: 为模型进程的输出交换选择“主输出流”的 flowUUID。
 * 规则：
 *  - 若无输出交换，返回空串 ''；若仅有一个输出交换，直接返回其 '@flowUUID'。
 *  - 若存在多个输出且数据库参考交换方向为 OUTPUT，且参考流出现在模型输出中，则优先返回参考流。
 *  - 否则，在数据库交换中按 OUTPUT 方向筛选出与模型输出集合重叠的 flowId，
 *    使用分配比例(allocatedFraction)最大者作为主输出流（调用 selectMaxAllocatedFlowId）。
 *
 * en-US: Choose the modeled process's main OUTPUT flowUUID.
 * Rules:
 *  - If no outputs, return ''. If exactly one, return its '@flowUUID'.
 *  - If multiple and DB ref exchange direction is OUTPUT and appears among modeled outputs,
 *    prefer the reference flow.
 *  - Otherwise, among DB exchanges with OUTPUT direction, intersect with the modeled outputs' flowIds
 *    and pick the one with the maximum allocatedFraction (via selectMaxAllocatedFlowId).
 *
 * 参数 / Params:
 * - mdProcessOutputExchanges: any[] 模型进程的输出交换列表（connections.outputExchange 展平后的条目）。
 * - dbProccess: DbProcessMapValue | undefined 对应数据库进程信息（可选）。
 *
 * 返回 / Returns:
 * - string 主输出流的 flowUUID；若无法判定则返回 ''。
 *
 * 复杂度 / Complexity:
 * - O(E + D)，E 为输出交换数量（收集 flowUUID），D 为遍历 DB 交换的线性扫描。
 *
 * 注意 / Notes:
 * - 当 dbProccess 或其 exchanges 缺失时，将跳过分配比例回退，直接依据“0/1 条输出”的分支或返回 ''。
 * - 分配比例并列时，保留先出现的交换（与 selectMaxAllocatedFlowId 行为一致）。
 */
const getMainOutputFlowUUID = (
  mdProcessOutputExchanges: any[],
  dbProccess: DbProcessMapValue | undefined,
): string => {
  if (!mdProcessOutputExchanges || mdProcessOutputExchanges.length === 0) return '';
  if (mdProcessOutputExchanges.length === 1) {
    return mdProcessOutputExchanges[0]?.['@flowUUID'] ?? '';
  }
  const refExchange = dbProccess?.refExchangeMap;
  if (refExchange && refExchange.direction === 'OUTPUT') {
    // Prefer reference flow if it appears among mdProcess outputs
    const ref = mdProcessOutputExchanges.find((o: any) => o?.['@flowUUID'] === refExchange.flowId);
    if (ref) return ref?.['@flowUUID'] ?? '';
  }

  // Fallback: choose max allocated fraction among overlaps
  const mdOutFlowIdSet = new Set(
    mdProcessOutputExchanges.map((o: any) => o?.['@flowUUID'] ?? '').filter(Boolean),
  );
  return selectMaxAllocatedFlowId(dbProccess?.exchanges ?? [], 'OUTPUT', mdOutFlowIdSet);
};

/**
 * zh-CN: 基于模型进程列表构建工艺网络的边与邻接索引，并为每个节点确定“主输出流”和“主输入流”。
 *  - 第一步：遍历每个模型进程的输出交换（connections.outputExchange），根据数据库进程信息
 *    使用 getMainOutputFlowUUID 选出该上游节点的主输出流，将所有输出连到的下游实例构造成 Up2DownEdge，
 *    同时填充 mainOutputFlowUUID，并建立两类索引：
 *      • edgesByDownstream[downstreamId] -> 以该节点为下游的入边列表
 *      • edgesByUpstream[upstreamId]   -> 以该节点为上游的出边列表
 *  - 第二步：按节点收集其输入边，使用 getMainInputFlowUUID 结合数据库交换，选出该节点主输入流，
 *    将 mainInputFlowUUID 写回该节点的所有输入边。
 *
 * en-US: Build the edge list and adjacency indices of the modeled network and determine
 * the main output/input flow per node.
 *  - Step 1: For each model process, iterate its output exchanges, choose main output flow
 *    via getMainOutputFlowUUID using DB process info, create Up2DownEdge objects towards
 *    each referenced downstream process, set mainOutputFlowUUID, and populate indices:
 *      • edgesByDownstream[downstreamId] -> incoming edges of the node
 *      • edgesByUpstream[upstreamId]     -> outgoing edges of the node
 *  - Step 2: For each node, inspect its input edges and pick main input flow using
 *    getMainInputFlowUUID with DB exchanges, then write mainInputFlowUUID back to all
 *    its input edges.
 *
 * 参数 / Params:
 * - mdProcesses: any[]
 *     模型中的 processInstance 列表。
 *     List of modeled process instances.
 * - dbProcessMap: Map<string, DbProcessMapValue>
 *     键为 `${id}@${version}` 的数据库进程映射，包含 exchanges 和 refExchangeMap。
 *     Database process map keyed by `${id}@${version}`, providing exchanges and refExchangeMap.
 *
 * 返回 / Returns:
 * - up2DownEdges: Up2DownEdge[]
 *     全量边集合（包含 flowUUID、upstreamId、downstreamId、mainOutputFlowUUID、mainInputFlowUUID）。
 * - edgesByDownstream: Map<string, Up2DownEdge[]>
 *     以下游节点分组的入边索引。
 * - edgesByUpstream: Map<string, Up2DownEdge[]>
 *     以上游节点分组的出边索引。
 *
 * 前置条件 / Preconditions:
 * - dbProcessMap 覆盖了 mdProcesses 中引用到的数据库进程（用于主流判定）。
 * - mdProcesses.connections.outputExchange 结构符合预期（通过 jsonToList 安全展开）。
 *
 * 复杂度 / Complexity:
 * - 约 O(E + R)，其中 E 为输出交换条目总数，R 为下游引用总数；随后为每节点选主输入流的扫描为 O(V + inDegree)。
 *   Overall about O(E + R + V + inDegree).
 *
 * 副作用 / Side effects:
 * - 函数内部创建的 Up2DownEdge 对象会被索引引用；在确定主输入流后，会原地修改这些边的 mainInputFlowUUID 字段。
 */
function buildEdgesAndIndices(
  mdProcesses: any[],
  dbProcessMap: Map<string, DbProcessMapValue>,
): {
  up2DownEdges: Up2DownEdge[];
  edgesByDownstreamInput: Map<string, Up2DownEdge[]>;
  edgesByUpstreamOutput: Map<string, Up2DownEdge[]>;
} {
  const up2DownEdges: Up2DownEdge[] = [];
  const edgesByDownstreamInput = new Map<string, Up2DownEdge[]>();
  const edgesByUpstreamOutput = new Map<string, Up2DownEdge[]>();

  // 1) Build edges from model processes' output exchanges and index them
  for (const mdProcess of mdProcesses as any[]) {
    const mdProcessOutputExchanges = jsonToList(mdProcess?.connections?.outputExchange);
    const dbKey = dbProcessKey(
      mdProcess?.['referenceToProcess']?.['@refObjectId'],
      mdProcess?.['referenceToProcess']?.['@version'],
    );
    const mainOutputFlowUUID = getMainOutputFlowUUID(
      mdProcessOutputExchanges,
      dbProcessMap.get(dbKey),
    );

    for (const o of mdProcessOutputExchanges) {
      const downstreamList = jsonToList(o?.downstreamProcess);
      for (const dp of downstreamList) {
        const nowUp2DownEdge: Up2DownEdge = {
          id: `${mdProcess?.['@dataSetInternalID']}->${dp?.['@id']}:${o?.['@flowUUID']}`,
          flowUUID: o?.['@flowUUID'],
          upstreamId: mdProcess?.['@dataSetInternalID'],
          downstreamId: dp?.['@id'],
          mainOutputFlowUUID: mainOutputFlowUUID,
          mainInputFlowUUID: '',
        };
        up2DownEdges.push(nowUp2DownEdge);

        if (!edgesByDownstreamInput.has(nowUp2DownEdge.downstreamId)) {
          edgesByDownstreamInput.set(nowUp2DownEdge.downstreamId, []);
        }
        edgesByDownstreamInput.get(nowUp2DownEdge.downstreamId)!.push(nowUp2DownEdge);

        if (!edgesByUpstreamOutput.has(nowUp2DownEdge.upstreamId)) {
          edgesByUpstreamOutput.set(nowUp2DownEdge.upstreamId, []);
        }
        edgesByUpstreamOutput.get(nowUp2DownEdge.upstreamId)!.push(nowUp2DownEdge);
      }
    }
  }

  // 2) For each node, derive main input flow and write back to its input edges
  for (const mdProcess of mdProcesses as any[]) {
    const mdNodeId = mdProcess?.['@dataSetInternalID'];
    const inputEdges = edgesByDownstreamInput.get(mdNodeId) ?? [];

    if (inputEdges.length > 0) {
      const key = dbProcessKey(
        mdProcess?.['referenceToProcess']?.['@refObjectId'],
        mdProcess?.['referenceToProcess']?.['@version'],
      );
      const mainInputFlowUUID = getMainInputFlowUUID(inputEdges, dbProcessMap.get(key));
      for (const ie of inputEdges) {
        ie.mainInputFlowUUID = mainInputFlowUUID;
      }
    }
  }

  return { up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput };
}

/**
 * zh-CN: 从参考节点开始，交替按 OUTPUT/INPUT 方向在图上层层推进，对可达的边打上依赖标记：
 *   - downstream：下游依赖（当前节点从上游获取供给）
 *   - upstream：上游依赖（当前节点向下游提供产品）
 *   在每一阶段对“被触达”的节点做去重：仅保留该节点的主流（mainOutputFlowUUID 或 mainInputFlowUUID）对应的边，
 *   其余同节点同方向的边标记为 none，并记录 mainDependence 以便后续缩放系数计算。
 *   本方法原地修改传入的 up2DownEdges（写入 dependence/mainDependence），不会修改索引 Map。
 *
 * en-US: Starting from the reference node, alternates OUTPUT/INPUT expansion over the graph
 *   and marks each reachable edge with a dependence label:
 *   - downstream: current node depends on its upstream (supplier)
 *   - upstream: current node is depended upon by downstream (customer)
 *   During each phase, it de-duplicates only the nodes touched in that phase: keep the edge
 *   matching the node's main flow (mainOutputFlowUUID or mainInputFlowUUID) and mark others
 *   as none while recording mainDependence. The function mutates the provided up2DownEdges
 *   in place; adjacency indices (edgesByDownstream/edgesByUpstream) are read-only.
 *
 * 参数 / Parameters:
 * - up2DownEdges: Up2DownEdge[]
 *     所有边的列表。函数会在其中写入 dependence 与 mainDependence。
 *     List of all edges. This function writes dependence and mainDependence into items.
 * - edgesByDownstream: Map<string, Up2DownEdge[]>
 *     下游节点 -> 相连边 的索引（用于 OUTPUT 扩张）。
 *     Index from downstream node id to incident edges (used for OUTPUT expansion).
 * - edgesByUpstream: Map<string, Up2DownEdge[]>
 *     上游节点 -> 相连边 的索引（用于 INPUT 扩张）。
 *     Index from upstream node id to incident edges (used for INPUT expansion).
 * - refProcessNodeId: string
 *     参考起点节点 ID。Reference node id to start the alternating BFS.
 *
 * 前置条件 / Preconditions:
 * - up2DownEdges 中的 mainOutputFlowUUID/mainInputFlowUUID 已根据各节点主流设置好。
 * - edgesByDownstream/edgesByUpstream 与 up2DownEdges 一致且覆盖同一批边。
 *
 * 副作用 / Side effects:
 * - 原地修改边对象的 dependence、mainDependence 字段。
 *   Mutates edge objects in place (dependence, mainDependence).
 *
 * 复杂度 / Complexity:
 * - 近似 O(E + V + D)，其中 D 为去重阶段触达节点的相邻边总数；相比每轮全量扫描更高效。
 *   Approximately O(E + V + D), where D is the number of incident edges of touched nodes
 *   during de-dup phases; more efficient than scanning the whole edge set each round.
 */
function assignEdgeDependence(
  up2DownEdges: Up2DownEdge[],
  edgesByDownstream: Map<string, Up2DownEdge[]>,
  edgesByUpstream: Map<string, Up2DownEdge[]>,
  refProcessNodeId: string,
): void {
  // Use a set frontier and incremental bookkeeping to reduce repeated full scans
  let frontier = new Set<string>([refProcessNodeId]);
  let direction: Direction = 'OUTPUT';
  const totalEdges = up2DownEdges.length;
  let assignedCount = 0;

  while (frontier.size > 0 && assignedCount < totalEdges) {
    const touchedUpNodes = new Set<string>();
    const touchedDownNodes = new Set<string>();

    // 1) Expand fully in current direction, marking newly discovered edges
    let current = frontier;
    while (current.size > 0) {
      const next = new Set<string>();
      if (direction === 'OUTPUT') {
        for (const nodeId of current) {
          const uds = edgesByDownstream.get(nodeId) ?? [];
          for (const ud of uds) {
            if (ud?.dependence !== undefined) continue;
            ud.dependence = 'downstream';
            assignedCount++;
            touchedUpNodes.add(ud.upstreamId);
            next.add(ud.upstreamId);
          }
        }
      } else {
        for (const nodeId of current) {
          const uds = edgesByUpstream.get(nodeId) ?? [];
          for (const ud of uds) {
            if (ud?.dependence !== undefined) continue;
            ud.dependence = 'upstream';
            assignedCount++;
            touchedDownNodes.add(ud.downstreamId);
            next.add(ud.downstreamId);
          }
        }
      }
      current = next;
    }

    // 2) Deduplicate only for nodes that got new edges this phase
    if (direction === 'OUTPUT') {
      for (const upId of touchedUpNodes) {
        const uds = edgesByUpstream.get(upId) ?? [];
        let count = 0;
        for (const ud of uds) if (ud.dependence === 'downstream') count++;
        if (count > 1) {
          for (const ud of uds) {
            if (ud.dependence === 'downstream' && ud.flowUUID !== ud.mainOutputFlowUUID) {
              ud.dependence = 'none';
              ud.mainDependence = 'downstream';
            }
          }
        }
      }
    } else {
      for (const downId of touchedDownNodes) {
        const uds = edgesByDownstream.get(downId) ?? [];
        let count = 0;
        for (const ud of uds) if (ud.dependence === 'upstream') count++;
        if (count > 1) {
          for (const ud of uds) {
            if (ud.dependence === 'upstream' && ud.flowUUID !== ud.mainInputFlowUUID) {
              ud.dependence = 'none';
              ud.mainDependence = 'upstream';
            }
          }
        }
      }
    }

    // 3) Build next frontier only from touched nodes, looking for edges still undefined
    const nextFrontier = new Set<string>();
    if (direction === 'OUTPUT') {
      for (const upId of touchedUpNodes) {
        const uds = edgesByUpstream.get(upId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence === undefined) nextFrontier.add(ud.upstreamId);
        }
      }
      direction = 'INPUT';
    } else {
      for (const downId of touchedDownNodes) {
        const uds = edgesByDownstream.get(downId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence === undefined) nextFrontier.add(ud.downstreamId);
        }
      }
      direction = 'OUTPUT';
    }

    frontier = nextFrontier;
  }
}

/**
 * zh-CN: 计算下一层缩放系数：next = targetAmount * curSF / baseAmount。
 * - 使用 BigNumber 避免浮点误差；保留防御性回退：当 baseAmount 为 0，或 targetAmount/curSF 任一为 0 时返回 1。
 * - 返回 number 以兼容现有调用方。
 *
 * 参数 / Params:
 * - targetAmount: number 作为分子（当前节点对应方向的目标量）。
 * - baseAmount: number 作为分母（相邻节点对应方向的基准量）。
 * - curSF: number 当前节点的缩放系数，将沿边传播。
 *
 * 返回 / Returns:
 * - number 下一节点（相邻进程）的缩放系数。
 *
 * en-US: Compute next scaling factor: next = targetAmount * curSF / baseAmount.
 * - Uses BigNumber to reduce floating-point errors; defensive fallback returns 1 when
 *   baseAmount is 0 or either targetAmount/curSF is 0.
 * - Returns a number for backward compatibility with existing callers.
 */
const nextScaling = (
  targetAmount: number,
  baseAmount: number,
  curSF: number,
): {
  exchangeAmount: number;
  nextScalingFactor: number;
} => {
  if (!baseAmount) return { exchangeAmount: 0, nextScalingFactor: 0 };
  if (!targetAmount || !curSF) return { exchangeAmount: 0, nextScalingFactor: 0 };
  const exchangeAmount = new BigNumber(targetAmount).times(curSF);
  return {
    exchangeAmount: exchangeAmount.toNumber(),
    nextScalingFactor: exchangeAmount.div(baseAmount).toNumber(),
  };
};

/**
 * zh-CN: 以当前节点为起点，沿着标注有依赖方向的边（downstream/upstream）在图上双向扩展，
 *  - 通过共享的 flowUUID 在数据库交换中进行 O(1) 匹配，计算相邻进程的缩放系数并逐步传播；
 *  - 使用显式栈避免递归，按边方向分别处理「供应商」(downstream，沿入边找上游) 与「客户」（upstream，沿出边找下游）。
 *
 * en-US: Starting from the given node, walk both directions along dependence-marked edges
 *  (downstream/upstream). For each adjacent process, match the shared flowUUID in DB exchanges
 *  in O(1) and propagate scaling factors using a non-recursive, stack-based traversal.
 *
 * 参数 / Params:
 * - currentModelProcess: any
 *     当前模型进程实例（包含 '@dataSetInternalID' 与 referenceToProcess）。
 * - currentDatabaseProcess: DbProcessMapValue
 *     与当前模型进程对应的数据库进程，包含 exchanges、refExchangeMap 与 exIndex（按方向/flowId 的快速索引）。
 * - dependence: any
 *     进入当前节点的依赖信息 { direction, nodeId, flowUUID }；作为根时可为空字段。
 * - scalingFactor: number
 *     当前节点的缩放系数（根节点通常由目标量/参考量得到）。
 * - edgesByDownstream: Map<string, Up2DownEdge[]>
 *     以 downstreamId 分组的入边索引，用于在 downstream 阶段查找上游。
 * - edgesByUpstream: Map<string, Up2DownEdge[]>
 *     以 upstreamId 分组的出边索引，用于在 upstream 阶段查找下游。
 * - mdProcessMap: Map<string, any>
 *     模型进程映射：nodeId -> 进程实例。
 * - dbProcessMap: Map<string, DbProcessMapValue>
 *     数据库进程映射：`${id}@${version}` -> 进程数据（含交换索引）。
 *
 * 返回 / Returns:
 * - collectedProcesses: Array<{
 *     nodeId: string;
 *     dependence: { direction?: string; nodeId?: string; flowUUID?: string };
 *     processId: string;
 *     processVersion: string;
 *     quantitativeReferenceFlowIndex: string;
 *     scalingFactor: number;
 *     exchanges: any[];
 *   }>
 *   自根向两侧可达的进程缩放记录清单（用于后续 buildEdgeScaling 聚合）。
 *
 * 计算方式 / How scaling is computed:
 * - 对于 downstream（沿入边向上游）：使用当前节点的 INPUT meanAmount 与上游节点的
 *   OUTPUT meanAmount 计算 nextScaling(target, base, cur) = target * cur / base。
 * - 对于 upstream（沿出边向下游）：使用当前节点的 OUTPUT meanAmount 与下游节点的
 *   INPUT meanAmount 计算同式的缩放。
 * - 若任一参与量或当前缩放为 0，或 baseAmount 为 0，使用防御性回退，nextScaling 返回 1。
 *
 * 复杂度 / Complexity:
 * - 约 O(R)，R 为从起点可达部分的边数；借助 exIndex 的哈希查找，单条边为 O(1)。
 *
 * 注意 / Notes:
 * - 仅遍历 ud.dependence 为 'downstream' 或 'upstream' 的边；'none' 边会被跳过。
 * - 不在此处做去重或环检测；通常在 assignEdgeDependence 的去重策略下路径有限。
 * - 本函数为纯函数，不修改输入索引与边，仅返回收集的进程缩放条目。
 */
const calculateScalingFactor = (
  currentModelProcess: any,
  currentDatabaseProcess: DbProcessMapValue,
  dependence: any,
  scalingFactor: number,
  edgesByDownstreamInput: Map<string, Up2DownEdge[]>,
  edgesByUpstreamOutput: Map<string, Up2DownEdge[]>,
  mdProcessMap: Map<string, any>,
  dbProcessMap: Map<string, DbProcessMapValue>,
) => {
  type Frame = {
    md: any;
    db: DbProcessMapValue;
    dep: any;
    sf: number;
  };

  const collectedProcesses: any[] = [];
  const stack: Frame[] = [
    { md: currentModelProcess, db: currentDatabaseProcess, dep: dependence, sf: scalingFactor },
  ];

  while (stack.length > 0) {
    const { md, db, dep, sf } = stack.pop() as Frame;
    const nodeId = md?.['@dataSetInternalID'];
    const scalingExchanges =
      db?.exchanges?.map((ex: any) => {
        const amount = new BigNumber(toAmountNumber(ex.meanAmount)).times(sf ?? 1).toNumber();
        return { ...ex, meanAmount: amount, resultingAmount: amount };
      }) ?? [];

    collectedProcesses.push({
      nodeId: nodeId,
      dependence: dep,
      processId: db.id,
      processVersion: db.version,
      quantitativeReferenceFlowIndex: db?.refExchangeMap?.exchangeId,
      scalingFactor: sf,
      baseExchanges: db?.exchanges ?? [],
      exchanges: scalingExchanges,
    });

    const inputEdges = edgesByDownstreamInput.get(nodeId) ?? [];
    for (const edge of inputEdges) {
      if (edge?.dependence !== 'downstream') continue;

      const upstreamModelProcess = mdProcessMap.get(edge?.upstreamId);
      if (!upstreamModelProcess) continue;

      const upKey = dbProcessKey(
        upstreamModelProcess?.referenceToProcess?.['@refObjectId'],
        upstreamModelProcess?.referenceToProcess?.['@version'],
      );
      const upstreamDatabaseProcess = dbProcessMap.get(upKey);
      if (!upstreamDatabaseProcess) continue;
      // O(1) exchange lookup via indices
      const currentInputExchange = db?.exIndex?.inputByFlowId.get(edge?.flowUUID);
      const upstreamOutputExchange = upstreamDatabaseProcess?.exIndex?.outputByFlowId.get(
        edge?.flowUUID,
      );

      const upstreamMeanAmount = toAmountNumber(upstreamOutputExchange?.meanAmount);
      const currentInputMeanAmount = toAmountNumber(currentInputExchange?.meanAmount);
      const { exchangeAmount, nextScalingFactor } = nextScaling(
        currentInputMeanAmount,
        upstreamMeanAmount,
        sf,
      );

      edge.exchangeAmount = exchangeAmount;

      stack.push({
        md: upstreamModelProcess,
        db: upstreamDatabaseProcess,
        dep: {
          direction: 'downstream',
          nodeId: nodeId,
          flowUUID: edge?.flowUUID,
          edgeId: edge?.id,
          exchangeAmount: exchangeAmount,
        },
        sf: nextScalingFactor,
      });
    }

    const outputEdges = edgesByUpstreamOutput.get(nodeId) ?? [];
    for (const edge of outputEdges) {
      if (edge?.dependence !== 'upstream') continue;

      const downstreamModelProcess = mdProcessMap.get(edge?.downstreamId);
      if (!downstreamModelProcess) continue;

      const downKey = dbProcessKey(
        downstreamModelProcess?.referenceToProcess?.['@refObjectId'],
        downstreamModelProcess?.referenceToProcess?.['@version'],
      );
      const downstreamDatabaseProcess = dbProcessMap.get(downKey);
      if (!downstreamDatabaseProcess) continue;
      // O(1) exchange lookup via indices
      const currentOutputExchange = db?.exIndex?.outputByFlowId.get(edge?.flowUUID);
      const downstreamInputExchange = downstreamDatabaseProcess?.exIndex?.inputByFlowId.get(
        edge?.flowUUID,
      );

      const downstreamMeanAmount = toAmountNumber(downstreamInputExchange?.meanAmount);
      const currentOutputMeanAmount = toAmountNumber(currentOutputExchange?.meanAmount);
      const { exchangeAmount, nextScalingFactor } = nextScaling(
        currentOutputMeanAmount,
        downstreamMeanAmount,
        sf,
      );

      edge.exchangeAmount = exchangeAmount;

      stack.push({
        md: downstreamModelProcess,
        db: downstreamDatabaseProcess,
        dep: {
          direction: 'upstream',
          nodeId: nodeId,
          flowUUID: edge?.flowUUID,
          edgeId: edge?.id,
          exchangeAmount: exchangeAmount,
        },
        sf: nextScalingFactor,
      });
    }
  }

  return collectedProcesses;
};

/**
 * zh-CN: 构造 processScalingFactorMap 的键，用于 O(1) 命中特定依赖方向的缩放聚合条目。
 * 键格式：`${direction}|${flowUUID}|${dependenceNodeId}|${nodeId}`。
 * - direction 与边/依赖方向一致（'downstream' | 'upstream'）。
 * - flowUUID 为连接两端共享的流 ID。
 * - dependenceNodeId 表示“依赖关系记录中的对端节点 ID”（对于 downstream 是 downstreamId，对于 upstream 是 upstreamId）。
 * - nodeId 表示当前节点 ID（记录所属节点）。
 *
 * en-US: Build the lookup key for processScalingFactorMap to perform O(1) hits
 * on aggregated scaling entries. Key format is `${direction}|${flowUUID}|${dependenceNodeId}|${nodeId}`.
 * - direction matches the dependence label ('downstream' | 'upstream').
 * - flowUUID is the shared flow id across the connecting edge.
 * - dependenceNodeId is the counterparty node id in the dependence record (downstreamId for 'downstream', upstreamId for 'upstream').
 * - nodeId is the current (owner) node id of the record.
 *
 * 参数 / Params:
 * - direction: string 依赖方向（'downstream' | 'upstream'）。
 * - flowUUID?: string 共享流 ID，缺失时以空串占位。
 * - dependenceNodeId?: string 依赖记录中的对端节点 ID，缺失时以空串占位。
 * - nodeId?: string 当前记录所属节点 ID，缺失时以空串占位。
 *
 * 返回 / Returns:
 * - string 规范化的复合键，稳定且可用于 Map 索引与调试输出。
 *
 * 注意 / Notes:
 * - 键各段缺失时以空串占位，可能导致不同记录聚合到同一键，请在上游/调用处尽量提供完整字段；
 *   缺失场景通常应回退到 sumScalingFactorByNodeId。
 * - 该键格式与 getScalingFactorForEdge/buildEdgeScaling 的使用保持一致，请勿随意变更分隔符或字段顺序。
 *
 * 示例 / Examples:
 * - 'downstream|f123|D1|U9'
 * - 'upstream|f456|U9|D1'
 */
// const processScalingFactorKey = (
//   direction: string,
//   flowUUID?: string,
//   dependenceNodeId?: string,
//   nodeId?: string,
// ) => `${direction}|${flowUUID ?? ''}|${dependenceNodeId ?? ''}|${nodeId ?? ''}`;

/**
 * zh-CN: 使用预构建的索引为单条边计算 scalingFactor（O(1)）。
 * 取值规则：
 *  - 当 ud.dependence === 'downstream'：
 *    • 以 key = processScalingFactorKey('downstream', ud.flowUUID, ud.downstreamId, ud.upstreamId)
 *      从 processScalingFactorMap 取聚合值。
 *  - 当 ud.dependence === 'upstream'：
 *    • 以 key = processScalingFactorKey('upstream', ud.flowUUID, ud.upstreamId, ud.downstreamId)
 *      从 processScalingFactorMap 取聚合值。
 *  - 当 ud.dependence === 'none'：
 *    • 若 ud.mainDependence === 'downstream'，回退到 sumScalingFactorByNodeId.get(ud.upstreamId)?.scalingFactor；
 *    • 若 ud.mainDependence === 'upstream'，回退到 sumScalingFactorByNodeId.get(ud.downstreamId)?.scalingFactor。
 *  - 其余情况返回 0。
 *
 * en-US: Compute the scalingFactor for a given edge in O(1) using pre-indexed maps.
 * Rules:
 *  - If ud.dependence === 'downstream':
 *    • Use key = processScalingFactorKey('downstream', ud.flowUUID, ud.downstreamId, ud.upstreamId)
 *      to hit processScalingFactorMap.
 *  - If ud.dependence === 'upstream':
 *    • Use key = processScalingFactorKey('upstream', ud.flowUUID, ud.upstreamId, ud.downstreamId)
 *      to hit processScalingFactorMap.
 *  - If ud.dependence === 'none':
 *    • If ud.mainDependence === 'downstream', fall back to sumScalingFactorByNodeId.get(ud.upstreamId)?.scalingFactor;
 *    • If ud.mainDependence === 'upstream', fall back to sumScalingFactorByNodeId.get(ud.downstreamId)?.scalingFactor.
 *  - Otherwise, return 0.
 *
 * 参数 / Params:
 * - ud: Up2DownEdge 边对象，包含 flowUUID、upstreamId、downstreamId、dependence、mainDependence 等。
 * - processScalingFactorMap: Map<string, number> 由精确键聚合的缩放索引（参见 processScalingFactorKey）。
 * - sumScalingFactorByNodeId: Map<string, any> 按节点聚合的缩放汇总与计数（用于 none 场景回退）。
 *
 * 返回 / Returns:
 * - number 命中的 scalingFactor 值；若未命中或信息不足则为 0。
 *
 * 复杂度 / Complexity:
 * - O(1) 哈希命中或单次 Map 访问。
 *
 * 注意 / Notes:
 * - 需与 processScalingFactorKey 的键语义保持一致；
 * - 当字段缺失或键未命中时返回 0，表示对该边无有效缩放贡献。
 */
// const getScalingFactorForEdge = (
//   ud: Up2DownEdge,
//   processScalingFactorMap: Map<string, number>,
//   sumAmountMap: Map<string, any>,
// ): { downScalingFactor: number, upScalingFactor: number, scalingFactor: number, exchangeAmount: number } => {
//   const dependence = ud?.dependence;
//   if (dependence !== 'none') {
//     const downK = processScalingFactorKey('downstream', ud?.flowUUID, ud?.downstreamId, ud?.upstreamId);
//     const upK = processScalingFactorKey('upstream', ud?.flowUUID, ud?.upstreamId, ud?.downstreamId);

//     const downScalingFactor = processScalingFactorMap.get(downK) ?? 0;
//     const upScalingFactor = processScalingFactorMap.get(upK) ?? 0;

//     const downNode = sumAmountMap.get(ud?.downstreamId);
//     const upNode = sumAmountMap.get(ud?.upstreamId);

//     if (dependence === 'downstream') {
//       const dependenceExchange = downNode?.exchanges?.find((ex: any) => ex?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID && ex?.exchangeDirection.toUpperCase() === 'INPUT');
//       return { downScalingFactor, upScalingFactor, scalingFactor: downScalingFactor, exchangeAmount: dependenceExchange?.meanAmount ?? 0 };
//     } else if (dependence === 'upstream') {
//       const dependenceExchange = upNode?.exchanges?.find((ex: any) => ex?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID && ex?.exchangeDirection.toUpperCase() === 'OUTPUT');
//       return { downScalingFactor, upScalingFactor, scalingFactor: upScalingFactor, exchangeAmount: dependenceExchange?.meanAmount ?? 0 };
//     }
//   }
//   else {
//     const downScalingFactor = sumAmountMap.get(ud?.downstreamId)?.scalingFactor ?? 0;
//     const upScalingFactor = sumAmountMap.get(ud?.upstreamId)?.scalingFactor ?? 0;
//     if (ud?.mainDependence === 'downstream') {
//       return {
//         downScalingFactor,
//         upScalingFactor,
//         scalingFactor: upScalingFactor,
//         exchangeAmount: sumAmountMap.get(ud?.upstreamId)?.scalingFactor ?? 0
//       };
//     }
//   }
//   return { downScalingFactor: 0, upScalingFactor: 0, scalingFactor: 0, exchangeAmount: 0 };
// };

/**
 * zh-CN: 聚合进程缩放系数并为边计算缩放因子（原地修改传入的边）。
 *  - 将 processScalingFactors 汇总为两个索引：
 *    • processScalingFactorMap：按「方向|流UUID|依赖节点|节点」四元组聚合 scalingFactor 之和（忽略 0）。
 *    • sumScalingFactorByNodeId：按节点汇总 scalingFactor 与计数（保留最后一次的其它字段，scalingFactor 累加，count++）。
 *  - 遍历 up2DownEdges，使用 getScalingFactorForEdge 计算每条边的 scalingFactor 并原地写入：
 *    • 若边的 dependence 为 downstream/upstream，则按精确键从 processScalingFactorMap 命中；
 *    • 若 dependence 为 none，则按 mainDependence 回退到 sumScalingFactorByNodeId（upstream 节点或 downstream 节点的总和）。
 *  - 忽略 scalingFactor=0 的条目以减少噪声。
 *
 * en-US: Aggregate process scaling factors and compute per-edge scalingFactor (mutates the edges in place).
 *  - Build two indices from processScalingFactors:
 *    • processScalingFactorMap: sum of scaling factors keyed by
 *      "direction|flowUUID|dependenceNodeId|nodeId" (zero values ignored).
 *    • sumScalingFactorByNodeId: per-node sum and count (preserving last psf fields,
 *      accumulating scalingFactor and incrementing count).
 *  - For each up2DownEdge, compute scalingFactor via getScalingFactorForEdge and write it back:
 *    • If dependence is downstream/upstream, use the exact key in processScalingFactorMap.
 *    • If dependence is none, fall back to per-node sum according to mainDependence
 *      (upstream or downstream node).
 *  - Zero scaling factors are ignored to reduce noise.
 *
 * 参数 / Params:
 * - processScalingFactors: any[]
 *     由图遍历得到的进程缩放记录，包含 nodeId、dependence(direction/nodeId/flowUUID)、scalingFactor 等。
 * - up2DownEdges: Up2DownEdge[]
 *     已打上 dependence/mainDependence 的边集合（通常由 assignEdgeDependence 产出）。
 *
 * 返回 / Returns:
 * - sumScalingFactorByNodeId: Map<string, any>
 *     按节点聚合的缩放汇总与计数，供后续分配与汇总流程使用。
 *   注：函数会原地为 up2DownEdges 写入 scalingFactor，不返回新的边数组。
 *
 * 前置条件 / Preconditions:
 * - up2DownEdges.dependence 和 mainDependence 已正确设置（由 assignEdgeDependence 完成）。
 * - getScalingFactorForEdge 与 processScalingFactorKey 的语义与此处一致。
 *
 * 复杂度 / Complexity:
 * - 约 O(P + E)，P 为 processScalingFactors 数量，E 为边数量。
 *
 * 副作用 / Side effects:
 * - 会原地修改传入的边对象（为每条边写入/更新 scalingFactor 字段）。
 */
const sumAmountByNodeId = (
  processScalingFactors: any[],
  // up2DownEdges: Up2DownEdge[],
): Map<string, any> => {
  // const processScalingFactorMap = new Map<string, number>();
  const sumAmountMap = new Map<string, any>();

  for (const psf of processScalingFactors as any[]) {
    // const dir = psf?.dependence?.direction;
    // const flowUUID = psf?.dependence?.flowUUID;
    // const depNodeId = psf?.dependence?.nodeId;
    const nodeId = psf?.nodeId;
    const sf = psf?.scalingFactor ?? 0;

    // if (dir && flowUUID && depNodeId && nodeId && sf !== 0) {
    //   const key = processScalingFactorKey(dir, flowUUID, depNodeId, nodeId);
    //   processScalingFactorMap.set(key, (processScalingFactorMap.get(key) ?? 0) + sf);
    // }
    if (nodeId && sf !== 0) {
      const sumSF = sumAmountMap.get(nodeId) ?? { ...psf, scalingFactor: 0, count: 0 };
      sumAmountMap.set(nodeId, {
        ...sumSF,
        scalingFactor: (sumSF?.scalingFactor ?? 0) + sf,
        count: (sumSF?.count ?? 0) + 1,
      });
    }
  }

  for (const [nodeId, data] of sumAmountMap) {
    sumAmountMap.set(nodeId, {
      ...data,
      exchanges:
        data?.baseExchanges?.map((ex: any) => {
          const amount = new BigNumber(toAmountNumber(ex.meanAmount))
            .times(data?.scalingFactor ?? 1)
            .toNumber();
          return { ...ex, meanAmount: amount, resultingAmount: amount };
        }) ?? [],
    });
  }

  // In-place write scalingFactor onto each edge to avoid array/object churn
  // for (const ud of up2DownEdges) {
  //   const { downScalingFactor, upScalingFactor } = getScalingFactorForEdge(
  //     ud,
  //     processScalingFactorMap,
  //     sumAmountMap,
  //   );
  //   ud.downScalingFactor = downScalingFactor;
  //   ud.upScalingFactor = upScalingFactor;
  // }
  return sumAmountMap;
};

// const calculateExchangeUsageRate = (sumAmountMap: Map<string, any>, up2DownEdges: any[], edgesByDownstream: Map<string, Up2DownEdge[]>,
//   edgesByUpstream: Map<string, Up2DownEdge[]>) => {
//   const mainEdges = up2DownEdges.filter(ud => ud?.dependence !== 'none');
//   mainEdges.forEach(mainEdge => {
//     const upNode = sumAmountMap.get(mainEdge?.upstreamId);
//     const downNode = sumAmountMap.get(mainEdge?.downstreamId);
//     if (upNode && downNode) {
//       const mainOutputExchange = upNode?.exchanges?.find((upEx: any) => upEx?.exchangeDirection.toUpperCase() === 'OUTPUT' && upEx?.referenceToFlowDataSet?.['@refObjectId'] === mainEdge?.flowUUID);
//       const mainInputExchange = downNode?.exchanges?.find((downEx: any) => downEx?.exchangeDirection.toUpperCase() === 'INPUT' && downEx?.referenceToFlowDataSet?.['@refObjectId'] === mainEdge?.flowUUID);
//       if (mainOutputExchange && mainInputExchange) {
//         mainOutputExchange.mainUsageAmount = (mainOutputExchange?.mainUsageAmount ?? 0) + (mainInputExchange?.meanAmount ?? 0) * (mainEdge?.scalingFactor ?? 1) / (downNode?.scalingFactor ?? 1);
//         mainInputExchange.mainUsageAmount = (mainInputExchange?.mainUsageAmount ?? 0) + (mainInputExchange?.meanAmount ?? 0) * (mainEdge?.scalingFactor ?? 1) / (upNode?.scalingFactor ?? 1);
//       }
//       console.log('mainExchange2', mainOutputExchange, mainInputExchange);
//     }

//   });

//   // for (const [nodeId, data] of sumAmountMap) {
//   //   const inputEdges = edgesByDownstream.get(nodeId) ?? [];
//   //   const outputEdges = edgesByUpstream.get(nodeId) ?? [];
//   //   data?.exchanges?.forEach((ex: any) => {
//   //     if (ex?.exchangeDirection.toUpperCase() === 'INPUT') {
//   //       const inputEdgesForThisFlow = inputEdges.filter(ie => ie.flowUUID === ex?.referenceToFlowDataSet?.['@refObjectId']);
//   //       if (inputEdgesForThisFlow.length > 0) {
//   //         const totalSF = inputEdgesForThisFlow.reduce((sum, ie) => {
//   //           const upstreamData = sumAmountMap.get(ie?.upstreamId);
//   //           const exInUpstream = upstreamData?.exchanges?.find((e: any) => e?.exchangeDirection.toUpperCase() === 'OUTPUT' && e?.referenceToFlowDataSet?.['@refObjectId'] === ie?.flowUUID);
//   //           const amount = exInUpstream?.meanAmount ?? 0;
//   //           return sum + amount;
//   //         }, 0);
//   //         });
//   //         console.log('inputEdgesForThisFlow', inputEdgesForThisFlow);
//   //       } else {
//   //         ex.usageRate = 0;
//   //       }
//   //     } else if (ex?.exchangeDirection.toUpperCase() === 'OUTPUT') {

//   //     }
//   //   });

//   // }

//   console.log('sumAmountMap', sumAmountMap);
//   return sumAmountMap;

// };

// const splitExchange = (sumAmountMap: Map<string, any>, edges: any[], edgesByDownstream: Map<string, Up2DownEdge[]>,
//   edgesByUpstream: Map<string, Up2DownEdge[]>) => {
//   for (const [nodeId, data] of sumAmountMap) {
//     const inputEdges = edgesByDownstream.get(nodeId) ?? [];
//     const outputEdges = edgesByUpstream.get(nodeId) ?? [];

//     // console.log('splitExchange', nodeId, data, inputEdges, outputEdges);
//   }
//   return sumAmountMap;
// }

/**
 * zh-CN: 判定某子进程在其下游路径上是否存在“最终产品”交换。
 * 判定逻辑：
 *  - 先筛选从该进程出发的下游边：
 *    • 若进程未分配(isAllocated=false)，保留该节点的所有下游边；
 *    • 若进程已分配(isAllocated=true)，仅保留 flowUUID 等于 allocatedExchangeFlowId 的边。
 *  - 对每一条下游边：
 *    • 若能在子进程列表中找到对应的下游子进程：
 *      - 若下游子进程的 finalProductType 为 'unknown' 或 'has'，直接返回 'no'（当前并非最终产品）；
 *      - 否则递归向下游继续判定（沿链路继续搜索）。
 *    • 若找不到对应的下游子进程，则视为到达末端，返回 'has'（当前视作最终产品）。
 *  - 若未匹配到任何下游边，则返回 'unknown'。
 *
 * en-US: Determine whether a child process has a "final product" exchange along its
 * downstream path.
 * Rules:
 *  - Filter outgoing downstream edges of the process:
 *    • If not allocated, keep all edges; if allocated, keep only edges whose flowUUID
 *      equals allocatedExchangeFlowId.
 *  - For each downstream edge:
 *    • If a corresponding next child process exists:
 *      - If its finalProductType is 'unknown' or 'has', return 'no' (current is not final);
 *      - Otherwise, recurse further downstream to continue checking.
 *    • If no corresponding child is found, treat it as a leaf and return 'has'.
 *  - If no downstream edges match, return 'unknown'.
 *
 * 参数 / Params:
 * - childProcessExchange: any 当前待判定的子进程条目（需包含 nodeId、isAllocated、allocatedExchangeFlowId 等）。
 * - allUp2DownEdges: Up2DownEdge[] 全量边集合（用于筛选该节点为上游的下游边）。
 * - childProcessExchanges: any[] 子进程数组（通常为 allocatedProcess 的结果，经 assignFinalProductTypes 标注）。
 *
 * 返回 / Returns:
 * - 'has' | 'no' | 'unknown' 表示当前子进程相对“最终产品”的类型判定。
 *
 * 复杂度 / Complexity:
 * - 近似 O(L)，L 为从当前节点沿下游可达路径的长度；每步含一次在数组中的查找。
 *
 * 注意 / Notes:
 * - 该逻辑依赖外部对 finalProductType 的逐轮更新（见 assignFinalProductTypes）；
 * - 未做显式环检测；通常在有限深度与外层迭代上限下可接受。
 *
 * 副作用 / Side effects:
 * - 纯函数，不修改入参。
 */
const hasFinalProductProcessExchange = (
  childProcessExchange: any,
  allUp2DownEdges: Up2DownEdge[],
  childProcessExchanges: any[],
) => {
  const downStreamEdges = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.upstreamId === childProcessExchange?.nodeId &&
      (!childProcessExchange?.isAllocated ||
        ud?.flowUUID === childProcessExchange?.allocatedExchangeFlowId)
    );
  });
  for (const edge of downStreamEdges) {
    const nextChildProcessExchange = childProcessExchanges.find((cpe: any) => {
      return cpe?.nodeId === edge?.downstreamId;
    });
    if (nextChildProcessExchange) {
      if (
        nextChildProcessExchange.finalProductType === 'unknown' ||
        nextChildProcessExchange.finalProductType === 'has'
      ) {
        return 'no';
      } else {
        return hasFinalProductProcessExchange(
          nextChildProcessExchange,
          allUp2DownEdges,
          childProcessExchanges,
        );
      }
    } else {
      return 'has';
    }
  }
  return 'unknown';
};

/**
 * zh-CN: 为分配后的进程标注“最终产品类型”，并迭代解析未知状态。
 * 规则：
 *  - 参考节点直接标记为 'has'
 *  - 分配进程若不存在对应流的下游边，则标记为 'has'；否则先标为 'unknown'
 *  - 其它（未分配）则标记为 'no'
 * 之后对 'unknown' 项进行循环判定，借助 hasFinalProductProcessExchange 沿图检索，
 * 并设置安全上限避免无限循环。函数原地修改传入数组并返回同一引用。
 *
 * en-US: Annotates "final product type" for allocated processes and resolves unknown states.
 * Rules:
 *  - Reference node is marked as 'has'
 *  - For allocated processes, if no downstream edge matches its allocated flow, mark as 'has';
 *    otherwise mark as 'unknown' initially
 *  - Others (non-allocated) are marked as 'no'
 * Then iteratively resolves 'unknown' entries via hasFinalProductProcessExchange with a safety cap.
 * The function mutates the given array and returns the same reference.
 *
 * 参数 / Params:
 * - allocatedProcesses: any[] 由 allocatedProcess 生成的子进程数组，元素需包含 nodeId、isAllocated、allocatedExchangeFlowId、exchanges 等字段。
 * - up2DownEdges: Up2DownEdge[] 工艺网络中的边集合（至少需包含 upstreamId、downstreamId、flowUUID）。
 * - refProcessNodeId: string 参考节点 ID，用于直接标记 'has'。
 *
 * 返回 / Returns:
 * - any[] 与入参同一数组引用，且每个元素补充 finalProductType: 'has' | 'no' | 'unknown'。
 *
 * 前置条件 / Preconditions:
 * - up2DownEdges 覆盖了 allocatedProcesses 中涉及到的连通关系；不依赖 dependence/mainDependence 字段。
 *
 * 复杂度 / Complexity:
 * - 约 O(P + R*K)，P 为进程数，R 为单轮解析中对未知项的遍历与边查找成本，K 为迭代轮数（有安全上限）。
 *
 * 副作用 / Side effects:
 * - 原地写入/更新 allocatedProcesses[i].finalProductType。
 *
 * 错误处理 / Error handling:
 * - 当迭代次数超限时，会输出 console.error 但不中断流程，提前结束解析。
 */
const assignFinalProductTypes = (
  allocatedProcesses: any[],
  up2DownEdges: Up2DownEdge[],
  refProcessNodeId: string,
) => {
  allocatedProcesses.forEach((ap: any) => {
    if (ap?.nodeId === refProcessNodeId) {
      ap.finalProductType = 'has';
      return;
    }
    if (ap?.isAllocated) {
      const downstreamEdges = up2DownEdges.filter(
        (ud: Up2DownEdge) =>
          ud?.upstreamId === ap?.nodeId && ud?.flowUUID === ap?.allocatedExchangeFlowId,
      );
      if (downstreamEdges.length === 0) {
        ap.finalProductType = 'has';
        return;
      } else {
        ap.finalProductType = 'unknown';
        return;
      }
    } else {
      ap.finalProductType = 'no';
      return;
    }
  });

  let whileCount = 0;
  let whileUnknown = true;
  const unknownCount = allocatedProcesses.filter(
    (cpe: any) => cpe?.finalProductType === 'unknown',
  )?.length;
  while (whileUnknown) {
    const unknownCPEs = allocatedProcesses.filter(
      (cpe: any) => cpe?.finalProductType === 'unknown',
    );
    unknownCPEs.forEach((cpe: any) => {
      const finalProductType = hasFinalProductProcessExchange(
        cpe,
        up2DownEdges,
        allocatedProcesses,
      );
      cpe.finalProductType = finalProductType;
    });
    if (unknownCPEs.length === 0) {
      whileUnknown = false;
    }
    whileCount++;
    if (whileCount > 3 + (unknownCount ?? 0) * 3) {
      console.error(`Too many iterations (${whileCount}), breaking out of the loop`);
      whileUnknown = false;
    }
  }

  return allocatedProcesses;
};

/**
 * zh-CN: 基于节点聚合结果（通常来自 sumScalingFactorByNodeId 的 Map 值），
 *  将每个进程的交换分解为「已分配的输出交换」与「未分配交换」两类，并据此产出子进程列表：
 *  - 若存在带正分配比例(allocatedFraction>0)的 OUTPUT 交换，则为每个此类交换创建一个子进程：
 *    • isAllocated=true，allocatedExchangeId/FlowId 指向该输出交换；
 *    • exchanges=未分配交换 + 该已分配输出交换；
 *    • allocatedFraction 取自该交换的分配比例（百分字符串已转换为数字）。
 *  - 若不存在已分配的 OUTPUT 交换，则回退到参考 OUTPUT 交换（quantitativeReferenceFlowIndex 对应的 OUTPUT），
 *    以 allocatedFraction=1 创建一个子进程。
 *  - 如果参考交换为 OUTPUT 且未被选为已分配交换，会被视作未分配交换加入（避免丢失参考输出）。
 *  最终返回的子进程数组可用于后续的最终产品分组与金额缩放计算。
 *
 * en-US: Given per-node aggregated process entries (usually values of sumScalingFactorByNodeId),
 *  split each process's exchanges into "allocated OUTPUT exchanges" and "non-allocated exchanges",
 *  and emit child process entries:
 *  - If there exist OUTPUT exchanges with a positive allocatedFraction, create one child per such
 *    exchange: isAllocated=true, set allocatedExchangeId/FlowId, and set exchanges to
 *    [non-allocated + this allocated OUTPUT]; allocatedFraction is parsed from percent string.
 *  - If none exist, fall back to the reference OUTPUT exchange (by quantitativeReferenceFlowIndex)
 *    and create a single child with allocatedFraction=1.
 *  - If the reference exchange is OUTPUT and not already selected as allocated, include it into
 *    non-allocated to avoid losing the reference output.
 *
 * 参数 / Params:
 * - processMap: Map<string, any>
 *     节点聚合后的进程映射（nodeId -> 聚合记录），每条记录应含 exchanges 与 quantitativeReferenceFlowIndex 等。
 *
 * 返回 / Returns:
 * - childProcesses: any[]
 *     子进程数组，每个元素包含：isAllocated、allocatedExchangeId/FlowId、allocatedFraction、exchanges 等。
 *
 * 处理规则 / Rules:
 * - 非 OUTPUT 的交换一律归为非分配交换；
 * - 对于 OUTPUT 交换，仅使用 allocations 的首个分配比例（若存在且>0）作为 allocatedFraction；
 * - 若 OUTPUT 交换既无有效分配比例，且其 '@dataSetInternalID' 不等于参考交换 ID，则归为未分配；
 * - 回退逻辑：当没有任何已分配 OUTPUT 交换时，使用参考 OUTPUT 交换且 allocatedFraction=1；
 * - 参考 OUTPUT 交换若未被选为已分配且其方向确认为 OUTPUT，则会附加到未分配列表。
 *
 * 复杂度 / Complexity:
 * - 约 O(N + E)，N 为进程条目数，E 为遍历的交换数量；单进程内为线性扫描。
 *
 * 注意 / Notes:
 * - 输入类型必须为 Map<string, any>，函数遍历其 values；不修改传入的 Map 实例。
 * - 若同一进程存在多个已分配 OUTPUT 交换，将产生多个子进程（按交换拆分）。
 * - 仅解析 allocations 的第一个条目，假定数据规范如此；如需支持多条，需要扩展逻辑。
 */
const allocatedProcess = (processMap: Map<string, any>) => {
  const childProcesses: any[] = [];

  // Iterate map values directly; only Map<string, any> is supported
  for (const p of processMap.values()) {
    const pExchanges = p?.exchanges ?? [];
    const allocatedExchanges: any[] = [];
    const nonAllocatedExchanges: any[] = [];

    for (const pExchange of pExchanges) {
      const dir = String(pExchange?.exchangeDirection ?? '').toUpperCase();
      if (dir !== 'OUTPUT') {
        nonAllocatedExchanges.push(pExchange);
        continue;
      }

      const allocations = jsonToList(pExchange?.allocations);
      if (allocations.length > 0) {
        const allocatedFractionStr = allocations[0]?.allocation?.['@allocatedFraction'] ?? '';
        const allocatedFraction = percentStringToNumber(allocatedFractionStr);
        if (allocatedFraction && allocatedFraction > 0) {
          allocatedExchanges.push({ exchange: pExchange, allocatedFraction });
          continue;
        }
      }

      if (pExchange['@dataSetInternalID'] !== p?.quantitativeReferenceFlowIndex) {
        nonAllocatedExchanges.push(pExchange);
      }
    }

    // If no allocated OUTPUT exchanges exist, fall back to reference output exchange
    if (allocatedExchanges.length === 0) {
      const refOutputExchange = pExchanges.find(
        (pe: any) =>
          pe['@dataSetInternalID'] === p?.quantitativeReferenceFlowIndex &&
          String(pe?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT',
      );
      if (refOutputExchange) {
        allocatedExchanges.push({ exchange: refOutputExchange, allocatedFraction: 1 });
      }
    }

    if (allocatedExchanges.length > 0) {
      const refExchange = pExchanges.find(
        (pe: any) => pe['@dataSetInternalID'] === p?.quantitativeReferenceFlowIndex,
      );

      if (
        refExchange &&
        String(refExchange?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT' &&
        !allocatedExchanges.find(
          (ne: any) => ne?.exchange?.['@dataSetInternalID'] === refExchange?.['@dataSetInternalID'],
        )
      ) {
        nonAllocatedExchanges.push(refExchange);
      }

      for (const allocatedExchange of allocatedExchanges) {
        childProcesses.push({
          ...p,
          isAllocated: true,
          allocatedExchangeId: allocatedExchange.exchange?.['@dataSetInternalID'],
          allocatedExchangeDirection: allocatedExchange.exchange?.exchangeDirection ?? '',
          allocatedExchangeFlowId:
            allocatedExchange.exchange?.referenceToFlowDataSet?.['@refObjectId'],
          allocatedFraction: allocatedExchange.allocatedFraction,
          exchanges: [...nonAllocatedExchanges, allocatedExchange.exchange],
        });
      }
    } else {
      childProcesses.push({
        ...p,
        isAllocated: false,
        allocatedExchangeId: '',
        allocatedExchangeDirection: '',
        allocatedExchangeFlowId: '',
        allocatedFraction: 1,
        exchanges: nonAllocatedExchanges,
      });
    }
  }

  return childProcesses;
};

/**
 * zh-CN: 自某个候选“最终产品”子进程起，递归收集同一子产品链条上的进程分组。
 * 规则：
 *  - 若当前子进程已分配且 allocatedFraction > 0，则将其作为一个分组（childAllocatedFraction 为父级累计份额与本级份额之积，childScalingPercentage 为父级累计缩放比例）；
 *    然后在图中筛选与该子进程交换匹配的连边（依据 dependence/mainDependence 与交换方向：上游用 OUTPUT， 下游用 INPUT），
 *    找到沿该边连接的下一个子进程（nodeId 为上/下游之一，且 allocatedExchangeFlowId 与边的 flowUUID 相同，且其 finalProductType !== 'has'），
 *    以 edge.scalingFactor / nextChild.scalingFactor 进一步更新累计缩放比例并继续递归；
 *  - 若当前未分配或份额无效，则视作叶子，直接以传入的累计份额与缩放比例入组。
 *
 * en-US: Starting from a candidate "final product" child process, recursively collect groups
 * along the same subproduct chain.
 * Rules:
 *  - If the current child is allocated and allocatedFraction > 0, push it as a group entry
 *    (childAllocatedFraction = parentAccumulatedFraction * current.allocatedFraction,
 *     childScalingPercentage = parentAccumulatedScaling), then find connected edges that match
 *    this child's exchanges (by dependence/mainDependence and direction: OUTPUT for upstream,
 *    INPUT for downstream). For each edge, locate the next child process connected by this edge
 *    (nodeId equals the upstream/downstream, allocatedExchangeFlowId equals edge.flowUUID,
 *    and finalProductType !== 'has'), then recurse with updated scalingPercentage as
 *    edge.scalingFactor / nextChild.scalingFactor * currentScaling.
 *  - Otherwise, treat it as a leaf and push with the accumulated fraction and scaling as-is.
 *
 * 参数 / Params:
 * - finalProductProcess: any 当前（候选）最终产品子进程。
 * - allocatedFraction: number 从父层累计传入的份额（默认起始为 1）。
 * - scalingPercentage: number 从父层累计传入的缩放比例（默认起始为 1）。
 * - allocatedProcesses: any[] 所有子进程集合，用于在图中定位下一个子进程。
 * - allUp2DownEdges: Up2DownEdge[] 全量连边集合（需包含 dependence/mainDependence/scalingFactor）。
 *
 * 返回 / Returns:
 * - any[] 分组条目数组；每个元素继承子进程字段并附加
 *   childAllocatedFraction 与 childScalingPercentage，表示相对起点的累计份额与缩放。
 *
 * 复杂度 / Complexity:
 * - 约 O(R)，R 为从起点可达的连边数；深度由链路长度决定。
 *
 * 注意 / Notes:
 * - 本函数为纯函数，不修改入参；未显式做环检测，依赖前置的 finalProductType 标注与图结构避免循环。
 */
const getFinalProductGroup = (
  finalProductProcess: any,
  allocatedFraction: number,
  scalingPercentage: number,
  allocatedProcesses: any[],
  allUp2DownEdges: Up2DownEdge[],
) => {
  const finalProductGroups: any[] = [];
  if (finalProductProcess?.isAllocated && finalProductProcess?.allocatedFraction > 0) {
    const newAllocatedFraction = new BigNumber(finalProductProcess.allocatedFraction)
      .times(allocatedFraction)
      .toNumber();
    finalProductGroups.push({
      ...finalProductProcess,
      childAllocatedFraction: newAllocatedFraction,
      childScalingPercentage: scalingPercentage,
    });

    const connectedEdges = allUp2DownEdges.filter((ud: Up2DownEdge) => {
      if (ud?.upstreamId === finalProductProcess?.nodeId) {
        if (
          (ud?.dependence === 'none' && ud?.mainDependence === 'upstream') ||
          ud?.dependence === 'upstream'
        ) {
          const connectedExhanges = finalProductProcess?.exchanges?.filter((e: any) => {
            return (
              e?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID &&
              (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT'
            );
          });
          if (connectedExhanges?.length > 0) {
            return true;
          }
          return false;
        }
      }

      if (ud?.downstreamId === finalProductProcess?.nodeId) {
        if (
          (ud?.dependence === 'none' && ud?.mainDependence === 'downstream') ||
          ud?.dependence === 'downstream'
        ) {
          const connectedExhanges = finalProductProcess?.exchanges?.filter((e: any) => {
            return (
              e?.referenceToFlowDataSet?.['@refObjectId'] === ud?.flowUUID &&
              (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT'
            );
          });

          if (connectedExhanges?.length > 0) {
            return true;
          }
          return false;
        }
        return false;
      }
      return false;
    });

    if (connectedEdges.length > 0) {
      connectedEdges.forEach((edge: Up2DownEdge) => {
        const nextChildProcess = allocatedProcesses.find((childProcess: any) => {
          return (
            childProcess?.nodeId !== finalProductProcess?.nodeId &&
            childProcess?.finalProductType !== 'has' &&
            (childProcess?.nodeId === edge?.downstreamId ||
              childProcess?.nodeId === edge?.upstreamId) &&
            childProcess?.allocatedExchangeFlowId === edge?.flowUUID
          );
        });

        if (nextChildProcess) {
          const nextFinalProductGroups = getFinalProductGroup(
            nextChildProcess,
            newAllocatedFraction ?? 1,
            //需要后续修改
            // new BigNumber(edge?.scalingFactor ?? 1)
            //   .div(nextChildProcess?.scalingFactor ?? 1)
            //   .times(scalingPercentage)
            //   .toNumber(),
            1,
            allocatedProcesses,
            allUp2DownEdges,
          );
          if (nextFinalProductGroups?.length > 0) {
            finalProductGroups.push(...nextFinalProductGroups);
          }
        }
      });
    }
  } else {
    finalProductGroups.push({
      ...finalProductProcess,
      childAllocatedFraction: allocatedFraction,
      childScalingPercentage: scalingPercentage,
    });
  }

  return finalProductGroups;
};

/**
 * zh-CN: 按分组规则对单个子进程的交换量进行缩放计算。
 * 逻辑：
 *  - 若交换为该子进程的已分配交换（@dataSetInternalID === allocatedExchangeId），
 *    则仅按 scalingFactor 进行缩放；
 *  - 否则（未分配交换），按 scalingFactor × childAllocatedFraction × childScalingPercentage 缩放；
 *  - meanAmount 与 resultingAmount 均使用 BigNumber 计算后再转为 number 返回。
 *
 * en-US: Scale a single child process's exchanges according to grouping rules.
 * Rules:
 *  - If an exchange is the allocated one for this process (@dataSetInternalID === allocatedExchangeId),
 *    scale by scalingFactor only;
 *  - Otherwise (non-allocated exchanges), scale by
 *    scalingFactor × childAllocatedFraction × childScalingPercentage;
 *  - Both meanAmount and resultingAmount are computed with BigNumber and converted to number.
 *
 * 参数 / Params:
 * - process: any 子进程对象，需包含 exchanges、allocatedExchangeId、scalingFactor，
 *   以及可选的 childAllocatedFraction、childScalingPercentage。
 *
 * 返回 / Returns:
 * - any 复制后的子进程对象，exchanges 中的金额字段已完成缩放。
 *
 * 注意 / Notes:
 * - 该函数为纯函数，不修改入参，返回新对象；
 * - childAllocatedFraction 与 childScalingPercentage 应在上游链路聚合时设定。
 */
const calculateProcess = (process: any) => {
  const newExchanges = process?.exchanges?.map((e: any) => {
    if (e['@dataSetInternalID'] === process?.allocatedExchangeId) {
      return {
        ...e,
        meanAmount: new BigNumber(e?.meanAmount).times(process?.scalingFactor).toNumber(),
        resultingAmount: new BigNumber(e?.resultingAmount).times(process?.scalingFactor).toNumber(),
      };
    } else {
      return {
        ...e,
        meanAmount: new BigNumber(e?.meanAmount)
          .times(process?.scalingFactor)
          .times(process?.childAllocatedFraction ?? 1)
          .times(process?.childScalingPercentage ?? 1)
          .toNumber(),
        resultingAmount: new BigNumber(e?.resultingAmount)
          .times(process?.scalingFactor)
          .times(process?.childAllocatedFraction ?? 1)
          .times(process?.childScalingPercentage ?? 1)
          .toNumber(),
      };
    }
  });
  return {
    ...process,
    exchanges: newExchanges,
  };
};

/**
 * zh-CN: 汇总同一子产品分组内各子进程（含缩放后）的交换清单，并标记定量参考交换。
 * 步骤：
 *  - 找到分组内 finalProductType === 'has' 的最终产品进程，取其已分配交换作为参考交换 refExchange；
 *  - 对分组内每个子进程调用 calculateProcess，依据 scalingFactor、childAllocatedFraction、childScalingPercentage
 *    对交换量(meanAmount/resultingAmount)进行缩放；
 *  - 将所有缩放后的交换合并，按键 `${exchangeDirection}_${flowId}` 归并求和；
 *  - 在结果中为与参考交换“方向且流ID”均相同的条目标记 quantitativeReference=true，其余为 false。
 *
 * en-US: Aggregate (sum) the scaled exchanges of child processes within the same subproduct group
 * and flag the quantitative reference exchange.
 * Steps:
 *  - Locate the final product process (finalProductType === 'has') and use its allocated exchange
 *    as the reference exchange (refExchange);
 *  - For each child process, call calculateProcess to scale meanAmount/resultingAmount by
 *    scalingFactor and, for non-allocated exchanges, also by childAllocatedFraction and
 *    childScalingPercentage;
 *  - Flatten all scaled exchanges and reduce by key `${exchangeDirection}_${flowId}` to sum them;
 *  - In the resulting list, set quantitativeReference=true for the item whose flow id AND direction
 *    match the reference exchange; others are false.
 *
 * 参数 / Params:
 * - processExchanges: any[] 同一分组内的子进程数组（来自 getFinalProductGroup 的结果）。
 *
 * 返回 / Returns:
 * - any[] 合并汇总后的交换数组，每项包含累加的 meanAmount/resultingAmount，且带 quantitativeReference 标记。
 *
 * 复杂度 / Complexity:
 * - 约 O(N + E)，N 为子进程数，E 为其总交换数；归并与映射均为线性。
 *
 * 注意 / Notes:
 * - 若未找到最终产品进程或其参考交换，quantitativeReference 将对所有条目为 false；
 * - calculateProcess 内部使用 BigNumber 缩放，返回值在此处继续作为 number 参与求和。
 */
const sumProcessExchange = (processExchanges: any[]) => {
  const finalProcess = processExchanges.find((p) => p?.finalProductType === 'has') ?? {};
  const refExchange = finalProcess?.exchanges?.find(
    (e: any) => e?.['@dataSetInternalID'] === finalProcess?.allocatedExchangeId,
  );

  // const newProcessExchanges = processExchanges.map((process) => {
  //   return calculateProcess(process);
  // });

  let allExchanges: any[] = [];
  processExchanges.forEach((pes) => {
    allExchanges.push(...(pes?.exchanges ?? []));
  });

  const sumData =
    allExchanges?.reduce((acc, curr) => {
      const cId =
        curr?.exchangeDirection.toUpperCase() +
        '_' +
        curr?.referenceToFlowDataSet?.['@refObjectId'];
      if (!acc[cId]) {
        acc[cId] = { ...curr };
      } else {
        acc[cId].meanAmount += curr.meanAmount;
        acc[cId].resultingAmount += curr.resultingAmount;
      }
      return acc;
    }, []) ?? [];
  const sumExchanges = Object.values(sumData);

  return sumExchanges?.map((e: any) => {
    if (
      e?.referenceToFlowDataSet?.['@refObjectId'] ===
        refExchange?.referenceToFlowDataSet?.['@refObjectId'] &&
      e?.exchangeDirection?.toUpperCase() === refExchange?.exchangeDirection?.toUpperCase()
    ) {
      return {
        ...e,
        quantitativeReference: true,
      };
    } else {
      return {
        ...e,
        quantitativeReference: false,
      };
    }
  });
};

/**
 * zh-CN: 生成（或更新）生命周期模型的子模型数据列表。
 * 概览流程：
 *  1) 读取模型中的参考节点(refProcessNodeId)与所有 processInstance；
 *  2) 批量查询数据库进程(processes)并构建 dbProcessMap（含 exchanges、参考交换与按方向/flowId 的索引）；
 *  3) 计算参考节点的缩放系数 refScalingFactor（目标量/参考量，支持 refTargetAmount 覆盖）；
 *  4) 基于模型进程与数据库进程，建图并索引边(buildEdgesAndIndices)，随后分配依赖方向(assignEdgeDependence)；
 *  5) 从参考节点沿依赖方向遍历图，计算所有可达进程的缩放因子(calculateScalingFactor)；
 *  6) 将进程级缩放聚合至边级(buildEdgeScaling)，得到 sumScalingFactorByNodeId；
 *  7) 对每个节点根据分配规则拆分为子进程(allocatedProcess)，并标注最终产品类型(assignFinalProductTypes)；
 *  8) 以每个“最终产品”子进程为起点收集同一子产品链条(getFinalProductGroup)，过滤已连接交换避免双计，
 *     汇总交换(sumProcessExchange)并计算 LCIA 结果，按 primary/secondary 组装最终数据；
 *  9) 若为 secondary 子模型，尝试与 oldSubmodels 比对以决定 create 或 update；返回非空的新数据数组。
 *
 * en-US: Generate (or update) submodel datasets for a life cycle model.
 * Pipeline:
 *  1) Read the reference node (refProcessNodeId) and all processInstance items;
 *  2) Batch-fetch DB processes and build dbProcessMap (with exchanges, ref exchange, and direction/flowId indices);
 *  3) Compute the reference scaling factor refScalingFactor (target/reference, optionally overridden by refTargetAmount);
 *  4) Build graph and indices from model/DB processes (buildEdgesAndIndices), then assign dependence (assignEdgeDependence);
 *  5) Traverse from the reference node to compute scaling of reachable processes (calculateScalingFactor);
 *  6) Aggregate process scaling onto edges (buildEdgeScaling) to get sumScalingFactorByNodeId;
 *  7) Split nodes into child processes by allocation (allocatedProcess) and mark final product types (assignFinalProductTypes);
 *  8) For each "final product" child, collect its subproduct chain (getFinalProductGroup),
 *     filter connected exchanges to avoid double counting, sum exchanges (sumProcessExchange),
 *     compute LCIA results, and assemble final data for primary/secondary groups;
 *  9) For secondary, compare with oldSubmodels to decide create vs update; return non-null results.
 *
 * 参数 / Params:
 * - id: string 主模型（primary）在更新时使用的固定 ID；用于 primary 子模型的覆盖更新。
 * - refTargetAmount: number | null 若提供则覆盖参考节点的目标量，用于计算 refScalingFactor；否则使用参考交换 meanAmount。
 * - data: any 生命周期模型原始数据（包含 lifeCycleModelInformation/...）。
 * - oldSubmodels: any[] 历史子模型列表，用于 secondary 子模型的去重/更新匹配。
 *
 * 返回 / Returns:
 * - Promise<any[]> 生成的新/更新的子模型数据数组（过滤掉 null 的项）。
 *
 * 前置条件 / Preconditions:
 * - data.lifeCycleModelInformation.quantitativeReference.referenceToReferenceProcess 存在；
 * - processes 表可查询到模型中引用的数据库进程（id/version 对应）；
 * - LCIAResultCalculation 可对汇总后的 exchanges 正常计算 LCIA。
 *
 * 复杂度 / Complexity:
 * - 主要由建图与遍历 O(E + V) 及每个最终产品分组的汇总与 LCIA 计算组成，整体与图规模和子产品条数线性相关。
 *
 * 副作用 / Side effects:
 * - 进行外部数据库查询与 LCIA 计算；向控制台输出日志；
 * - 不修改传入的 data/oldSubmodels；函数内部对边与缓存结构的修改限于局部作用域。
 *
 * 注意 / Notes:
 * - 当 refTargetAmount 为 0 或参考量为 0 时，refScalingFactor 退化为 1；
 * - primary 组会以传入 id 与目标量覆盖参考交换金额；secondary 组根据 oldSubmodels 做更新匹配。
 */
export async function genLifeCycleModelProcesses(
  id: string,
  modelNodes: any[],
  lifeCycleModelJsonOrdered: any,
  oldSubmodels: any[],
) {
  const refProcessNodeId =
    lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
      ?.quantitativeReference?.referenceToReferenceProcess;

  if (!refProcessNodeId) {
    throw new Error('No referenceToReferenceProcess found in lifeCycleModelInformation');
  }

  const refNode = modelNodes?.find((i: any) => i?.data?.quantitativeReference === '1');

  const refTargetAmount = toAmountNumber(refNode?.data?.targetAmount);

  const mdProcesses = jsonToList(
    lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation?.technology
      ?.processes?.processInstance,
  );

  const mdProcessMap = new Map<string, any>();
  for (const p of mdProcesses as any[]) {
    const nid = p?.['@dataSetInternalID'];
    if (nid) mdProcessMap.set(nid, p);
  }

  const refMdProcess = mdProcessMap.get(refProcessNodeId);

  const processKeys = mdProcesses.map((p: any) => {
    return {
      id: p?.referenceToProcess?.['@refObjectId'],
      version: p?.referenceToProcess?.['@version'],
    };
  });
  const orConditions = processKeys
    .map((k) => `and(id.eq.${k.id},version.eq.${k.version})`)
    .join(',');
  const dbProcesses =
    processKeys.length === 0
      ? []
      : ((
          await supabase
            .from('processes')
            .select(
              `
      id,
      version,
      json->processDataSet->processInformation->quantitativeReference,
      json->processDataSet->exchanges->exchange
      `,
            )
            .or(orConditions)
        )?.data ?? []);

  const dbProcessMap = new Map<string, DbProcessMapValue>();

  for (const p of dbProcesses as any[]) {
    const key = dbProcessKey(p?.id, p?.version);
    const exchanges = jsonToList(p?.exchange);
    const refExchangeId = (p?.quantitativeReference as any)?.referenceToReferenceFlow ?? '';
    const refExchange = exchanges?.find((e: any) => e?.['@dataSetInternalID'] === refExchangeId);
    const flowId = refExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
    const direction =
      ((refExchange?.exchangeDirection ?? '') as string).toUpperCase() === 'INPUT'
        ? 'INPUT'
        : 'OUTPUT';

    const inputByFlowId = new Map<string, any>();
    const outputByFlowId = new Map<string, any>();
    for (const ex of exchanges) {
      const dir = String(ex?.exchangeDirection ?? '').toUpperCase();
      const fid = ex?.referenceToFlowDataSet?.['@refObjectId'];
      if (!fid) continue;
      if (dir === 'INPUT') inputByFlowId.set(fid, ex);
      else if (dir === 'OUTPUT') outputByFlowId.set(fid, ex);
    }

    const newP = {
      id: p.id,
      version: p.version,
      exchanges: exchanges,
      refExchangeMap: {
        exchangeId: refExchangeId,
        flowId,
        direction: direction as Direction,
        refExchange,
      },
      exIndex: { inputByFlowId, outputByFlowId },
    };
    dbProcessMap.set(key, newP);
  }

  const refProcessKey = dbProcessKey(
    refMdProcess?.referenceToProcess?.['@refObjectId'],
    refMdProcess?.referenceToProcess?.['@version'],
  );

  const refDbProcess = dbProcessMap.get(refProcessKey);
  const refModelExchange = refDbProcess?.refExchangeMap;

  if (!refDbProcess) {
    throw new Error('Reference process not found in database');
  }

  const refModelMeanAmount = toAmountNumber(refModelExchange?.refExchange?.meanAmount);

  const modelTargetAmount = refTargetAmount ?? refModelMeanAmount;

  let refScalingFactor = 1;

  if (refModelMeanAmount !== 0 && modelTargetAmount !== 0) {
    refScalingFactor = new BigNumber(modelTargetAmount).div(refModelMeanAmount).toNumber();
  }
  const { up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput } = buildEdgesAndIndices(
    mdProcesses,
    dbProcessMap,
  );

  assignEdgeDependence(
    up2DownEdges,
    edgesByDownstreamInput,
    edgesByUpstreamOutput,
    refProcessNodeId,
  );

  const processScalingFactors = calculateScalingFactor(
    refMdProcess,
    refDbProcess,
    {
      direction: '',
      nodeId: '',
      flowUUID: '',
      edgeId: '',
    },
    refScalingFactor,
    edgesByDownstreamInput,
    edgesByUpstreamOutput,
    mdProcessMap,
    dbProcessMap,
  );

  const sumAmountMap = sumAmountByNodeId(processScalingFactors);

  // const noneDependenceEdges = up2DownEdges.filter((e) => e.dependence === 'none');
  // if (noneDependenceEdges.length > 0) {
  //   noneDependenceEdges.forEach((e) => {
  //     console.warn('Found edge with no dependence:', e);
  //   });
  // }

  // up2DownEdges.forEach((edge) => {
  //   const downstream = sumAmountMap.get(edge.downstreamId);
  //   const upstream = sumAmountMap.get(edge.upstreamId);
  //   if (!downstream || !upstream) return;

  //   const inputExchange = downstream.exchanges?.find(
  //     (ex: any) =>
  //       ex.exchangeDirection?.toUpperCase() === 'INPUT' &&
  //       ex.referenceToFlowDataSet?.['@refObjectId'] === edge.flowUUID,
  //   );

  //   const outputExchange = upstream.exchanges?.find(
  //     (ex: any) =>
  //       ex.exchangeDirection?.toUpperCase() === 'OUTPUT' &&
  //       ex.referenceToFlowDataSet?.['@refObjectId'] === edge.flowUUID,
  //   );

  //   edge.inputAmount = toAmountNumber(inputExchange?.meanAmount) * (downstream?.scalingFactor ?? 1);
  // });

  // console.log('up2DownEdges', up2DownEdges, 'processScalingFactors', processScalingFactors, 'sumAmountMap', sumAmountMap);

  // return;

  // const exchangeUsageRate = calculateExchangeUsageRate(sumAmountMap, up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput);

  // const splitedExchanges = splitExchange(sumAmountMap, up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput);

  // console.log('processScalingFactors', processScalingFactors);
  // console.log('up2DownEdges', up2DownEdges);
  // console.log('sumAmountProcesses', sumAmountMap);

  // const calculatedEdges = up2DownEdges.reduce(
  //   (acc: Map<string, any>, e) => {
  //     const downstream = sumAmountMap.get(e.downstreamId);
  //     const upstream = sumAmountMap.get(e.upstreamId);
  //     if (!downstream || !upstream) return acc;

  //     const inputExchange = downstream.exchanges?.find(
  //       (ex: any) =>
  //         String(ex.exchangeDirection ?? '').toUpperCase() === 'INPUT' &&
  //         ex.referenceToFlowDataSet?.['@refObjectId'] === e.flowUUID,
  //     );

  //     const outputExchange = upstream.exchanges?.find(
  //       (ex: any) =>
  //         String(ex.exchangeDirection ?? '').toUpperCase() === 'OUTPUT' &&
  //         ex.referenceToFlowDataSet?.['@refObjectId'] === e.flowUUID,
  //     );

  //     let outputAmount = new BigNumber(0);
  //     let inputAmount = new BigNumber(0);

  //     if (e.dependence === 'downstream' || e.mainDependence === 'downstream') {
  //       outputAmount = new BigNumber(outputExchange?.meanAmount ?? 0).times(
  //         e?.scalingFactor ?? 1,
  //       );
  //       inputAmount = new BigNumber(inputExchange?.meanAmount ?? 0).times(
  //         downstream?.scalingFactor ?? 1,
  //       );
  //     } else if (e.dependence === 'upstream' || e.mainDependence === 'upstream') {
  //       outputAmount = new BigNumber(outputExchange?.meanAmount ?? 0).times(
  //         upstream?.scalingFactor ?? 1,
  //       );
  //       inputAmount = new BigNumber(inputExchange?.meanAmount ?? 0).times(
  //         e?.scalingFactor ?? 1,
  //       );
  //     }
  //     const outZero = outputAmount.isZero();
  //     const inZero = inputAmount.isZero();
  //     let isBalanced = false;
  //     if (outZero && inZero) {
  //       isBalanced = true;
  //     } else if (!outZero && !inZero) {
  //       const divAmount = outputAmount.div(inputAmount).toNumber();
  //       isBalanced = divAmount <= 1.000001 && divAmount >= 0.999999;
  //     } else {
  //       isBalanced = false;
  //     }

  //     if (!isBalanced) {
  //       const diffAmount = outputAmount.minus(inputAmount).toNumber();
  //       const targetNode = diffAmount > 0 ? upstream : downstream;
  //       const targetExchange = diffAmount > 0 ? outputExchange : inputExchange;
  //       if (!targetNode) return acc;

  //       const nodeKey = targetNode?.nodeId ?? targetNode?.['@dataSetInternalID'] ?? '';
  //       if (!nodeKey) return acc;

  //       const existing = acc.get(nodeKey);
  //       const baseNode = existing ?? { ...targetNode, exchanges: [] };

  //       baseNode.exchanges = [
  //         ...(baseNode.exchanges ?? []),
  //         {
  //           ...(targetExchange ?? {}),
  //           diffAmount: Math.abs(diffAmount),
  //         },
  //       ];

  //       acc.set(nodeKey, baseNode);
  //     }

  //     return acc;
  //   },
  //   new Map<string, any>()
  // );

  // console.log('calculatedEdges', calculatedEdges);

  const allocatedProcesses = assignFinalProductTypes(
    allocatedProcess(sumAmountMap),
    up2DownEdges,
    refProcessNodeId,
  );

  const hasFinalProductProcesses = allocatedProcesses.filter(
    (cpe: any) => cpe?.finalProductType === 'has',
  );

  const inputFlowsByNodeId = new Map<string, Set<string>>();
  const outputFlowsByNodeId = new Map<string, Set<string>>();
  for (const ud of up2DownEdges as Up2DownEdge[]) {
    if (!ud) continue;
    if (ud.downstreamId && ud.flowUUID) {
      const set = inputFlowsByNodeId.get(ud.downstreamId) ?? new Set<string>();
      set.add(ud.flowUUID);
      inputFlowsByNodeId.set(ud.downstreamId, set);
    }
    if (ud.upstreamId && ud.flowUUID) {
      const set = outputFlowsByNodeId.get(ud.upstreamId) ?? new Set<string>();
      set.add(ud.flowUUID);
      outputFlowsByNodeId.set(ud.upstreamId, set);
    }
  }

  const sumFinalProductGroups = await Promise.all(
    hasFinalProductProcesses.map(async (hasFinalProductProcess: any) => {
      const finalProductGroup = getFinalProductGroup(
        hasFinalProductProcess,
        1,
        1,
        allocatedProcesses,
        up2DownEdges,
      );

      if (finalProductGroup?.length > 0) {
        let newSumExchanges: any = [];

        //先计算每个exchange最终的量
        const calculatedProcessExchanges = finalProductGroup.map((p) => {
          return calculateProcess(p);
        });

        //汇总连接的exchange，判断是否平衡，保留不平衡的exchange
        // const connectedProcessExchanges = calculatedProcessExchanges.forEach((cpe: any) => {
        //   console.log('cpe', cpe);
        // });

        const unconnectedProcessExchanges = calculatedProcessExchanges.map((npe: any) => {
          const nodeId = npe?.nodeId;
          const connectedInputSet = nodeId
            ? (inputFlowsByNodeId.get(nodeId) ?? new Set<string>())
            : new Set<string>();
          const connectedOutputSet = nodeId
            ? (outputFlowsByNodeId.get(nodeId) ?? new Set<string>())
            : new Set<string>();

          const npeExchanges = npe?.exchanges ?? [];
          const unconnectedExchanges = npeExchanges.filter((e: any) => {
            const dir = String(e?.exchangeDirection ?? '').toUpperCase();
            const flowId = e?.referenceToFlowDataSet?.['@refObjectId'];
            if (!flowId) return true;
            if (dir === 'INPUT' && connectedInputSet.has(flowId)) return false;
            if (dir === 'OUTPUT' && connectedOutputSet.has(flowId)) return false;
            return true;
          });

          return {
            ...npe,
            exchanges: unconnectedExchanges,
          };
        });

        // console.log('unconnectedProcessExchanges', unconnectedProcessExchanges);

        if (unconnectedProcessExchanges.length > 0) {
          newSumExchanges = sumProcessExchange(unconnectedProcessExchanges).map(
            (e: any, index: number) => {
              return {
                ...e,
                meanAmount: toAmountNumber(e?.meanAmount),
                resultingAmount: toAmountNumber(e?.resultingAmount),
                '@dataSetInternalID': (index + 1).toString(),
              };
            },
          );

          const finalProductProcessExchange = unconnectedProcessExchanges.find(
            (npe: any) => npe?.finalProductType === 'has',
          );

          let finalId: any = {
            nodeId: finalProductProcessExchange?.nodeId ?? '',
            processId: finalProductProcessExchange?.processId ?? '',
          };
          if (finalProductProcessExchange?.isAllocated) {
            finalId = {
              ...finalId,
              allocatedExchangeFlowId: finalProductProcessExchange?.allocatedExchangeFlowId ?? '',
              allocatedExchangeDirection:
                finalProductProcessExchange?.allocatedExchangeDirection ?? '',
            };
          } else {
            finalId = {
              ...finalId,
              referenceToFlowDataSet: {
                '@refObjectId': refModelExchange?.flowId ?? '',
                '@exchangeDirection': refModelExchange?.direction ?? '',
              },
            };
          }

          const isPrimaryGroup =
            finalProductProcessExchange?.nodeId === refProcessNodeId &&
            finalProductProcessExchange?.allocatedExchangeId === refModelExchange?.exchangeId;

          let type: 'primary' | 'secondary' = isPrimaryGroup ? 'primary' : 'secondary';
          let option: 'create' | 'update' = isPrimaryGroup ? 'update' : 'create';
          let newId = isPrimaryGroup ? id : v4();

          const refFlowId = refModelExchange?.flowId ?? '';
          const refDirection = String(refModelExchange?.direction ?? '').toUpperCase();

          const newExchanges = newSumExchanges.map((e: any) => {
            const dir = String(e?.exchangeDirection ?? '').toUpperCase();
            const flowId = e?.referenceToFlowDataSet?.['@refObjectId'];
            const isRefMatch = isPrimaryGroup && flowId === refFlowId && dir === refDirection;
            return {
              ...e,
              allocatedFraction: undefined,
              allocations: undefined,
              meanAmount: (isRefMatch ? modelTargetAmount : e?.meanAmount)?.toString(),
              resultingAmount: (isRefMatch ? modelTargetAmount : e?.resultingAmount)?.toString(),
            };
          });

          const LCIAResults = await LCIAResultCalculation(newExchanges);

          // log execution time for LCIAResultCalculation
          // const __lciaLabel = `[LCIA] LCIAResultCalculation (exchanges=${Array.isArray(newExchanges) ? newExchanges.length : 'n/a'}, type=${type}, id=${newId})`;
          // console.time(__lciaLabel);
          // let LCIAResults: any;
          // try {
          //   LCIAResults = await LCIAResultCalculation(newExchanges);
          // } finally {
          //   console.timeEnd(__lciaLabel);
          // }

          if (type === 'secondary') {
            const oldProcesses = oldSubmodels?.find(
              (o: any) =>
                o.type === 'secondary' &&
                o.finalId.nodeId === finalId.nodeId &&
                o.finalId.processId === finalId.processId &&
                o.finalId.allocatedExchangeDirection === finalId.allocatedExchangeDirection &&
                o.finalId.allocatedExchangeFlowId === finalId.allocatedExchangeFlowId,
            );
            if (oldProcesses && oldProcesses.id.length > 0) {
              option = 'update';
              newId = oldProcesses.id;
            }
          }

          const refExchange = newExchanges.find((e: any) => e?.quantitativeReference);

          const subproductPrefix = [
            { '@xml:lang': 'zh', '#text': '子产品: ' },
            { '@xml:lang': 'en', '#text': 'Subproduct: ' },
          ];
          const subproductLeftBracket = [
            { '@xml:lang': 'zh', '#text': '[' },
            { '@xml:lang': 'en', '#text': '[' },
          ];
          const subproductRightBracket = [
            { '@xml:lang': 'zh', '#text': '] ' },
            { '@xml:lang': 'en', '#text': '] ' },
          ];

          const baseName =
            type === 'primary'
              ? lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                  ?.dataSetInformation?.name?.baseName
              : mergeLangArrays(
                  subproductLeftBracket,
                  subproductPrefix,
                  jsonToList(refExchange?.referenceToFlowDataSet['common:shortDescription']),
                  subproductRightBracket,
                  jsonToList(
                    lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                      ?.dataSetInformation?.name?.baseName,
                  ),
                );
          const newData = removeEmptyObjects({
            option: option,
            modelInfo: {
              id: newId,
              type: type,
              finalId: finalId,
            },
            data: {
              processDataSet: {
                processInformation: {
                  dataSetInformation: {
                    'common:UUID': newId,
                    name: {
                      baseName: baseName,
                      treatmentStandardsRoutes:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.name?.treatmentStandardsRoutes,
                      mixAndLocationTypes:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.name?.mixAndLocationTypes,
                      functionalUnitFlowProperties:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.name?.functionalUnitFlowProperties,
                    },
                    identifierOfSubDataSet:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.dataSetInformation?.identifierOfSubDataSet,
                    'common:synonyms':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.dataSetInformation?.['common:synonyms'],
                    classificationInformation: {
                      'common:classification': {
                        'common:class':
                          lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                            ?.lifeCycleModelInformation?.dataSetInformation
                            ?.classificationInformation?.['common:classification']?.[
                            'common:class'
                          ],
                      },
                    },
                    'common:generalComment':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.dataSetInformation?.['common:generalComment'],
                    referenceToExternalDocumentation: {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.referenceToExternalDocumentation?.[
                          '@refObjectId'
                        ] ?? {},
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.referenceToExternalDocumentation?.['@type'] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.referenceToExternalDocumentation?.['@uri'] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.referenceToExternalDocumentation?.['@version'] ??
                        {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.dataSetInformation?.referenceToExternalDocumentation?.[
                          'common:shortDescription'
                        ],
                    },
                  },
                  // quantitativeReference: {
                  //   '@type': refDbProcess?.quantitativeReference?.['@type'],
                  //   referenceToReferenceFlow: referenceToReferenceFlow?.['@dataSetInternalID'],
                  //   functionalUnitOrOther:
                  //     refDbProcess?.quantitativeReference?.functionalUnitOrOther,
                  // },
                  time: {
                    'common:referenceYear':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.time?.['common:referenceYear'] ?? {},
                    'common:dataSetValidUntil':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.time?.['common:dataSetValidUntil'],
                    'common:timeRepresentativenessDescription':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.time?.['common:timeRepresentativenessDescription'],
                  },
                  geography: {
                    locationOfOperationSupplyOrProduction: {
                      '@location':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.geography?.locationOfOperationSupplyOrProduction?.['@location'] ===
                        'NULL'
                          ? {}
                          : (lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                              ?.lifeCycleModelInformation?.geography
                              ?.locationOfOperationSupplyOrProduction?.['@location'] ?? {}),
                      descriptionOfRestrictions:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.geography?.locationOfOperationSupplyOrProduction
                          ?.descriptionOfRestrictions,
                    },
                    subLocationOfOperationSupplyOrProduction: {
                      '@subLocation':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.geography?.subLocationOfOperationSupplyOrProduction?.[
                          '@subLocation'
                        ] === 'NULL'
                          ? {}
                          : (lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                              ?.lifeCycleModelInformation?.geography
                              ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] ?? {}),
                      descriptionOfRestrictions:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.geography?.subLocationOfOperationSupplyOrProduction
                          ?.descriptionOfRestrictions,
                    },
                  },
                  technology: {
                    technologyDescriptionAndIncludedProcesses:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.technology?.technologyDescriptionAndIncludedProcesses,
                    technologicalApplicability:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.technology?.technologicalApplicability,
                    referenceToTechnologyPictogramme: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyPictogramme?.['@type'],
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyPictogramme?.['@refObjectId'],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyPictogramme?.['@version'],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyPictogramme?.['@uri'],
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyPictogramme?.[
                          'common:shortDescription'
                        ],
                    },
                    referenceToTechnologyFlowDiagrammOrPicture: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.['@version'],
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                          '@refObjectId'
                        ],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'],
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.technology?.referenceToTechnologyFlowDiagrammOrPicture?.[
                          'common:shortDescription'
                        ],
                    },
                  },
                  mathematicalRelations: {
                    modelDescription:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                        ?.mathematicalRelations?.modelDescription,
                    variableParameter: {
                      '@name':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.['@name'],
                      formula:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.formula,
                      meanValue:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.meanValue,
                      minimumValue:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.minimumValue,
                      maximumValue:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.maximumValue,
                      uncertaintyDistributionType:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.uncertaintyDistributionType,
                      relativeStandardDeviation95In:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.relativeStandardDeviation95In,
                      comment:
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.lifeCycleModelInformation
                          ?.mathematicalRelations?.variableParameter?.comment,
                    },
                  },
                },
                modellingAndValidation: {
                  LCIMethodAndAllocation: {
                    typeOfDataSet:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
                    LCIMethodPrinciple:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.LCIMethodPrinciple ?? {},
                    deviationsFromLCIMethodPrinciple:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.deviationsFromLCIMethodPrinciple,
                    LCIMethodApproaches:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.LCIMethodApproaches ?? {},
                    deviationsFromLCIMethodApproaches:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.deviationsFromLCIMethodApproaches,
                    modellingConstants:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.modellingConstants,
                    deviationsFromModellingConstants:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.LCIMethodAndAllocation?.deviationsFromModellingConstants,
                    referenceToLCAMethodDetails: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.['@type'] ?? {},
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.['@refObjectId'] ??
                        {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.['@uri'] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.['@version'] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.LCIMethodAndAllocation?.referenceToLCAMethodDetails?.[
                          'common:shortDescription'
                        ],
                    },
                  },
                  dataSourcesTreatmentAndRepresentativeness: {
                    dataCutOffAndCompletenessPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataCutOffAndCompletenessPrinciples,
                    deviationsFromCutOffAndCompletenessPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromCutOffAndCompletenessPrinciples,
                    dataSelectionAndCombinationPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataSelectionAndCombinationPrinciples,
                    deviationsFromSelectionAndCombinationPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromSelectionAndCombinationPrinciples,
                    dataTreatmentAndExtrapolationsPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataTreatmentAndExtrapolationsPrinciples,
                    deviationsFromTreatmentAndExtrapolationPrinciples:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromTreatmentAndExtrapolationPrinciples,
                    referenceToDataHandlingPrinciples: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@type'] ?? {},
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@refObjectId'] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@uri'] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@version'] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['common:shortDescription'],
                    },
                    referenceToDataSource: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource?.[
                          '@type'
                        ] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource?.[
                          '@version'
                        ] ?? {},
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource?.[
                          '@refObjectId'
                        ] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource?.[
                          '@uri'
                        ] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.dataSourcesTreatmentAndRepresentativeness?.referenceToDataSource?.[
                          'common:shortDescription'
                        ],
                    },
                    percentageSupplyOrProductionCovered:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness
                        ?.percentageSupplyOrProductionCovered ?? {},
                    annualSupplyOrProductionVolume:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness?.annualSupplyOrProductionVolume,
                    samplingProcedure:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness?.samplingProcedure,
                    dataCollectionPeriod:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness?.dataCollectionPeriod,
                    uncertaintyAdjustments:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness?.uncertaintyAdjustments,
                    useAdviceForDataSet:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.dataSourcesTreatmentAndRepresentativeness?.useAdviceForDataSet,
                  },
                  completeness: {
                    completenessProductModel:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.completeness?.completenessProductModel,
                    completenessElementaryFlows: {
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.completeness?.completenessElementaryFlows?.['@type'],
                      '@value':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                          ?.completeness?.completenessElementaryFlows?.['@value'],
                    },
                    completenessOtherProblemField:
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                        ?.completeness?.completenessOtherProblemField,
                    // completenessDescription: getLangJson(
                    //   lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation?.completeness?.completenessDescription,
                    // ),
                  },
                  validation: {
                    ...lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                      ?.validation,
                  },
                  complianceDeclarations: {
                    ...lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.modellingAndValidation
                      ?.complianceDeclarations,
                  },
                },
                administrativeInformation: {
                  ['common:commissionerAndGoal']: {
                    'common:referenceToCommissioner': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                          ?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                          ?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@type'] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                          ?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@uri'] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                          ?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet
                          ?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['common:shortDescription'],
                    },
                    'common:project':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation?.[
                        'common:commissionerAndGoal'
                      ]?.['common:project'],
                    'common:intendedApplications':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation?.[
                        'common:commissionerAndGoal'
                      ]?.['common:intendedApplications'],
                  },
                  dataGenerator: {
                    'common:referenceToPersonOrEntityGeneratingTheDataSet': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@refObjectId'],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@type'],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@uri'],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@version'],
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['common:shortDescription'],
                    },
                  },
                  dataEntryBy: {
                    'common:timeStamp':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.dataEntryBy?.['common:timeStamp'],
                    'common:referenceToDataSetFormat': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@refObjectId'],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@type'],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@uri'],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetFormat']?.['@version'] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetFormat']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:referenceToConvertedOriginalDataSetFrom': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToConvertedOriginalDataSetFrom']?.[
                          '@refObjectId'
                        ],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToConvertedOriginalDataSetFrom']?.[
                          '@type'
                        ],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToConvertedOriginalDataSetFrom']?.[
                          '@uri'
                        ],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToConvertedOriginalDataSetFrom']?.[
                          '@version'
                        ] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToConvertedOriginalDataSetFrom']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:referenceToPersonOrEntityEnteringTheData': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToPersonOrEntityEnteringTheData']?.[
                          '@refObjectId'
                        ],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToPersonOrEntityEnteringTheData']?.[
                          '@type'
                        ],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToPersonOrEntityEnteringTheData']?.[
                          '@uri'
                        ],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToPersonOrEntityEnteringTheData']?.[
                          '@version'
                        ] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToPersonOrEntityEnteringTheData']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:referenceToDataSetUseApproval': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetUseApproval']?.['@refObjectId'],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetUseApproval']?.['@type'],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetUseApproval']?.['@uri'],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetUseApproval']?.['@version'] ??
                        {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.dataEntryBy?.['common:referenceToDataSetUseApproval']?.[
                          'common:shortDescription'
                        ],
                    },
                  },
                  publicationAndOwnership: {
                    'common:dateOfLastRevision':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:dateOfLastRevision'] ?? {},
                    'common:dataSetVersion':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:dataSetVersion'],
                    'common:permanentDataSetURI':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:permanentDataSetURI'] ?? {},
                    'common:workflowAndPublicationStatus':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:workflowAndPublicationStatus'] ?? {},
                    'common:referenceToUnchangedRepublication': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToUnchangedRepublication']?.[
                          '@refObjectId'
                        ] ?? {},
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToUnchangedRepublication']?.[
                          '@type'
                        ] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToUnchangedRepublication']?.[
                          '@uri'
                        ] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToUnchangedRepublication']?.[
                          '@version'
                        ] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToUnchangedRepublication']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:referenceToRegistrationAuthority': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToRegistrationAuthority']?.[
                          '@refObjectId'
                        ] ?? {},
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToRegistrationAuthority']?.[
                          '@type'
                        ] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToRegistrationAuthority']?.[
                          '@uri'
                        ] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToRegistrationAuthority']?.[
                          '@version'
                        ] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToRegistrationAuthority']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:registrationNumber':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:registrationNumber'] ?? {},
                    'common:referenceToOwnershipOfDataSet': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']?.[
                          '@refObjectId'
                        ],
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']?.[
                          '@type'
                        ],
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']?.[
                          '@uri'
                        ],
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']?.[
                          '@version'
                        ],
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.['common:referenceToOwnershipOfDataSet']?.[
                          'common:shortDescription'
                        ],
                    },
                    'common:copyright':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:copyright'],
                    'common:referenceToEntitiesWithExclusiveAccess': {
                      '@refObjectId':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@type'] ?? {},
                      '@uri':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@uri'] ?? {},
                      '@version':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                          ?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['common:shortDescription'],
                    },
                    'common:licenseType':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:licenseType'],
                    'common:accessRestrictions':
                      lifeCycleModelJsonOrdered?.lifeCycleModelDataSet?.administrativeInformation
                        ?.publicationAndOwnership?.['common:accessRestrictions'],
                  },
                },
                exchanges: {
                  exchange: newExchanges,
                },
                LCIAResults: {
                  LCIAResult: LCIAResults,
                },
              },
            },
          });

          // if (type === 'primary') {
          //   console.log('primary newData', newData);
          // }

          return newData;
        }
      }
      return null;
    }),
  );

  const newProcessInstance = mdProcesses.map((mdProcess) => {
    return removeEmptyObjects({
      '@dataSetInternalID': mdProcess?.['@dataSetInternalID'] ?? {},
      '@multiplicationFactor':
        sumAmountMap.get(mdProcess?.['@dataSetInternalID'])?.scalingFactor?.toString() ?? {},
      referenceToProcess: mdProcess?.referenceToProcess,
      groups: mdProcess?.groups,
      parameters: mdProcess.parameters,
      connections: mdProcess.connections,
    });
  });

  lifeCycleModelJsonOrdered.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance =
    listToJson(newProcessInstance);

  return { lifeCycleModelProcesses: sumFinalProductGroups.filter((item) => item !== null) };
}
