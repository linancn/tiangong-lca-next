/**
 * Input and connection validation for the matrix calculation.
 *
 * zh-CN: 矩阵计算的输入与连接校验。单供应约束、引用/目标量、流兼容性与连接
 * 结构在这里统一判定；连线、粘贴、导入和计算入口共用同一规则。定位信息以
 * CalculationIssue 返回，独立于错误正文展示。
 *
 * en-US: Input and connection validation for the matrix calculation. The
 * single-provider rule, reference/target validation, flow compatibility and
 * connection structure are decided here; manual connecting, pasting, importing
 * and the calculation entry share the same rules. Location data is returned as
 * CalculationIssue and rendered separately from the error body.
 */

import type { CalculationIssue, MatrixCalculationPayload, MatrixConnectionPayload } from './types';
import { CalculationError } from './types';

/**
 * zh-CN: 生成 `${upstreamIndex}->${downstreamIndex}:${flowId}` 形式的边标识，
 * 与既有 Up2DownEdge.id 保持一致。
 * en-US: Build the `up->down:flow` edge id, matching the existing Up2DownEdge.id.
 */
export const buildMatrixEdgeId = (
  upstreamIndex: string,
  downstreamIndex: string,
  flowId: string,
): string => `${upstreamIndex}->${downstreamIndex}:${flowId}`;

/**
 * zh-CN: 判断一条新连接是否会让某个目标输入出现第二个供应方。
 * 返回与该目标输入相连、且来源不同于新连接的既有边 ID 列表；列表非空表示
 * 应拒绝建立新边。excludeEdgeIds 用于重连场景（正在编辑的同一条边不算第二
 * 供应方）。
 *
 * en-US: Decide whether a new connection would give a target input a second
 * provider. Returns the ids of existing edges into the same target input from
 * a different source; a non-empty list means the new edge must be rejected.
 * excludeEdgeIds supports reconnection (the edge being edited is not a second
 * provider).
 */
export const findConflictingProviderEdges = (
  connections: Array<
    Pick<MatrixConnectionPayload, 'upstreamIndex' | 'downstreamIndex' | 'inputFlowId' | 'edgeId'>
  >,
  candidate: { upstreamIndex: string; downstreamIndex: string; inputFlowId: string },
  excludeEdgeIds: ReadonlyArray<string> = [],
): string[] => {
  const excluded = new Set(excludeEdgeIds);
  const conflicts: string[] = [];
  for (const connection of connections) {
    if (excluded.has(connection.edgeId)) continue;
    if (
      connection.downstreamIndex === candidate.downstreamIndex &&
      connection.inputFlowId === candidate.inputFlowId &&
      connection.upstreamIndex !== candidate.upstreamIndex
    ) {
      conflicts.push(connection.edgeId);
    }
  }
  return conflicts;
};

/**
 * zh-CN: 计算入口的完整结构校验。全部问题一次性收集，便于集中展示与定位。
 * en-US: Full structure validation for the calculation entry. All issues are
 * collected in one pass for centralized display and locating.
 */
export const validateCalculationPayload = (
  payload: MatrixCalculationPayload,
): CalculationIssue[] => {
  const issues: CalculationIssue[] = [];

  if (payload.instances.length === 0) {
    issues.push({ code: 'EMPTY_MODEL' });
    return issues;
  }

  const instancesByIndex = new Map(
    payload.instances.map((instance) => [instance.instanceIndex, instance]),
  );
  const refInstance = instancesByIndex.get(payload.refInstanceIndex);

  if (!refInstance) {
    issues.push({ code: 'INVALID_REFERENCE' });
  }

  if (!Number.isFinite(payload.targetAmount) || payload.targetAmount <= 0) {
    issues.push({ code: 'INVALID_TARGET_AMOUNT' });
  }

  // 连接结构、流兼容性与单供应约束
  const providersByTargetInput = new Map<string, MatrixConnectionPayload[]>();
  for (const instance of payload.instances) {
    for (const connection of instance.connections) {
      const upstream = instancesByIndex.get(connection.upstreamIndex);
      const downstream = instancesByIndex.get(connection.downstreamIndex);
      if (!upstream || !downstream) {
        issues.push({
          code: 'INVALID_CONNECTION',
          instanceIndex: instance.instanceIndex,
          nodeId: instance.nodeId,
          edgeId: connection.edgeId,
        });
        continue;
      }

      if (connection.outputFlowId !== connection.inputFlowId) {
        issues.push({
          code: 'INVALID_CONNECTION',
          instanceIndex: connection.downstreamIndex,
          nodeId: downstream.nodeId,
          flowId: connection.inputFlowId,
          edgeId: connection.edgeId,
        });
        continue;
      }

      if (
        typeof connection.outputFlowVersion === 'string' &&
        typeof connection.inputFlowVersion === 'string' &&
        connection.outputFlowVersion !== connection.inputFlowVersion
      ) {
        issues.push({
          code: 'INCOMPATIBLE_FLOW',
          instanceIndex: connection.downstreamIndex,
          nodeId: downstream.nodeId,
          flowId: connection.inputFlowId,
          edgeId: connection.edgeId,
        });
      }

      const providerKey = `${connection.downstreamIndex}\u0000${connection.inputFlowId}`;
      const providers = providersByTargetInput.get(providerKey) ?? [];
      providers.push(connection);
      providersByTargetInput.set(providerKey, providers);
    }
  }

  for (const [providerKey, providers] of providersByTargetInput) {
    const distinctUpstreams = new Set(providers.map((connection) => connection.upstreamIndex));
    if (distinctUpstreams.size > 1) {
      const downstreamIndex = providerKey.split('\u0000')[0];
      const flowId = providerKey.split('\u0000')[1];
      const downstream = instancesByIndex.get(downstreamIndex);
      issues.push({
        code: 'MULTIPLE_PROVIDERS',
        instanceIndex: downstreamIndex,
        nodeId: downstream?.nodeId,
        flowId,
        edgeId: providers[0]?.edgeId,
      });
    }
  }

  // 交换数量与参考交换
  for (const instance of payload.instances) {
    for (const exchange of instance.process.exchanges) {
      if (exchange.amount === null) {
        issues.push({
          code: 'INVALID_EXCHANGE_AMOUNT',
          instanceIndex: instance.instanceIndex,
          nodeId: instance.nodeId,
          flowId: exchange.flowId,
          exchangeInternalId: exchange.internalId,
        });
      }
    }

    const refExchange = instance.process.refExchangeInternalId
      ? instance.process.exchanges.find(
          (exchange) => exchange.internalId === instance.process.refExchangeInternalId,
        )
      : undefined;

    if (
      !instance.process.refExchangeInternalId ||
      !refExchange ||
      refExchange.amount === null ||
      refExchange.amount === 0
    ) {
      issues.push({
        code: 'INVALID_REFERENCE_EXCHANGE',
        instanceIndex: instance.instanceIndex,
        nodeId: instance.nodeId,
        exchangeInternalId: instance.process.refExchangeInternalId,
      });
    }
  }

  return issues;
};

/**
 * zh-CN: 运行结构校验并在发现问题时抛出 CalculationError。
 * en-US: Run the structure validation and throw CalculationError when issues exist.
 */
export const assertCalculationPayloadValid = (payload: MatrixCalculationPayload): void => {
  const issues = validateCalculationPayload(payload);
  if (issues.length > 0) {
    throw new CalculationError(issues[0].code, issues);
  }
};
