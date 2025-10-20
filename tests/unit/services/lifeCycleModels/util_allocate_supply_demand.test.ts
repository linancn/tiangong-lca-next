import { allocateSupplyToDemand } from '../../../../src/services/lifeCycleModels/util_allocate_supply_demand';

describe('allocateSupplyToDemand - tiny magnitude cases', () => {
  test('preserves small flows with default tolerance (1e-7 > 1e-9)', () => {
    const supplies = { s: 1e-7 };
    const demands = { d: 1e-7 };
    const edges: Array<[string, string]> = [['s', 'd']];

    const res = allocateSupplyToDemand(supplies, demands, edges);

    expect(res.total_delivered).toBeCloseTo(1e-7, 12);
    expect(res.allocations.s.d).toBeCloseTo(1e-7, 12);
    expect(res.remaining_supply.s).toBeCloseTo(0, 12);
    expect(res.remaining_demand.d).toBeCloseTo(0, 12);
  });

  test('early-exit when abs tolerance larger than totals (tolerance=1e-6)', () => {
    const supplies = { s: 1e-7 };
    const demands = { d: 1e-7 };
    const edges: Array<[string, string]> = [['s', 'd']];

    const res = allocateSupplyToDemand(supplies, demands, edges, undefined, {
      tolerance: 1e-6,
    });

    expect(res.total_delivered).toBe(0);
    expect(res.allocations).toEqual({});
    expect(res.remaining_supply).toEqual(supplies);
    expect(res.remaining_demand).toEqual(demands);
  });

  test('relative tolerance preserves tiny scale (tolerance=0, relTolerance=1e-6)', () => {
    // scale = 1e-9, eps = max(0, 1e-6 * 1e-9) = 1e-15
    const supplies = { s: 1e-9 };
    const demands = { d: 1e-9 };
    const edges: Array<[string, string]> = [['s', 'd']];

    const res = allocateSupplyToDemand(supplies, demands, edges, undefined, {
      tolerance: 0,
      relTolerance: 1e-6,
    });

    expect(res.total_delivered).toBeCloseTo(1e-9, 18);
    expect(res.allocations.s.d).toBeCloseTo(1e-9, 18);
    expect(res.remaining_supply.s).toBeCloseTo(0, 18);
    expect(res.remaining_demand.d).toBeCloseTo(0, 18);
  });
});
