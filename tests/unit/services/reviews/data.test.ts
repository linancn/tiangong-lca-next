import type { ReviewsTable } from '@/services/reviews/data';

describe('reviews data shapes', () => {
  it('supports the nested review payload used by assignment and review tables', () => {
    const row: ReviewsTable = {
      key: 'review-1',
      id: 'review-1',
      name: 'Review A',
      teamName: 'Team Alpha',
      modifiedAt: '2026-03-13T10:00:00Z',
      userName: 'Alice',
      createAt: '2026-03-12T08:00:00Z',
      isFromLifeCycle: true,
      stateCode: 20,
      comments: [{ state_code: 10 }, { state_code: 20 }],
      json: {
        data: {
          id: 'process-1',
          version: '01.00.000',
          name: { baseName: [{ '@xml:lang': 'en', '#text': 'Process A' }] },
        },
        team: {
          id: 'team-1',
          name: 'Team Alpha',
        },
        user: {
          id: 'user-1',
          name: 'Alice',
          email: 'alice@example.com',
        },
      },
      modelData: {
        id: 'model-1',
        version: '01.00.000',
        json: { lifeCycleModelDataSet: {} },
        json_tg: { xflow: { nodes: [], edges: [] } },
      },
    };

    expect(row.comments?.map((item) => item.state_code)).toEqual([10, 20]);
    expect(row.json.team.name).toBe('Team Alpha');
    expect(row.modelData?.json_tg.xflow.nodes).toEqual([]);
  });

  it('allows review rows without model data for process-only reviews', () => {
    const row: ReviewsTable = {
      key: 'review-2',
      id: 'review-2',
      name: 'Review B',
      teamName: 'Team Beta',
      userName: 'Bob',
      isFromLifeCycle: false,
      json: {
        data: {
          id: 'process-2',
          version: '02.00.000',
          name: 'Process B',
        },
        team: {
          id: 'team-2',
          name: 'Team Beta',
        },
        user: {
          id: 'user-2',
          name: 'Bob',
          email: 'bob@example.com',
        },
      },
      modelData: null,
    };

    expect(row.isFromLifeCycle).toBe(false);
    expect(row.modelData).toBeNull();
  });
});
