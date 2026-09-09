/**
 * Result assembly for the matrix calculation.
 *
 * zh-CN: 求解后的端口平衡校验、活动量/倍率映射与子模型聚合。职责：
 *  - 以原始矩阵复核端口平衡：连通枢轴输出必须被消费完；死端直通管的每条
 *    供应边都必须与供应方余量一致；
 *  - 把视图活动量映射为实例倍率（x / |参考数量|，经主视图统一）；
 *  - 按参考视图（主过程）与死端视图（副产品）聚合独立归因情景；
 *  - 组内已连接的内部交换相互抵消，不重复进入外部清单。
 *
 * en-US: Post-solve port-balance verification, activity/multiplier mapping and
 * submodel aggregation. Connected pivot outputs must be fully consumed; every
 * dead-end supply pipe must match the supplier's leftover; instance
 * multipliers are x / |reference amount| unified through primary views; groups
 * aggregate independent attribution scenarios with internal flows cancelling.
 */

import type { CompiledView, Compilation } from './compile';
import type {
  CalculationIssue,
  MatrixCalculationResult,
  MatrixResultExchange,
  MatrixResultGroup,
  SolvedView,
} from './types';
import { CALCULATION_TOLERANCES, CalculationError } from './types';

/**
 * zh-CN: 汇总求解结果并执行端口平衡校验，返回完整计算结果。
 * en-US: Summarize the solution, run the port-balance checks, and return the full result.
 */
export const assembleResult = (
  compilation: Compilation,
  solution: number[],
): MatrixCalculationResult => {
  const { views, viewById, instanceByIndex, edges } = compilation;
  const activityOf = (view: CompiledView): number => solution[view.columnIndex];

  // 每条边的交付量与每个供应视图的交付汇总（系统消费与死端直通分别累计）
  const deliveredBySupplierView = new Map<string, number>();
  const deadEndDeliveredBySupplierView = new Map<string, number>();
  const edgeAmounts: Record<string, number> = {};

  const deadEndViewIds = new Set(views.filter((view) => view.isDeadEnd).map((view) => view.id));
  for (const edge of edges) {
    let delivered = 0;
    let systemDelivered = 0;
    for (const consumption of edge.consumptions) {
      const consumerView = viewById.get(consumption.viewId)!;
      const amount = consumption.amount * activityOf(consumerView);
      delivered += amount;
      if (!deadEndViewIds.has(consumerView.id)) {
        systemDelivered += amount;
      }
    }
    edgeAmounts[edge.connection.edgeId] = delivered;
    // 仅需求驱动（系统）消费计入供应余量；死端直通交付单独累计
    if (systemDelivered !== 0) {
      deliveredBySupplierView.set(
        edge.supplierViewId,
        (deliveredBySupplierView.get(edge.supplierViewId) ?? 0) + systemDelivered,
      );
    }
    if (delivered - systemDelivered !== 0) {
      deadEndDeliveredBySupplierView.set(
        edge.supplierViewId,
        (deadEndDeliveredBySupplierView.get(edge.supplierViewId) ?? 0) +
          (delivered - systemDelivered),
      );
    }
  }

  // 端口平衡校验 1：连通枢轴输出没有自由边界，产量必须被消费完
  const issues: CalculationIssue[] = [];
  for (const view of views) {
    const instance = instanceByIndex.get(view.instanceIndex);
    const pivotIsConnected = edges.some((edge) => edge.supplierViewId === view.id);
    if (!pivotIsConnected) continue;
    const activity = activityOf(view);
    const deliveredToSystem = deliveredBySupplierView.get(view.id) ?? 0;
    const deliveredToDeadEnds = deadEndDeliveredBySupplierView.get(view.id) ?? 0;
    const deliveredTotal = deliveredToSystem + deliveredToDeadEnds;
    if (view.isReference) {
      // 参考视图：目标量可经边界或死端管道交付，只禁止超额交付
      if (
        activity - deliveredTotal <
        -CALCULATION_TOLERANCES.residual * Math.max(1, Math.abs(activity), Math.abs(deliveredTotal))
      ) {
        issues.push({
          code: 'MODEL_NOT_SOLVABLE',
          instanceIndex: view.instanceIndex,
          nodeId: instance?.nodeId,
          flowId: view.pivotFlowId,
          exchangeInternalId: view.pivotExchangeId,
        });
      }
      continue;
    }
    // 非参考连通枢轴输出没有自由边界：产量必须被消费完
    if (
      Math.abs(activity - deliveredTotal) >
      CALCULATION_TOLERANCES.residual * Math.max(1, Math.abs(activity), Math.abs(deliveredTotal))
    ) {
      issues.push({
        code: 'MODEL_NOT_SOLVABLE',
        instanceIndex: view.instanceIndex,
        nodeId: instance?.nodeId,
        flowId: view.pivotFlowId,
        exchangeInternalId: view.pivotExchangeId,
      });
    }
  }

  // 端口平衡校验 2：每条死端直通管的交付量必须等于供应方余量
  for (const edge of edges) {
    const consumption = edge.consumptions.find((item) => {
      const view = viewById.get(item.viewId);
      return !!view?.isDeadEnd;
    });
    const consumerView = consumption ? viewById.get(consumption.viewId) : undefined;
    if (!consumption || !consumerView?.isDeadEnd) continue;
    const supplierView = viewById.get(edge.supplierViewId)!;
    const supplierDeliveredToSystem = deliveredBySupplierView.get(supplierView.id) ?? 0;
    const leftover = activityOf(supplierView) - supplierDeliveredToSystem;
    const pipeFlow = consumption.amount * activityOf(consumerView);
    if (
      Math.abs(pipeFlow - leftover) >
      CALCULATION_TOLERANCES.residual * Math.max(1, Math.abs(leftover), Math.abs(pipeFlow))
    ) {
      issues.push({
        code: 'MODEL_NOT_SOLVABLE',
        instanceIndex: consumerView.instanceIndex,
        nodeId: instanceByIndex.get(consumerView.instanceIndex)?.nodeId,
        flowId: edge.connection.inputFlowId,
        edgeId: edge.connection.edgeId,
      });
    }
  }

  if (issues.length > 0) {
    throw new CalculationError(issues[0].code, issues);
  }

  // 视图活动量
  const solvedViews: SolvedView[] = views.map((view) => ({
    instanceIndex: view.instanceIndex,
    pivotExchangeId: view.pivotExchangeId,
    pivotDirection: view.pivotDirection,
    pivotFlowId: view.pivotFlowId,
    activity: activityOf(view),
    isReference: view.isReference,
  }));

  // 实例倍率：主视图活动量 / |主视图枢轴数量|
  const instanceMultipliers: Record<string, number> = {};
  for (const [instanceIndex, primaryViewId] of compilation.primaryViewIdByInstance) {
    const primaryView = viewById.get(primaryViewId)!;
    const activity = activityOf(primaryView);
    if (activity <= 0 || !primaryView.pivotAmount) continue;
    instanceMultipliers[instanceIndex] = activity / primaryView.pivotAmount;
  }

  // 子模型分组：主过程（参考视图上游闭包）+ 副产品（死端视图上游闭包）
  const supplierViewByConsumerInput = new Map<string, string>();
  for (const edge of edges) {
    const key = `${edge.connection.downstreamIndex}\u0000${edge.connection.inputFlowId}`;
    supplierViewByConsumerInput.set(key, edge.supplierViewId);
  }

  const buildGroup = (
    rootView: CompiledView,
    type: 'primary' | 'secondary',
  ): MatrixResultGroup | undefined => {
    const memberIds: string[] = [];
    const visited = new Set<string>([rootView.id]);
    const queue: Array<CompiledView> = [rootView];
    while (queue.length > 0) {
      const view = queue.shift()!;
      memberIds.push(view.id);
      for (const [key, supplierViewId] of supplierViewByConsumerInput) {
        if (!key.startsWith(`${view.instanceIndex}\u0000`)) continue;
        if (visited.has(supplierViewId)) continue;
        const supplierView = viewById.get(supplierViewId)!;
        // 副产品闭包不吸收其他情景的根视图（参考视图或别的死端）
        if (type === 'secondary' && (supplierView.isReference || supplierView.isDeadEnd)) {
          continue;
        }
        visited.add(supplierViewId);
        queue.push(supplierView);
      }
    }

    const members = memberIds
      .map((id) => viewById.get(id))
      .filter((view): view is CompiledView => !!view);
    // 组根视图已被调用方保证活动量为正，成员必然非空

    const memberSet = new Set(memberIds);
    const aggregated = new Map<string, MatrixResultExchange>();
    const order: string[] = [];
    const addExchange = (
      direction: 'INPUT' | 'OUTPUT',
      flowId: string,
      amount: number,
      template: MatrixResultExchange['template'],
    ) => {
      const key = `${direction}\u0000${flowId}`;
      const existing = aggregated.get(key);
      if (!existing) {
        order.push(key);
        aggregated.set(key, { direction, flowId, amount, quantitativeReference: false, template });
      } else {
        existing.amount += amount;
      }
    };

    for (const view of members) {
      const instance = instanceByIndex.get(view.instanceIndex)!;
      const activity = activityOf(view);

      for (const exchange of instance.exchanges) {
        const payload = exchange.payload;
        const isPivot = payload.internalId === view.pivotExchangeId;

        if (payload.direction === 'OUTPUT' && !isPivot) {
          // 已连接的非枢轴输出有自己的视图，不进入本视图清单
          const hasOwnView = views.some(
            (candidate) =>
              candidate.instanceIndex === view.instanceIndex &&
              candidate.pivotExchangeId === payload.internalId,
          );
          if (hasOwnView) continue;
        }

        let amount: number;
        if (isPivot && payload.direction === 'OUTPUT') {
          // 枢轴输出：减去组内消费；组外消费与最终需求保留为边界流出
          let inGroupConsumption = 0;
          for (const edge of edges) {
            if (edge.supplierViewId !== view.id) continue;
            for (const consumption of edge.consumptions) {
              if (!memberSet.has(consumption.viewId)) continue;
              const consumerView = viewById.get(consumption.viewId)!;
              inGroupConsumption += consumption.amount * activityOf(consumerView);
            }
          }
          amount = activity - inGroupConsumption;
        } else {
          const fraction = isPivot
            ? 1
            : compilation.fractionsByView.get(view.id)!.get(payload.internalId)!;
          amount = ((payload.amount ?? 0) * fraction * activity) / view.pivotAmount;
        }

        if (payload.direction === 'INPUT') {
          // 已连接且供应视图在组内的输入是内部流，完全抵消不进入清单
          const supplierViewId = supplierViewByConsumerInput.get(
            `${view.instanceIndex}\u0000${payload.flowId}`,
          );
          if (supplierViewId && memberSet.has(supplierViewId)) continue;
          amount = -Math.abs(amount);
        }

        if (Math.abs(amount) <= CALCULATION_TOLERANCES.zeroActivity * Math.max(1, activity)) {
          continue;
        }
        addExchange(payload.direction, payload.flowId, amount, payload);
      }
    }

    // 标记定量参考
    const refExchange = aggregated.get(`${rootView.pivotDirection}\u0000${rootView.pivotFlowId}`);
    if (refExchange) {
      refExchange.quantitativeReference = true;
    }

    const refProcesses = Array.from(
      new Set(
        members.map((view) => {
          const instance = instanceByIndex.get(view.instanceIndex)!;
          return `${instance.processId}@${instance.processVersion}`;
        }),
      ),
    ).map((key) => {
      const [id, version] = key.split('@');
      return { id, version };
    });

    return {
      type,
      root: { instanceIndex: rootView.instanceIndex, pivotExchangeId: rootView.pivotExchangeId },
      pivotFlowId: rootView.pivotFlowId,
      pivotDirection: rootView.pivotDirection,
      exchanges: order.map((key) => aggregated.get(key)!),
      refProcesses,
    };
  };

  const groups: MatrixResultGroup[] = [];
  const refView = viewById.get(compilation.refViewId)!;
  groups.push(buildGroup(refView, 'primary')!);
  for (const view of views) {
    if (!view.isDeadEnd || view.isReference) continue;
    if (activityOf(view) <= 0) continue;
    groups.push(buildGroup(view, 'secondary')!);
  }

  return {
    views: solvedViews,
    instanceMultipliers,
    edgeAmounts,
    balancedEdgeIds: Object.keys(edgeAmounts),
    groups,
  };
};
