/**
 * Tests for the matrix calculation worker client.
 *
 * zh-CN: 运行绑定、取消与同步回退（Jest 环境无 Worker）。
 * en-US: Run binding, cancellation and the synchronous fallback (no Worker in Jest).
 */

import { MatrixCalculationClient } from '@/services/lifeCycleModels/matrixCalculation/workerClient';
import type { MatrixCalculationPayload } from '@/services/lifeCycleModels/matrixCalculation/types';

const buildPayload = (
  targetAmount: number,
  connections: MatrixCalculationPayload['instances'][number]['connections'] = [],
): MatrixCalculationPayload => ({
  refInstanceIndex: 'n0',
  targetAmount,
  instances: [
    {
      instanceIndex: 'n0',
      processId: 'p0',
      processVersion: '1',
      process: {
        id: 'p0',
        version: '1',
        refExchangeInternalId: 'e0',
        exchanges: [
          {
            internalId: 'e0',
            direction: 'OUTPUT',
            flowId: 'flow-F0',
            amount: 1,
          },
        ],
      },
      connections,
    },
  ],
});

describe('MatrixCalculationClient', () => {
  it('completes a calculation through the synchronous fallback', async () => {
    const client = new MatrixCalculationClient();
    const outcome = await client.run(buildPayload(5));
    expect(outcome.status).toBe('completed');
    expect(outcome.result?.instanceMultipliers.n0).toBeCloseTo(5, 9);
  });

  it('fails with the typed error code for unsolvable models', async () => {
    const client = new MatrixCalculationClient();
    const outcome = await client.run(buildPayload(Number.NaN));
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.code).toBe('INVALID_TARGET_AMOUNT');
  });

  it('discards late results of superseded runs and resolves cancellation of the active run', async () => {
    const client = new MatrixCalculationClient();

    const firstRun = client.run(buildPayload(1));
    // 立即提交新运行：旧运行被取消/丢弃
    const secondRun = client.run(buildPayload(2));

    const firstOutcome = await firstRun;
    expect(firstOutcome.status === 'cancelled' || firstOutcome.status === 'discarded').toBe(true);

    const secondOutcome = await secondRun;
    expect(secondOutcome.status).toBe('completed');
    expect(secondOutcome.result?.instanceMultipliers.n0).toBeCloseTo(2, 9);

    // 显式取消：当前运行以 cancelled 结束，不是错误
    const thirdRun = client.run(buildPayload(3));
    client.cancel();
    const thirdOutcome = await thirdRun;
    expect(thirdOutcome.status).toBe('cancelled');
  });
});

describe('MatrixCalculationClient worker path', () => {
  class FakeWorker {
    static instances: FakeWorker[] = [];
    url: unknown;
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    posted: unknown[] = [];
    terminated = false;

    constructor(url: unknown) {
      if ((globalThis as Record<string, unknown>).__failWorkerConstruction) {
        throw new Error('worker construction failed');
      }
      this.url = url;
      FakeWorker.instances.push(this);
    }

    postMessage(message: unknown) {
      this.posted.push(message);
    }

    terminate() {
      this.terminated = true;
    }
  }

  beforeEach(() => {
    FakeWorker.instances = [];
    (globalThis as Record<string, unknown>).__failWorkerConstruction = false;
    // 客户端先检查 Worker 是否存在；工厂注入决定实际创建行为
    (globalThis as Record<string, unknown>).Worker = FakeWorker;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__failWorkerConstruction;
    delete (globalThis as Record<string, unknown>).Worker;
  });

  it('resolves results delivered through the worker message channel and ignores non-result messages', async () => {
    const client = new MatrixCalculationClient({
      createWorker: () => new FakeWorker('matrix-worker-url') as unknown as Worker,
    });
    const pending = client.run(buildPayload(4));
    const worker = FakeWorker.instances[FakeWorker.instances.length - 1];
    // 非 result 消息与非匹配 runId 均被忽略
    worker.onmessage?.({ data: { type: 'calculate', runId: 'x' } });
    worker.onmessage?.({ data: null });
    worker.onmessage?.({
      data: {
        type: 'result',
        runId: 'not-the-run',
        ok: true,
        result: {
          views: [],
          instanceMultipliers: {},
          edgeAmounts: {},
          balancedEdgeIds: [],
          groups: [],
        },
      },
    });
    worker.onmessage?.({
      data: {
        type: 'result',
        runId: (worker.posted[0] as { runId: string }).runId,
        ok: true,
        result: {
          views: [],
          instanceMultipliers: { n0: 4 },
          edgeAmounts: {},
          balancedEdgeIds: [],
          groups: [],
        },
      },
    });
    const outcome = await pending;
    expect(outcome.status).toBe('completed');
    expect(outcome.result?.instanceMultipliers.n0).toBe(4);
    client.dispose();
    expect(worker.terminated).toBe(true);
  });

  it('falls back to the generic failure when the worker result omits the error payload', async () => {
    const client = new MatrixCalculationClient({
      createWorker: () => new FakeWorker('matrix-worker-url') as unknown as Worker,
    });
    const pending = client.run(buildPayload(1));
    const worker = FakeWorker.instances[FakeWorker.instances.length - 1];
    worker.onmessage?.({
      data: {
        type: 'result',
        runId: (worker.posted[0] as { runId: string }).runId,
        ok: false,
      },
    });
    const outcome = await pending;
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.code).toBe('CALCULATION_FAILED');
    client.dispose();
  });

  it('maps worker-reported typed errors and late results to failed/discarded', async () => {
    const client = new MatrixCalculationClient({
      createWorker: () => new FakeWorker('matrix-worker-url') as unknown as Worker,
    });
    const pending = client.run(buildPayload(1));
    const worker = FakeWorker.instances[FakeWorker.instances.length - 1];
    worker.onmessage?.({
      data: {
        type: 'result',
        runId: 'not-the-run',
        ok: false,
        error: { code: 'CALCULATION_FAILED', issues: [] },
      },
    });
    worker.onmessage?.({
      data: {
        type: 'result',
        runId: (worker.posted[0] as { runId: string }).runId,
        ok: false,
        error: { code: 'MODEL_NOT_SOLVABLE', issues: [] },
      },
    });
    const outcome = await pending;
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.code).toBe('MODEL_NOT_SOLVABLE');
  });

  it('resolves failed when the worker raises onerror', async () => {
    const client = new MatrixCalculationClient({
      createWorker: () => new FakeWorker('matrix-worker-url') as unknown as Worker,
    });
    const pending = client.run(buildPayload(1));
    const worker = FakeWorker.instances[FakeWorker.instances.length - 1];
    worker.onerror?.(new Error('worker crashed'));
    const outcome = await pending;
    expect(outcome.status).toBe('failed');
    expect(outcome.error?.code).toBe('CALCULATION_FAILED');
  });

  it('falls back to synchronous execution when worker construction fails', async () => {
    const client = new MatrixCalculationClient({
      createWorker: () => {
        throw new Error('worker construction failed');
      },
    });
    const outcome = await client.run(buildPayload(6));
    expect(outcome.status).toBe('completed');
    expect(outcome.result?.instanceMultipliers.n0).toBeCloseTo(6, 9);
    // 后续运行直接走同步回退
    const again = await client.run(buildPayload(7));
    expect(again.status).toBe('completed');
    expect(again.result?.instanceMultipliers.n0).toBeCloseTo(7, 9);
  });
});
