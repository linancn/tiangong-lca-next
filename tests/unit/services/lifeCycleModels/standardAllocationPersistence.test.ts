import { runMatrixCalculation } from '@/services/lifeCycleModels/matrixCalculation/matrixWorker';
import { materializeProductSystem } from '@/services/lifeCycleModels/productSystemPersistence';
import { genProcessJsonOrdered } from '@/services/processes/util';
import { jsonToList } from '@/services/general/util';
import {
  exchange,
  productDemandFixture,
  uuid,
  version,
} from '../../../helpers/lifeCycleModelProductDemand';

const targeted = (fractions: [string, number][]) => ({
  allocation: fractions.map(([target, fraction]) => ({
    '@internalReferenceToCoProduct': target,
    '@allocatedFraction': String(fraction),
  })),
});

function calculate(fractions?: [string, number][], otherExchange = false) {
  const fixture = productDemandFixture();
  const source = fixture.payload.instances[1].process;
  source.exchanges.forEach((entry) => {
    entry.allocations = undefined;
  });
  source.exchanges[2].allocations = fractions ? targeted(fractions) : undefined;
  if (otherExchange) {
    source.exchanges.push({
      ...exchange('4', 14, 10, 'INPUT'),
      allocations: targeted([
        ['1', 50],
        ['2', 50],
      ]),
    });
  }
  const outcome = runMatrixCalculation({
    type: 'calculate',
    runId: 'standard-allocation',
    payload: fixture.payload,
  });
  return { ...fixture, outcome };
}

it.each([
  ['sparse zero', [['1', 100]]],
  [
    'explicit zero',
    [
      ['1', 100],
      ['2', 0],
    ],
  ],
] as const)('preserves %s through product projection and serialization', (_label, fractions) => {
  const { original, model, outcome } = calculate(fractions.map(([id, amount]) => [id, amount]));
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) throw new Error(outcome.error.code);
  expect(
    outcome.result.groups[0].exchanges.find((entry) => entry.flowId === uuid(13))?.amount,
  ).toBe(100);
  const products = outcome.result.productSystem.instances.filter(
    (entry) => entry.sourceInstanceIndex === '1',
  );
  expect(products.map((entry) => entry.multiplier)).toEqual([100, 30]);
  const records = materializeProductSystem(
    outcome.result.productSystem,
    model,
    [],
    new Map([[`${uuid(2)}@${version}`, original]]),
  );
  const q = records.find((record) => record.modelInfo.finalId.exchangeId === '2');
  expect(q.refProcesses).toEqual([expect.objectContaining({ id: uuid(2), version })]);
  const saved = JSON.parse(
    JSON.stringify(genProcessJsonOrdered(q.modelInfo.id, q.data.processDataSet)),
  );
  const inventory = jsonToList(saved.processDataSet.exchanges.exchange);
  expect(inventory).toHaveLength(1);
  expect(inventory[0].referenceToFlowDataSet['@refObjectId']).toBe(uuid(12));
  expect(Number(inventory[0].resultingAmount)).toBe(1);
  expect(inventory[0].allocations).toBeUndefined();
});

it('uses exchange-local fractions when Q is zero on one exchange and nonzero on another', () => {
  const { outcome } = calculate([['1', 100]], true);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) throw new Error(outcome.error.code);
  const totals = outcome.result.groups[0].exchanges;
  expect(totals.find((entry) => entry.flowId === uuid(13))?.amount).toBe(100);
  expect(totals.find((entry) => entry.flowId === uuid(14))?.amount).toBe(-12.5);
  const q = outcome.result.productSystem.instances.find(
    (entry) => entry.sourceInstanceIndex === '1' && entry.sourceExchangeId === '2',
  );
  expect(q?.exchanges.find((entry) => entry.flowId === uuid(14))?.amount).toBe(0.25);
});

it.each([
  ['no allocation declarations', undefined],
  ['an incomplete declared vector', [['1', 80]]],
] as const)('rejects %s when requesting non-reference coproducts', (_label, fractions) => {
  const { outcome } = calculate(fractions?.map(([id, amount]) => [id, amount]));
  expect(outcome.ok).toBe(false);
  if (outcome.ok) throw new Error('Invalid allocation was accepted');
  expect(outcome.error.code).toBe('INVALID_ALLOCATION');
});
