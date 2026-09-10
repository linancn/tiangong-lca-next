/**
 * Dense LU solve for the compiled model system.
 *
 * zh-CN: 组装 M = I - A 并用带部分主元的 LU 分解求解 Mx = y（不显式求逆）。
 * 求解器确认奇异 → MODEL_NOT_SOLVABLE；解含非有限值或残差超差 →
 * NUMERIC_RESULT_INVALID；超出默认非负活动语义 → NEGATIVE_ACTIVITY。
 * 不做伪逆、删边、截负数或旧算法兜底。
 *
 * en-US: Assemble M = I - A and solve Mx = y with partial-pivoting LU (no
 * explicit inverse). A solver-confirmed singular matrix maps to
 * MODEL_NOT_SOLVABLE; non-finite solutions or excessive residuals map to
 * NUMERIC_RESULT_INVALID; violations of the default non-negative activity
 * semantics map to NEGATIVE_ACTIVITY. No pseudo-inverse, edge removal,
 * clamping, or legacy-algorithm fallback.
 */

import { LuDecomposition, Matrix } from 'ml-matrix';
import type { Compilation } from './compile';
import type { CalculationIssue } from './types';
import { CALCULATION_TOLERANCES, CalculationError } from './types';

export interface SolveOutcome {
  /** zh-CN: 按视图列顺序的解。en-US: Solution in view-column order. */
  x: number[];
}

const buildSystemMatrix = (compilation: Compilation): Matrix => {
  const size = compilation.views.length;
  const matrix = Matrix.identity(size, size);
  for (const entry of compilation.entries) {
    matrix.set(entry.row, entry.col, matrix.get(entry.row, entry.col) - entry.value);
  }
  return matrix;
};

/**
 * zh-CN: 求解并执行数值校验。
 * en-US: Solve and run the numerical validations.
 */
export const solveCompiledSystem = (compilation: Compilation): SolveOutcome => {
  const size = compilation.views.length;
  const matrix = buildSystemMatrix(compilation);
  const y = Matrix.columnVector(compilation.demand);

  let lu: LuDecomposition;
  try {
    lu = new LuDecomposition(matrix);
  } catch {
    throw new CalculationError('CALCULATION_FAILED');
  }

  if (lu.isSingular()) {
    throw new CalculationError('MODEL_NOT_SOLVABLE');
  }

  let solution: Matrix;
  try {
    solution = lu.solve(y);
  } catch {
    throw new CalculationError('MODEL_NOT_SOLVABLE');
  }

  const x = solution.to1DArray() as number[];
  if (x.some((value) => !Number.isFinite(value))) {
    throw new CalculationError('NUMERIC_RESULT_INVALID');
  }

  const scale = Math.max(
    1,
    ...x.map((value) => Math.abs(value)),
    ...compilation.demand.map((value) => Math.abs(value)),
  );

  // 残差检查：Mx = y
  for (let row = 0; row < size; row += 1) {
    let residual = compilation.demand[row];
    for (let col = 0; col < size; col += 1) {
      residual -= matrix.get(row, col) * x[col];
    }
    if (Math.abs(residual) > CALCULATION_TOLERANCES.residual * scale) {
      throw new CalculationError('NUMERIC_RESULT_INVALID');
    }
  }

  // 默认非负活动语义
  const negativeIssues: CalculationIssue[] = [];
  for (let index = 0; index < size; index += 1) {
    if (x[index] < -CALCULATION_TOLERANCES.negativeActivity * scale) {
      const view = compilation.views[index];
      negativeIssues.push({
        code: 'NEGATIVE_ACTIVITY',
        instanceIndex: view.instanceIndex,
        nodeId: compilation.instanceByIndex.get(view.instanceIndex)?.nodeId,
        flowId: view.pivotFlowId,
        exchangeInternalId: view.pivotExchangeId,
      });
    }
  }
  if (negativeIssues.length > 0) {
    throw new CalculationError('NEGATIVE_ACTIVITY', negativeIssues);
  }

  // 仅将极小负值（数值噪声）归零；正小值原样保留——活动量小不代表环境负荷
  // 可忽略（如 1e-13 活动量 × 1e13 原料强度 = 1 的实质负荷），展示舍入与
  // 计算语义分离。
  const snapped = x.map((value) => (value < 0 ? 0 : value));
  return { x: snapped };
};
