const CONTRIBUTION_PATH_EPSILON = 1e-12;
const DEFAULT_TOP_CONTRIBUTOR_COUNT = 12;

type ContributionPathDirection = 'positive' | 'negative' | 'neutral';

export type LcaContributionPathContributorItem = {
  key: string;
  processId: string;
  processIndex: number;
  label: string;
  location?: string;
  directImpact: number;
  shareOfTotal: number;
  isRoot: boolean;
  depthMin: number | null;
  direction: ContributionPathDirection;
};

export type LcaContributionPathBranchItem = {
  key: string;
  rank: number;
  pathProcessIds: string[];
  pathLabels: string[];
  pathLabel: string;
  pathScore: number;
  terminalReason: string;
};

export type LcaContributionPathLinkItem = {
  key: string;
  sourceProcessId: string;
  targetProcessId: string;
  sourceLabel: string;
  targetLabel: string;
  depthFromRoot: number;
  cycleCut: boolean;
  directImpact: number;
  shareOfTotal: number;
  direction: ContributionPathDirection;
};

export type LcaContributionPathModel = {
  version: number;
  format: string;
  snapshotId: string;
  jobId: string;
  processId: string;
  impactId: string;
  amount: number;
  options: {
    maxDepth: number;
    topKChildren: number;
    cutoffShare: number;
    maxNodes: number;
  };
  summary: {
    totalImpact: number;
    unit: string;
    coverageRatio: number;
    expandedNodeCount: number;
    truncatedNodeCount: number;
    computedAt: string;
  };
  root: {
    processId: string;
    label: string;
  };
  impact: {
    impactId: string;
    label: string;
    unit: string;
  };
  source: string;
  snapshotIndexVersion: number;
  contributors: LcaContributionPathContributorItem[];
  topContributors: LcaContributionPathContributorItem[];
  branches: LcaContributionPathBranchItem[];
  links: LcaContributionPathLinkItem[];
  topContributor: LcaContributionPathContributorItem | null;
};

export type LcaContributionPathProcessMeta = {
  label?: string;
  version?: string;
};

export type LcaContributionPathSankeyNode = {
  key: string;
  processId: string;
  label: string;
  depth: number;
};

export type LcaContributionPathSankeyLink = {
  key: string;
  source: string;
  target: string;
  sourceProcessId: string;
  targetProcessId: string;
  sourceLabel: string;
  targetLabel: string;
  sourceDepth: number;
  targetDepth: number;
  value: number;
  directImpact: number;
  shareOfTotal: number;
  cycleCut: boolean;
  direction: ContributionPathDirection;
};

export type LcaContributionPathSankeyData = {
  nodes: LcaContributionPathSankeyNode[];
  links: LcaContributionPathSankeyLink[];
  repeatedNodeCount: number;
  cycleCutLinkCount: number;
  selfLoopLinkCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown): string | undefined {
  const resolved = readString(value);
  return resolved || undefined;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => readString(item))
    .filter((item) => item.length > 0);
}

function resolveDirection(value: number): ContributionPathDirection {
  if (value > CONTRIBUTION_PATH_EPSILON) {
    return 'positive';
  }
  if (value < -CONTRIBUTION_PATH_EPSILON) {
    return 'negative';
  }
  return 'neutral';
}

function resolveContributionPathLabel(
  processId: string,
  fallbackLabel: string,
  processMetaById: Map<string, LcaContributionPathProcessMeta>,
): string {
  const mappedLabel = readString(processMetaById.get(processId)?.label);
  if (mappedLabel) {
    return mappedLabel;
  }
  return readString(fallbackLabel) || processId;
}

export function buildLcaContributionPathModel(raw: unknown): LcaContributionPathModel | null {
  const artifact = asRecord(raw);
  if (!artifact) {
    return null;
  }

  const summary = asRecord(artifact.summary);
  const root = asRecord(artifact.root);
  const impact = asRecord(artifact.impact);
  const options = asRecord(artifact.options);
  const meta = asRecord(artifact.meta);
  if (!summary || !root || !impact || !options || !meta) {
    return null;
  }

  const rootProcessId = readString(root.process_id);
  const rootLabel = readString(root.label) || rootProcessId;
  const impactId = readString(impact.impact_id);
  const impactLabel = readString(impact.label) || impactId;
  const impactUnit = readString(impact.unit) || '-';
  if (!rootProcessId || !impactId) {
    return null;
  }

  const contributors = asArray(artifact.process_contributions).reduce<
    LcaContributionPathContributorItem[]
  >((items, item) => {
    const record = asRecord(item);
    if (!record) {
      return items;
    }
    const processId = readString(record.process_id);
    if (!processId) {
      return items;
    }
    const directImpact = readNumber(record.direct_impact);
    items.push({
      key: processId,
      processId,
      processIndex: readNumber(record.process_index),
      label: readString(record.label) || processId,
      location: readOptionalString(record.location),
      directImpact,
      shareOfTotal: readNumber(record.share_of_total),
      isRoot: readBoolean(record.is_root),
      depthMin:
        record.depth_min === null || record.depth_min === undefined
          ? null
          : readNumber(record.depth_min),
      direction: resolveDirection(directImpact),
    });
    return items;
  }, []);
  contributors.sort((left, right) => {
    return (
      Math.abs(right.directImpact) - Math.abs(left.directImpact) ||
      left.label.localeCompare(right.label)
    );
  });

  const labelByProcessId = new Map<string, string>();
  labelByProcessId.set(rootProcessId, rootLabel);
  contributors.forEach((item) => {
    labelByProcessId.set(item.processId, item.label);
  });

  const branches = asArray(artifact.branches).reduce<LcaContributionPathBranchItem[]>(
    (items, item) => {
      const record = asRecord(item);
      if (!record) {
        return items;
      }
      const pathLabels = readStringArray(record.path_labels);
      const pathProcessIds = readStringArray(record.path_process_ids);
      pathProcessIds.forEach((processId, index) => {
        const label = pathLabels[index];
        if (processId && label && !labelByProcessId.has(processId)) {
          labelByProcessId.set(processId, label);
        }
      });
      items.push({
        key: `${readNumber(record.rank)}:${pathProcessIds.join('>')}`,
        rank: readNumber(record.rank),
        pathProcessIds,
        pathLabels,
        pathLabel: pathLabels.join(' > '),
        pathScore: readNumber(record.path_score),
        terminalReason: readString(record.terminal_reason) || 'unknown',
      });
      return items;
    },
    [],
  );
  branches.sort((left, right) => left.rank - right.rank);

  const links = asArray(artifact.links).reduce<LcaContributionPathLinkItem[]>((items, item) => {
    const record = asRecord(item);
    if (!record) {
      return items;
    }
    const sourceProcessId = readString(record.source_process_id);
    const targetProcessId = readString(record.target_process_id);
    if (!sourceProcessId || !targetProcessId) {
      return items;
    }
    const directImpact = readNumber(record.direct_impact);
    items.push({
      key: `${sourceProcessId}:${targetProcessId}:${readNumber(record.depth_from_root)}`,
      sourceProcessId,
      targetProcessId,
      sourceLabel: labelByProcessId.get(sourceProcessId) || sourceProcessId,
      targetLabel: labelByProcessId.get(targetProcessId) || targetProcessId,
      depthFromRoot: readNumber(record.depth_from_root),
      cycleCut: readBoolean(record.cycle_cut),
      directImpact,
      shareOfTotal: readNumber(record.share_of_total),
      direction: resolveDirection(directImpact),
    });
    return items;
  }, []);
  links.sort((left, right) => {
    return (
      left.depthFromRoot - right.depthFromRoot ||
      Math.abs(right.directImpact) - Math.abs(left.directImpact)
    );
  });

  const topContributors = contributors.slice(0, DEFAULT_TOP_CONTRIBUTOR_COUNT);

  return {
    version: readNumber(artifact.version, 1),
    format: readString(artifact.format) || 'contribution-path:v1',
    snapshotId: readString(artifact.snapshot_id),
    jobId: readString(artifact.job_id),
    processId: readString(artifact.process_id) || rootProcessId,
    impactId: readString(artifact.impact_id) || impactId,
    amount: readNumber(artifact.amount, 1),
    options: {
      maxDepth: readNumber(options.max_depth, 4),
      topKChildren: readNumber(options.top_k_children, 5),
      cutoffShare: readNumber(options.cutoff_share, 0.01),
      maxNodes: readNumber(options.max_nodes, 200),
    },
    summary: {
      totalImpact: readNumber(summary.total_impact),
      unit: readString(summary.unit) || impactUnit,
      coverageRatio: Math.min(Math.max(readNumber(summary.coverage_ratio), 0), 1),
      expandedNodeCount: readNumber(summary.expanded_node_count),
      truncatedNodeCount: readNumber(summary.truncated_node_count),
      computedAt: readString(summary.computed_at),
    },
    root: {
      processId: rootProcessId,
      label: rootLabel,
    },
    impact: {
      impactId,
      label: impactLabel,
      unit: impactUnit,
    },
    source: readString(meta.source) || 'solve_one_path_analysis',
    snapshotIndexVersion: readNumber(meta.snapshot_index_version, 1),
    contributors,
    topContributors,
    branches,
    links,
    topContributor: contributors[0] ?? null,
  };
}

export function applyLcaContributionPathProcessMeta(
  model: LcaContributionPathModel,
  processMetaById: Map<string, LcaContributionPathProcessMeta>,
): LcaContributionPathModel {
  if (processMetaById.size === 0) {
    return model;
  }

  const contributors = model.contributors.map((item) => ({
    ...item,
    label: resolveContributionPathLabel(item.processId, item.label, processMetaById),
  }));
  const labelByProcessId = new Map<string, string>();
  labelByProcessId.set(
    model.root.processId,
    resolveContributionPathLabel(model.root.processId, model.root.label, processMetaById),
  );
  contributors.forEach((item) => {
    labelByProcessId.set(item.processId, item.label);
  });

  const branches = model.branches.map((item) => {
    const pathLabels = item.pathProcessIds.map((processId, index) =>
      resolveContributionPathLabel(processId, item.pathLabels[index] ?? processId, processMetaById),
    );
    return {
      ...item,
      pathLabels,
      pathLabel: pathLabels.join(' > '),
    };
  });

  const links = model.links.map((item) => {
    const sourceLabel =
      labelByProcessId.get(item.sourceProcessId) ||
      resolveContributionPathLabel(item.sourceProcessId, item.sourceLabel, processMetaById);
    const targetLabel =
      labelByProcessId.get(item.targetProcessId) ||
      resolveContributionPathLabel(item.targetProcessId, item.targetLabel, processMetaById);
    return {
      ...item,
      sourceLabel,
      targetLabel,
    };
  });

  return {
    ...model,
    root: {
      ...model.root,
      label: labelByProcessId.get(model.root.processId)!,
    },
    contributors,
    topContributors: contributors.slice(0, DEFAULT_TOP_CONTRIBUTOR_COUNT),
    branches,
    links,
    topContributor: contributors[0] ?? null,
  };
}

export function buildLcaContributionPathSankeyData(
  model: LcaContributionPathModel,
): LcaContributionPathSankeyData {
  const contributorDepthByProcessId = new Map<string, number>();
  model.contributors.forEach((item) => {
    if (typeof item.depthMin === 'number' && Number.isFinite(item.depthMin)) {
      contributorDepthByProcessId.set(item.processId, Math.max(0, Math.floor(item.depthMin)));
    }
  });
  contributorDepthByProcessId.set(model.root.processId, 0);

  const knownDepthsByProcessId = new Map<string, Set<number>>();
  const nodesByKey = new Map<string, LcaContributionPathSankeyNode>();
  const nodeCountByProcessId = new Map<string, number>();

  const registerKnownDepth = (processId: string, depth: number) => {
    const resolvedDepth = Math.max(0, Math.floor(depth));
    const knownDepths = knownDepthsByProcessId.get(processId) ?? new Set<number>();
    knownDepths.add(resolvedDepth);
    knownDepthsByProcessId.set(processId, knownDepths);
  };

  const ensureNode = (processId: string, label: string, depth: number) => {
    const resolvedDepth = Math.max(0, Math.floor(depth));
    const key = `${processId}::${resolvedDepth}`;
    if (!nodesByKey.has(key)) {
      nodesByKey.set(key, {
        key,
        processId,
        label: label || processId,
        depth: resolvedDepth,
      });
      nodeCountByProcessId.set(processId, (nodeCountByProcessId.get(processId) ?? 0) + 1);
    }
    registerKnownDepth(processId, resolvedDepth);
    return key;
  };

  ensureNode(model.root.processId, model.root.label, 0);
  model.contributors.forEach((item) => {
    if (typeof item.depthMin === 'number' && Number.isFinite(item.depthMin)) {
      ensureNode(item.processId, item.label, item.depthMin);
    }
  });

  let cycleCutLinkCount = 0;
  let selfLoopLinkCount = 0;

  const links = model.links.reduce<LcaContributionPathSankeyLink[]>((items, item) => {
    const value = Math.abs(item.directImpact);
    if (value <= CONTRIBUTION_PATH_EPSILON) {
      return items;
    }

    const targetDepthBase = Math.max(1, Math.floor(item.depthFromRoot));
    const knownSourceDepths = Array.from(
      knownDepthsByProcessId.get(item.sourceProcessId) ?? new Set<number>(),
    )
      .filter((depth) => depth < targetDepthBase)
      .sort((left, right) => right - left);
    const fallbackSourceDepth = Math.max(0, targetDepthBase - 1);
    const sourceDepth =
      knownSourceDepths[0] ??
      Math.min(
        contributorDepthByProcessId.get(item.sourceProcessId) ?? fallbackSourceDepth,
        fallbackSourceDepth,
      );
    const targetDepth = Math.max(targetDepthBase, sourceDepth + 1);

    const sourceKey = ensureNode(item.sourceProcessId, item.sourceLabel, sourceDepth);
    const targetKey = ensureNode(item.targetProcessId, item.targetLabel, targetDepth);

    if (item.cycleCut) {
      cycleCutLinkCount += 1;
    }
    if (item.sourceProcessId === item.targetProcessId) {
      selfLoopLinkCount += 1;
    }

    items.push({
      key: `${item.key}:${sourceDepth}:${targetDepth}`,
      source: sourceKey,
      target: targetKey,
      sourceProcessId: item.sourceProcessId,
      targetProcessId: item.targetProcessId,
      sourceLabel: item.sourceLabel || item.sourceProcessId,
      targetLabel: item.targetLabel || item.targetProcessId,
      sourceDepth,
      targetDepth,
      value,
      directImpact: item.directImpact,
      shareOfTotal: item.shareOfTotal,
      cycleCut: item.cycleCut,
      direction: item.direction,
    });
    return items;
  }, []);

  const referencedNodeKeys = new Set<string>();
  links.forEach((item) => {
    referencedNodeKeys.add(item.source);
    referencedNodeKeys.add(item.target);
  });

  const nodes = Array.from(nodesByKey.values())
    .filter((item) => referencedNodeKeys.has(item.key))
    .sort((left, right) => left.depth - right.depth || left.label.localeCompare(right.label));

  const repeatedNodeCount = Array.from(nodeCountByProcessId.values()).reduce((count, item) => {
    return count + Math.max(0, item - 1);
  }, 0);

  return {
    nodes,
    links,
    repeatedNodeCount,
    cycleCutLinkCount,
    selfLoopLinkCount,
  };
}
