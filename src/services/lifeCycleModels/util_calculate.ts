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
import { allocateSupplyToDemand } from './util_allocate_supply_demand';

/**
 * zh-CN: 交换方向，仅 'INPUT' | 'OUTPUT'。
 * en-US: Exchange direction: 'INPUT' | 'OUTPUT'.
 */
type Direction = 'INPUT' | 'OUTPUT';

/**
 * zh-CN: 数据库进程的内存结构（用于建图与快速匹配）。
 * - id/version: 唯一标识
 * - exchanges: 展平交换列表
 * - refExchangeMap: 定量参考交换信息
 * - exIndex: 按方向+flowId 的索引（可选）
 *
 * en-US: In-memory DB process shape (for graph/lookup).
 * - id/version: identifiers
 * - exchanges: flattened exchanges
 * - refExchangeMap: quantitative reference info
 * - exIndex: indices by direction+flowId (optional)
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
 * zh-CN: 生成 `${id}@${version}` 键，用于进程查找/去重。
 * en-US: Build key `${id}@${version}` for process lookup/dedup.
 * Params: id?: string, version?: string
 * Returns: string
 */
const dbProcessKey = (id?: string, version?: string) => `${id ?? ''}@${version ?? ''}`;

/**
 * zh-CN: 按方向与允许的 flow 集合，从交换中选择分配比例最大的 flowId。
 * en-US: From exchanges, by direction and allowed flows, pick flowId with max allocatedFraction.
 * Params: dbExchanges: any[] | undefined; direction: Direction; allowedFlowIds: Set<string>
 * Returns: string ('' if none)
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

    const flowId: string | undefined = e?.referenceToFlowDataSet?.['@refObjectId'];
    if (!flowId || !allowedFlowIds.has(flowId)) continue;

    const af = e?.allocations?.allocation?.['@allocatedFraction'];

    if (bestAF === undefined) {
      bestAF = af;
      bestFlowId = flowId;
      continue;
    }

    if (af !== undefined && af !== null && bestAF !== undefined && bestAF !== null) {
      if (comparePercentDesc(af, bestAF) < 0) {
        bestAF = af;
        bestFlowId = flowId;
      }
    }
  }
  return bestFlowId;
};

/**
 * zh-CN: 选择节点主输入流 flowUUID（优先参考交换；否则取分配比例最大的 INPUT 流）。
 * en-US: Pick main INPUT flowUUID (prefer ref exchange; else max allocatedFraction among INPUTs).
 * Params: inputEdges: Up2DownEdge[]; dbProccess?: DbProcessMapValue
 * Returns: string
 */
const getMainInputFlowUUID = (
  inputEdges: Up2DownEdge[],
  dbProccess: DbProcessMapValue | undefined,
): string => {
  if (!inputEdges || inputEdges.length === 0) return '';
  if (inputEdges.length === 1) return inputEdges[0]?.flowUUID ?? '';

  const refExchange = dbProccess?.refExchangeMap;
  if (refExchange && refExchange.direction === 'INPUT') {
    const refFlowId = refExchange.flowId;
    if (refFlowId && inputEdges.some((ie) => ie?.flowUUID === refFlowId)) return refFlowId;
  }

  // Build the flow set without creating intermediate arrays
  const inputEdgeFlowIdSet = new Set<string>();
  for (const ie of inputEdges) {
    const fid = ie?.flowUUID;
    if (fid) inputEdgeFlowIdSet.add(fid);
  }
  const best = selectMaxAllocatedFlowId(dbProccess?.exchanges ?? [], 'INPUT', inputEdgeFlowIdSet);
  return best ?? '';
};

/**
 * zh-CN: 选择模型进程主输出流 flowUUID（优先参考 OUTPUT；否则取分配比例最大的 OUTPUT）。
 * en-US: Choose main OUTPUT flowUUID (prefer ref OUTPUT; else max allocatedFraction among OUTPUTs).
 * Params: mdProcessOutputExchanges: any[]; dbProccess?: DbProcessMapValue
 * Returns: string
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
  const flowIdSet = new Set<string>();
  let preferredRefFlow: string | '' = '';

  for (const o of mdProcessOutputExchanges as any[]) {
    const fid = o?.['@flowUUID'];
    if (!fid) continue;
    flowIdSet.add(fid);
    if (
      !preferredRefFlow &&
      refExchange &&
      refExchange.direction === 'OUTPUT' &&
      fid === refExchange.flowId
    ) {
      preferredRefFlow = fid;
    }
  }
  if (preferredRefFlow) return preferredRefFlow;

  return selectMaxAllocatedFlowId(dbProccess?.exchanges ?? [], 'OUTPUT', flowIdSet);
};

/**
 * zh-CN: 基于模型进程构建边与索引，并确定每个节点的主输出/主输入流。
 * en-US: Build edges/indices from model processes and set each node's main output/input flow.
 * Params: mdProcesses: any[]; dbProcessMap: Map<string, DbProcessMapValue>
 * Returns: { up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput }
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
    const upstreamId = mdProcess?.['@dataSetInternalID'];
    const upstreamNodeId = mdProcess?.nodeId;
    const mdProcessOutputExchanges = jsonToList(mdProcess?.connections?.outputExchange);
    const refTo = mdProcess?.['referenceToProcess'] as any;
    const dbKey = dbProcessKey(refTo?.['@refObjectId'], refTo?.['@version']);
    const mainOutputFlowUUID = getMainOutputFlowUUID(
      mdProcessOutputExchanges,
      dbProcessMap.get(dbKey),
    );

    for (const o of mdProcessOutputExchanges) {
      const flowUUID = o?.['@flowUUID'];
      const downstreamList = jsonToList(o?.downstreamProcess)?.map((d: any) => {
        const downstreamNode = mdProcesses.find(
          (p: any) => p?.['@dataSetInternalID'] === d?.['@id'],
        );
        return {
          ...d,
          nodeId: downstreamNode?.nodeId,
        };
      });

      for (const dp of downstreamList) {
        const downstreamId = dp?.['@id'];
        const downstreamNodeId = dp?.nodeId;
        const edge: Up2DownEdge = {
          id: `${upstreamId}->${downstreamId}:${flowUUID}`,
          flowUUID,
          upstreamId,
          upstreamNodeId,
          downstreamId,
          downstreamNodeId,
          mainOutputFlowUUID,
          mainInputFlowUUID: '',
        };
        up2DownEdges.push(edge);

        // push to edgesByDownstreamInput
        let dsArr = edgesByDownstreamInput.get(downstreamId);
        if (!dsArr) {
          dsArr = [];
          edgesByDownstreamInput.set(downstreamId, dsArr);
        }
        dsArr.push(edge);

        // push to edgesByUpstreamOutput
        let usArr = edgesByUpstreamOutput.get(upstreamId);
        if (!usArr) {
          usArr = [];
          edgesByUpstreamOutput.set(upstreamId, usArr);
        }
        usArr.push(edge);
      }
    }
  }

  // 2) For each node, derive main input flow and write back to its input edges
  for (const mdProcess of mdProcesses as any[]) {
    const mdNodeId = mdProcess?.['@dataSetInternalID'];
    const inputEdges = edgesByDownstreamInput.get(mdNodeId) ?? [];

    if (inputEdges.length > 0) {
      const refTo = mdProcess?.['referenceToProcess'] as any;
      const key = dbProcessKey(refTo?.['@refObjectId'], refTo?.['@version']);
      const mainInputFlowUUID = getMainInputFlowUUID(inputEdges, dbProcessMap.get(key));
      for (const ie of inputEdges) {
        ie.mainInputFlowUUID = mainInputFlowUUID;
      }
    }
  }

  return { up2DownEdges, edgesByDownstreamInput, edgesByUpstreamOutput };
}

/**
 * zh-CN: 从参考节点出发，交替按层扩散并标注边依赖：
 *  - phaseOutput：沿节点“输入边”向上游扩散，将这些边标注为 downstream；
 *  - phaseInput：沿节点“输出边”向下游扩散，将这些边标注为 upstream；
 *  - 两阶段以“前沿(frontier)”交替推进，直到没有新增节点；支持在一条路径上交替向上/向下（例如 A→B→C→D 的“之”字形）。
 *  - 在每个节点：若同向被标注的边多于一条，则保留主流（主输出/主输入），其余置为 dependence='none' 并记录 mainDependence；
 *  - 各阶段均进行断环处理：处于回路中的对应方向的边会被置为 dependence='none' 且 isCycle=true；
 *  - 所有仍未被触达的边，最终统一置为 dependence='none'。
 *
 * en-US: Starting from the reference node, alternately expand by layers and mark edge dependence:
 *  - phaseOutput: walk incoming edges to upstream and mark them as 'downstream';
 *  - phaseInput: walk outgoing edges to downstream and mark them as 'upstream';
 *  - The two phases advance by passing the current frontier to the next, repeating until no growth.
 *    This enables zig-zag reachability along INPUT/OUTPUT (e.g., A→B→C→D).
 *  - Per node: when multiple edges of the same marked direction exist, keep only the main flow
 *    (main output/input) and set others to dependence='none' with mainDependence recorded;
 *  - Each phase breaks cycles: cycle-participating edges for that direction are set to
 *    dependence='none' and flagged with isCycle=true;
 *  - Any untouched edges at the end are set to dependence='none'.
 *
 * Params: up2DownEdges, edgesByDownstream, edgesByUpstream, refProcessNodeId, direction?: 'OUTPUT'|'INPUT'
 * Returns: void
 */
function assignEdgeDependence(
  up2DownEdges: Up2DownEdge[],
  edgesByDownstream: Map<string, Up2DownEdge[]>,
  edgesByUpstream: Map<string, Up2DownEdge[]>,
  refProcessNodeId: string,
  direction: Direction = 'OUTPUT',
): void {
  const phaseOutput = (startFrontier?: Set<string>): Set<string> => {
    const frontier =
      startFrontier && startFrontier.size > 0
        ? new Set<string>(startFrontier)
        : new Set<string>([refProcessNodeId]);
    const touchedUpNodes = new Set<string>();
    const touchedDownNodesA = new Set<string>();

    let current = frontier;
    while (current.size > 0) {
      const next = new Set<string>();
      for (const nodeId of current) {
        touchedDownNodesA.add(nodeId);
        const uds = edgesByDownstream.get(nodeId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence !== undefined) continue;
          ud.dependence = 'downstream';
          touchedUpNodes.add(ud.upstreamId);
          next.add(ud.upstreamId);
        }
      }
      current = next;
    }

    for (const upId of touchedUpNodes) {
      const uds = edgesByUpstream.get(upId);
      if (!uds || uds.length < 2) continue;
      const dsEdges = uds.filter((e) => e.dependence === 'downstream');
      if (dsEdges.length > 1) {
        for (const e of dsEdges) {
          if (e.flowUUID !== e.mainOutputFlowUUID) {
            e.dependence = 'none';
            e.mainDependence = 'downstream';
          }
        }
      }
    }

    return touchedUpNodes;
  };

  const breakDownstreamCycles = () => {
    const color = new Map<string, 0 | 1 | 2>(); // 0: unvisited, 1: visiting, 2: done

    const dfs = (nodeId: string) => {
      color.set(nodeId, 1);
      const inEdges = edgesByDownstream.get(nodeId) ?? [];
      for (const e of inEdges) {
        if (e?.dependence !== 'downstream') continue;
        const up = e.upstreamId;
        const state = color.get(up) ?? 0;
        if (state === 0) {
          dfs(up);
        } else if (state === 1) {
          e.mainDependence = 'downstream';
          e.dependence = 'none';
          e.isCycle = true;
        }
      }
      color.set(nodeId, 2);
    };

    dfs(refProcessNodeId);
  };

  // 从给定前沿（默认为参考节点）开始，沿“输出边”向下标注为 upstream；返回触达的下游节点集合
  const phaseInput = (startFrontier?: Set<string>): Set<string> => {
    const frontier =
      startFrontier && startFrontier.size > 0
        ? new Set<string>(startFrontier)
        : new Set<string>([refProcessNodeId]);
    const touchedDownNodes = new Set<string>();

    let current = frontier;
    while (current.size > 0) {
      const next = new Set<string>();
      for (const nodeId of current) {
        const uds = edgesByUpstream.get(nodeId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence !== undefined) continue;
          ud.dependence = 'upstream';
          touchedDownNodes.add(ud.downstreamId);
          next.add(ud.downstreamId);
        }
      }
      current = next;
    }

    for (const downId of touchedDownNodes) {
      const uds = edgesByDownstream.get(downId);
      if (!uds || uds.length < 2) continue;
      const usEdges = uds.filter((e) => e.dependence === 'upstream');
      if (usEdges.length > 1) {
        for (const e of usEdges) {
          if (e.flowUUID !== e.mainInputFlowUUID) {
            e.dependence = 'none';
            e.mainDependence = 'upstream';
          }
        }
      }
    }

    return touchedDownNodes;
  };

  const breakUpstreamCycles = () => {
    const color = new Map<string, 0 | 1 | 2>(); // 0: unvisited, 1: visiting, 2: done

    const dfs = (nodeId: string) => {
      color.set(nodeId, 1);
      const outEdges = edgesByUpstream.get(nodeId) ?? [];
      for (const e of outEdges) {
        if (e?.dependence !== 'upstream') continue;
        const down = e.downstreamId;
        const state = color.get(down) ?? 0;
        if (state === 0) {
          dfs(down);
        } else if (state === 1) {
          e.mainDependence = 'upstream';
          e.dependence = 'none';
          e.isCycle = true;
        }
      }
      color.set(nodeId, 2);
    };

    dfs(refProcessNodeId);
  };

  if (direction === 'OUTPUT') {
    let upFrontier = phaseOutput();
    breakDownstreamCycles();
    let guard = 0;
    while (upFrontier.size > 0 && guard++ < 1000) {
      const downFrontier = phaseInput(upFrontier);
      breakUpstreamCycles();
      if (downFrontier.size === 0) break;
      upFrontier = phaseOutput(downFrontier);
      breakDownstreamCycles();
    }
  } else {
    let downFrontier = phaseInput();
    breakUpstreamCycles();
    let guard = 0;
    while (downFrontier.size > 0 && guard++ < 1000) {
      const upFrontier = phaseOutput(downFrontier);
      breakDownstreamCycles();
      if (upFrontier.size === 0) break;
      downFrontier = phaseInput(upFrontier);
      breakUpstreamCycles();
    }
  }

  for (const e of up2DownEdges as Up2DownEdge[]) {
    if (e && e.dependence === undefined) e.dependence = 'none';
  }
}

/**
 * zh-CN: 计算下一层缩放：next = target * cur / base（防 0 处理）。
 * en-US: Compute next scaling: next = target * cur / base (guard zeros).
 * Params: targetAmount: number; baseAmount: number; curSF: number
 * Returns: { exchangeAmount, nextScalingFactor }
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
 * zh-CN: 计算 r=num/den，带容差，接近 0/1 则归一。
 * en-US: Ratio r=num/den with epsilon; snap near 0/1.
 */
const normalizeRatio = (numerator: any, denominator: any, eps = 1e-6): number => {
  const num = new BigNumber(numerator ?? 0);
  const den = new BigNumber(denominator ?? 0);
  if (!Number.isFinite(num.toNumber()) || !Number.isFinite(den.toNumber())) return 0;
  if (den.abs().lte(eps)) return 0;
  const r = num.div(den).toNumber();
  if (!Number.isFinite(r)) return 0;
  if (Math.abs(r - 1) <= eps) return 1;
  if (Math.abs(r) <= eps) return 0;
  return r;
};

/**
 * zh-CN: 从当前节点沿 dependence 标记双向遍历，按共享 flowUUID 计算并传播缩放系数。
 * en-US: From current node, traverse both ways along dependence edges; match flowUUID and propagate scaling.
 * Params: currentModelProcess, currentDatabaseProcess, dependence, scalingFactor, edgesByDownstreamInput, edgesByUpstreamOutput, mdProcessMap, dbProcessMap
 * Returns: collected process scaling records (array)
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
    mdProcess: any;
    dbProcess: DbProcessMapValue;
    dependence: any;
    scalingFactor: number;
  };

  const collectedProcesses: any[] = [];
  const stack: Frame[] = [
    {
      mdProcess: currentModelProcess,
      dbProcess: currentDatabaseProcess,
      dependence: dependence,
      scalingFactor: scalingFactor,
    },
  ];

  while (stack.length > 0) {
    const { mdProcess, dbProcess, dependence, scalingFactor } = stack.pop() as Frame;
    const nodeId = mdProcess?.['@dataSetInternalID'];

    // use Sets for O(1) membership checks
    const mainConnectExchangeIds = new Set<string | number>();
    const secondaryConnectExchangeIds = new Set<string | number>();

    if (dependence?.direction === 'downstream') {
      const dependeceExchange = dbProcess?.exIndex?.outputByFlowId.get(dependence?.flowUUID);
      mainConnectExchangeIds.add(dependeceExchange?.['@dataSetInternalID']);
    } else if (dependence?.direction === 'upstream') {
      const dependeceExchange = dbProcess?.exIndex?.inputByFlowId.get(dependence?.flowUUID);
      mainConnectExchangeIds.add(dependeceExchange?.['@dataSetInternalID']);
    }

    // Consolidate input/output edge processing to reduce duplication
    const processEdges = (edges: Up2DownEdge[] = [], isInput: boolean) => {
      for (const edge of edges) {
        const currentExchange = isInput
          ? dbProcess?.exIndex?.inputByFlowId.get(edge?.flowUUID)
          : dbProcess?.exIndex?.outputByFlowId.get(edge?.flowUUID);
        if (!currentExchange) continue;

        const expectedDependence = isInput ? 'downstream' : 'upstream';
        if (edge?.dependence !== expectedDependence) {
          if (edge?.dependence === 'none') {
            secondaryConnectExchangeIds.add(currentExchange?.['@dataSetInternalID']);
          }
          continue;
        }

        const adjacentModelProcess = isInput
          ? mdProcessMap.get(edge?.upstreamId)
          : mdProcessMap.get(edge?.downstreamId);
        if (!adjacentModelProcess) continue;

        const adjKey = dbProcessKey(
          adjacentModelProcess?.referenceToProcess?.['@refObjectId'],
          adjacentModelProcess?.referenceToProcess?.['@version'],
        );
        const adjacentDbProcess = dbProcessMap.get(adjKey);
        if (!adjacentDbProcess) continue;

        const adjacentExchange = isInput
          ? adjacentDbProcess?.exIndex?.outputByFlowId.get(edge?.flowUUID)
          : adjacentDbProcess?.exIndex?.inputByFlowId.get(edge?.flowUUID);

        const currentMean = toAmountNumber(currentExchange?.meanAmount);
        const adjacentMean = toAmountNumber(adjacentExchange?.meanAmount);
        const { exchangeAmount, nextScalingFactor } = nextScaling(
          currentMean,
          adjacentMean,
          scalingFactor,
        );

        edge.exchangeAmount = exchangeAmount;
        mainConnectExchangeIds.add(currentExchange?.['@dataSetInternalID']);

        stack.push({
          mdProcess: adjacentModelProcess,
          dbProcess: adjacentDbProcess,
          dependence: {
            direction: isInput ? 'downstream' : 'upstream',
            nodeId: nodeId,
            flowUUID: edge?.flowUUID,
            edgeId: edge?.id,
            exchangeAmount: exchangeAmount,
          },
          scalingFactor: nextScalingFactor,
        });
      }
    };

    processEdges(edgesByDownstreamInput.get(nodeId) ?? [], true);
    processEdges(edgesByUpstreamOutput.get(nodeId) ?? [], false);

    const mainConnectExchanges: any[] = [];
    const secondaryConnectExchanges: any[] = [];
    const noneConnectExchanges: any[] = [];

    const scalingExchanges =
      dbProcess?.exchanges?.map((ex: any) => {
        const amount = new BigNumber(toAmountNumber(ex.meanAmount))
          .times(scalingFactor ?? 1)
          .toNumber();
        const amountExchange = { ...ex, meanAmount: amount, resultingAmount: amount };

        const id = ex?.['@dataSetInternalID'];
        if (mainConnectExchangeIds.has(id)) {
          mainConnectExchanges.push(amountExchange);
        } else if (secondaryConnectExchangeIds.has(id)) {
          secondaryConnectExchanges.push(amountExchange);
        } else {
          noneConnectExchanges.push(amountExchange);
        }

        return amountExchange;
      }) ?? [];

    collectedProcesses.push({
      nodeId: nodeId,
      dependence: dependence,
      processId: dbProcess.id,
      processVersion: dbProcess.version,
      quantitativeReferenceFlowIndex: dbProcess?.refExchangeMap?.exchangeId,
      scalingFactor: scalingFactor,
      baseExchanges: dbProcess?.exchanges ?? [],
      mainConnectExchanges: mainConnectExchanges,
      secondaryConnectExchanges: secondaryConnectExchanges,
      noneConnectExchanges: noneConnectExchanges,
      exchanges: scalingExchanges,
    });
  }

  return collectedProcesses;
};

/**
 * zh-CN: 按 @dataSetInternalID 合并两个 exchanges 列表，同 ID 的 meanAmount/resultingAmount 累加；不修改入参。
 * en-US: Merge two exchange lists by @dataSetInternalID, summing meanAmount/resultingAmount per ID; inputs are not mutated.
 * Params:
 *  - prevList?: any[] 先前累积的交换列表
 *  - nextList?: any[] 新增需要合并的交换列表
 * Returns: any[] 合并后的新数组
 */
function mergeExchangesById(prevList?: any[], nextList?: any[]): any[] {
  const prev = Array.isArray(prevList) ? prevList : [];
  const next = Array.isArray(nextList) ? nextList : [];
  if (prev.length === 0) return next.length === 0 ? [] : next.map((e) => ({ ...e }));
  if (next.length === 0) return prev.map((e) => ({ ...e }));

  const acc = new Map<string, any>();
  const add = (ex: any) => {
    const id = ex?.['@dataSetInternalID'] ?? ex?.id;
    if (!id) return;
    const existed = acc.get(id);
    if (!existed) {
      acc.set(id, { ...ex });
    } else {
      existed.meanAmount = new BigNumber(existed?.meanAmount ?? 0)
        .plus(toAmountNumber(ex?.meanAmount))
        .toNumber();
      existed.resultingAmount = new BigNumber(existed?.resultingAmount ?? 0)
        .plus(toAmountNumber(ex?.resultingAmount))
        .toNumber();
      acc.set(id, existed);
    }
  };

  for (const ex of prev) add(ex);
  for (const ex of next) add(ex);

  return Array.from(acc.values());
}

/**
 * zh-CN: 按 nodeId 聚合进程缩放记录，累加 scalingFactor，并合并各类 exchanges（main/secondary/none/全部）。
 * en-US: Aggregate process scaling records by nodeId, summing scalingFactor and merging exchange groups.
 * Params:
 *  - processScalingFactors: any[] 由遍历得到的进程缩放记录
 * Returns: Map<string, any> nodeId -> 聚合后的进程条目（含 scalingFactor、count 与合并后的 exchanges）
 */
const sumAmountByNodeId = (processScalingFactors: any[]): Map<string, any> => {
  const sumAmountMap = new Map<string, any>();

  for (const psf of processScalingFactors as any[]) {
    const nodeId = psf?.nodeId;
    const sf = psf?.scalingFactor ?? 0;

    if (!nodeId || sf === 0) continue;

    const prev = sumAmountMap.get(nodeId) ?? {
      ...psf,
      scalingFactor: 0,
      count: 0,
      mainConnectExchanges: [],
      secondaryConnectExchanges: [],
      noneConnectExchanges: [],
      exchanges: [],
    };

    const mergedMainConnectExchanges = mergeExchangesById(
      prev?.mainConnectExchanges as any[],
      psf?.mainConnectExchanges as any[],
    );

    const mergedSecondaryConnectExchanges = mergeExchangesById(
      prev?.secondaryConnectExchanges as any[],
      psf?.secondaryConnectExchanges as any[],
    );

    const mergedNoneConnectExchanges = mergeExchangesById(
      prev?.noneConnectExchanges as any[],
      psf?.noneConnectExchanges as any[],
    );

    const mergedExchanges = mergeExchangesById(prev?.exchanges as any[], psf?.exchanges as any[]);

    sumAmountMap.set(nodeId, {
      ...prev,
      scalingFactor: (prev?.scalingFactor ?? 0) + sf,
      count: (prev?.count ?? 0) + 1,
      mainConnectExchanges: mergedMainConnectExchanges,
      secondaryConnectExchanges: mergedSecondaryConnectExchanges,
      noneConnectExchanges: mergedNoneConnectExchanges,
      exchanges: mergedExchanges,
    });
  }

  return sumAmountMap;
};

/**
 * zh-CN: 基于节点聚合结果，将交换拆为「已分配 OUTPUT」与「未分配」，并生成子进程列表。
 * en-US: From aggregated node entries, split exchanges into allocated OUTPUT and non-allocated, emit child processes.
 * Params: sumAmountNodeMap: Map<string, any>
 * Returns: any[] child processes
 */
const allocatedProcess = (sumAmountNodeMap: Map<string, any>) => {
  const childProcesses: any[] = [];

  // Iterate map values directly; only Map<string, any> is supported
  for (const sumAmountNode of sumAmountNodeMap.values()) {
    const pExchanges: any[] = sumAmountNode?.remainingExchanges ?? [];
    const refId = sumAmountNode?.quantitativeReferenceFlowIndex;

    const allocatedExchanges: Array<{ exchange: any; allocatedFraction: number }> = [];
    const nonAllocatedExchanges: any[] = [];

    // Pre-find reference exchange once to avoid multiple scans later
    const refExchange = pExchanges.find((pe: any) => pe?.['@dataSetInternalID'] === refId);
    const refIsOutput = String(refExchange?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT';

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

      // For OUTPUT without valid allocation: push to non-allocated unless it's the reference exchange
      if (pExchange?.['@dataSetInternalID'] !== refId) {
        nonAllocatedExchanges.push(pExchange);
      }
    }

    // If no allocated OUTPUT exchanges exist, fall back to reference output exchange
    if (allocatedExchanges.length === 0 && refExchange && refIsOutput) {
      allocatedExchanges.push({ exchange: refExchange, allocatedFraction: 1 });
    }

    if (allocatedExchanges.length > 0) {
      // If the reference OUTPUT exchange wasn't chosen as allocated, include it as non-allocated
      if (
        refExchange &&
        refIsOutput &&
        !allocatedExchanges.find(
          (ne: any) => ne?.exchange?.['@dataSetInternalID'] === refExchange?.['@dataSetInternalID'],
        )
      ) {
        nonAllocatedExchanges.push(refExchange);
      }

      for (const allocatedExchange of allocatedExchanges) {
        const ex = allocatedExchange.exchange;
        const remainingRate = ex?.remainingRate ?? 1;

        if (remainingRate > 0 && remainingRate < 1) {
          const allocatedFractionBN = new BigNumber(allocatedExchange.allocatedFraction);
          const remainingAllocatedFraction = allocatedFractionBN.times(remainingRate);

          const baseChild = {
            ...sumAmountNode,
            isAllocated: true,
            allocatedExchangeId: ex?.['@dataSetInternalID'],
            allocatedExchangeDirection: ex?.exchangeDirection ?? '',
            allocatedExchangeFlowId: ex?.referenceToFlowDataSet?.['@refObjectId'],
          } as any;

          childProcesses.push({
            ...baseChild,
            allocatedFraction: remainingAllocatedFraction.toNumber(),
            finalProductType: 'has',
            childExchanges: [...nonAllocatedExchanges, ex],
          });

          childProcesses.push({
            ...baseChild,
            allocatedFraction: allocatedFractionBN.minus(remainingAllocatedFraction).toNumber(),
            finalProductType: 'no',
            childExchanges: [...nonAllocatedExchanges, { ...ex, meanAmount: 0, resultAmount: 0 }],
          });
          continue;
        }

        const finalProductType = ex?.meanAmount > 0 ? 'has' : 'no';
        childProcesses.push({
          ...sumAmountNode,
          isAllocated: true,
          allocatedExchangeId: ex?.['@dataSetInternalID'],
          allocatedExchangeDirection: ex?.exchangeDirection ?? '',
          allocatedExchangeFlowId: ex?.referenceToFlowDataSet?.['@refObjectId'],
          allocatedFraction: allocatedExchange.allocatedFraction,
          finalProductType,
          childExchanges: [...nonAllocatedExchanges, ex],
        });
      }
    } else {
      childProcesses.push({
        ...sumAmountNode,
        isAllocated: false,
        allocatedExchangeId: '',
        allocatedExchangeDirection: '',
        allocatedExchangeFlowId: '',
        allocatedFraction: 1,
        finalProductType: 'no',
        childExchanges: nonAllocatedExchanges,
      });
    }
  }

  return childProcesses;
};

/**
 * zh-CN: 从“最终产品”候选出发，按依赖（downstream/upstream；none 时用 mainDependence）与相同 flowUUID 递归收集同一子产品链；跳过 isCycle 边；
 *       累计 allocatedFraction（相乘），scalingPercentage 透传。
 * en-US: From a candidate final product, follow dependence (downstream/upstream; fallback to mainDependence when none)
 *       and the same flowUUID to recursively collect the subproduct chain; skip isCycle edges; accumulate allocatedFraction and pass through scalingPercentage.
 * Params: finalProductProcess, allocatedFraction, scalingPercentage, allocatedProcesses, allUp2DownEdges
 * Returns: any[] groups（每项含 childAllocatedFraction 与 childScalingPercentage）
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

    const nodeId = finalProductProcess?.nodeId;
    const exchanges: any[] = finalProductProcess?.exchanges ?? [];
    const hasExchange = (flowUUID: string, dir: 'INPUT' | 'OUTPUT') =>
      exchanges.some(
        (e: any) =>
          e?.referenceToFlowDataSet?.['@refObjectId'] === flowUUID &&
          String(e?.exchangeDirection ?? '').toUpperCase() === dir,
      );

    const connectedEdges = allUp2DownEdges.filter((ud: Up2DownEdge) => {
      if (ud?.isCycle === true) return false;

      const dependUp =
        (ud?.dependence === 'none' && ud?.mainDependence === 'upstream') ||
        ud?.dependence === 'upstream';
      const dependDown =
        (ud?.dependence === 'none' && ud?.mainDependence === 'downstream') ||
        ud?.dependence === 'downstream';

      return (
        (ud?.upstreamId === nodeId && dependUp && hasExchange(ud?.flowUUID, 'OUTPUT')) ||
        (ud?.downstreamId === nodeId && dependDown && hasExchange(ud?.flowUUID, 'INPUT'))
      );
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
 * zh-CN: 按分组规则缩放子进程交换量（已分配仅按 scalingFactor；其余乘以累计份额比例）。
 * en-US: Scale child process exchanges (allocated: scalingFactor only; others × accumulated factors).
 * Params: process: any
 * Returns: new process with resultExchanges
 */
const calculateProcess = (process: any) => {
  const allocatedId = process?.allocatedExchangeId;
  const childAllocatedFraction = process?.childAllocatedFraction ?? 1;
  const childScalingPercentage = process?.childScalingPercentage ?? 1;

  const scaleFactor = new BigNumber(childAllocatedFraction).times(childScalingPercentage);

  const newExchanges = process?.childExchanges?.map((e: any) => {
    const isAllocatedExchange = e?.['@dataSetInternalID'] === allocatedId;
    if (isAllocatedExchange) {
      return {
        ...e,
        meanAmount: e?.meanAmount,
        resultingAmount: e?.resultingAmount,
      };
    }

    const meanAmount = new BigNumber(e?.meanAmount).times(scaleFactor).toNumber();
    const resultingAmount = new BigNumber(e?.resultingAmount).times(scaleFactor).toNumber();
    return {
      ...e,
      meanAmount,
      resultingAmount,
    };
  });

  return {
    ...process,
    resultExchanges: newExchanges,
  };
};

/**
 * zh-CN: 汇总同一分组内已缩放的交换并标记定量参考交换。
 * en-US: Sum scaled exchanges within a group and flag the quantitative reference.
 * Params: processExchanges: any[]
 * Returns: any[] summed exchanges
 */
const sumProcessExchange = (processExchanges: any[]) => {
  const finalProcess = processExchanges.find((p) => p?.finalProductType === 'has') ?? {};
  const refExchange = finalProcess?.exchanges?.find(
    (e: any) => e?.['@dataSetInternalID'] === finalProcess?.allocatedExchangeId,
  );

  // Flatten all result exchanges and keep only positive meanAmount entries
  const allExchanges: any[] = processExchanges
    .flatMap((pes) => pes?.resultExchanges ?? [])
    .filter((e: any) => (e?.meanAmount ?? 0) > 0);

  // Aggregate by key `${DIRECTION}_${flowId}`
  const sumMap = allExchanges.reduce<Record<string, any>>((acc, curr) => {
    const dir = String(curr?.exchangeDirection ?? '').toUpperCase();
    const fid = curr?.referenceToFlowDataSet?.['@refObjectId'];
    const key = `${dir}_${fid}`;
    const prev = acc[key];
    if (!prev) {
      acc[key] = { ...curr };
    } else {
      prev.meanAmount += curr.meanAmount;
      prev.resultingAmount += curr.resultingAmount;
    }
    return acc;
  }, {});

  const refDir = String(refExchange?.exchangeDirection ?? '').toUpperCase();
  const refFid = refExchange?.referenceToFlowDataSet?.['@refObjectId'];

  return Object.values(sumMap).map((e: any) => {
    const isRef =
      e?.referenceToFlowDataSet?.['@refObjectId'] === refFid &&
      String(e?.exchangeDirection ?? '').toUpperCase() === refDir;
    return {
      ...e,
      quantitativeReference: !!isRef,
    };
  });
};

/**
 * zh-CN: 生成/更新生命周期模型的子模型数据（构建图→依赖→缩放→分配→汇总→LCIA）。
 * en-US: Generate/update submodels for LCA model (graph → dependence → scaling → allocation → sum → LCIA).
 * Params: id: string; modelNodes: any[] | null | undefined; lifeCycleModelJsonOrdered: any; oldSubmodels: any[]
 * Returns: Promise<any[]> new/updated submodels
 */
export async function genLifeCycleModelProcesses(
  id: string,
  modelNodes: any[] | null | undefined,
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
  ).map((p: any) => {
    let node = modelNodes?.find((i: any) => i?.data?.index === p?.['@dataSetInternalID']);
    if (!node)
      node = modelNodes?.find((i: any) => i?.['@dataSetInternalID'] === p?.['@dataSetInternalID']);
    return {
      ...p,
      nodeId: node?.id,
    };
  });

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
  const refModelExchangeDirection = refModelExchange?.direction;

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
    refModelExchangeDirection,
  );

  const processScalingFactors = calculateScalingFactor(
    refMdProcess,
    refDbProcess!,
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

  const sumAmountNodeMap = sumAmountByNodeId(processScalingFactors);

  // helpers to reduce duplication while keeping behavior unchanged
  const makeFlowKey = (nodeId: string, flowId: string) => `${nodeId}:${flowId}`;
  const addSupplyDemandFromExchange = (supply: any, demand: any, nodeId: string, ex: any) => {
    const dir = String(ex?.exchangeDirection ?? '').toUpperCase();
    const fid = ex?.referenceToFlowDataSet?.['@refObjectId'];
    if (!fid) return;
    const key = makeFlowKey(nodeId, fid);
    if (dir === 'OUTPUT') {
      supply[key] = ex?.meanAmount;
    } else if (dir === 'INPUT') {
      demand[key] = ex?.meanAmount;
    }
  };

  const pushRemainingForGroup = (
    exchanges: any[] | undefined,
    nodeId: string,
    allocResult: any,
    out: any[],
  ) => {
    if (!Array.isArray(exchanges) || exchanges.length === 0) return;
    for (const ex of exchanges) {
      const fid = ex?.referenceToFlowDataSet?.['@refObjectId'];
      if (!fid) continue;
      const key = makeFlowKey(nodeId, fid);
      const dir = String(ex?.exchangeDirection ?? '').toUpperCase();
      if (dir === 'OUTPUT') {
        const remain = allocResult?.remaining_supply?.[key];
        const remainingRate = normalizeRatio(remain, ex?.meanAmount);
        if (remain !== null && remain !== undefined)
          out.push({
            ...ex,
            remainingRate,
            meanAmount: remain,
            resultingAmount: remain,
          });
      } else if (dir === 'INPUT') {
        const remain = allocResult?.remaining_demand?.[key];
        if (remain !== null && remain !== undefined)
          out.push({
            ...ex,
            meanAmount: remain,
            resultingAmount: remain,
          });
      }
    }
  };

  const applyAllocationToEdge = (edge: any, allocResult: any) => {
    const upKey = makeFlowKey(edge.upstreamId, edge.flowUUID);
    const downKey = makeFlowKey(edge.downstreamId, edge.flowUUID);
    const allocations = allocResult?.allocations?.[upKey]?.[downKey];
    const upRemain = allocResult?.remaining_supply?.[upKey];
    const downRemain = allocResult?.remaining_demand?.[downKey];
    edge.exchangeAmount = allocations ?? 0;
    if (upRemain === 0 && downRemain === 0) {
      edge.isBalanced = true;
    } else {
      const rel = normalizeRatio(
        new BigNumber(upRemain ?? 0).plus(downRemain ?? 0).toNumber(),
        allocations ?? 0,
      );
      edge.isBalanced = (allocations ?? 0) > 0 && rel === 0;
    }
    edge.unbalancedAmount = edge.isBalanced
      ? 0
      : new BigNumber(upRemain ?? 0).minus(downRemain ?? 0).toNumber();
  };

  const mainUpstreamOutputs: any = {};
  const mainDownstreamInputs: any = {};
  const mainEdges: any[] = [];

  const secondaryUpstreamOutputs: any = {};
  const secondaryDownstreamInputs: any = {};
  const secondaryEdges: any[] = [];

  sumAmountNodeMap.forEach((sumAmountNode) => {
    if (sumAmountNode?.mainConnectExchanges?.length > 0) {
      for (const ex of sumAmountNode.mainConnectExchanges) {
        addSupplyDemandFromExchange(
          mainUpstreamOutputs,
          mainDownstreamInputs,
          sumAmountNode?.nodeId,
          ex,
        );
      }
    }

    if (sumAmountNode?.secondaryConnectExchanges?.length > 0) {
      for (const ex of sumAmountNode.secondaryConnectExchanges) {
        addSupplyDemandFromExchange(
          secondaryUpstreamOutputs,
          secondaryDownstreamInputs,
          sumAmountNode?.nodeId,
          ex,
        );
      }
    }
  });

  up2DownEdges.forEach((edge) => {
    if (edge?.dependence === 'upstream' || edge?.dependence === 'downstream') {
      mainEdges.push([
        `${edge.upstreamId}:${edge.flowUUID}`,
        `${edge.downstreamId}:${edge.flowUUID}`,
      ]);
    } else if (edge?.dependence === 'none') {
      secondaryEdges.push([
        `${edge.upstreamId}:${edge.flowUUID}`,
        `${edge.downstreamId}:${edge.flowUUID}`,
      ]);
    }
  });

  const mainAllocateResult = allocateSupplyToDemand(
    mainUpstreamOutputs,
    mainDownstreamInputs,
    mainEdges,
    {},
    { prioritizeBalance: true },
  );

  const secondaryAllocateResult = allocateSupplyToDemand(
    secondaryUpstreamOutputs,
    secondaryDownstreamInputs,
    secondaryEdges,
    {},
    { prioritizeBalance: true },
  );

  sumAmountNodeMap.forEach((sumAmountNode) => {
    const remainingExchanges: any[] = [];

    // main group remaining
    pushRemainingForGroup(
      sumAmountNode?.mainConnectExchanges,
      sumAmountNode?.nodeId,
      mainAllocateResult,
      remainingExchanges,
    );

    // secondary group remaining
    pushRemainingForGroup(
      sumAmountNode?.secondaryConnectExchanges,
      sumAmountNode?.nodeId,
      secondaryAllocateResult,
      remainingExchanges,
    );

    // keep none-connect exchanges as-is
    for (const nce of sumAmountNode?.noneConnectExchanges ?? []) {
      remainingExchanges.push(nce);
    }

    sumAmountNode.remainingExchanges = remainingExchanges;
  });

  up2DownEdges.forEach((edge) => {
    if (edge.dependence === 'upstream' || edge.dependence === 'downstream') {
      applyAllocationToEdge(edge, mainAllocateResult);
    } else if (edge.dependence === 'none') {
      applyAllocationToEdge(edge, secondaryAllocateResult);
    }
  });

  const allocatedProcesses = allocatedProcess(sumAmountNodeMap);

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

        const calculatedProcessExchanges = finalProductGroup.map((p) => {
          return calculateProcess(p);
        });

        if (calculatedProcessExchanges.length > 0) {
          newSumExchanges = sumProcessExchange(calculatedProcessExchanges).map(
            (e: any, index: number) => {
              return {
                ...e,
                '@dataSetInternalID': (index + 1).toString(),
              };
            },
          );

          const finalProductProcessExchange = calculatedProcessExchanges.find(
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

          const newExchanges = newSumExchanges.map((e: any) => {
            return {
              ...e,
              allocatedFraction: undefined,
              allocations: undefined,
            };
          });

          const LCIAResults = await LCIAResultCalculation(newExchanges);

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

          return newData;
        }
      }
      return null;
    }),
  );

  const primaryProcess = sumFinalProductGroups.find((p) => p?.modelInfo?.type === 'primary');

  const refPrimaryProcessExchange = primaryProcess?.data?.processDataSet?.exchanges?.exchange?.find(
    (e: any) => e?.quantitativeReference === true,
  );

  const refRemainingRate = refPrimaryProcessExchange?.remainingRate ?? 1;

  if (refRemainingRate > 0 && refRemainingRate !== 1) {
    sumFinalProductGroups?.forEach((process) => {
      const isPrimaryGroup = process?.modelInfo?.type === 'primary';
      if (process?.data?.processDataSet?.exchanges?.exchange?.length > 0)
        process?.data?.processDataSet?.exchanges?.exchange?.forEach((e: any) => {
          const isRefExchange = isPrimaryGroup && e?.quantitativeReference;
          const amount = isRefExchange
            ? modelTargetAmount.toString()
            : new BigNumber(e?.meanAmount).div(refRemainingRate).toString();
          e.meanAmount = amount;
          e.resultingAmount = amount;
        });

      if (process?.data?.processDataSet?.LCIAResults?.LCIAResult?.length > 0)
        process?.data?.processDataSet?.LCIAResults?.LCIAResult?.forEach((lcia: any) => {
          const amount = new BigNumber(lcia?.meanAmount).div(refRemainingRate).toString();
          lcia.meanAmount = amount;
        });
    });
  }

  const newProcessInstance = mdProcesses.map((mdProcess) => {
    return removeEmptyObjects({
      '@dataSetInternalID': mdProcess?.['@dataSetInternalID'] ?? {},
      '@multiplicationFactor':
        sumAmountNodeMap.get(mdProcess?.['@dataSetInternalID'])?.scalingFactor?.toString() ?? {},
      referenceToProcess: mdProcess?.referenceToProcess,
      groups: mdProcess?.groups,
      parameters: mdProcess.parameters,
      connections: mdProcess.connections,
    });
  });

  lifeCycleModelJsonOrdered.lifeCycleModelDataSet.lifeCycleModelInformation.technology.processes.processInstance =
    listToJson(newProcessInstance);

  return {
    lifeCycleModelProcesses: sumFinalProductGroups.filter((item) => item !== null),
    up2DownEdges: up2DownEdges,
  };
}
