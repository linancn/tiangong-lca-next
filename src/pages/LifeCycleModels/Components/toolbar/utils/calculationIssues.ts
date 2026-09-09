/**
 * Calculation issue location helpers for the life-cycle model editor.
 *
 * zh-CN: 把计算模块返回的可定位问题解析为编辑器内的展示信息。定位信息独立于
 * 错误正文；名称缺失时回退为“节点 {index} / 流 {index}”；同名源过程用画布
 * 实例序号消歧。内部定位始终使用运行绑定的实例/交换/边 ID。
 *
 * en-US: Resolves calculation issues into editor display data. Location data is
 * independent of the error body; names fall back to "Node {index} / Flow
 * {index}"; same-name source instances are disambiguated by canvas instance
 * number. Internal locating always uses the run-bound instance/exchange/edge
 * ids.
 */

import type { LifeCycleModelGraphNode } from '@/services/lifeCycleModels/data';
import type { CalculationIssue } from '@/services/lifeCycleModels/matrixCalculation/types';

export interface ResolvedCalculationIssue {
  issue: CalculationIssue;
  nodeId?: string;
  /** zh-CN: 过程显示名（含同名实例消歧）。en-US: Process display name (with same-name disambiguation). */
  processName?: string;
  /** zh-CN: 流显示名。en-US: Flow display name. */
  flowName?: string;
}

const getPortFlowName = (
  node: LifeCycleModelGraphNode,
  flowId: string,
  lang: string,
): string | undefined => {
  const items = node?.ports?.items ?? [];
  for (const item of items) {
    if (item?.data?.flowId !== flowId) continue;
    const text = item?.data?.textLang;
    if (!text) continue;
    if (typeof text === 'string') return text;
    const entries = Array.isArray(text) ? text : [text];
    const matched = entries.find((entry: any) => entry?.['@xml:lang'] === lang) ?? entries[0];
    if (matched?.['#text']) return String(matched['#text']);
  }
  return undefined;
};

const getNodeName = (node: LifeCycleModelGraphNode, lang: string): string | undefined => {
  const text = node?.data?.shortDescription ?? node?.data?.label;
  if (!text) return undefined;
  if (typeof text === 'string') return text;
  const entries = Array.isArray(text) ? text : [text];
  const matched = entries.find((entry: any) => entry?.['@xml:lang'] === lang) ?? entries[0];
  if (matched?.['#text']) return String(matched['#text']);
  return undefined;
};

/**
 * zh-CN: 解析问题定位；无可靠定位信息时仅返回原始 issue（UI 不显示定位按钮）。
 * en-US: Resolve issue locations; when no reliable location exists only the raw
 * issue is returned (the UI shows no locate button).
 */
export const resolveCalculationIssues = (
  nodes: LifeCycleModelGraphNode[],
  issues: CalculationIssue[],
  lang: string,
): ResolvedCalculationIssue[] => {
  const nameCounts = new Map<string, number>();
  for (const node of nodes) {
    const name = getNodeName(node, lang);
    if (!name) continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }

  return (issues ?? []).map((issue) => {
    const node =
      nodes.find((candidate) => candidate?.data?.index === issue.instanceIndex) ??
      nodes.find((candidate) => candidate?.id === issue.nodeId);
    if (!node) {
      return { issue };
    }

    let processName = getNodeName(node, lang);
    if (processName && (nameCounts.get(processName) ?? 0) > 1) {
      const sameNameNodes = nodes.filter(
        (candidate) => getNodeName(candidate, lang) === processName,
      );
      const displayNumber = sameNameNodes.findIndex((candidate) => candidate?.id === node?.id);
      if (displayNumber >= 0) {
        processName = `${processName} ${displayNumber + 1}`;
      }
    }

    const flowName = issue.flowId ? getPortFlowName(node, issue.flowId, lang) : undefined;

    return {
      issue,
      nodeId: node?.id,
      processName,
      flowName,
    };
  });
};

/**
 * zh-CN: 计算失败分类码全集（用于判断结果是否属于本地计算失败）。
 * en-US: All calculation failure codes (to classify a result as a local calculation failure).
 */
export const CALCULATION_ERROR_CODES = [
  'EMPTY_MODEL',
  'INVALID_REFERENCE',
  'INVALID_TARGET_AMOUNT',
  'INVALID_REFERENCE_EXCHANGE',
  'MULTIPLE_PROVIDERS',
  'INVALID_CONNECTION',
  'INCOMPATIBLE_FLOW',
  'INVALID_EXCHANGE_AMOUNT',
  'INVALID_ALLOCATION',
  'MODEL_NOT_SOLVABLE',
  'NUMERIC_RESULT_INVALID',
  'NEGATIVE_ACTIVITY',
  'SOURCE_UNAVAILABLE',
  'LOCAL_LIMIT_EXCEEDED',
  'CALCULATION_FAILED',
] as const;

export const isCalculationErrorCode = (code: string | undefined): boolean =>
  !!code && (CALCULATION_ERROR_CODES as readonly string[]).includes(code);
