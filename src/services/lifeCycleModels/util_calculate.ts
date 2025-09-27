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
import { supabase } from '../supabase';
import { Up2DownEdge } from './data';

const calculateProcessScalingFactor = (
  thisMdProcess: any,
  thisDbProcess: any,
  dependence: any,
  scalingFactor: number,
  allUp2DownEdges: Up2DownEdge[],
  mdProcesses: any[],
  dbProcesses: any[],
) => {
  let newProcesses: any[] = [];
  const thisDbProcessExchanges = jsonToList(thisDbProcess?.exchange);

  newProcesses.push({
    nodeId: thisMdProcess?.['@dataSetInternalID'],
    dependence: dependence,
    processId: thisDbProcess.id,
    processVersion: thisDbProcess.version,
    quantitativeReferenceFlowIndex:
      thisDbProcess?.quantitativeReference?.['referenceToReferenceFlow'],
    scalingFactor: scalingFactor,
    exchanges: thisDbProcessExchanges,
  });

  const dependenceDownstreams = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.downstreamId === thisMdProcess?.['@dataSetInternalID'] && ud?.dependence === 'downstream'
    );
  });

  if (dependenceDownstreams.length > 0) {
    dependenceDownstreams.forEach((dependenceDownstream: Up2DownEdge) => {
      const upMdProcess = mdProcesses.find(
        (mdp: any) => mdp?.['@dataSetInternalID'] === dependenceDownstream?.upstreamId,
      );
      const upDbProcess = dbProcesses.find(
        (dbp: any) =>
          dbp?.id === upMdProcess?.referenceToProcess?.['@refObjectId'] &&
          dbp?.version === upMdProcess?.referenceToProcess?.['@version'],
      );

      if (upMdProcess && upDbProcess) {
        const downExchange = thisDbProcessExchanges.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceDownstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT',
        );

        const upExchange = jsonToList(upDbProcess?.exchange)?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceDownstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT',
        );

        const upMeanAmount = toAmountNumber(upExchange?.meanAmount);
        const upTargetAmount = new BigNumber(downExchange?.meanAmount)
          .times(scalingFactor)
          .toNumber();

        let upScalingFactor = 1;

        if (upMeanAmount !== 0 && upTargetAmount !== 0) {
          upScalingFactor = new BigNumber(upTargetAmount).div(upMeanAmount).toNumber();
        }

        const upProcesses = calculateProcessScalingFactor(
          upMdProcess,
          upDbProcess,
          {
            direction: 'downstream',
            nodeId: thisMdProcess?.['@dataSetInternalID'],
            flowUUID: dependenceDownstream?.flowUUID,
            // scalingFactor: upScalingFactor,
          },
          upScalingFactor,
          allUp2DownEdges,
          mdProcesses,
          dbProcesses,
        );
        if (upProcesses) {
          newProcesses.push(...upProcesses);
        }
      }
    });
  }

  const dependenceUpstreams = allUp2DownEdges.filter((ud: Up2DownEdge) => {
    return (
      ud?.upstreamId === thisMdProcess?.['@dataSetInternalID'] && ud?.dependence === 'upstream'
    );
  });

  if (dependenceUpstreams.length > 0) {
    dependenceUpstreams.forEach((dependenceUpstream: Up2DownEdge) => {
      const downMdProcess = mdProcesses.find(
        (mdp: any) => mdp?.['@dataSetInternalID'] === dependenceUpstream?.downstreamId,
      );
      const downDbProcess = dbProcesses.find(
        (dbp: any) =>
          dbp?.id === downMdProcess?.referenceToProcess?.['@refObjectId'] &&
          dbp?.version === downMdProcess?.referenceToProcess?.['@version'],
      );
      if (downMdProcess && downDbProcess) {
        const upExchange = thisDbProcessExchanges?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceUpstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT',
        );

        const downExchange = jsonToList(downDbProcess?.exchange)?.find(
          (e: any) =>
            e?.referenceToFlowDataSet?.['@refObjectId'] === dependenceUpstream?.flowUUID &&
            (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT',
        );

        const downMeanAmount = toAmountNumber(downExchange?.meanAmount);
        const downTargetAmount = new BigNumber(upExchange?.meanAmount)
          .times(scalingFactor)
          .toNumber();

        let downScalingFactor = 1;

        if (downMeanAmount !== 0 && downTargetAmount !== 0) {
          downScalingFactor = new BigNumber(downTargetAmount).div(downMeanAmount).toNumber();
        }

        const downProcesses = calculateProcessScalingFactor(
          downMdProcess,
          downDbProcess,
          {
            direction: 'upstream',
            nodeId: thisMdProcess?.['@dataSetInternalID'],
            flowUUID: dependenceUpstream?.flowUUID,
            // scalingFactor: downScalingFactor,
          },
          downScalingFactor,
          allUp2DownEdges,
          mdProcesses,
          dbProcesses,
        );
        if (downProcesses) {
          newProcesses.push(...downProcesses);
        }
      }
    });
  }
  return newProcesses;
};

const allocatedProcess = (processes: any[]) => {
  let childProcesses: any[] = [];
  processes.forEach((p: any) => {
    const pExchanges = jsonToList(p?.exchanges ?? []);
    const allocatedExchanges: any[] = [];
    const nonAllocatedExchanges: any[] = [];

    pExchanges.forEach((pExchange: any) => {
      if (pExchange?.exchangeDirection?.toUpperCase() !== 'OUTPUT') {
        nonAllocatedExchanges.push(pExchange);
        return;
      }

      const allocations = jsonToList(pExchange?.allocations ?? []);
      if (allocations.length > 0) {
        const allocatedFractionStr = allocations[0]?.allocation?.['@allocatedFraction'] ?? '';
        const allocatedFraction = percentStringToNumber(allocatedFractionStr);
        if (allocatedFraction && allocatedFraction > 0) {
          allocatedExchanges.push({
            exchange: pExchange,
            allocatedFraction: allocatedFraction,
          });
          return;
        }
      }
      if (pExchange['@dataSetInternalID'] !== p?.quantitativeReferenceFlowIndex) {
        nonAllocatedExchanges.push(pExchange);
      }
    });

    if (allocatedExchanges.length === 0) {
      const refOutputExchange = pExchanges.find(
        (pe: any) =>
          pe['@dataSetInternalID'] === p?.quantitativeReferenceFlowIndex &&
          pe?.exchangeDirection?.toUpperCase() === 'OUTPUT',
      );
      if (refOutputExchange) {
        allocatedExchanges.push({
          exchange: refOutputExchange,
          allocatedFraction: 1,
        });
      }
    }

    if (allocatedExchanges.length > 0) {
      const refExchange = pExchanges.find(
        (pe: any) => pe['@dataSetInternalID'] === p?.quantitativeReferenceFlowIndex,
      );

      if (
        refExchange &&
        refExchange?.exchangeDirection?.toUpperCase() === 'OUTPUT' &&
        !allocatedExchanges.find(
          (ne: any) => ne?.exchange?.['@dataSetInternalID'] === refExchange?.['@dataSetInternalID'],
        )
      ) {
        nonAllocatedExchanges.push(refExchange);
      }

      allocatedExchanges.forEach((allocatedExchange: any) => {
        const childProcess = {
          ...p,
          isAllocated: true,
          allocatedExchangeId: allocatedExchange.exchange?.['@dataSetInternalID'],
          allocatedExchangeFlowId:
            allocatedExchange.exchange?.referenceToFlowDataSet?.['@refObjectId'],
          allocatedFraction: allocatedExchange.allocatedFraction,
          exchanges: [...nonAllocatedExchanges, allocatedExchange.exchange],
        };
        childProcesses.push(childProcess);
      });
    } else {
      const childProcess = {
        ...p,
        isAllocated: false,
        allocatedExchangeId: '',
        allocatedExchangeFlowId: '',
        allocatedFraction: 1,
        exchanges: nonAllocatedExchanges,
      };
      childProcesses.push(childProcess);
    }
  });
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
      // exchanges: finalProductProcess?.exchanges?.map((e: any) => {
      //   if (e['@dataSetInternalID'] === finalProductProcess?.allocatedExchangeId) {
      //     return {
      //       ...e,
      //       meanAmount: new BigNumber(e?.meanAmount).times(allocatedFraction).toNumber(),
      //       resultingAmount: new BigNumber(e?.resultingAmount).times(allocatedFraction).toNumber(),
      //     };
      //   } else {
      //     return {
      //       ...e,
      //       meanAmount: new BigNumber(e?.meanAmount).times(newAllocatedFraction).toNumber(),
      //       resultingAmount: new BigNumber(e?.resultingAmount)
      //         .times(newAllocatedFraction)
      //         .toNumber(),
      //     };
      //   }
      // }),
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

  return { sumExchanges };
};

export async function genLifeCycleModelProcesses(
  id: string,
  refNode: any,
  data: any,
  oldSubmodels: any[],
) {
  const mdProcesses = jsonToList(
    data?.lifeCycleModelInformation?.technology?.processes?.processInstance,
  );
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
    (
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
    )?.data ?? [];

  let up2DownEdges: Up2DownEdge[] = [];
  mdProcesses.forEach((mdProcess: any) => {
    const mdProcessOutputExchanges = jsonToList(mdProcess?.connections?.outputExchange);
    let mainOutputExchange = { '@flowUUID': '' };

    if (mdProcessOutputExchanges?.length > 0) {
      if (mdProcessOutputExchanges?.length === 1) {
        mainOutputExchange = { '@flowUUID': mdProcessOutputExchanges[0]?.['@flowUUID'] ?? '' };
      } else {
        const dbProcess = dbProcesses.find(
          (pe: any) =>
            pe['id'] === mdProcess?.['referenceToProcess']?.['@refObjectId'] &&
            pe['version'] === mdProcess?.['referenceToProcess']?.['@version'],
        );
        const dbProcessExchanges = jsonToList(dbProcess?.exchange);
        const dbProcessRefExchange = dbProcessExchanges?.find(
          (e: any) =>
            e?.['@dataSetInternalID'] ===
            (dbProcess?.quantitativeReference as any)?.referenceToReferenceFlow,
        );
        const dbProcessRefExchangeFlowId =
          dbProcessRefExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
        const dbProcessRefExchangeFlowDirection = (
          dbProcessRefExchange?.exchangeDirection ?? ''
        ).toUpperCase();

        const refMdProcessOutputExchange = mdProcessOutputExchanges.find(
          (o: any) =>
            o?.['@flowUUID'] === dbProcessRefExchangeFlowId &&
            dbProcessRefExchangeFlowDirection === 'OUTPUT',
        );
        if (refMdProcessOutputExchange) {
          mainOutputExchange = { '@flowUUID': refMdProcessOutputExchange?.['@flowUUID'] ?? '' };
        } else {
          const mdProcessOutputExchangeFlowIds = mdProcessOutputExchanges.map(
            (o: any) => o?.['@flowUUID'] ?? '',
          );
          const fes = dbProcessExchanges.filter(
            (e: any) =>
              e?.exchangeDirection?.toUpperCase() === 'OUTPUT' &&
              mdProcessOutputExchangeFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId']),
          );
          const allocatedFractions = fes.map(
            (e: any) => e.allocations.allocation['@allocatedFraction'],
          );
          const maxAF = allocatedFractions.sort(comparePercentDesc)[0];
          const maxFlow = fes.find(
            (e: any) => e.allocations.allocation['@allocatedFraction'] === maxAF,
          );
          mainOutputExchange = {
            '@flowUUID': maxFlow?.referenceToFlowDataSet['@refObjectId'] ?? '',
          };
        }
      }
    }

    mdProcessOutputExchanges.forEach((o: any) => {
      jsonToList(o?.downstreamProcess).forEach((dp: any) => {
        const nowUp2DownEdge: Up2DownEdge = {
          flowUUID: o?.['@flowUUID'],
          upstreamId: mdProcess?.['@dataSetInternalID'],
          downstreamId: dp?.['@id'],
          mainOutputFlowUUID: mainOutputExchange?.['@flowUUID'],
          mainInputFlowUUID: '',
        };
        up2DownEdges.push(nowUp2DownEdge);
      });
    });
  });

  mdProcesses.forEach((mdProcess: any) => {
    const inputEdges = up2DownEdges.filter((edge: Up2DownEdge) => {
      return edge?.downstreamId === mdProcess?.['@dataSetInternalID'];
    });

    if (inputEdges.length > 0) {
      const dbProcess = dbProcesses.find(
        (pe: any) =>
          pe['id'] === mdProcess?.['referenceToProcess']?.['@refObjectId'] &&
          pe['version'] === mdProcess?.['referenceToProcess']?.['@version'],
      );
      if (inputEdges.length === 1) {
        inputEdges[0].mainInputFlowUUID = inputEdges[0]?.flowUUID ?? '';
      } else {
        const dbProcessExchanges = jsonToList(dbProcess?.exchange);
        const dbProcessRefExchange = dbProcessExchanges?.find(
          (e: any) =>
            e?.['@dataSetInternalID'] ===
            (dbProcess?.quantitativeReference as any)?.referenceToReferenceFlow,
        );
        const dbProcessRefExchangeFlowId =
          dbProcessRefExchange?.referenceToFlowDataSet?.['@refObjectId'] ?? '';
        const dbProcessRefExchangeFlowDirection = (
          dbProcessRefExchange?.exchangeDirection ?? ''
        ).toUpperCase();

        const refInputEdge = inputEdges.find(
          (ie) =>
            ie.flowUUID === dbProcessRefExchangeFlowId &&
            dbProcessRefExchangeFlowDirection === 'INPUT',
        );

        let mainInputExchange = { '@flowUUID': '' };
        if (refInputEdge) {
          mainInputExchange = { '@flowUUID': refInputEdge?.flowUUID ?? '' };
        } else {
          const inputEdgeFlowIds = inputEdges.map((ie) => ie?.flowUUID ?? '');
          const fes = dbProcessExchanges.filter(
            (e: any) =>
              e?.exchangeDirection?.toUpperCase() === 'INPUT' &&
              inputEdgeFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId']),
          );
          const allocatedFractions = fes.map(
            (e: any) => e.allocations.allocation['@allocatedFraction'] ?? '',
          );
          const maxAF = allocatedFractions.sort(comparePercentDesc)[0];
          if (maxAF !== '') {
            const maxFlow = fes.find(
              (e: any) => e.allocations.allocation['@allocatedFraction'] === maxAF,
            );
            const mainInputEdge = inputEdges.find(
              (ie) => ie.flowUUID === maxFlow?.referenceToFlowDataSet?.['@refObjectId'],
            );
            if (mainInputEdge) {
              mainInputExchange = { '@flowUUID': mainInputEdge?.flowUUID ?? '' };
            }
          }
        }

        inputEdges.forEach((ie) => {
          ie.mainInputFlowUUID = mainInputExchange?.['@flowUUID'] ?? '';
        });
      }
    }
  });

  const referenceToReferenceProcess =
    data?.lifeCycleModelInformation?.quantitativeReference?.referenceToReferenceProcess;

  if (!referenceToReferenceProcess) {
    throw new Error('No referenceToReferenceProcess found in lifeCycleModelInformation');
  }

  let baseIds1: any[] = [];
  baseIds1.push(referenceToReferenceProcess);
  let direction1 = 'OUTPUT';
  let whileGO1 = true;
  let whileGO11 = true;

  while (whileGO1) {
    whileGO11 = true;

    while (whileGO11) {
      if (baseIds1.length === 0) {
        whileGO11 = false;
        break;
      }

      let newBaseIds: any[] = [];

      if (direction1 === 'OUTPUT') {
        for (const baseId of baseIds1) {
          const uds = up2DownEdges.filter(
            (up2DownEdge: any) => up2DownEdge?.downstreamId === baseId,
          );
          for (const ud of uds) {
            if (ud?.dependence) {
              continue;
            } else {
              newBaseIds.push(ud?.upstreamId);
              ud.dependence = 'downstream';
            }
          }
        }
        baseIds1 = newBaseIds;
      } else if (direction1 === 'INPUT') {
        for (const baseId of baseIds1) {
          const uds = up2DownEdges.filter((up2DownEdge: any) => up2DownEdge?.upstreamId === baseId);
          for (const ud of uds) {
            if (ud?.dependence) {
              continue;
            } else {
              newBaseIds.push(ud?.downstreamId);
              ud.dependence = 'upstream';
            }
          }
        }
        baseIds1 = newBaseIds;
      }
    }

    if (direction1 === 'OUTPUT') {
      const downstreamItems = up2DownEdges.filter((item: any) => item.dependence === 'downstream');
      const duplicatedIds = Object.entries(
        downstreamItems.reduce(
          (acc: Record<string, number>, cur) => {
            acc[cur.upstreamId] = (acc[cur.upstreamId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      for (const duplicatedId of duplicatedIds) {
        const uds = up2DownEdges.filter(
          (up2DownEdge: any) => up2DownEdge?.upstreamId === duplicatedId,
        );
        for (const ud of uds) {
          if (ud.flowUUID !== ud.mainOutputFlowUUID) {
            ud.dependence = 'none';
            ud.mainDependence = 'downstream';
          }
        }
      }
    } else if (direction1 === 'INPUT') {
      const upstreamItems = up2DownEdges.filter((item: any) => item.dependence === 'upstream');
      const duplicatedIds = Object.entries(
        upstreamItems.reduce(
          (acc: Record<string, number>, cur) => {
            acc[cur.downstreamId] = (acc[cur.downstreamId] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      )
        .filter(([, count]) => count > 1)
        .map(([id]) => id);

      for (const duplicatedId of duplicatedIds) {
        const uds = up2DownEdges.filter(
          (up2DownEdge: any) => up2DownEdge?.downstreamId === duplicatedId,
        );
        for (const ud of uds) {
          if (ud.flowUUID !== ud.mainInputFlowUUID) {
            ud.dependence = 'none';
            ud.mainDependence = 'upstream';
          }
        }
      }
    }

    const hasDependenceItems = up2DownEdges.filter((ud: any) => ud?.dependence !== undefined) ?? [];
    if (hasDependenceItems.length === up2DownEdges.length) {
      whileGO1 = false;
      break;
    }

    baseIds1 = [];

    if (direction1 === 'OUTPUT') {
      const hasDependenceUpstreamIds = hasDependenceItems.map((ud: any) => ud?.upstreamId);
      const undoDownstreams = up2DownEdges.filter(
        (ud: any) =>
          ud?.dependence === undefined && hasDependenceUpstreamIds.includes(ud?.upstreamId),
      );
      if (undoDownstreams.length > 0) {
        baseIds1 = undoDownstreams.map((ud: any) => ud?.upstreamId);
      }
      direction1 = 'INPUT';
    } else if (direction1 === 'INPUT') {
      const hasDependenceDownstreamIds = hasDependenceItems.map((ud: any) => ud?.downstreamId);
      const undoUpstreams = up2DownEdges.filter(
        (ud: any) =>
          ud?.dependence === undefined && hasDependenceDownstreamIds.includes(ud?.downstreamId),
      );
      if (undoUpstreams.length > 0) {
        baseIds1 = undoUpstreams.map((ud: any) => ud?.downstreamId);
      }
      direction1 = 'OUTPUT';
    }

    if (baseIds1.length === 0) {
      whileGO1 = false;
      break;
    }
  }

  const refMdProcess = mdProcesses.find(
    (p: any) => p?.['@dataSetInternalID'] === referenceToReferenceProcess,
  );

  const refDbProcess = dbProcesses.find(
    (p: any) =>
      p?.id === refMdProcess?.referenceToProcess?.['@refObjectId'] &&
      p?.version === refMdProcess?.referenceToProcess?.['@version'],
  ) as any;

  const thisRefFlow = refDbProcess?.exchange?.find(
    (e: any) =>
      refDbProcess?.quantitativeReference?.referenceToReferenceFlow === e?.['@dataSetInternalID'],
  );

  const thisRefMeanAmount = toAmountNumber(thisRefFlow?.meanAmount);
  const targetAmount = Number(refNode?.data?.targetAmount) ?? thisRefMeanAmount;

  let scalingFactor = 1;

  if (thisRefMeanAmount !== 0 && targetAmount !== 0) {
    scalingFactor = new BigNumber(targetAmount).div(thisRefMeanAmount).toNumber();
  }
  if (refMdProcess && refDbProcess) {
    const processScalingFactors = calculateProcessScalingFactor(
      refMdProcess,
      refDbProcess,
      {
        direction: '',
        nodeId: '',
        flowUUID: '',
        // scalingFactor: 1,
      },
      scalingFactor,
      up2DownEdges,
      mdProcesses,
      dbProcesses,
    );

    const newUp2DownEdges = up2DownEdges.map((ud: Up2DownEdge) => {
      if (ud?.dependence === 'downstream') {
        const processScalingFactor = processScalingFactors.find((psf: any) => {
          return (
            psf?.dependence?.direction === 'downstream' &&
            psf?.dependence?.flowUUID === ud?.flowUUID &&
            psf?.dependence?.nodeId === ud?.downstreamId &&
            psf?.nodeId === ud?.upstreamId
          );
        });
        if (processScalingFactor) {
          return {
            ...ud,
            scalingFactor: processScalingFactor?.scalingFactor,
          };
        }
      }

      if (ud?.dependence === 'upstream') {
        const processScalingFactor = processScalingFactors.find((psf: any) => {
          return (
            psf?.dependence?.direction === 'upstream' &&
            psf?.dependence?.flowUUID === ud?.flowUUID &&
            psf?.dependence?.nodeId === ud?.upstreamId &&
            psf?.nodeId === ud?.downstreamId
          );
        });
        if (processScalingFactor) {
          return {
            ...ud,
            scalingFactor: processScalingFactor?.scalingFactor,
          };
        }
      }

      if (ud?.dependence === 'none') {
        if (ud?.mainDependence === 'downstream') {
          const processScalingFactor = processScalingFactors.filter((psf: any) => {
            return psf?.nodeId === ud?.upstreamId;
          });

          if (processScalingFactor) {
            const sumProcessScalingFactor = processScalingFactor.reduce((acc, curr) => {
              return acc + (curr?.scalingFactor ?? 0);
            }, 0);
            return {
              ...ud,
              scalingFactor: sumProcessScalingFactor,
            };
          }
        }
        if (ud?.mainDependence === 'upstream') {
          const processScalingFactor = processScalingFactors.filter((psf: any) => {
            return psf?.nodeId === ud?.downstreamId;
          });
          if (processScalingFactor) {
            const sumScalingFactor = processScalingFactor.reduce((acc, curr) => {
              return acc + (curr?.scalingFactor ?? 0);
            }, 0);
            return {
              ...ud,
              scalingFactor: sumScalingFactor,
            };
          }
        }
      }
      return {
        ...ud,
        scalingFactor: 0,
      };
    });

    const groupedProcesses: Record<string, any[]> = {};
    processScalingFactors.forEach((npe: any) => {
      if (!groupedProcesses[npe.nodeId]) {
        groupedProcesses[npe.nodeId] = [];
      }
      groupedProcesses[npe.nodeId].push(npe);
    });

    const newProcesses = Object.values(groupedProcesses).map((group: any[]) => {
      // const sumData = sumProcessExchange(group);
      const sumScalingFactor = group.reduce((acc, curr) => {
        return acc + (curr?.scalingFactor ?? 0);
      }, 0);

      return {
        ...group[0],
        scalingFactor: sumScalingFactor,
      };
    });

    const childProcesses = allocatedProcess(newProcesses);

    childProcesses.forEach((childProcess: any) => {
      if (childProcess?.nodeId === referenceToReferenceProcess) {
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
        const finalProductType = hasFinalProductProcessExchange(
          cpe,
          newUp2DownEdges,
          childProcesses,
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

    const hasFinalProductProcesses = childProcesses.filter(
      (cpe: any) => cpe?.finalProductType === 'has',
    );

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
            const connectedInputFlowIds = newUp2DownEdges
              .map((ud: Up2DownEdge) => {
                if (ud?.downstreamId === npe?.nodeId) {
                  return ud?.flowUUID;
                }
                return null;
              })
              .filter((flowUUID: any) => flowUUID !== null);

            const connectedOutputFlowIds = newUp2DownEdges
              .map((ud: Up2DownEdge) => {
                if (ud?.upstreamId === npe?.nodeId) {
                  return ud?.flowUUID;
                }
                return null;
              })
              .filter((flowUUID: any) => flowUUID !== null);

            const npeExchanges = jsonToList(npe?.exchanges);
            const unconnectedExchanges = npeExchanges
              .map((e: any) => {
                if (
                  (e?.exchangeDirection ?? '').toUpperCase() === 'INPUT' &&
                  connectedInputFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
                ) {
                  return null;
                }
                if (
                  (e?.exchangeDirection ?? '').toUpperCase() === 'OUTPUT' &&
                  connectedOutputFlowIds.includes(e?.referenceToFlowDataSet?.['@refObjectId'])
                ) {
                  return null;
                }
                return e;
              })
              .filter((item: any) => item !== null);

            return {
              ...npe,
              exchanges: unconnectedExchanges,
            };
          });

          if (unconnectedProcessExchanges.length > 0) {
            newSumExchanges = sumProcessExchange(unconnectedProcessExchanges).sumExchanges.map(
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
                  '@refObjectId': thisRefFlow?.referenceToFlowDataSet?.['@refObjectId'] ?? '',
                  '@exchangeDirection': thisRefFlow?.exchangeDirection ?? '',
                },
              };
            }

            let newId = v4();
            let option = 'create';
            let type = 'secondary';
            const newExchanges = newSumExchanges?.map((e: any) => {
              if (
                finalProductProcessExchange?.nodeId === referenceToReferenceProcess &&
                e?.referenceToFlowDataSet?.['@refObjectId'] ===
                  thisRefFlow?.referenceToFlowDataSet?.['@refObjectId'] &&
                e?.exchangeDirection?.toUpperCase() ===
                  thisRefFlow?.exchangeDirection?.toUpperCase()
              ) {
                newId = id;
                option = 'update';
                type = 'primary';
                return {
                  ...e,
                  allocatedFraction: undefined,
                  allocations: undefined,
                  meanAmount: targetAmount.toString(),
                  resultingAmount: targetAmount.toString(),
                  quantitativeReference: true,
                };
              } else {
                if (
                  finalProductProcessExchange?.isAllocated &&
                  e?.referenceToFlowDataSet?.['@refObjectId'] ===
                    finalProductProcessExchange?.allocatedExchangeFlowId &&
                  e?.exchangeDirection?.toUpperCase() ===
                    finalProductProcessExchange?.allocatedExchangeDirection?.toUpperCase()
                ) {
                  return {
                    ...e,
                    allocatedFraction: undefined,
                    allocations: undefined,
                    meanAmount: e?.meanAmount.toString(),
                    resultingAmount: e?.resultingAmount.toString(),
                    quantitativeReference: true,
                  };
                } else {
                  return {
                    ...e,
                    allocatedFraction: undefined,
                    allocations: undefined,
                    meanAmount: e?.meanAmount.toString(),
                    resultingAmount: e?.resultingAmount.toString(),
                  };
                }
              }
            });

            // const LCIAResults = await LCIAResultCalculation(newExchanges);

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
                            ?.referenceToTechnologyFlowDiagrammOrPicture?.[
                            'common:shortDescription'
                          ],
                      },
                    },
                    mathematicalRelations: {
                      modelDescription:
                        data?.lifeCycleModelInformation?.mathematicalRelations?.modelDescription,
                      variableParameter: {
                        '@name':
                          data?.lifeCycleModelInformation?.mathematicalRelations
                            ?.variableParameter?.['@name'],
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
                    // LCIAResult: LCIAResults,
                  },
                },
              },
            });

            // if(type==='primary'){
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
  return [];
}
