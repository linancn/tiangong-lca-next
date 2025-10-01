import BigNumber from 'bignumber.js';
import { v4 } from 'uuid';
import {
  comparePercentDesc,
  jsonToList,
  mergeLangArrays,
  percentStringToNumber,
  removeEmptyObjects,
  toAmountNumber,
} from '../general/util';
import LCIAResultCalculation from '../lciaMethods/util';
import { supabase } from '../supabase';
import { Up2DownEdge } from './data';

type Direction = 'INPUT' | 'OUTPUT';
interface DbProcessMapValue {
  id: string;
  version: string;
  exchanges: any[];
  refExchangeMap: {
    exchangeId: string;
    flowId: string;
    direction: Direction;
    refExchange: any;
  };
}

// Build fast lookup indices to avoid repeated finds/filters
const dbProcessKey = (id?: string, version?: string) => `${id ?? ''}@${version ?? ''}`;

// Pre-index processScalingFactors for O(1) lookups and per-node sums
const processScalingFactorKey = (
  direction: string,
  flowUUID?: string,
  dependenceNodeId?: string,
  nodeId?: string,
) => `${direction}|${flowUUID ?? ''}|${dependenceNodeId ?? ''}|${nodeId ?? ''}`;

// Compute scalingFactor for a given edge using pre-indexed maps
const getScalingFactorForEdge = (
  ud: Up2DownEdge,
  processScalingFactorMap: Map<string, number>,
  sumScalingFactorByNodeId: Map<string, any>,
): number => {
  if (ud?.dependence === 'downstream') {
    const k = processScalingFactorKey('downstream', ud?.flowUUID, ud?.downstreamId, ud?.upstreamId);
    return processScalingFactorMap.get(k) ?? 0;
  }
  if (ud?.dependence === 'upstream') {
    const k = processScalingFactorKey('upstream', ud?.flowUUID, ud?.upstreamId, ud?.downstreamId);
    return processScalingFactorMap.get(k) ?? 0;
  }
  if (ud?.dependence === 'none') {
    if (ud?.mainDependence === 'downstream') {
      return sumScalingFactorByNodeId.get(ud?.upstreamId)?.scalingFactor ?? 0;
    }
    if (ud?.mainDependence === 'upstream') {
      return sumScalingFactorByNodeId.get(ud?.downstreamId)?.scalingFactor ?? 0;
    }
  }
  return 0;
};

// small helper: find first exchange by flow uuid + direction (case-insensitive)
const findExchange = (
  exchanges: any[] | undefined,
  flowUUID: string | undefined,
  requiredDirectionUpper: Direction,
) => {
  if (!exchanges || !flowUUID) return undefined;
  for (const exchange of exchanges) {
    if (
      exchange?.referenceToFlowDataSet?.['@refObjectId'] === flowUUID &&
      (exchange?.exchangeDirection ?? '').toUpperCase() === requiredDirectionUpper
    ) {
      return exchange;
    }
  }
  return undefined;
};

// Return the flowId with the maximum allocatedFraction among db exchanges
// filtered by direction and allowed flow set. Single pass using comparePercentDesc.
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

// Decide main OUTPUT flowUUID for a modelled process' output exchanges.
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

// Decide main INPUT flowUUID for a node with multiple incoming edges.
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

const nextScaling = (targetAmount: number, baseAmount: number, curSF: number) => {
  let result = 1;
  if (baseAmount !== 0) {
    const targetBN =
      targetAmount !== 0 && curSF !== 0 ? new BigNumber(targetAmount).times(curSF) : null;
    if (targetBN) {
      result = targetBN.div(baseAmount).toNumber();
    }
  }
  return result;
};

// Calculate scaling factors for processes connected to the current node, walking both
// downstream (suppliers) and upstream (customers) by matching the shared flow UUID.
// Use adjacency indices for O(degree) traversal; keep behavior with clearer, stack-based flow.
const calculateProcessScalingFactor = (
  currentModelProcess: any,
  currentDatabaseProcess: DbProcessMapValue,
  dependence: any,
  scalingFactor: number,
  edgesByDownstream: Map<string, Up2DownEdge[]>,
  edgesByUpstream: Map<string, Up2DownEdge[]>,
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
    const currentExs = jsonToList(db?.exchanges);

    collectedProcesses.push({
      nodeId: nodeId,
      dependence: dep,
      processId: db.id,
      processVersion: db.version,
      quantitativeReferenceFlowIndex: db?.refExchangeMap?.exchangeId,
      scalingFactor: sf,
      exchanges: currentExs,
    });

    const incomingEdges = edgesByDownstream.get(nodeId) ?? [];
    for (const edge of incomingEdges) {
      if (edge?.dependence !== 'downstream') continue;

      const upstreamModelProcess = mdProcessMap.get(edge?.upstreamId);
      if (!upstreamModelProcess) continue;

      const upKey = dbProcessKey(
        upstreamModelProcess?.referenceToProcess?.['@refObjectId'],
        upstreamModelProcess?.referenceToProcess?.['@version'],
      );
      const upstreamDatabaseProcess = dbProcessMap.get(upKey);
      if (!upstreamDatabaseProcess) continue;

      const currentInputExchange = findExchange(currentExs, edge?.flowUUID, 'INPUT');
      const upstreamExs = jsonToList(upstreamDatabaseProcess?.exchanges);
      const upstreamOutputExchange = findExchange(upstreamExs, edge?.flowUUID, 'OUTPUT');

      const upstreamMeanAmount = toAmountNumber(upstreamOutputExchange?.meanAmount);
      const currentInputMeanAmount = toAmountNumber(currentInputExchange?.meanAmount);
      const upstreamSF = nextScaling(currentInputMeanAmount, upstreamMeanAmount, sf);

      stack.push({
        md: upstreamModelProcess,
        db: upstreamDatabaseProcess,
        dep: { direction: 'downstream', nodeId: nodeId, flowUUID: edge?.flowUUID },
        sf: upstreamSF,
      });
    }

    const outgoingEdges = edgesByUpstream.get(nodeId) ?? [];
    for (const edge of outgoingEdges) {
      if (edge?.dependence !== 'upstream') continue;

      const downstreamModelProcess = mdProcessMap.get(edge?.downstreamId);
      if (!downstreamModelProcess) continue;

      const downKey = dbProcessKey(
        downstreamModelProcess?.referenceToProcess?.['@refObjectId'],
        downstreamModelProcess?.referenceToProcess?.['@version'],
      );
      const downstreamDatabaseProcess = dbProcessMap.get(downKey);
      if (!downstreamDatabaseProcess) continue;

      const currentOutputExchange = findExchange(currentExs, edge?.flowUUID, 'OUTPUT');
      const downstreamExs = jsonToList(downstreamDatabaseProcess?.exchanges);
      const downstreamInputExchange = findExchange(downstreamExs, edge?.flowUUID, 'INPUT');

      const downstreamMeanAmount = toAmountNumber(downstreamInputExchange?.meanAmount);
      const currentOutputMeanAmount = toAmountNumber(currentOutputExchange?.meanAmount);
      const downstreamSF = nextScaling(currentOutputMeanAmount, downstreamMeanAmount, sf);

      stack.push({
        md: downstreamModelProcess,
        db: downstreamDatabaseProcess,
        dep: { direction: 'upstream', nodeId: nodeId, flowUUID: edge?.flowUUID },
        sf: downstreamSF,
      });
    }
  }

  return collectedProcesses;
};

const allocatedProcess = (processMap: Map<string, any>) => {
  const childProcesses: any[] = [];

  // Iterate map values directly; only Map<string, any> is supported
  for (const p of processMap.values()) {
    const pExchanges = jsonToList(p?.exchanges ?? []);
    const allocatedExchanges: any[] = [];
    const nonAllocatedExchanges: any[] = [];

    for (const pExchange of pExchanges) {
      const dir = String(pExchange?.exchangeDirection ?? '').toUpperCase();
      if (dir !== 'OUTPUT') {
        nonAllocatedExchanges.push(pExchange);
        continue;
      }

      const allocations = jsonToList(pExchange?.allocations ?? []);
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
        allocatedExchangeFlowId: '',
        allocatedFraction: 1,
        exchanges: nonAllocatedExchanges,
      });
    }
  }

  return childProcesses;
};

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

const getFinalProductGroup = (
  finalProductProcess: any,
  allocatedFraction: number,
  scalingPercentage: number,
  childProcesses: any[],
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
        const nextChildProcess = childProcesses.find((childProcess: any) => {
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
            new BigNumber(edge?.scalingFactor ?? 1)
              .div(nextChildProcess?.scalingFactor ?? 1)
              .times(scalingPercentage)
              .toNumber(),
            childProcesses,
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

const sumProcessExchange = (processExchanges: any[]) => {
  const finalProcess = processExchanges.find((p) => p?.finalProductType === 'has') ?? {};
  const refExchange = finalProcess?.exchanges?.find(
    (e: any) => e?.['@dataSetInternalID'] === finalProcess?.allocatedExchangeId,
  );

  const newProcessExchanges = processExchanges.map((process) => {
    return calculateProcess(process);
  });

  let allExchanges: any[] = [];
  newProcessExchanges.forEach((pes) => {
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

export async function genLifeCycleModelProcesses(
  id: string,
  refTargetAmount: number | null,
  data: any,
  oldSubmodels: any[],
) {
  const refProcessNodeId =
    data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess;

  if (!refProcessNodeId) {
    throw new Error('No referenceToReferenceProcess found in lifeCycleModelInformation');
  }

  const mdProcesses = jsonToList(
    data?.lifeCycleModelInformation?.technology?.processes?.processInstance,
  );

  // Fast lookup: model process by nodeId
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

  let up2DownEdges: Up2DownEdge[] = [];
  // fast edge lookup indices
  const edgesByDownstream = new Map<string, Up2DownEdge[]>();
  const edgesByUpstream = new Map<string, Up2DownEdge[]>();
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
          flowUUID: o?.['@flowUUID'],
          upstreamId: mdProcess?.['@dataSetInternalID'],
          downstreamId: dp?.['@id'],
          mainOutputFlowUUID: mainOutputFlowUUID,
          mainInputFlowUUID: '',
        };
        up2DownEdges.push(nowUp2DownEdge);

        // index for faster future lookups
        if (!edgesByDownstream.has(nowUp2DownEdge.downstreamId)) {
          edgesByDownstream.set(nowUp2DownEdge.downstreamId, []);
        }
        edgesByDownstream.get(nowUp2DownEdge.downstreamId)!.push(nowUp2DownEdge);

        if (!edgesByUpstream.has(nowUp2DownEdge.upstreamId)) {
          edgesByUpstream.set(nowUp2DownEdge.upstreamId, []);
        }
        edgesByUpstream.get(nowUp2DownEdge.upstreamId)!.push(nowUp2DownEdge);
      }
    }
  }

  for (const mdProcess of mdProcesses as any[]) {
    const mdNodeId = mdProcess?.['@dataSetInternalID'];
    const inputEdges = edgesByDownstream.get(mdNodeId) ?? [];

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

  let baseIds1: any[] = [];
  baseIds1.push(refProcessNodeId);
  let direction1: Direction = 'OUTPUT';

  while (true) {
    // Expand as far as possible in the current direction until no further nodes can be reached
    let current = new Set<string>(baseIds1);
    while (current.size > 0) {
      const next = new Set<string>();
      if (direction1 === 'OUTPUT') {
        for (const baseId of current) {
          const uds = edgesByDownstream.get(baseId) ?? [];
          for (const ud of uds) {
            if (ud?.dependence) continue;
            next.add(ud.upstreamId);
            ud.dependence = 'downstream';
          }
        }
      } else {
        for (const baseId of current) {
          const uds = edgesByUpstream.get(baseId) ?? [];
          for (const ud of uds) {
            if (ud?.dependence) continue;
            next.add(ud.downstreamId);
            ud.dependence = 'upstream';
          }
        }
      }
      current = next;
    }

    // Handle duplicates: if the same upstream/downstream has multiple dependencies,
    // keep only the main (reference) flow and mark others as 'none'
    if (direction1 === 'OUTPUT') {
      const countByUpstream = new Map<string, number>();
      for (const item of up2DownEdges) {
        if (item.dependence === 'downstream') {
          countByUpstream.set(item.upstreamId, (countByUpstream.get(item.upstreamId) ?? 0) + 1);
        }
      }
      for (const [dupId, count] of countByUpstream) {
        if (count > 1) {
          const uds = edgesByUpstream.get(dupId) ?? [];
          for (const ud of uds) {
            if (ud.dependence === 'downstream' && ud.flowUUID !== ud.mainOutputFlowUUID) {
              ud.dependence = 'none';
              ud.mainDependence = 'downstream';
            }
          }
        }
      }
    } else {
      const countByDownstream = new Map<string, number>();
      for (const item of up2DownEdges) {
        if (item.dependence === 'upstream') {
          countByDownstream.set(
            item.downstreamId,
            (countByDownstream.get(item.downstreamId) ?? 0) + 1,
          );
        }
      }
      for (const [dupId, count] of countByDownstream) {
        if (count > 1) {
          const uds = edgesByDownstream.get(dupId) ?? [];
          for (const ud of uds) {
            if (ud.dependence === 'upstream' && ud.flowUUID !== ud.mainInputFlowUUID) {
              ud.dependence = 'none';
              ud.mainDependence = 'upstream';
            }
          }
        }
      }
    }

    const hasDependenceItems = up2DownEdges.filter((ud: any) => ud?.dependence !== undefined) ?? [];
    if (hasDependenceItems.length === up2DownEdges.length) {
      break;
    }

    // Prepare baseIds for the next iteration (switch direction)
    let nextBaseIds: string[] = [];
    if (direction1 === 'OUTPUT') {
      const hasDepUpIds = new Set(hasDependenceItems.map((ud: any) => ud?.upstreamId));
      for (const upId of hasDepUpIds) {
        const uds = edgesByUpstream.get(upId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence === undefined) {
            nextBaseIds.push(ud.upstreamId);
          }
        }
      }
      direction1 = 'INPUT';
    } else {
      const hasDepDownIds = new Set(hasDependenceItems.map((ud: any) => ud?.downstreamId));
      for (const downId of hasDepDownIds) {
        const uds = edgesByDownstream.get(downId) ?? [];
        for (const ud of uds) {
          if (ud?.dependence === undefined) {
            nextBaseIds.push(ud.downstreamId);
          }
        }
      }
      direction1 = 'OUTPUT';
    }

    if (nextBaseIds.length === 0) {
      break;
    }
    baseIds1 = nextBaseIds;
  }

  const processScalingFactors = calculateProcessScalingFactor(
    refMdProcess,
    refDbProcess,
    {
      direction: '',
      nodeId: '',
      flowUUID: '',
    },
    refScalingFactor,
    edgesByDownstream,
    edgesByUpstream,
    mdProcessMap,
    dbProcessMap,
  );

  const processScalingFactorMap = new Map<string, number>();
  const sumScalingFactorByNodeId = new Map<string, any>();
  for (const psf of processScalingFactors as any[]) {
    const dir = psf?.dependence?.direction;
    const flowUUID = psf?.dependence?.flowUUID;
    const depNodeId = psf?.dependence?.nodeId;
    const nodeId = psf?.nodeId;
    const sf = psf?.scalingFactor ?? 0;

    if (dir && flowUUID && depNodeId && nodeId && sf !== 0) {
      const key = processScalingFactorKey(dir, flowUUID, depNodeId, nodeId);
      processScalingFactorMap.set(key, (processScalingFactorMap.get(key) ?? 0) + sf);
    }
    if (nodeId && sf !== 0) {
      const sumSF = sumScalingFactorByNodeId.get(nodeId) ?? { ...psf, scalingFactor: 0, count: 0 };
      sumScalingFactorByNodeId.set(nodeId, {
        ...sumSF,
        scalingFactor: (sumSF?.scalingFactor ?? 0) + sf,
        count: (sumSF?.count ?? 0) + 1,
      });
    }
  }

  const newUp2DownEdges = up2DownEdges.map((ud: Up2DownEdge) => ({
    ...ud,
    scalingFactor: getScalingFactorForEdge(ud, processScalingFactorMap, sumScalingFactorByNodeId),
  }));

  const childProcesses = allocatedProcess(sumScalingFactorByNodeId);

  childProcesses.forEach((childProcess: any) => {
    if (childProcess?.nodeId === refProcessNodeId) {
      childProcess.finalProductType = 'has';
      return;
    }
    if (childProcess?.isAllocated) {
      const downstreamEdges = newUp2DownEdges.filter(
        (ud: Up2DownEdge) =>
          ud?.upstreamId === childProcess?.nodeId &&
          ud?.flowUUID === childProcess?.allocatedExchangeFlowId,
      );
      if (downstreamEdges.length === 0) {
        childProcess.finalProductType = 'has';
        return;
      } else {
        childProcess.finalProductType = 'unknown';
        return;
      }
    } else {
      childProcess.finalProductType = 'no';
      return;
    }
  });

  let whileCount = 0;
  let whileUnknown = true;
  const unknownCount = childProcesses.filter(
    (cpe: any) => cpe?.finalProductType === 'unknown',
  )?.length;
  while (whileUnknown) {
    const unknownCPEs = childProcesses.filter((cpe: any) => cpe?.finalProductType === 'unknown');
    unknownCPEs.forEach((cpe: any) => {
      const finalProductType = hasFinalProductProcessExchange(cpe, newUp2DownEdges, childProcesses);
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

  const hasFinalProductProcesses = childProcesses.filter(
    (cpe: any) => cpe?.finalProductType === 'has',
  );

  const inputFlowsByNodeId = new Map<string, Set<string>>();
  const outputFlowsByNodeId = new Map<string, Set<string>>();
  for (const ud of newUp2DownEdges as Up2DownEdge[]) {
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
        childProcesses,
        newUp2DownEdges,
      );

      if (finalProductGroup?.length > 0) {
        let newSumExchanges: any = [];

        const unconnectedProcessExchanges = finalProductGroup.map((npe: any) => {
          const nodeId = npe?.nodeId;
          const connectedInputSet = nodeId
            ? (inputFlowsByNodeId.get(nodeId) ?? new Set<string>())
            : new Set<string>();
          const connectedOutputSet = nodeId
            ? (outputFlowsByNodeId.get(nodeId) ?? new Set<string>())
            : new Set<string>();

          const npeExchanges = jsonToList(npe?.exchanges);
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
              ? data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName
              : mergeLangArrays(
                  subproductLeftBracket,
                  subproductPrefix,
                  jsonToList(refExchange?.referenceToFlowDataSet['common:shortDescription']),
                  subproductRightBracket,
                  jsonToList(data?.lifeCycleModelInformation?.dataSetInformation?.name?.baseName),
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
                        data?.lifeCycleModelInformation?.dataSetInformation?.name
                          ?.treatmentStandardsRoutes,
                      mixAndLocationTypes:
                        data?.lifeCycleModelInformation?.dataSetInformation?.name
                          ?.mixAndLocationTypes,
                      functionalUnitFlowProperties:
                        data?.lifeCycleModelInformation?.dataSetInformation?.name
                          ?.functionalUnitFlowProperties,
                    },
                    identifierOfSubDataSet:
                      data?.lifeCycleModelInformation?.dataSetInformation?.identifierOfSubDataSet,
                    'common:synonyms':
                      data?.lifeCycleModelInformation?.dataSetInformation?.['common:synonyms'],
                    classificationInformation: {
                      'common:classification': {
                        'common:class':
                          data?.lifeCycleModelInformation?.dataSetInformation
                            ?.classificationInformation?.['common:classification']?.[
                            'common:class'
                          ],
                      },
                    },
                    'common:generalComment':
                      data?.lifeCycleModelInformation?.dataSetInformation?.[
                        'common:generalComment'
                      ],
                    referenceToExternalDocumentation: {
                      '@refObjectId':
                        data?.lifeCycleModelInformation?.dataSetInformation
                          ?.referenceToExternalDocumentation?.['@refObjectId'] ?? {},
                      '@type':
                        data?.lifeCycleModelInformation?.dataSetInformation
                          ?.referenceToExternalDocumentation?.['@type'] ?? {},
                      '@uri':
                        data?.lifeCycleModelInformation?.dataSetInformation
                          ?.referenceToExternalDocumentation?.['@uri'] ?? {},
                      '@version':
                        data?.lifeCycleModelInformation?.dataSetInformation
                          ?.referenceToExternalDocumentation?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.lifeCycleModelInformation?.dataSetInformation
                          ?.referenceToExternalDocumentation?.['common:shortDescription'],
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
                      data?.lifeCycleModelInformation?.time?.['common:referenceYear'] ?? {},
                    'common:dataSetValidUntil':
                      data?.lifeCycleModelInformation?.time?.['common:dataSetValidUntil'],
                    'common:timeRepresentativenessDescription':
                      data?.lifeCycleModelInformation?.time?.[
                        'common:timeRepresentativenessDescription'
                      ],
                  },
                  geography: {
                    locationOfOperationSupplyOrProduction: {
                      '@location':
                        data?.lifeCycleModelInformation?.geography
                          ?.locationOfOperationSupplyOrProduction?.['@location'] === 'NULL'
                          ? {}
                          : (data?.lifeCycleModelInformation?.geography
                              ?.locationOfOperationSupplyOrProduction?.['@location'] ?? {}),
                      descriptionOfRestrictions:
                        data?.lifeCycleModelInformation?.geography
                          ?.locationOfOperationSupplyOrProduction?.descriptionOfRestrictions,
                    },
                    subLocationOfOperationSupplyOrProduction: {
                      '@subLocation':
                        data?.lifeCycleModelInformation?.geography
                          ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] === 'NULL'
                          ? {}
                          : (data?.lifeCycleModelInformation?.geography
                              ?.subLocationOfOperationSupplyOrProduction?.['@subLocation'] ?? {}),
                      descriptionOfRestrictions:
                        data?.lifeCycleModelInformation?.geography
                          ?.subLocationOfOperationSupplyOrProduction?.descriptionOfRestrictions,
                    },
                  },
                  technology: {
                    technologyDescriptionAndIncludedProcesses:
                      data?.lifeCycleModelInformation?.technology
                        ?.technologyDescriptionAndIncludedProcesses,
                    technologicalApplicability:
                      data?.lifeCycleModelInformation?.technology?.technologicalApplicability,
                    referenceToTechnologyPictogramme: {
                      '@type':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyPictogramme?.['@type'],
                      '@refObjectId':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyPictogramme?.['@refObjectId'],
                      '@version':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyPictogramme?.['@version'],
                      '@uri':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyPictogramme?.['@uri'],
                      'common:shortDescription':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyPictogramme?.['common:shortDescription'],
                    },
                    referenceToTechnologyFlowDiagrammOrPicture: {
                      '@type':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyFlowDiagrammOrPicture?.['@type'],
                      '@version':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyFlowDiagrammOrPicture?.['@version'],
                      '@refObjectId':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyFlowDiagrammOrPicture?.['@refObjectId'],
                      '@uri':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyFlowDiagrammOrPicture?.['@uri'],
                      'common:shortDescription':
                        data?.lifeCycleModelInformation?.technology
                          ?.referenceToTechnologyFlowDiagrammOrPicture?.['common:shortDescription'],
                    },
                  },
                  mathematicalRelations: {
                    modelDescription:
                      data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
                    variableParameter: {
                      '@name':
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter?.[
                          '@name'
                        ],
                      formula:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.formula,
                      meanValue:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.meanValue,
                      minimumValue:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.minimumValue,
                      maximumValue:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.maximumValue,
                      uncertaintyDistributionType:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.uncertaintyDistributionType,
                      relativeStandardDeviation95In:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.relativeStandardDeviation95In,
                      comment:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.variableParameter
                          ?.comment,
                    },
                  },
                },
                modellingAndValidation: {
                  LCIMethodAndAllocation: {
                    typeOfDataSet:
                      data?.modellingAndValidation?.LCIMethodAndAllocation?.typeOfDataSet ?? {},
                    LCIMethodPrinciple:
                      data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodPrinciple ??
                      {},
                    deviationsFromLCIMethodPrinciple:
                      data?.modellingAndValidation?.LCIMethodAndAllocation
                        ?.deviationsFromLCIMethodPrinciple,
                    LCIMethodApproaches:
                      data?.modellingAndValidation?.LCIMethodAndAllocation?.LCIMethodApproaches ??
                      {},
                    deviationsFromLCIMethodApproaches:
                      data?.modellingAndValidation?.LCIMethodAndAllocation
                        ?.deviationsFromLCIMethodApproaches,
                    modellingConstants:
                      data?.modellingAndValidation?.LCIMethodAndAllocation?.modellingConstants,
                    deviationsFromModellingConstants:
                      data?.modellingAndValidation?.LCIMethodAndAllocation
                        ?.deviationsFromModellingConstants,
                    referenceToLCAMethodDetails: {
                      '@type':
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.referenceToLCAMethodDetails?.['@type'] ?? {},
                      '@refObjectId':
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.referenceToLCAMethodDetails?.['@refObjectId'] ?? {},
                      '@uri':
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.referenceToLCAMethodDetails?.['@uri'] ?? {},
                      '@version':
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.referenceToLCAMethodDetails?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.modellingAndValidation?.LCIMethodAndAllocation
                          ?.referenceToLCAMethodDetails?.['common:shortDescription'],
                    },
                  },
                  dataSourcesTreatmentAndRepresentativeness: {
                    dataCutOffAndCompletenessPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataCutOffAndCompletenessPrinciples,
                    deviationsFromCutOffAndCompletenessPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromCutOffAndCompletenessPrinciples,
                    dataSelectionAndCombinationPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataSelectionAndCombinationPrinciples,
                    deviationsFromSelectionAndCombinationPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromSelectionAndCombinationPrinciples,
                    dataTreatmentAndExtrapolationsPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataTreatmentAndExtrapolationsPrinciples,
                    deviationsFromTreatmentAndExtrapolationPrinciples:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.deviationsFromTreatmentAndExtrapolationPrinciples,
                    referenceToDataHandlingPrinciples: {
                      '@type':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@type'] ?? {},
                      '@refObjectId':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@refObjectId'] ?? {},
                      '@uri':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@uri'] ?? {},
                      '@version':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataHandlingPrinciples?.['common:shortDescription'],
                    },
                    referenceToDataSource: {
                      '@type':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataSource?.['@type'] ?? {},
                      '@version':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataSource?.['@version'] ?? {},
                      '@refObjectId':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataSource?.['@refObjectId'] ?? {},
                      '@uri':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataSource?.['@uri'] ?? {},
                      'common:shortDescription':
                        data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                          ?.referenceToDataSource?.['common:shortDescription'],
                    },
                    percentageSupplyOrProductionCovered:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.percentageSupplyOrProductionCovered ?? {},
                    annualSupplyOrProductionVolume:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.annualSupplyOrProductionVolume,
                    samplingProcedure:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.samplingProcedure,
                    dataCollectionPeriod:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.dataCollectionPeriod,
                    uncertaintyAdjustments:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.uncertaintyAdjustments,
                    useAdviceForDataSet:
                      data?.modellingAndValidation?.dataSourcesTreatmentAndRepresentativeness
                        ?.useAdviceForDataSet,
                  },
                  completeness: {
                    completenessProductModel:
                      data?.modellingAndValidation?.completeness?.completenessProductModel,
                    completenessElementaryFlows: {
                      '@type':
                        data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                          '@type'
                        ],
                      '@value':
                        data?.modellingAndValidation?.completeness?.completenessElementaryFlows?.[
                          '@value'
                        ],
                    },
                    completenessOtherProblemField:
                      data?.modellingAndValidation?.completeness?.completenessOtherProblemField,
                    // completenessDescription: getLangJson(
                    //   data?.modellingAndValidation?.completeness?.completenessDescription,
                    // ),
                  },
                  validation: { ...data?.modellingAndValidation?.validation },
                  complianceDeclarations: {
                    ...data?.modellingAndValidation?.complianceDeclarations,
                  },
                },
                administrativeInformation: {
                  ['common:commissionerAndGoal']: {
                    'common:referenceToCommissioner': {
                      '@refObjectId':
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@type'] ?? {},
                      '@uri':
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@uri'] ?? {},
                      '@version':
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                          'common:referenceToCommissioner'
                        ]?.['common:shortDescription'],
                    },
                    'common:project':
                      data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                        'common:project'
                      ],
                    'common:intendedApplications':
                      data?.administrativeInformation?.['common:commissionerAndGoal']?.[
                        'common:intendedApplications'
                      ],
                  },
                  dataGenerator: {
                    'common:referenceToPersonOrEntityGeneratingTheDataSet': {
                      '@refObjectId':
                        data?.administrativeInformation?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['@version'],
                      'common:shortDescription':
                        data?.administrativeInformation?.dataGenerator?.[
                          'common:referenceToPersonOrEntityGeneratingTheDataSet'
                        ]?.['common:shortDescription'],
                    },
                  },
                  dataEntryBy: {
                    'common:timeStamp':
                      data?.administrativeInformation?.dataEntryBy?.['common:timeStamp'],
                    'common:referenceToDataSetFormat': {
                      '@refObjectId':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetFormat'
                        ]?.['common:shortDescription'],
                    },
                    'common:referenceToConvertedOriginalDataSetFrom': {
                      '@refObjectId':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToConvertedOriginalDataSetFrom'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToConvertedOriginalDataSetFrom'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToConvertedOriginalDataSetFrom'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToConvertedOriginalDataSetFrom'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToConvertedOriginalDataSetFrom'
                        ]?.['common:shortDescription'],
                    },
                    'common:referenceToPersonOrEntityEnteringTheData': {
                      '@refObjectId':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToPersonOrEntityEnteringTheData'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToPersonOrEntityEnteringTheData'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToPersonOrEntityEnteringTheData'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToPersonOrEntityEnteringTheData'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToPersonOrEntityEnteringTheData'
                        ]?.['common:shortDescription'],
                    },
                    'common:referenceToDataSetUseApproval': {
                      '@refObjectId':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetUseApproval'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetUseApproval'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetUseApproval'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetUseApproval'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.dataEntryBy?.[
                          'common:referenceToDataSetUseApproval'
                        ]?.['common:shortDescription'],
                    },
                  },
                  publicationAndOwnership: {
                    'common:dateOfLastRevision':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:dateOfLastRevision'
                      ] ?? {},
                    'common:dataSetVersion':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:dataSetVersion'
                      ],
                    'common:permanentDataSetURI':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:permanentDataSetURI'
                      ] ?? {},
                    'common:workflowAndPublicationStatus':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:workflowAndPublicationStatus'
                      ] ?? {},
                    'common:referenceToUnchangedRepublication': {
                      '@refObjectId':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToUnchangedRepublication'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToUnchangedRepublication'
                        ]?.['@type'] ?? {},
                      '@uri':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToUnchangedRepublication'
                        ]?.['@uri'] ?? {},
                      '@version':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToUnchangedRepublication'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToUnchangedRepublication'
                        ]?.['common:shortDescription'],
                    },
                    'common:referenceToRegistrationAuthority': {
                      '@refObjectId':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToRegistrationAuthority'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToRegistrationAuthority'
                        ]?.['@type'] ?? {},
                      '@uri':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToRegistrationAuthority'
                        ]?.['@uri'] ?? {},
                      '@version':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToRegistrationAuthority'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToRegistrationAuthority'
                        ]?.['common:shortDescription'],
                    },
                    'common:registrationNumber':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:registrationNumber'
                      ] ?? {},
                    'common:referenceToOwnershipOfDataSet': {
                      '@refObjectId':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToOwnershipOfDataSet'
                        ]?.['@refObjectId'],
                      '@type':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToOwnershipOfDataSet'
                        ]?.['@type'],
                      '@uri':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToOwnershipOfDataSet'
                        ]?.['@uri'],
                      '@version':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToOwnershipOfDataSet'
                        ]?.['@version'],
                      'common:shortDescription':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToOwnershipOfDataSet'
                        ]?.['common:shortDescription'],
                    },
                    'common:copyright':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:copyright'
                      ],
                    'common:referenceToEntitiesWithExclusiveAccess': {
                      '@refObjectId':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@refObjectId'] ?? {},
                      '@type':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@type'] ?? {},
                      '@uri':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@uri'] ?? {},
                      '@version':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['@version'] ?? {},
                      'common:shortDescription':
                        data?.administrativeInformation?.publicationAndOwnership?.[
                          'common:referenceToEntitiesWithExclusiveAccess'
                        ]?.['common:shortDescription'],
                    },
                    'common:licenseType':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:licenseType'
                      ],
                    'common:accessRestrictions':
                      data?.administrativeInformation?.publicationAndOwnership?.[
                        'common:accessRestrictions'
                      ],
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

  return sumFinalProductGroups.filter((item) => item !== null);
}
