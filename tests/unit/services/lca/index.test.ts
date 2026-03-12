import * as lca from '@/services/lca';
import * as api from '@/services/lca/api';
import * as taskCenter from '@/services/lca/taskCenter';

describe('LCA service barrel exports (src/services/lca/index.ts)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('re-exports the public API and task center helpers', () => {
    expect(lca.submitLcaSolve).toBe(api.submitLcaSolve);
    expect(lca.queryLcaResults).toBe(api.queryLcaResults);
    expect(lca.pollLcaJobUntilTerminal).toBe(api.pollLcaJobUntilTerminal);
    expect(lca.submitLcaTask).toBe(taskCenter.submitLcaTask);
    expect(lca.listLcaTasks).toBe(taskCenter.listLcaTasks);
    expect(lca.subscribeLcaTasks).toBe(taskCenter.subscribeLcaTasks);
  });
});
