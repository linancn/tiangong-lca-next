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
});
