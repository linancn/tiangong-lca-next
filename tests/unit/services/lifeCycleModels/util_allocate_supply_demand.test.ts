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

  test('respects custom edge capacities provided as a Map', () => {
    const supplies = { s: 5 };
    const demands = { d: 5 };
    const edges: Array<[string, string]> = [['s', 'd']];
    const edgeCaps = new Map([['s→d', 2]]);

    const res = allocateSupplyToDemand(supplies, demands, edges, edgeCaps);

    expect(res.total_delivered).toBe(2);
    expect(res.allocations).toEqual({ s: { d: 2 } });
    expect(res.remaining_supply).toEqual({ s: 3 });
    expect(res.remaining_demand).toEqual({ d: 3 });
  });

  test('deduplicates duplicate edges instead of allocating the same route twice', () => {
    const supplies = { s: 3 };
    const demands = { d: 3 };
    const edges: Array<[string, string]> = [
      ['s', 'd'],
      ['s', 'd'],
    ];

    const res = allocateSupplyToDemand(supplies, demands, edges);

    expect(res.total_delivered).toBe(3);
    expect(res.allocations).toEqual({ s: { d: 3 } });
    expect(res.remaining_supply).toEqual({ s: 0 });
    expect(res.remaining_demand).toEqual({ d: 0 });
  });

  test('skips zero-capacity edges from Record capacities and uses remaining available routes', () => {
    const supplies = { s1: 2, s2: 2 };
    const demands = { d: 4 };
    const edges: Array<[string, string]> = [
      ['s1', 'd'],
      ['s2', 'd'],
    ];
    const edgeCaps = {
      's1→d': 0,
      's2→d': 10,
    };

    const res = allocateSupplyToDemand(supplies, demands, edges, edgeCaps);

    expect(res.total_delivered).toBe(2);
    expect(res.allocations).toEqual({ s2: { d: 2 } });
    expect(res.remaining_supply).toEqual({ s1: 2, s2: 0 });
    expect(res.remaining_demand).toEqual({ d: 2 });
  });

  test('throws when any supply amount is negative', () => {
    expect(() => allocateSupplyToDemand({ s: -1 }, { d: 1 }, [['s', 'd']])).toThrow(
      'Supply amounts must be non-negative',
    );
  });

  test('throws when any demand amount is negative', () => {
    expect(() => allocateSupplyToDemand({ s: 1 }, { d: -1 }, [['s', 'd']])).toThrow(
      'Demand amounts must be non-negative',
    );
  });

  test('supports prioritizeBalance without changing the optimal delivered total', () => {
    const supplies = { s1: 2, s2: 5 };
    const demands = { d1: 2, d2: 5 };
    const edges: Array<[string, string]> = [
      ['s1', 'd1'],
      ['s1', 'd2'],
      ['s2', 'd1'],
      ['s2', 'd2'],
    ];

    const res = allocateSupplyToDemand(supplies, demands, edges, undefined, {
      prioritizeBalance: true,
    });

    expect(res.total_delivered).toBe(7);
    expect(res.remaining_supply).toEqual({ s1: 0, s2: 0 });
    expect(res.remaining_demand).toEqual({ d1: 0, d2: 0 });
    expect(
      Object.values(res.allocations).flatMap((row) => Object.values(row)).length,
    ).toBeGreaterThan(0);
  });
});
