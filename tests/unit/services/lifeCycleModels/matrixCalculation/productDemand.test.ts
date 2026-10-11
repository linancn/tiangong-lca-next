import { runMatrixCalculation } from '@/services/lifeCycleModels/matrixCalculation/matrixWorker';
import type { MatrixCalculationPayload } from '@/services/lifeCycleModels/matrixCalculation/types';

const ex = (internalId: string, direction: 'INPUT' | 'OUTPUT', flowId: string, amount: number) => ({
  internalId,
  direction,
  flowId,
  amount,
});
const edge = (upstreamIndex: string, downstreamIndex: string, flowId: string) => ({
  upstreamIndex,
  downstreamIndex,
  outputFlowId: flowId,
  inputFlowId: flowId,
  edgeId: `${upstreamIndex}->${downstreamIndex}:${flowId}`,
});

function payload(qDemand: number, deadEnd = false): MatrixCalculationPayload {
  return {
    refInstanceIndex: 'R',
    targetAmount: 1,
    instances: [
      {
        instanceIndex: 'R',
        processId: 'R',
        processVersion: '1',
        connections: [],
        process: {
          id: 'R',
          version: '1',
          refExchangeInternalId: 'r',
          exchanges: [
            ex('r', 'OUTPUT', 'r', 1),
            ex('b', 'INPUT', 'b', 1),
            ...(deadEnd ? [] : [ex('c', 'INPUT', 'c', 1)]),
          ],
        },
      },
      {
        instanceIndex: 'B',
        processId: 'B',
        processVersion: '1',
        connections: [edge('B', 'R', 'b')],
        process: {
          id: 'B',
          version: '1',
          refExchangeInternalId: 'b',
          exchanges: [ex('b', 'OUTPUT', 'b', 1), ex('p', 'INPUT', 'p', 100)],
        },
      },
      {
        instanceIndex: 'C',
        processId: 'C',
        processVersion: '1',
        connections: deadEnd ? [] : [edge('C', 'R', 'c')],
        process: {
          id: 'C',
          version: '1',
          refExchangeInternalId: 'c',
          exchanges: [ex('c', 'OUTPUT', 'c', 1), ex('q', 'INPUT', 'q', qDemand)],
        },
      },
      {
        instanceIndex: 'A',
        processId: 'A',
        processVersion: '1',
        connections: [edge('A', 'B', 'p'), edge('A', 'C', 'q')],
        process: {
          id: 'A',
          version: '1',
          refExchangeInternalId: 'p',
          exchanges: [
            {
              ...ex('p', 'OUTPUT', 'p', 100),
              allocations: { allocation: { '@allocatedFraction': '80' } },
            },
            {
              ...ex('q', 'OUTPUT', 'q', 20),
              allocations: { allocation: { '@allocatedFraction': '20' } },
            },
            ex('co2', 'OUTPUT', 'co2', 100),
            ex('raw', 'INPUT', 'raw', 100),
          ],
        },
      },
    ],
  };
}

describe('allocated product demand', () => {
  it.each([10, 20, 30])(
    'solves product demands 100/%s without a joint-production constraint',
    (qDemand) => {
      const response = runMatrixCalculation({
        type: 'calculate',
        runId: 'demand',
        payload: payload(qDemand),
      });
      expect(response.ok).toBe(true);
      if (!response.ok) throw new Error(response.error.code);
      const result = response.result;
      // Standard process instances reproduce the same inventory without source allocations.
      const projected: MatrixCalculationPayload = {
        refInstanceIndex: result.productSystem.refInstanceIndex,
        targetAmount: 1,
        instances: result.productSystem.instances.map((instance) => ({
          instanceIndex: instance.instanceIndex,
          processId: instance.instanceIndex,
          processVersion: '1',
          process: {
            id: instance.instanceIndex,
            version: '1',
            refExchangeInternalId: instance.refExchangeInternalId,
            exchanges: instance.exchanges,
          },
          connections: instance.connections,
        })),
      };
      const roundTrip = runMatrixCalculation({
        type: 'calculate',
        runId: 'projected',
        payload: JSON.parse(JSON.stringify(projected)),
      });
      expect(roundTrip.ok).toBe(true);
      if (!roundTrip.ok) throw new Error(roundTrip.error.code);
      expect(
        roundTrip.result.groups[0].exchanges.find((e) => e.flowId === 'co2')?.amount,
      ).toBeCloseTo(80 + qDemand);
      expect(result.edgeAmounts['A->B:p']).toBeCloseTo(100);
      expect(result.edgeAmounts['A->C:q']).toBeCloseTo(qDemand);
      expect(
        result.views.find((v) => v.instanceIndex === 'A' && v.pivotExchangeId === 'q')?.multiplier,
      ).toBeCloseTo(qDemand / 20);
      const primary = result.groups.find((g) => g.type === 'primary')!;
      expect(primary.exchanges.find((e) => e.flowId === 'co2')?.amount).toBeCloseTo(80 + qDemand);
      expect(primary.exchanges.find((e) => e.flowId === 'raw')?.amount).toBeCloseTo(
        -(80 + qDemand),
      );
      expect(primary.exchanges.some((e) => e.flowId === 'p' || e.flowId === 'q')).toBe(false);
      expect(result.instanceMultipliers.A).toEqual(qDemand === 20 ? 1 : undefined);
    },
  );

  it('solves a terminal product as an independent source-unit scenario, not leftover consumption', () => {
    const response = runMatrixCalculation({
      type: 'calculate',
      runId: 'terminal',
      payload: payload(10, true),
    });
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.code);
    expect(response.result.edgeAmounts['A->C:q']).toBe(0);
    const main = response.result.groups.find((g) => g.type === 'primary')!;
    const secondary = response.result.groups.find((g) => g.root.instanceIndex === 'C')!;
    expect(main.exchanges.find((e) => e.flowId === 'co2')?.amount).toBeCloseTo(80);
    expect(secondary.exchanges.find((e) => e.flowId === 'c')?.amount).toBeCloseTo(1);
    expect(secondary.exchanges.find((e) => e.flowId === 'co2')?.amount).toBeCloseTo(10);
  });

  it('scales a reference output of 100 to a downstream demand of 10000', () => {
    const model = payload(20);
    model.targetAmount = 100;
    const response = runMatrixCalculation({ type: 'calculate', runId: 'scale', payload: model });
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error(response.error.code);
    expect(response.result.edgeAmounts['A->B:p']).toBeCloseTo(10000);
    expect(
      response.result.views.find((v) => v.instanceIndex === 'A' && v.pivotExchangeId === 'p')
        ?.multiplier,
    ).toBeCloseTo(100);
  });

  it('locates a used coproduct without an explicit allocation', () => {
    const model = payload(10);
    model.instances
      .find((instance) => instance.instanceIndex === 'A')!
      .process.exchanges.forEach((exchange) => delete exchange.allocations);
    const response = runMatrixCalculation({ type: 'calculate', runId: 'missing', payload: model });
    expect(response.ok).toBe(false);
    if (response.ok) throw new Error('Expected an allocation diagnostic');
    expect(response.error.code).toBe('INVALID_ALLOCATION');
    expect(response.error.issues).toContainEqual(
      expect.objectContaining({ instanceIndex: 'A', exchangeInternalId: 'q' }),
    );
  });
});
