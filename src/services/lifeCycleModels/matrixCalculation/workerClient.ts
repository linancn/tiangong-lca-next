/**
 * Main-thread client for the local matrix calculation worker.
 *
 * zh-CN: 管理 Web Worker 生命周期与运行绑定。每次计算持有 run ID；只有最新
 * 运行的结果会被应用，迟到的旧结果标记为 discarded；取消通过终止线程实现，
 * 被取消的运行标记为 cancelled。Worker 不可用（测试/旧环境）时同步回退。
 *
 * en-US: Manages the Web Worker lifecycle and run binding. Every calculation
 * carries a run id; only the latest run's result is applied, late results of
 * older runs are reported as discarded, and cancellation terminates the worker
 * (runs reported as cancelled). Falls back to synchronous execution when
 * Worker is unavailable (tests/legacy environments).
 */

import { runMatrixCalculation } from './matrixWorker';
import type {
  CalculationIssue,
  CalculationErrorCode,
  CalculationOperation,
  MatrixCalculationPayload,
  MatrixCalculationResult,
} from './types';

export type MatrixRunStatus = 'completed' | 'discarded' | 'cancelled' | 'failed';

export interface MatrixRunOutcome {
  status: MatrixRunStatus;
  result?: MatrixCalculationResult;
  error?: { code: CalculationErrorCode; issues: CalculationIssue[] };
}

interface PendingRun {
  runId: string;
  resolve: (outcome: MatrixRunOutcome) => void;
}

export interface MatrixCalculationClientOptions {
  /**
   * zh-CN: 可注入的 Worker 工厂；默认使用 webpack 原生 `new Worker(new URL(...))`。
   * en-US: Injectable worker factory; defaults to the native webpack
   * `new Worker(new URL(...))` path.
   */
  createWorker?: () => Worker;
}

/**
 * zh-CN: Worker 工厂；生产路径使用 webpack 原生 `new Worker(new URL(...))`，
 * 测试可通过替换本工厂注入受控 Worker。
 * en-US: Worker factory; production uses the native webpack
 * `new Worker(new URL(...))` path, tests can substitute a controlled worker.
 */
export function createCalculationWorker(): Worker {
  return new Worker(new URL('./matrixWorker.ts', import.meta.url));
}

export class MatrixCalculationClient {
  private worker: Worker | null = null;

  private workerCreationFailed = false;

  private pending: PendingRun | null = null;

  private latestRunId: string | null = null;

  private runCounter = 0;

  private readonly createWorkerImpl: () => Worker;

  /**
   * zh-CN: 提交一次计算。同一时刻只保留最新运行：提交新运行会取消旧运行。
   * en-US: Submit one calculation. Only the latest run is kept: submitting a
   * new run cancels the previous one.
   */
  run(
    payload: MatrixCalculationPayload,
    options?: { operation?: CalculationOperation },
  ): Promise<MatrixRunOutcome> {
    this.cancelActive('cancelled');
    const runId = `matrix-run-${Date.now()}-${(this.runCounter += 1)}`;
    this.latestRunId = runId;

    // 提交前复核操作级取消（源加载阶段可能已取消）
    if (options?.operation?.isCancelled()) {
      this.pending = null;
      this.latestRunId = null;
      return Promise.resolve({ status: 'cancelled' });
    }

    let resolveOutcome!: (outcome: MatrixRunOutcome) => void;
    const promise = new Promise<MatrixRunOutcome>((resolve) => {
      resolveOutcome = resolve;
    });
    this.pending = { runId, resolve: resolveOutcome };

    // 排队后、分发前的取消复核：同步回退与 Worker 路径语义一致
    if (options?.operation?.isCancelled()) {
      this.pending = null;
      this.latestRunId = null;
      resolveOutcome({ status: 'cancelled' });
      return promise;
    }

    if (typeof Worker === 'undefined' || this.workerCreationFailed) {
      this.runSyncFallback(runId, payload, resolveOutcome);
      return promise;
    }

    try {
      const worker = this.ensureWorker();
      worker.postMessage({ type: 'calculate', runId, payload });
      return promise;
    } catch {
      // Worker 创建失败（含 URL 解析异常）：回退同步执行，语义与不可用环境一致
      this.workerCreationFailed = true;
      this.runSyncFallback(runId, payload, resolveOutcome);
      return promise;
    }
  }

  /**
   * zh-CN: 同步回退：让出到微任务队列，取消/替代运行语义与 Worker 一致。
   * en-US: Synchronous fallback yielding to the microtask queue so
   * cancellation/supersede semantics match the Worker path.
   */
  private runSyncFallback(
    runId: string,
    payload: MatrixCalculationPayload,
    resolveOutcome: (outcome: MatrixRunOutcome) => void,
  ): void {
    Promise.resolve().then(() => {
      if (this.latestRunId !== runId) return;
      const response = runMatrixCalculation({ type: 'calculate', runId, payload });
      this.pending = null;
      if (response.ok) {
        resolveOutcome({ status: 'completed', result: response.result });
      } else {
        resolveOutcome({ status: 'failed', error: response.error });
      }
    });
  }

  /**
   * zh-CN: 取消当前运行（终止线程；下一次运行重建）。
   * en-US: Cancel the active run (terminate the worker; it is recreated on the next run).
   */
  cancel(): void {
    this.cancelActive('cancelled');
  }

  /** zh-CN: 释放底层线程。en-US: Release the underlying worker. */
  dispose(): void {
    this.cancelActive('cancelled');
  }

  constructor(options: MatrixCalculationClientOptions = {}) {
    this.createWorkerImpl = options.createWorker ?? createCalculationWorker;
  }

  private ensureWorker(): Worker {
    const worker = this.createWorkerImpl();
    worker.onmessage = (event: MessageEvent) => {
      const response = event.data as {
        type?: string;
        runId?: string;
        ok?: boolean;
        result?: MatrixCalculationResult;
        error?: { code: CalculationErrorCode; issues: CalculationIssue[] };
      };
      if (!response || response.type !== 'result') return;
      const pending = this.pending;
      if (!pending || pending.runId !== response.runId) return;
      this.pending = null;
      if (response.ok && response.result) {
        pending.resolve({ status: 'completed', result: response.result });
      } else {
        pending.resolve({
          status: 'failed',
          error: response.error ?? { code: 'CALCULATION_FAILED', issues: [] },
        });
      }
    };
    worker.onerror = () => {
      const pending = this.pending;
      this.pending = null;
      pending?.resolve({ status: 'failed', error: { code: 'CALCULATION_FAILED', issues: [] } });
    };
    this.worker = worker;
    return worker;
  }

  private cancelActive(status: 'cancelled' | 'discarded'): void {
    this.latestRunId = null;
    const pending = this.pending;
    this.pending = null;
    pending?.resolve({ status });
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

let sharedClient: MatrixCalculationClient | null = null;

/**
 * zh-CN: 共享客户端实例（页面生命周期内复用一个 Worker）。
 * en-US: Shared client instance (one worker reused across the page lifecycle).
 */
export const getSharedMatrixCalculationClient = (): MatrixCalculationClient => {
  if (!sharedClient) {
    sharedClient = new MatrixCalculationClient();
  }
  return sharedClient;
};
