import { normalizeNumber, VALUE_EPSILON } from './lcaAnalysisShared';

export type LcaGroupedResultBy = 'location' | 'classification' | 'typeOfDataSet' | 'team';

export type LcaGroupedProcessRow = {
  id: string;
  name: string;
  version: string;
  classification?: string;
  location?: string;
  teamId?: string;
  typeOfDataSet?: string;
};

export type LcaGroupedProcessMember = {
  processId: string;
  processName: string;
  version: string;
  value: number;
  absoluteValue: number;
};

export type LcaGroupedResultItem = {
  groupKey: string;
  groupLabel: string;
  value: number;
  absoluteValue: number;
  normalizedValue: number;
  share: number;
  cumulativeShare: number;
  processCount: number;
  rank: number;
  direction: 'positive' | 'negative' | 'neutral';
  topProcess?: LcaGroupedProcessMember;
  members: LcaGroupedProcessMember[];
};

export type LcaGroupedResultModel = {
  items: LcaGroupedResultItem[];
  totalAbsoluteValue: number;
  processCount: number;
  groupCount: number;
  topItem?: LcaGroupedResultItem;
  topPositiveItem?: LcaGroupedResultItem;
  topNegativeItem?: LcaGroupedResultItem;
};

type GroupDescriptor = {
  key: string;
  label: string;
};

type BuildGroupedResultModelOptions = {
  groupBy: LcaGroupedResultBy;
  teamNameMap?: Map<string, string>;
  unknownGroupLabel?: string;
  noTeamLabel?: string;
};

function toDirection(value: number): LcaGroupedResultItem['direction'] {
  if (value > VALUE_EPSILON) {
    return 'positive';
  }
  if (value < -VALUE_EPSILON) {
    return 'negative';
  }
  return 'neutral';
}

function normalizeGroupValue(value: unknown): string {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 && normalized !== '-' ? normalized : '';
}

function resolveGroupDescriptor(
  process: LcaGroupedProcessRow,
  options: BuildGroupedResultModelOptions,
): GroupDescriptor {
  const unknownGroupLabel = options.unknownGroupLabel || '-';

  if (options.groupBy === 'team') {
    const teamId = normalizeGroupValue(process.teamId);
    if (!teamId) {
      return {
        key: '__no_team__',
        label: options.noTeamLabel || unknownGroupLabel,
      };
    }
    return {
      key: teamId,
      label: options.teamNameMap?.get(teamId) || teamId,
    };
  }

  if (options.groupBy === 'location') {
    const location = normalizeGroupValue(process.location);
    return {
      key: location || '__unknown_location__',
      label: location || unknownGroupLabel,
    };
  }

  if (options.groupBy === 'classification') {
    const classification = normalizeGroupValue(process.classification);
    return {
      key: classification || '__unknown_classification__',
      label: classification || unknownGroupLabel,
    };
  }

  const typeOfDataSet = normalizeGroupValue(process.typeOfDataSet);
  return {
    key: typeOfDataSet || '__unknown_type__',
    label: typeOfDataSet || unknownGroupLabel,
  };
}

export function buildGroupedResultModel(
  processes: LcaGroupedProcessRow[],
  valuesByProcessId: Record<string, unknown>,
  options: BuildGroupedResultModelOptions,
): LcaGroupedResultModel {
  const grouped = new Map<
    string,
    {
      groupKey: string;
      groupLabel: string;
      value: number;
      absoluteValue: number;
      members: LcaGroupedProcessMember[];
    }
  >();

  processes.forEach((process) => {
    const descriptor = resolveGroupDescriptor(process, options);
    const value = normalizeNumber(valuesByProcessId[process.id]);
    const absoluteValue = Math.abs(value);
    const member = {
      processId: process.id,
      processName: process.name,
      version: process.version,
      value,
      absoluteValue,
    } satisfies LcaGroupedProcessMember;
    const current = grouped.get(descriptor.key);

    if (current) {
      current.value += value;
      current.absoluteValue += absoluteValue;
      current.members.push(member);
      return;
    }

    grouped.set(descriptor.key, {
      groupKey: descriptor.key,
      groupLabel: descriptor.label,
      value,
      absoluteValue,
      members: [member],
    });
  });

  const baseItems = Array.from(grouped.values())
    .map((item) => {
      const sortedMembers = [...item.members].sort((left, right) => {
        if (right.absoluteValue !== left.absoluteValue) {
          return right.absoluteValue - left.absoluteValue;
        }
        return left.processName.localeCompare(right.processName);
      });

      return {
        ...item,
        members: sortedMembers,
        topProcess: sortedMembers[0],
      };
    })
    .sort((left, right) => {
      if (right.absoluteValue !== left.absoluteValue) {
        return right.absoluteValue - left.absoluteValue;
      }
      return left.groupLabel.localeCompare(right.groupLabel);
    });

  const totalAbsoluteValue = baseItems.reduce((sum, item) => sum + item.absoluteValue, 0);
  const maxAbsoluteValue = baseItems[0]?.absoluteValue ?? 0;
  let cumulativeAbsoluteValue = 0;

  const items = baseItems.map((item, index) => {
    cumulativeAbsoluteValue += item.absoluteValue;

    return {
      groupKey: item.groupKey,
      groupLabel: item.groupLabel,
      value: item.value,
      absoluteValue: item.absoluteValue,
      normalizedValue: maxAbsoluteValue > VALUE_EPSILON ? item.absoluteValue / maxAbsoluteValue : 0,
      share: totalAbsoluteValue > VALUE_EPSILON ? item.absoluteValue / totalAbsoluteValue : 0,
      cumulativeShare:
        totalAbsoluteValue > VALUE_EPSILON ? cumulativeAbsoluteValue / totalAbsoluteValue : 0,
      processCount: item.members.length,
      rank: index + 1,
      direction: toDirection(item.value),
      topProcess: item.topProcess,
      members: item.members,
    } satisfies LcaGroupedResultItem;
  });

  return {
    items,
    totalAbsoluteValue,
    processCount: processes.length,
    groupCount: items.length,
    topItem: items[0],
    topPositiveItem: items.find((item) => item.direction === 'positive'),
    topNegativeItem: items.find((item) => item.direction === 'negative'),
  };
}
