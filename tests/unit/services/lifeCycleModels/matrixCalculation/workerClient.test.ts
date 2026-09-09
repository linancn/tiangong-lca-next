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
