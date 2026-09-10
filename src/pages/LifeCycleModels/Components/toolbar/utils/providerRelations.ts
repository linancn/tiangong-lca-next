/**
 * Provider relation extraction for the life-cycle model editor.
 *
 * zh-CN: 从画布边集合提取供应关系，统一使用过程实例内部 ID（@dataSetInternalID，
 * 即 node.data.index）作为标识域；画布 UUID 仅用于反查实例。连线、重连、粘贴、
 * 旧模型与计算入口共用同一标识域，避免混用导致冲突漏检。
 *
 * en-US: Extracts provider relations from canvas edges using one identifier
 * domain: the process instance internal id (@dataSetInternalID, i.e.
 * node.data.index). Canvas UUIDs are only used to resolve instances. Connect,
 * reconnect, paste, legacy models and the calculation entry share this domain.
 */

import type {
  LifeCycleModelGraphEdge,
  LifeCycleModelGraphNode,
} from '@/services/lifeCycleModels/data';

export interface ProviderRelation {
  upstreamIndex: string;
  downstreamIndex: string;
  inputFlowId: string;
  edgeId: string;
}

/**
 * zh-CN: 从画布边集合提取供应关系。上/下游实例取自画布节点反查的
 * data.index；反查失败的边跳过（无法进入统一标识域）。
 * en-US: Resolve each edge's source/target canvas node and use its
 * data.index as the instance identifier; edges whose endpoints cannot be
 * resolved are skipped.
 */
export const collectCanvasProviderRelations = (
  nodes: LifeCycleModelGraphNode[],
  graphEdges: LifeCycleModelGraphEdge[],
): ProviderRelation[] => {
  const indexByNodeId = new Map<string, string>();
  for (const node of nodes) {
    if (node?.id && node?.data?.index !== undefined) {
      indexByNodeId.set(node.id, String(node.data.index));
    }
  }

  const relations: ProviderRelation[] = [];
  for (const edge of graphEdges) {
    const outputFlowId = edge?.data?.connection?.outputExchange?.['@flowUUID'];
    const inputFlowId = edge?.data?.connection?.outputExchange?.downstreamProcess?.['@flowUUID'];
    if (!outputFlowId || !inputFlowId) continue;
    const sourceNodeId = String(edge?.data?.node?.sourceNodeID ?? edge?.source?.cell ?? '');
    const targetNodeId = String(edge?.data?.node?.targetNodeID ?? edge?.target?.cell ?? '');
    const upstreamIndex = indexByNodeId.get(sourceNodeId);
    const downstreamIndex = indexByNodeId.get(targetNodeId);
    if (upstreamIndex === undefined || downstreamIndex === undefined) continue;
    relations.push({
      upstreamIndex,
      downstreamIndex,
      inputFlowId,
      edgeId: String(edge?.id ?? ''),
    });
  }
  return relations;
};

/**
 * zh-CN: 判断一条新连接是否会让某个目标输入出现第二个供应方。
 * en-US: Decide whether a new connection would give a target input a second provider.
 */
export const findConflictingProviderEdges = (
  relations: ReadonlyArray<ProviderRelation>,
  candidate: { upstreamIndex: string; downstreamIndex: string; inputFlowId: string },
  excludeEdgeIds: ReadonlyArray<string> = [],
): string[] => {
  const excluded = new Set(excludeEdgeIds);
  const conflicts: string[] = [];
  for (const relation of relations) {
    if (excluded.has(relation.edgeId)) continue;
    if (
      relation.downstreamIndex === candidate.downstreamIndex &&
      relation.inputFlowId === candidate.inputFlowId &&
      relation.upstreamIndex !== candidate.upstreamIndex
    ) {
      conflicts.push(relation.edgeId);
    }
  }
  return conflicts;
};

/**
 * zh-CN: 收集存在多供应方冲突的下游画布节点 ID（实例内部 ID 反查画布节点）。
 * en-US: Collect downstream canvas node ids whose inputs have multiple providers.
 */
export const collectMultiProviderConflictNodeIds = (
  nodes: LifeCycleModelGraphNode[],
  graphEdges: LifeCycleModelGraphEdge[],
): string[] => {
  const nodeIdByIndex = new Map<string, string>();
  for (const node of nodes) {
    if (node?.id && node?.data?.index !== undefined) {
      nodeIdByIndex.set(String(node.data.index), node.id);
    }
  }
  const byTargetInput = new Map<string, Set<string>>();
  for (const relation of collectCanvasProviderRelations(nodes, graphEdges)) {
    const key = `${relation.downstreamIndex}\u0000${relation.inputFlowId}`;
    const providers = byTargetInput.get(key) ?? new Set<string>();
    providers.add(relation.upstreamIndex);
    byTargetInput.set(key, providers);
  }
  const conflicted: string[] = [];
  for (const [key, providers] of byTargetInput) {
    if (providers.size > 1) {
      // 关系仅携带从同一节点集合解析出的实例 ID，节点必然可反查
      conflicted.push(nodeIdByIndex.get(key.split('\u0000')[0])!);
    }
  }
  return Array.from(new Set(conflicted));
};
