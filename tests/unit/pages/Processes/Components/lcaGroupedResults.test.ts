import {
  buildGroupedResultModel,
  type LcaGroupedProcessRow,
} from '@/pages/Processes/Components/lcaGroupedResults';

describe('buildGroupedResultModel', () => {
  const processes: LcaGroupedProcessRow[] = [
    {
      id: 'process-1',
      name: 'Solar panel manufacturing',
      version: '01.00.000',
      location: 'CN',
      classification: 'Energy',
      teamId: 'team-1',
      typeOfDataSet: 'unitProcessesBlackBox',
    },
    {
      id: 'process-2',
      name: 'Wind turbine maintenance',
      version: '02.00.000',
      location: 'CN',
      classification: 'Energy',
      teamId: 'team-1',
      typeOfDataSet: 'unitProcessesBlackBox',
    },
    {
      id: 'process-3',
      name: 'Battery pack assembly',
      version: '01.00.000',
      location: 'DE',
      classification: 'Storage',
      teamId: '',
      typeOfDataSet: 'LCI result',
    },
  ];

  it('aggregates process impacts by location', () => {
    const result = buildGroupedResultModel(
      processes,
      {
        'process-1': 12.5,
        'process-2': -3.5,
        'process-3': 4,
      },
      {
        groupBy: 'location',
        unknownGroupLabel: 'Unknown',
      },
    );

    expect(result.groupCount).toBe(2);
    expect(result.processCount).toBe(3);
    expect(result.items[0]).toMatchObject({
      groupLabel: 'CN',
      value: 9,
      absoluteValue: 16,
      processCount: 2,
      rank: 1,
    });
    expect(result.items[0].topProcess?.processName).toBe('Solar panel manufacturing');
    expect(result.items[1]).toMatchObject({
      groupLabel: 'DE',
      value: 4,
      absoluteValue: 4,
      processCount: 1,
      rank: 2,
    });
  });

  it('uses team names and fallback labels for team grouping', () => {
    const result = buildGroupedResultModel(
      processes,
      {
        'process-1': 12.5,
        'process-2': -3.5,
        'process-3': 4,
      },
      {
        groupBy: 'team',
        teamNameMap: new Map([['team-1', 'Operations']]),
        unknownGroupLabel: 'Unknown',
        noTeamLabel: 'No team',
      },
    );

    expect(result.items[0]).toMatchObject({
      groupLabel: 'Operations',
      value: 9,
      absoluteValue: 16,
    });
    expect(result.items[1]).toMatchObject({
      groupLabel: 'No team',
      value: 4,
      absoluteValue: 4,
    });
  });

  it('groups by classification, falls back unknown labels, and sorts tied groups by label', () => {
    const result = buildGroupedResultModel(
      [
        {
          id: 'process-a',
          name: 'Alpha process',
          version: '01.00.000',
          classification: 'Zeta',
        },
        {
          id: 'process-b',
          name: 'Beta process',
          version: '01.00.000',
          classification: 'Alpha',
        },
        {
          id: 'process-c',
          name: 'Gamma process',
          version: '01.00.000',
          classification: ' - ',
        },
      ],
      {
        'process-a': 5,
        'process-b': 5,
        'process-c': 1,
      },
      {
        groupBy: 'classification',
        unknownGroupLabel: 'Unknown classification',
      },
    );

    expect(result.items.map((item) => item.groupLabel)).toEqual([
      'Alpha',
      'Zeta',
      'Unknown classification',
    ]);
    expect(result.items[2]).toMatchObject({
      groupKey: '__unknown_classification__',
      groupLabel: 'Unknown classification',
      direction: 'positive',
    });
  });

  it('groups by dataset type, falls back unknown labels, and detects negative direction', () => {
    const result = buildGroupedResultModel(
      [
        {
          id: 'process-a',
          name: 'Dataset A',
          version: '01.00.000',
          typeOfDataSet: 'unitProcessesBlackBox',
        },
        {
          id: 'process-b',
          name: 'Dataset B',
          version: '01.00.000',
          typeOfDataSet: '',
        },
      ],
      {
        'process-a': -3,
        'process-b': 2,
      },
      {
        groupBy: 'typeOfDataSet',
        unknownGroupLabel: 'Unknown type',
      },
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        groupLabel: 'unitProcessesBlackBox',
        direction: 'negative',
      }),
      expect.objectContaining({
        groupKey: '__unknown_type__',
        groupLabel: 'Unknown type',
        direction: 'positive',
      }),
    ]);
    expect(result.topNegativeItem).toMatchObject({
      groupLabel: 'unitProcessesBlackBox',
    });
  });

  it('marks zero-valued groups as neutral and keeps normalized shares at zero', () => {
    const result = buildGroupedResultModel(
      [
        {
          id: 'process-a',
          name: 'Zero process',
          version: '01.00.000',
          location: '',
        },
      ],
      {
        'process-a': 0,
      },
      {
        groupBy: 'location',
        unknownGroupLabel: 'Unknown location',
      },
    );

    expect(result).toMatchObject({
      totalAbsoluteValue: 0,
      groupCount: 1,
      topNegativeItem: undefined,
      topPositiveItem: undefined,
    });
    expect(result.items[0]).toMatchObject({
      groupKey: '__unknown_location__',
      groupLabel: 'Unknown location',
      direction: 'neutral',
      normalizedValue: 0,
      share: 0,
      cumulativeShare: 0,
    });
  });

  it('sorts tied members by process name when absolute values match', () => {
    const result = buildGroupedResultModel(
      [
        {
          id: 'process-z',
          name: 'Zulu process',
          version: '01.00.000',
          location: 'CN',
        },
        {
          id: 'process-a',
          name: 'Alpha process',
          version: '01.00.000',
          location: 'CN',
        },
      ],
      {
        'process-z': 2,
        'process-a': -2,
      },
      {
        groupBy: 'location',
      },
    );

    expect(result.items[0].members.map((member) => member.processName)).toEqual([
      'Alpha process',
      'Zulu process',
    ]);
    expect(result.items[0].topProcess).toMatchObject({
      processName: 'Alpha process',
    });
  });

  it('falls back to the team id or unknown label when no mapped team name is available', () => {
    const result = buildGroupedResultModel(
      [
        {
          id: 'process-a',
          name: 'Mapped by id fallback',
          version: '01.00.000',
          teamId: 'team-unmapped',
        },
        {
          id: 'process-b',
          name: 'Unknown team',
          version: '01.00.000',
          teamId: undefined,
        },
      ],
      {
        'process-a': 3,
        'process-b': 1,
      },
      {
        groupBy: 'team',
        unknownGroupLabel: 'Unknown team',
      },
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        groupKey: 'team-unmapped',
        groupLabel: 'team-unmapped',
      }),
      expect.objectContaining({
        groupKey: '__no_team__',
        groupLabel: 'Unknown team',
      }),
    ]);
  });

  it('returns an empty grouped model when there are no processes', () => {
    const result = buildGroupedResultModel([], {}, { groupBy: 'location' });

    expect(result).toEqual({
      items: [],
      totalAbsoluteValue: 0,
      processCount: 0,
      groupCount: 0,
      topItem: undefined,
      topPositiveItem: undefined,
      topNegativeItem: undefined,
    });
  });
});
