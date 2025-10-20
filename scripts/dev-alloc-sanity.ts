import { allocateSupplyToDemand } from '../src/services/lifeCycleModels/util_allocate_supply_demand';

// Simple sanity case
const supplies = { s1: 5, s2: 3 };
const demands = { d1: 4, d2: 10 };
const edges: Array<[string, string]> = [
  ['s1', 'd1'],
  ['s1', 'd2'],
  ['s2', 'd2'],
];

const res = allocateSupplyToDemand(supplies, demands, edges, undefined, {
  prioritizeBalance: true,
  tolerance: 1e-9,
});

console.log(JSON.stringify(res, null, 2));

// Early-exit case (zero demand)
const res2 = allocateSupplyToDemand({ a: 2 }, { x: 0 }, [['a', 'x']], undefined, {
  tolerance: 1e-9,
});
console.log('early:', JSON.stringify(res2));
