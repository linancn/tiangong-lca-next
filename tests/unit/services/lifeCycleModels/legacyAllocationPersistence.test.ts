import { runMatrixCalculation } from '@/services/lifeCycleModels/matrixCalculation/matrixWorker';
import { materializeProductSystem } from '@/services/lifeCycleModels/productSystemPersistence';
import { genProcessJsonOrdered } from '@/services/processes/util';
import { jsonToList } from '@/services/general/util';
import {
  legacyProductDemandFixture,
  uuid,
  version,
} from '../../../helpers/lifeCycleModelProductDemand';

it.each([false, true])(
  'preserves closed legacy zero shares (explicit=%s) with independent product demands',
  (explicitZero) => {
    const { payload, model, original } = legacyProductDemandFixture(explicitZero);
    const outcome = runMatrixCalculation({ type: 'calculate', runId: 'legacy-zero', payload });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error(outcome.error.code);
    // P: 100 * (100 * .5 / 100) = 50; Q: 30 * (100 * .5 / 20) = 75; R: 0.
    expect(
      outcome.result.groups[0].exchanges.find((entry) => entry.flowId === uuid(13))?.amount,
    ).toBeCloseTo(125, 9);
    const r = outcome.result.productSystem.instances.find(
      (entry) => entry.sourceInstanceIndex === '1' && entry.sourceExchangeId === '4',
    )!;
    expect(r.multiplier).toBe(40);
    expect(r.exchanges).toEqual([expect.objectContaining({ flowId: uuid(14), amount: 1 })]);
    const providers = materializeProductSystem(
      outcome.result.productSystem,
      model,
      [],
      new Map([[`${uuid(2)}@${version}`, original]]),
    );
    const record = providers.find((entry) => entry.modelInfo.finalId.exchangeId === '4');
    const saved = genProcessJsonOrdered(record.modelInfo.id, record.data.processDataSet);
    expect(jsonToList(saved.processDataSet.exchanges.exchange)).toEqual([
      expect.objectContaining({
        resultingAmount: '1',
        referenceToFlowDataSet: expect.objectContaining({ '@refObjectId': uuid(14) }),
      }),
    ]);
  },
);

it('does not infer a missing remainder when legacy shares do not close', () => {
  const { payload } = legacyProductDemandFixture();
  payload.instances[1].process.exchanges[1].allocations = {
    allocation: { '@allocatedFraction': '30' },
  };
  const result = runMatrixCalculation({ type: 'calculate', runId: 'legacy-incomplete', payload });
  expect(result).toEqual(
    expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'INVALID_ALLOCATION' }),
    }),
  );
});

it.each(['MISSING_PRODUCT_ALLOCATION', 'MISSING_REFERENCE_ALLOCATION'] as const)(
  'locates %s and recalculates after explicit source allocation repair',
  (allocationReason) => {
    const { payload } = legacyProductDemandFixture();
    const supplier = payload.instances[1];
    supplier.process.exchanges.forEach((entry) => {
      entry.allocations = undefined;
    });
    if (allocationReason === 'MISSING_REFERENCE_ALLOCATION') {
      supplier.process.exchanges[1].allocations = { allocation: { '@allocatedFraction': '100' } };
    }
    const failed = runMatrixCalculation({ type: 'calculate', runId: 'needs-repair', payload });
    expect(failed).toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_ALLOCATION',
        issues: expect.arrayContaining([
          expect.objectContaining({
            allocationReason,
            instanceIndex: '1',
            exchangeInternalId: allocationReason === 'MISSING_REFERENCE_ALLOCATION' ? '1' : '2',
          }),
        ]),
      },
    });
    supplier.process.exchanges[0].allocations = { allocation: { '@allocatedFraction': '50' } };
    supplier.process.exchanges[1].allocations = { allocation: { '@allocatedFraction': '50' } };
    const repaired = runMatrixCalculation({ type: 'calculate', runId: 'repaired', payload });
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) throw new Error(repaired.error.code);
    expect(
      repaired.result.groups[0].exchanges.find((entry) => entry.flowId === uuid(13))?.amount,
    ).toBeCloseTo(125, 9);
  },
);
