import AlignedNumber from '@/components/AlignedNumber';
import {
  applyLcaContributionPathProcessMeta,
  buildLcaContributionPathModel,
  buildLcaContributionPathSankeyData,
  type LcaContributionPathBranchItem,
  type LcaContributionPathContributorItem,
  type LcaContributionPathLinkItem,
  type LcaContributionPathModel,
  type LcaContributionPathProcessMeta,
} from '@/pages/Processes/Components/lcaContributionPath';
import {
  buildGroupedResultModel,
  type LcaGroupedResultBy,
  type LcaGroupedResultItem,
  type LcaGroupedResultModel,
} from '@/pages/Processes/Components/lcaGroupedResults';
import {
  buildLcaImpactCompareModel,
  type LcaImpactCompareItem,
} from '@/pages/Processes/Components/lcaImpactCompareToolbar';
import LcaProcessSelectionTable from '@/pages/Processes/Components/lcaProcessSelectionTable';
import LcaProfileSummary, {
  buildLcaProfileModel,
} from '@/pages/Processes/Components/lcaProfileSummary';
import ProcessView from '@/pages/Processes/Components/view';
import { getLang, getLangText } from '@/services/general/util';
import {
  getLcaContributionPathResult,
  isLcaFunctionInvokeError,
  pollLcaJobUntilTerminal,
  queryLcaResults,
  submitLcaContributionPath,
} from '@/services/lca';
import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessDetail, listProcessesForLcaAnalysis } from '@/services/processes/api';
import type { ProcessTable } from '@/services/processes/data';
import { genProcessName } from '@/services/processes/util';
import { getTeams } from '@/services/teams/api';
import { Bar, Sankey } from '@ant-design/charts';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { FormattedMessage, history, useIntl } from 'umi';
import {
  LCA_SCOPE,
  buildLcaProcessOptions,
  buildLcaProcessSelectionKey,
  buildMergedLcaRows,
  formatPercent,
  formatSourceLabel,
  getLcaMethodMetaMap,
  loadImpactOptions,
  normalizeNumber,
  type ImpactOption,
  type LcaAnalysisDataScope,
  type LcaProcessOption,
  type SolverLcaImpactValueRow,
} from '../Components/lcaAnalysisShared';

const DEFAULT_ANALYSIS_PAGE_SIZE = 50;
const DEFAULT_COMPARE_SELECTION_LIMIT = 5;
const DEFAULT_CHART_LABEL_MAX_LENGTH = 28;
const DEFAULT_PATH_SANKEY_HEIGHT = 420;
const G2_TOOLTIP_SELECTOR = '.g2-tooltip';
const G2_TOOLTIP_TITLE_SELECTOR = '.g2-tooltip-title';
const G2_TOOLTIP_NAME_SELECTOR = '.g2-tooltip-list-item-name-label';
const G2_TOOLTIP_VALUE_SELECTOR = '.g2-tooltip-list-item-value';

function buildProcessRowKey(processRow: ProcessTable): string {
  return buildLcaProcessSelectionKey(processRow.id, processRow.version);
}

function mergeProcessRows(existingRows: ProcessTable[], nextRows: ProcessTable[]): ProcessTable[] {
  const merged = new Map<string, ProcessTable>();

  [...existingRows, ...nextRows].forEach((processRow) => {
    const rowKey = buildProcessRowKey(processRow);
    if (!rowKey) {
      return;
    }
    merged.set(rowKey, processRow);
  });

  return Array.from(merged.values());
}

function getProcessOptionSelectionKey(option: LcaProcessOption): string {
  return option.selectionKey;
}

function prependCurrentProcessOption(
  currentOptions: LcaProcessOption[],
  optionMap: Map<string, LcaProcessOption>,
  processSelectionKey: string,
): LcaProcessOption[] {
  const normalizedProcessSelectionKey = processSelectionKey.trim();
  if (
    !normalizedProcessSelectionKey ||
    currentOptions.some(
      (item) => getProcessOptionSelectionKey(item) === normalizedProcessSelectionKey,
    )
  ) {
    return currentOptions;
  }

  const selectedOption = optionMap.get(normalizedProcessSelectionKey);
  return selectedOption ? [selectedOption, ...currentOptions] : currentOptions;
}

function buildUniqueProcessIdList(processes: LcaProcessOption[]): string[] {
  return Array.from(new Set(processes.map((item) => item.processId)));
}

type AntdThemeToken = ReturnType<typeof theme.useToken>['token'];

type ProcessAllImpactsValue = {
  impact_id?: unknown;
  impact_index?: unknown;
  impact_name?: unknown;
  unit?: unknown;
  value?: unknown;
};

type QueryMeta = {
  snapshotId: string;
  resultId: string;
  source: string;
  computedAt: string;
};

type SankeyGraphNodeDatum = {
  key?: string;
  label?: string;
  depth?: number;
};

type SankeyGraphLinkDatum = {
  source?: SankeyGraphNodeDatum | string;
  target?: SankeyGraphNodeDatum | string;
  value?: number;
};

type ProfileResultState = QueryMeta & {
  process: LcaProcessOption;
  rows: LCIAResultTable[];
};

type CompareResultState = QueryMeta & {
  impactId: string;
  impactLabel: string;
  unit: string;
  model: ReturnType<typeof buildLcaImpactCompareModel>;
};

type GroupedResultState = QueryMeta & {
  impactId: string;
  impactLabel: string;
  unit: string;
  groupBy: LcaGroupedResultBy;
  valuesByProcessId: Record<string, unknown>;
  model: LcaGroupedResultModel;
};

type ContributionPathResultState = QueryMeta & {
  process: LcaProcessOption;
  impactId: string;
  impactLabel: string;
  unit: string;
  amount: number;
  model: LcaContributionPathModel;
};

function truncateChartLabel(value: string, maxLength = DEFAULT_CHART_LABEL_MAX_LENGTH): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}

function isMeaningfulUnit(value: string | undefined): boolean {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return normalized.length > 0 && normalized !== '-' && normalized !== 'unknown';
}

function resolveContributionPathDisplayUnit(
  selectedImpact: ImpactOption | undefined,
  model: LcaContributionPathModel,
): string {
  if (isMeaningfulUnit(selectedImpact?.unit)) {
    return String(selectedImpact?.unit);
  }
  if (isMeaningfulUnit(model.summary.unit)) {
    return model.summary.unit;
  }
  if (isMeaningfulUnit(model.impact.unit)) {
    return model.impact.unit;
  }
  return '-';
}

function buildLcaBarChartTheme(token: AntdThemeToken) {
  const borderColor = token.colorBorderSecondary ?? token.colorSplit;

  return {
    view: {
      viewFill: 'transparent',
      plotFill: 'transparent',
      mainFill: 'transparent',
      contentFill: 'transparent',
    },
    axis: {
      gridStroke: borderColor,
      gridStrokeOpacity: 0.45,
      labelFill: token.colorTextSecondary,
      labelOpacity: 1,
      lineStroke: borderColor,
      lineStrokeOpacity: 0.75,
      tickStroke: borderColor,
      tickOpacity: 0.75,
      titleFill: token.colorText,
      titleOpacity: 1,
    },
    legendCategory: {
      labelFill: token.colorTextSecondary,
      labelFillOpacity: 1,
      titleFill: token.colorText,
      titleFillOpacity: 1,
    },
    legendContinuous: {
      labelFill: token.colorTextSecondary,
      labelFillOpacity: 1,
      titleFill: token.colorText,
      titleFillOpacity: 1,
      tickStroke: borderColor,
      tickStrokeOpacity: 0.75,
      handleMarkerStroke: borderColor,
      handleMarkerFill: token.colorTextSecondary,
    },
    tooltip: {
      crosshairsStroke: borderColor,
      crosshairsLineWidth: 1,
      crosshairsStrokeOpacity: 0.35,
      css: {
        [G2_TOOLTIP_SELECTOR]: {
          background: token.colorBgElevated,
          border: `1px solid ${borderColor}`,
          boxShadow: token.boxShadow,
          color: token.colorText,
        },
        [G2_TOOLTIP_TITLE_SELECTOR]: {
          color: token.colorText,
        },
        [G2_TOOLTIP_NAME_SELECTOR]: {
          color: token.colorTextSecondary,
        },
        [G2_TOOLTIP_VALUE_SELECTOR]: {
          color: token.colorText,
        },
      },
    },
  };
}

function QueryMetaCard({ meta }: { meta: QueryMeta }) {
  return (
    <Card size='small'>
      <Descriptions bordered size='small' column={1}>
        <Descriptions.Item
          label={
            <FormattedMessage
              id='pages.process.lca.taskCenter.detail.snapshotId'
              defaultMessage='snapshot_id'
            />
          }
        >
          {meta.snapshotId}
        </Descriptions.Item>
        <Descriptions.Item
          label={
            <FormattedMessage
              id='pages.process.lca.taskCenter.detail.resultId'
              defaultMessage='result_id'
            />
          }
        >
          {meta.resultId}
        </Descriptions.Item>
        <Descriptions.Item
          label={
            <FormattedMessage id='pages.process.lca.analysis.meta.source' defaultMessage='source' />
          }
        >
          {formatSourceLabel(meta.source)}
        </Descriptions.Item>
        <Descriptions.Item
          label={
            <FormattedMessage
              id='pages.process.lca.analysis.meta.computedAt'
              defaultMessage='computed_at'
            />
          }
        >
          {meta.computedAt}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function resolveQueuedSnapshotMessage(
  error: unknown,
  intl: ReturnType<typeof useIntl>,
  fallbackMessage: string,
): string {
  if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
    const buildJobId =
      typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
    return intl.formatMessage(
      {
        id: 'pages.process.lca.analysis.error.snapshotBuilding',
        defaultMessage:
          'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
      },
      {
        jobSuffix: buildJobId ? ` (job ${buildJobId})` : '',
      },
    );
  }
  if (isLcaFunctionInvokeError(error) && error.code === 'no_ready_snapshot') {
    return intl.formatMessage({
      id: 'pages.process.lca.analysis.error.noReadySnapshot',
      defaultMessage: 'No ready snapshot is available for the selected data scope.',
    });
  }
  if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_stale_rebuild_required') {
    return intl.formatMessage({
      id: 'pages.process.lca.analysis.error.snapshotStale',
      defaultMessage:
        'The ready snapshot for the selected data scope is stale. Rebuild it before rerunning the analysis.',
    });
  }
  return error instanceof Error ? error.message : fallbackMessage;
}

function formatContributionPathTerminalReason(
  terminalReason: string,
  intl: ReturnType<typeof useIntl>,
): string {
  const normalized = terminalReason.trim().toLowerCase();
  switch (normalized) {
    case 'leaf':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.leaf',
        defaultMessage: 'Leaf process',
      });
    case 'cutoff':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.cutoff',
        defaultMessage: 'Cut off by share threshold',
      });
    case 'max_depth':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.maxDepth',
        defaultMessage: 'Stopped at max depth',
      });
    case 'max_nodes':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.maxNodes',
        defaultMessage: 'Stopped at max node limit',
      });
    case 'cycle_cut':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.cycleCut',
        defaultMessage: 'Cycle cut',
      });
    case 'top_k':
      return intl.formatMessage({
        id: 'pages.process.lca.page.path.terminalReason.topK',
        defaultMessage: 'Stopped by top-k child limit',
      });
    default:
      return normalized;
  }
}

const LcaAnalysisPage = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const lang = getLang(intl.locale);
  const barChartTheme = useMemo(() => buildLcaBarChartTheme(token), [token]);

  const [activeTabKey, setActiveTabKey] = useState('profile');
  const [selectedDataScope, setSelectedDataScope] = useState<LcaAnalysisDataScope>('current_user');
  const [processSearchKeyword, setProcessSearchKeyword] = useState('');
  const [appliedProcessSearchKeyword, setAppliedProcessSearchKeyword] = useState('');
  const [processCurrentPage, setProcessCurrentPage] = useState(1);
  const [processTotalCount, setProcessTotalCount] = useState(0);
  const [processOptionsLoading, setProcessOptionsLoading] = useState(false);
  const [processOptionsError, setProcessOptionsError] = useState<string | null>(null);
  const [impactOptions, setImpactOptions] = useState<ImpactOption[]>([]);
  const [impactOptionsLoading, setImpactOptionsLoading] = useState(false);
  const [impactOptionsError, setImpactOptionsError] = useState<string | null>(null);

  const [selectedProfileProcessId, setSelectedProfileProcessId] = useState('');
  const [selectedCompareImpactId, setSelectedCompareImpactId] = useState('');
  const [selectedCompareProcessIds, setSelectedCompareProcessIds] = useState<string[]>([]);
  const [selectedGroupedImpactId, setSelectedGroupedImpactId] = useState('');
  const [selectedGroupedProcessIds, setSelectedGroupedProcessIds] = useState<string[]>([]);
  const [selectedGroupedBy, setSelectedGroupedBy] = useState<LcaGroupedResultBy>('location');
  const [selectedPathImpactId, setSelectedPathImpactId] = useState('');
  const [selectedPathProcessId, setSelectedPathProcessId] = useState('');
  const [pathAmount, setPathAmount] = useState(1);
  const [pathMaxDepth, setPathMaxDepth] = useState(4);
  const [pathTopKChildren, setPathTopKChildren] = useState(5);
  const [pathCutoffShare, setPathCutoffShare] = useState(0.01);
  const [pathMaxNodes, setPathMaxNodes] = useState(200);
  const [processRows, setProcessRows] = useState<ProcessTable[]>([]);
  const [knownProcessRows, setKnownProcessRows] = useState<ProcessTable[]>([]);
  const [teamNameMap, setTeamNameMap] = useState<Map<string, string>>(new Map());

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<ProfileResultState | null>(null);

  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResultState | null>(null);

  const [groupedLoading, setGroupedLoading] = useState(false);
  const [groupedError, setGroupedError] = useState<string | null>(null);
  const [groupedResult, setGroupedResult] = useState<GroupedResultState | null>(null);

  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<ContributionPathResultState | null>(null);
  const [pathProcessMetaMap, setPathProcessMetaMap] = useState<
    Map<string, LcaContributionPathProcessMeta>
  >(new Map());
  const processOptionsRequestIdRef = useRef(0);
  const initializedProcessQueryKeyRef = useRef('');
  const processQueryKey = `${lang}:${selectedDataScope}:${appliedProcessSearchKeyword}`;
  const processOptions = useMemo(
    () => buildLcaProcessOptions(processRows, { dedupeByProcessId: false }),
    [processRows],
  );
  const knownProcessOptions = useMemo(
    () => buildLcaProcessOptions(knownProcessRows, { dedupeByProcessId: false }),
    [knownProcessRows],
  );
  const processPageCount = useMemo(
    () => Math.max(1, Math.ceil(processTotalCount / DEFAULT_ANALYSIS_PAGE_SIZE)),
    [processTotalCount],
  );
  const processRangeStart =
    processTotalCount === 0 ? 0 : (processCurrentPage - 1) * DEFAULT_ANALYSIS_PAGE_SIZE + 1;
  const processRangeEnd =
    processTotalCount === 0
      ? 0
      : Math.min(processTotalCount, processCurrentPage * DEFAULT_ANALYSIS_PAGE_SIZE);

  const processOptionMap = useMemo(
    () => new Map(knownProcessOptions.map((item) => [getProcessOptionSelectionKey(item), item])),
    [knownProcessOptions],
  );
  const processOptionByIdMap = useMemo(
    () => new Map(knownProcessOptions.map((item) => [item.processId, item])),
    [knownProcessOptions],
  );
  const processRowMap = useMemo(
    () => new Map(knownProcessRows.map((item) => [buildProcessRowKey(item), item])),
    [knownProcessRows],
  );
  const profileProcessOptions = useMemo(
    () => prependCurrentProcessOption(processOptions, processOptionMap, selectedProfileProcessId),
    [processOptionMap, processOptions, selectedProfileProcessId],
  );
  const selectedCompareProcesses = useMemo(
    () =>
      selectedCompareProcessIds
        .map((processId) => processOptionMap.get(processId))
        .filter((item): item is LcaProcessOption => !!item),
    [processOptionMap, selectedCompareProcessIds],
  );
  const selectedGroupedProcesses = useMemo(
    () =>
      selectedGroupedProcessIds
        .map((processId) => processRowMap.get(processId))
        .filter((item): item is ProcessTable => !!item),
    [processRowMap, selectedGroupedProcessIds],
  );
  const selectedPathProcess = useMemo(
    () => (selectedPathProcessId ? (processOptionMap.get(selectedPathProcessId) ?? null) : null),
    [processOptionMap, selectedPathProcessId],
  );

  const dataScopeOptions = useMemo(
    () => [
      {
        value: 'current_user' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.dataScope.option.currentUser',
          defaultMessage: 'Current user data',
        }),
      },
      {
        value: 'open_data' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.dataScope.option.openData',
          defaultMessage: 'Open data',
        }),
      },
      {
        value: 'all_data' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.dataScope.option.allData',
          defaultMessage: 'All data',
        }),
      },
    ],
    [intl],
  );

  const groupedByOptions = useMemo(
    () => [
      {
        value: 'location' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.grouped.groupBy.option.location',
          defaultMessage: 'Location',
        }),
      },
      {
        value: 'classification' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.grouped.groupBy.option.classification',
          defaultMessage: 'Classification',
        }),
      },
      {
        value: 'typeOfDataSet' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.grouped.groupBy.option.typeOfDataSet',
          defaultMessage: 'Type of data set',
        }),
      },
      {
        value: 'team' as const,
        label: intl.formatMessage({
          id: 'pages.process.lca.page.grouped.groupBy.option.team',
          defaultMessage: 'Team',
        }),
      },
    ],
    [intl],
  );

  useEffect(() => {
    if (impactOptions.length === 0) {
      return;
    }

    setSelectedCompareImpactId((current) =>
      current && impactOptions.some((item) => item.value === current)
        ? current
        : impactOptions[0].value,
    );
    setSelectedGroupedImpactId((current) =>
      current && impactOptions.some((item) => item.value === current)
        ? current
        : impactOptions[0].value,
    );
    setSelectedPathImpactId((current) =>
      current && impactOptions.some((item) => item.value === current)
        ? current
        : impactOptions[0].value,
    );
  }, [impactOptions]);

  useEffect(() => {
    if (processOptionsLoading || initializedProcessQueryKeyRef.current === processQueryKey) {
      return;
    }

    initializedProcessQueryKeyRef.current = processQueryKey;

    if (processOptions.length === 0) {
      setSelectedProfileProcessId('');
      setSelectedCompareProcessIds([]);
      setSelectedGroupedProcessIds([]);
      setSelectedPathProcessId('');
      return;
    }

    setSelectedProfileProcessId((current) =>
      current && processOptionMap.has(current)
        ? current
        : getProcessOptionSelectionKey(processOptions[0]),
    );

    setSelectedCompareProcessIds((current) => {
      const filtered = current.filter((item) => processOptionMap.has(item));
      if (filtered.length > 0) {
        return filtered;
      }
      return processOptions
        .slice(0, Math.max(1, Math.min(DEFAULT_COMPARE_SELECTION_LIMIT, processOptions.length)))
        .map(getProcessOptionSelectionKey);
    });

    setSelectedGroupedProcessIds((current) => {
      const filtered = current.filter((item) => processOptionMap.has(item));
      if (filtered.length > 0) {
        return filtered;
      }
      return processOptions
        .slice(0, Math.max(1, Math.min(DEFAULT_COMPARE_SELECTION_LIMIT, processOptions.length)))
        .map(getProcessOptionSelectionKey);
    });

    setSelectedPathProcessId(getProcessOptionSelectionKey(processOptions[0]));
  }, [processOptions, processOptionsLoading, processQueryKey]);

  useEffect(() => {
    let cancelled = false;

    const loadTeamNames = async () => {
      try {
        const result = await getTeams();
        if (cancelled) {
          return;
        }
        const rows = Array.isArray(result?.data) ? result.data : [];
        const nextMap = new Map<string, string>();

        rows.forEach((row: Record<string, unknown>) => {
          const teamId = String(row?.id ?? '').trim();
          if (!teamId) {
            return;
          }
          const title = getLangText(
            (row?.json as { title?: unknown } | undefined)?.title ?? {},
            lang,
          );
          nextMap.set(teamId, title && title !== '-' ? title : teamId);
        });

        setTeamNameMap(nextMap);
      } catch (_error) {
        if (!cancelled) {
          setTeamNameMap(new Map());
        }
      }
    };

    void loadTeamNames();

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const clearAnalysisResults = () => {
    setProfileResult(null);
    setCompareResult(null);
    setGroupedResult(null);
    setPathResult(null);
    setProfileError(null);
    setCompareError(null);
    setGroupedError(null);
    setPathError(null);
  };

  const loadProcessOptions = async (
    keyword: string,
    dataScope: LcaAnalysisDataScope,
    currentPage: number,
    options: { resetKnownRows?: boolean } = {},
  ) => {
    const requestId = processOptionsRequestIdRef.current + 1;
    processOptionsRequestIdRef.current = requestId;
    setProcessOptionsLoading(true);
    setProcessOptionsError(null);

    try {
      const result = await listProcessesForLcaAnalysis(
        {
          current: currentPage,
          pageSize: DEFAULT_ANALYSIS_PAGE_SIZE,
        },
        lang,
        dataScope,
        keyword,
        {},
        {},
        'all',
        'all',
      );
      if (result?.success === false) {
        throw new Error('load_processes_for_analysis_failed');
      }
      if (requestId !== processOptionsRequestIdRef.current) {
        return;
      }

      const rows = Array.isArray(result?.data) ? result.data : [];
      setProcessCurrentPage(currentPage);
      setProcessTotalCount(typeof result?.total === 'number' ? result.total : rows.length);
      setProcessRows(rows);
      setKnownProcessRows((current) =>
        options.resetKnownRows ? rows : mergeProcessRows(current, rows),
      );
      if (rows.length === 0) {
        setProcessOptionsError(
          intl.formatMessage({
            id: 'pages.process.lca.page.processes.empty',
            defaultMessage: 'No processes are available for the selected data scope.',
          }),
        );
      }
    } catch (_error) {
      if (requestId !== processOptionsRequestIdRef.current) {
        return;
      }
      if (options.resetKnownRows) {
        setProcessRows([]);
        setKnownProcessRows([]);
        setProcessTotalCount(0);
      }
      setProcessOptionsError(
        intl.formatMessage({
          id: 'pages.process.lca.page.processes.loadFailed',
          defaultMessage: 'Failed to load processes for analysis.',
        }),
      );
    } finally {
      if (requestId === processOptionsRequestIdRef.current) {
        setProcessOptionsLoading(false);
      }
    }
  };

  const loadFirstProcessPage = async (keyword: string, dataScope: LcaAnalysisDataScope) => {
    initializedProcessQueryKeyRef.current = '';
    setProcessCurrentPage(1);
    setProcessRows([]);
    setKnownProcessRows([]);
    setProcessTotalCount(0);
    clearAnalysisResults();
    await loadProcessOptions(keyword, dataScope, 1, { resetKnownRows: true });
  };

  const changeProcessPage = async (nextPage: number) => {
    await loadProcessOptions(appliedProcessSearchKeyword, selectedDataScope, nextPage);
  };

  const processSelectionPagination = {
    current: processCurrentPage,
    totalPages: processPageCount,
    rangeStart: processRangeStart,
    rangeEnd: processRangeEnd,
    loading: processOptionsLoading,
    onPrevious: () => {
      void changeProcessPage(processCurrentPage - 1);
    },
    onNext: () => {
      void changeProcessPage(processCurrentPage + 1);
    },
  };

  const loadAnalysisOptions = async () => {
    setImpactOptionsLoading(true);
    setImpactOptionsError(null);

    try {
      const options = await loadImpactOptions(lang);
      setImpactOptions(options);
      if (options.length === 0) {
        setImpactOptionsError(
          intl.formatMessage({
            id: 'pages.process.lca.analysis.empty.impactOptions',
            defaultMessage: 'No impact categories are available.',
          }),
        );
      }
    } catch (_error) {
      setImpactOptions([]);
      setImpactOptionsError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.message.loadImpactOptionsFailed',
          defaultMessage: 'Failed to load impact categories.',
        }),
      );
    } finally {
      setImpactOptionsLoading(false);
    }
  };

  useEffect(() => {
    void loadFirstProcessPage(appliedProcessSearchKeyword, selectedDataScope);
  }, [lang, selectedDataScope]);

  useEffect(() => {
    void loadAnalysisOptions();
  }, [lang]);

  useEffect(() => {
    setGroupedResult((current) => {
      if (!current || current.groupBy !== 'team') {
        return current;
      }

      return {
        ...current,
        model: buildGroupedResultModel(selectedGroupedProcesses, current.valuesByProcessId, {
          groupBy: current.groupBy,
          teamNameMap,
          unknownGroupLabel: intl.formatMessage({
            id: 'pages.process.lca.page.grouped.groupLabel.unknown',
            defaultMessage: 'Unknown',
          }),
          noTeamLabel: intl.formatMessage({
            id: 'pages.process.lca.page.grouped.groupLabel.noTeam',
            defaultMessage: 'No team',
          }),
        }),
      };
    });
  }, [intl, selectedGroupedProcesses, teamNameMap]);

  useEffect(() => {
    let cancelled = false;

    if (!pathResult) {
      setPathProcessMetaMap(new Map());
      return () => {
        cancelled = true;
      };
    }

    const seededMeta = new Map<string, LcaContributionPathProcessMeta>();
    knownProcessOptions.forEach((item) => {
      seededMeta.set(item.processId, {
        label: item.name,
        version: item.version,
      });
    });
    const selectedPathProcessId = pathResult.process.processId;
    if (selectedPathProcessId) {
      seededMeta.set(selectedPathProcessId, {
        label: pathResult.process.name,
        version: pathResult.process.version,
      });
    }

    const pathProcessIds = new Set<string>([
      pathResult.model.root.processId,
      ...pathResult.model.contributors.map((item) => item.processId),
      ...pathResult.model.links.flatMap((item) => [item.sourceProcessId, item.targetProcessId]),
      ...pathResult.model.branches.flatMap((item) => item.pathProcessIds),
    ]);

    const loadPathProcessMeta = async () => {
      const missingProcessIds = Array.from(pathProcessIds).filter(
        (processId) => processId && !seededMeta.has(processId),
      );

      if (missingProcessIds.length === 0) {
        setPathProcessMetaMap(seededMeta);
        return;
      }

      const loadedMeta = await Promise.all(
        missingProcessIds.map(async (processId) => {
          try {
            const detail = await getProcessDetail(processId, '');
            const name = genProcessName(
              detail?.data?.json?.processDataSet?.processInformation?.dataSetInformation?.name ??
                {},
              lang,
            );
            const normalizedLabel = name.trim();
            return [
              processId,
              normalizedLabel && normalizedLabel !== '-'
                ? {
                    label: normalizedLabel,
                    version: String(detail?.data?.version ?? '').trim(),
                  }
                : null,
            ] as const;
          } catch (_error) {
            return [processId, null] as const;
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextMeta = new Map(seededMeta);
      loadedMeta.forEach(([processId, meta]) => {
        if (!meta?.label) {
          return;
        }
        nextMeta.set(processId, meta);
      });
      setPathProcessMetaMap(nextMeta);
    };

    void loadPathProcessMeta();

    return () => {
      cancelled = true;
    };
  }, [knownProcessOptions, lang, pathResult]);

  const goBackToProcesses = () => {
    history.push('/mydata/processes');
  };

  const runProfileAnalysis = async () => {
    const selectedProcess = processOptionMap.get(selectedProfileProcessId);
    if (!selectedProcess) {
      setProfileError(
        intl.formatMessage({
          id: 'pages.process.lca.error.processRequired',
          defaultMessage: 'Please select a process',
        }),
      );
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        mode: 'process_all_impacts',
        process_id: selectedProcess.processId,
        process_version: selectedProcess.version,
        allow_fallback: false,
      });

      const solverRows = (
        Array.isArray((queried.data as { values?: unknown[] })?.values)
          ? ((queried.data as { values?: unknown[] }).values as ProcessAllImpactsValue[])
          : []
      )
        .map((row) => ({
          impact_id: String(row.impact_id ?? '').trim(),
          impact_name: String(row.impact_name ?? '').trim(),
          unit: String(row.unit ?? '').trim(),
          value: normalizeNumber(row.value),
          impact_index: Number(row.impact_index ?? 0),
        }))
        .filter((row) => row.impact_id.length > 0)
        .sort((left, right) => left.impact_index - right.impact_index);
      const methodMetaById = await getLcaMethodMetaMap(solverRows.map((row) => row.impact_id));
      const mergedRows = buildMergedLcaRows(
        [],
        solverRows.map(
          (row) =>
            ({
              impact_id: row.impact_id,
              impact_name: row.impact_name,
              unit: row.unit,
              value: row.value,
            }) satisfies SolverLcaImpactValueRow,
        ),
        methodMetaById,
      );

      setProfileResult({
        process: selectedProcess,
        rows: mergedRows,
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
      });
    } catch (error: unknown) {
      setProfileResult(null);
      setProfileError(
        resolveQueuedSnapshotMessage(
          error,
          intl,
          intl.formatMessage({
            id: 'pages.process.lca.page.profile.runFailed',
            defaultMessage: 'Failed to load the LCIA profile.',
          }),
        ),
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const runCompareAnalysis = async () => {
    setCompareLoading(true);
    setCompareError(null);

    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        mode: 'processes_one_impact',
        process_ids: buildUniqueProcessIdList(selectedCompareProcesses),
        impact_id: selectedCompareImpactId,
        allow_fallback: false,
      });

      const values = (queried.data as { values?: Record<string, unknown> })?.values;
      const valuesByProcessId =
        values && typeof values === 'object' && !Array.isArray(values)
          ? (values as Record<string, unknown>)
          : {};
      const selectedImpact = impactOptions.find((item) => item.value === selectedCompareImpactId);

      setCompareResult({
        impactId: selectedCompareImpactId,
        impactLabel: selectedImpact?.label || selectedCompareImpactId,
        unit: selectedImpact?.unit || '-',
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
        model: buildLcaImpactCompareModel(selectedCompareProcesses, valuesByProcessId),
      });
    } catch (error: unknown) {
      setCompareResult(null);
      setCompareError(
        resolveQueuedSnapshotMessage(
          error,
          intl,
          intl.formatMessage({
            id: 'pages.process.lca.analysis.message.runFailed',
            defaultMessage: 'Failed to run impact analysis.',
          }),
        ),
      );
    } finally {
      setCompareLoading(false);
    }
  };

  const runGroupedAnalysis = async () => {
    setGroupedLoading(true);
    setGroupedError(null);

    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        mode: 'processes_one_impact',
        process_ids: selectedGroupedProcesses.map((item) => item.id),
        impact_id: selectedGroupedImpactId,
        allow_fallback: false,
      });

      const values = (queried.data as { values?: Record<string, unknown> })?.values;
      const valuesByProcessId =
        values && typeof values === 'object' && !Array.isArray(values)
          ? (values as Record<string, unknown>)
          : {};
      const selectedImpact = impactOptions.find((item) => item.value === selectedGroupedImpactId);

      setGroupedResult({
        impactId: selectedGroupedImpactId,
        impactLabel: selectedImpact?.label || selectedGroupedImpactId,
        unit: selectedImpact?.unit || '-',
        groupBy: selectedGroupedBy,
        valuesByProcessId,
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
        model: buildGroupedResultModel(selectedGroupedProcesses, valuesByProcessId, {
          groupBy: selectedGroupedBy,
          teamNameMap,
          unknownGroupLabel: intl.formatMessage({
            id: 'pages.process.lca.page.grouped.groupLabel.unknown',
            defaultMessage: 'Unknown',
          }),
          noTeamLabel: intl.formatMessage({
            id: 'pages.process.lca.page.grouped.groupLabel.noTeam',
            defaultMessage: 'No team',
          }),
        }),
      });
    } catch (error: unknown) {
      setGroupedResult(null);
      setGroupedError(
        resolveQueuedSnapshotMessage(
          error,
          intl,
          intl.formatMessage({
            id: 'pages.process.lca.page.grouped.runFailed',
            defaultMessage: 'Failed to run grouped analysis.',
          }),
        ),
      );
    } finally {
      setGroupedLoading(false);
    }
  };

  const runContributionPathAnalysis = async () => {
    const pathProcess = selectedPathProcess!;

    if (!Number.isFinite(pathAmount) || pathAmount === 0) {
      setPathError(
        intl.formatMessage({
          id: 'pages.process.lca.page.path.validation.amountRequired',
          defaultMessage: 'Please enter a non-zero amount.',
        }),
      );
      return;
    }

    setPathLoading(true);
    setPathError(null);

    try {
      const submitted = await submitLcaContributionPath({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        process_id: pathProcess.processId,
        process_version: pathProcess.version === '-' ? undefined : pathProcess.version,
        impact_id: selectedPathImpactId,
        amount: pathAmount,
        options: {
          max_depth: pathMaxDepth,
          top_k_children: pathTopKChildren,
          cutoff_share: pathCutoffShare,
          max_nodes: pathMaxNodes,
        },
      });

      if (submitted.mode === 'snapshot_building') {
        setPathResult(null);
        setPathError(
          intl.formatMessage(
            {
              id: 'pages.process.lca.analysis.error.snapshotBuilding',
              defaultMessage:
                'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
            },
            {
              jobSuffix: submitted.build_job_id ? ` (job ${submitted.build_job_id})` : '',
            },
          ),
        );
        return;
      }

      let resultId = submitted.mode === 'cache_hit' ? submitted.result_id : '';
      if (!resultId) {
        const jobId = submitted.job_id?.trim();
        if (!jobId) {
          throw new Error(
            intl.formatMessage({
              id: 'pages.process.lca.page.path.jobMissingResult',
              defaultMessage: 'Contribution path analysis finished without a result.',
            }),
          );
        }

        const job = await pollLcaJobUntilTerminal(jobId);
        if (job.status === 'failed' || job.status === 'stale') {
          throw new Error(
            intl.formatMessage({
              id: 'pages.process.lca.page.path.jobFailed',
              defaultMessage: 'Contribution path analysis failed.',
            }),
          );
        }

        resultId = job.result?.result_id?.trim() ?? '';
        if (!resultId) {
          throw new Error(
            intl.formatMessage({
              id: 'pages.process.lca.page.path.jobMissingResult',
              defaultMessage: 'Contribution path analysis finished without a result.',
            }),
          );
        }
      }

      const result = await getLcaContributionPathResult(resultId);
      const model = buildLcaContributionPathModel(result.data);
      if (!model) {
        throw new Error(
          intl.formatMessage({
            id: 'pages.process.lca.page.path.invalidPayload',
            defaultMessage: 'Unexpected contribution path payload returned from the analysis API.',
          }),
        );
      }
      const selectedImpact = impactOptions.find((item) => item.value === selectedPathImpactId);

      setPathResult({
        process: pathProcess,
        impactId: model.impact.impactId,
        impactLabel: selectedImpact?.label || model.impact.label,
        unit: resolveContributionPathDisplayUnit(selectedImpact, model),
        amount: model.amount,
        snapshotId: result.snapshot_id,
        resultId: result.result_id,
        source: model.source,
        computedAt: model.summary.computedAt,
        model,
      });
    } catch (error: unknown) {
      setPathResult(null);
      setPathError(
        resolveQueuedSnapshotMessage(
          error,
          intl,
          intl.formatMessage({
            id: 'pages.process.lca.page.path.runFailed',
            defaultMessage: 'Failed to run contribution path analysis.',
          }),
        ),
      );
    } finally {
      setPathLoading(false);
    }
  };

  const profileModel = useMemo(
    () => (profileResult ? buildLcaProfileModel(profileResult.rows, lang) : null),
    [lang, profileResult],
  );
  const compareUnit = compareResult?.unit ?? '-';
  const groupedUnit = groupedResult?.unit ?? '-';
  const pathUnit = pathResult?.unit ?? '-';

  const profileChartData = useMemo(
    () =>
      (profileModel?.topItems ?? []).map((item) => ({
        key: item.key,
        label: truncateChartLabel(item.title),
        fullLabel: item.title,
        value: item.direction === 'negative' ? -item.normalizedValue : item.normalizedValue,
        direction: item.direction,
      })),
    [profileModel],
  );

  const compareChartData = useMemo(
    () =>
      (compareResult?.model.items ?? []).map((item) => ({
        key: item.processId,
        label: truncateChartLabel(item.processName),
        fullLabel: item.processName,
        value: item.value,
        direction: item.direction,
      })),
    [compareResult],
  );

  const groupedChartData = useMemo(
    () =>
      (groupedResult?.model.items ?? []).map((item) => ({
        key: item.groupKey,
        label: truncateChartLabel(item.groupLabel),
        fullLabel: item.groupLabel,
        value: item.absoluteValue,
        direction: item.direction,
      })),
    [groupedResult],
  );

  const resolvedPathModel = useMemo(
    () =>
      pathResult ? applyLcaContributionPathProcessMeta(pathResult.model, pathProcessMetaMap) : null,
    [pathProcessMetaMap, pathResult],
  );

  const pathChartData = useMemo(
    () =>
      (resolvedPathModel?.topContributors ?? []).map((item) => ({
        key: item.processId,
        label: truncateChartLabel(item.label),
        fullLabel: item.label,
        value: item.directImpact,
        direction: item.direction,
      })),
    [resolvedPathModel],
  );

  const pathSankeyData = useMemo(
    () => (resolvedPathModel ? buildLcaContributionPathSankeyData(resolvedPathModel) : null),
    [resolvedPathModel],
  );

  const pathSankeyLinkMetaMap = useMemo(() => {
    const metaMap = new Map<
      string,
      {
        sourceLabel: string;
        targetLabel: string;
        sourceDepth: number;
        targetDepth: number;
        directImpact: number;
        shareOfTotal: number;
        direction: 'positive' | 'negative' | 'neutral';
      }
    >();
    (pathSankeyData?.links ?? []).forEach((item) => {
      metaMap.set(`${item.source}|${item.target}|${item.value}`, {
        sourceLabel: item.sourceLabel,
        targetLabel: item.targetLabel,
        sourceDepth: item.sourceDepth,
        targetDepth: item.targetDepth,
        directImpact: item.directImpact,
        shareOfTotal: item.shareOfTotal,
        direction: item.direction,
      });
    });
    return metaMap;
  }, [pathSankeyData]);

  const resolveSankeyNodeKey = (value: SankeyGraphNodeDatum | string | undefined) => {
    return typeof value === 'string' ? value : String(value?.key ?? '').trim();
  };

  const resolvePathSankeyLinkMeta = (datum: SankeyGraphLinkDatum) => {
    const sourceKey = resolveSankeyNodeKey(datum.source);
    const targetKey = resolveSankeyNodeKey(datum.target);
    const value = normalizeNumber(datum.value);
    return pathSankeyLinkMetaMap.get(`${sourceKey}|${targetKey}|${value}`);
  };

  const hasPathSankey = Boolean(pathSankeyData && pathSankeyData.links.length > 0);
  const pathSankeyNeedsLayeringNote = Boolean(
    pathSankeyData &&
    (pathSankeyData.repeatedNodeCount > 0 ||
      pathSankeyData.cycleCutLinkCount > 0 ||
      pathSankeyData.selfLoopLinkCount > 0),
  );

  const profileChartHeight = Math.max(280, profileChartData.length * 44 + 80);
  const compareChartHeight = Math.max(280, compareChartData.length * 44 + 80);
  const groupedChartHeight = Math.max(280, groupedChartData.length * 44 + 80);
  const pathChartHeight = Math.max(280, pathChartData.length * 44 + 80);
  const pathSankeyHeight = Math.max(
    DEFAULT_PATH_SANKEY_HEIGHT,
    (pathSankeyData?.nodes.length ?? 0) * 20 + 120,
  );

  const resolvePathProcessVersion = (processId: string) => {
    if (
      pathResult &&
      pathResult.process.processId === processId &&
      pathResult.process.version !== '-'
    ) {
      return pathResult.process.version;
    }
    const resolvedVersion = String(pathProcessMetaMap.get(processId)?.version ?? '').trim();
    if (resolvedVersion && resolvedVersion !== '-') {
      return resolvedVersion;
    }
    const optionVersion = String(processOptionByIdMap.get(processId)?.version ?? '').trim();
    return optionVersion && optionVersion !== '-' ? optionVersion : '';
  };

  const renderPathProcessTrigger = (processId: string, fallbackLabel: string) => {
    return (
      <ProcessView
        id={processId}
        version={resolvePathProcessVersion(processId)}
        lang={lang}
        buttonType='link'
        disabled={false}
        triggerLabel={pathProcessMetaMap.get(processId)?.label || fallbackLabel}
      />
    );
  };

  const compareColumns: ColumnsType<LcaImpactCompareItem> = [
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      key: 'processName',
      render: (_, item) => (
        <Space size='small'>
          <Typography.Text strong>{item.processName}</Typography.Text>
          <Typography.Text type='secondary'>{item.version}</Typography.Text>
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.value'
          defaultMessage='Impact value'
        />
      ),
      key: 'value',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.value} />{' '}
          <Typography.Text type='secondary'>{compareUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.share'
          defaultMessage='Absolute share'
        />
      ),
      key: 'share',
      render: (_, item) => formatPercent(item.share),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.cumulativeShare'
          defaultMessage='Cumulative share'
        />
      ),
      key: 'cumulativeShare',
      render: (_, item) => formatPercent(item.cumulativeShare),
    },
  ];

  const groupedColumns: ColumnsType<LcaGroupedResultItem> = [
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.grouped.table.rank' defaultMessage='Rank' />
      ),
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
    },
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.grouped.table.group' defaultMessage='Group' />
      ),
      key: 'group',
      render: (_, item) => (
        <Space direction='vertical' size={0}>
          <Typography.Text strong>{item.groupLabel}</Typography.Text>
          <Typography.Text type='secondary'>
            {intl.formatMessage(
              {
                id: 'pages.process.lca.page.grouped.table.groupHint',
                defaultMessage: '{count} processes, top process: {processName}',
              },
              {
                count: item.processCount,
                processName: item.topProcess!.processName,
              },
            )}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.grouped.table.processCount'
          defaultMessage='Processes'
        />
      ),
      dataIndex: 'processCount',
      key: 'processCount',
      width: 100,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.grouped.table.netValue'
          defaultMessage='Net impact value'
        />
      ),
      key: 'value',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.value} />{' '}
          <Typography.Text type='secondary'>{groupedUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.grouped.table.absoluteValue'
          defaultMessage='Absolute magnitude'
        />
      ),
      key: 'absoluteValue',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.absoluteValue} />{' '}
          <Typography.Text type='secondary'>{groupedUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.share'
          defaultMessage='Absolute share'
        />
      ),
      key: 'share',
      render: (_, item) => formatPercent(item.share),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.cumulativeShare'
          defaultMessage='Cumulative share'
        />
      ),
      key: 'cumulativeShare',
      render: (_, item) => formatPercent(item.cumulativeShare),
    },
  ];

  const contributionPathContributorColumns: ColumnsType<LcaContributionPathContributorItem> = [
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      key: 'label',
      render: (_, item) => (
        <Space direction='vertical' size={0}>
          <Space size='small'>
            {renderPathProcessTrigger(item.processId, item.label)}
            {item.isRoot ? (
              <Typography.Text type='secondary'>
                <FormattedMessage
                  id='pages.process.lca.page.path.table.root'
                  defaultMessage='Root'
                />
              </Typography.Text>
            ) : null}
          </Space>
          {item.location ? (
            <Typography.Text type='secondary'>{item.location}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.path.table.depth' defaultMessage='Depth' />
      ),
      key: 'depthMin',
      width: 100,
      render: (_, item) => (item.depthMin === null ? '-' : item.depthMin),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.path.table.directImpact'
          defaultMessage='Direct impact'
        />
      ),
      key: 'directImpact',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.directImpact} />{' '}
          <Typography.Text type='secondary'>{pathUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.share'
          defaultMessage='Absolute share'
        />
      ),
      key: 'shareOfTotal',
      render: (_, item) => formatPercent(item.shareOfTotal),
    },
  ];

  const contributionPathBranchColumns: ColumnsType<LcaContributionPathBranchItem> = [
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.grouped.table.rank' defaultMessage='Rank' />
      ),
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
    },
    {
      title: <FormattedMessage id='pages.process.lca.page.path.table.path' defaultMessage='Path' />,
      key: 'pathLabel',
      render: (_, item) => (
        <Space
          size='small'
          wrap={true}
          split={<Typography.Text type='secondary'>&gt;</Typography.Text>}
        >
          {item.pathProcessIds.length > 0
            ? item.pathProcessIds.map((processId, index) => (
                <Fragment key={`${item.key}:${processId}:${index}`}>
                  {renderPathProcessTrigger(processId, item.pathLabels[index] ?? processId)}
                </Fragment>
              ))
            : [
                <Typography.Text key={`${item.key}:empty`}>
                  {item.pathLabel || item.pathLabels.join(' > ') || '-'}
                </Typography.Text>,
              ]}
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.path.table.pathScore'
          defaultMessage='Path score'
        />
      ),
      key: 'pathScore',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.pathScore} />{' '}
          <Typography.Text type='secondary'>{pathUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.path.table.terminalReason'
          defaultMessage='Terminal reason'
        />
      ),
      key: 'terminalReason',
      render: (_, item) => formatContributionPathTerminalReason(item.terminalReason, intl),
    },
  ];

  const contributionPathLinkColumns: ColumnsType<LcaContributionPathLinkItem> = [
    {
      title: <FormattedMessage id='pages.process.lca.page.path.table.edge' defaultMessage='Edge' />,
      key: 'edge',
      render: (_, item) => (
        <Space
          size='small'
          wrap={true}
          split={<Typography.Text type='secondary'>→</Typography.Text>}
        >
          {renderPathProcessTrigger(item.sourceProcessId, item.sourceLabel)}
          {renderPathProcessTrigger(item.targetProcessId, item.targetLabel)}
        </Space>
      ),
    },
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.path.table.depth' defaultMessage='Depth' />
      ),
      dataIndex: 'depthFromRoot',
      key: 'depthFromRoot',
      width: 100,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.path.table.directImpact'
          defaultMessage='Direct impact'
        />
      ),
      key: 'directImpact',
      render: (_, item) => (
        <>
          <AlignedNumber value={item.directImpact} />{' '}
          <Typography.Text type='secondary'>{pathUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.share'
          defaultMessage='Absolute share'
        />
      ),
      key: 'shareOfTotal',
      render: (_, item) => formatPercent(item.shareOfTotal),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.page.path.table.cycleCut'
          defaultMessage='Cycle cut'
        />
      ),
      key: 'cycleCut',
      width: 120,
      render: (_, item) =>
        item.cycleCut
          ? intl.formatMessage({ id: 'pages.yes', defaultMessage: 'Yes' })
          : intl.formatMessage({ id: 'pages.no', defaultMessage: 'No' }),
    },
  ];

  const summaryCardExtra = (
    <Space>
      <Button icon={<ArrowLeftOutlined />} onClick={goBackToProcesses}>
        <FormattedMessage
          id='pages.process.lca.page.action.back'
          defaultMessage='Back to processes'
        />
      </Button>
      <Button
        icon={<ReloadOutlined />}
        loading={processOptionsLoading || impactOptionsLoading}
        onClick={() => {
          void loadProcessOptions(
            appliedProcessSearchKeyword,
            selectedDataScope,
            processCurrentPage,
          );
          void loadAnalysisOptions();
        }}
      >
        <FormattedMessage
          id='pages.process.lca.page.action.refresh'
          defaultMessage='Refresh options'
        />
      </Button>
    </Space>
  );

  return (
    <PageContainer
      header={{
        title: <FormattedMessage id='pages.process.lca.page.title' defaultMessage='LCA Analysis' />,
        breadcrumb: {},
      }}
      extra={summaryCardExtra}
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <Card size='small'>
          <Space direction='vertical' size='small' style={{ width: '100%' }}>
            <Typography.Text strong>
              <FormattedMessage
                id='pages.process.lca.page.processes.title'
                defaultMessage='Analysis inputs'
              />
            </Typography.Text>
            <Typography.Paragraph type='secondary'>
              <FormattedMessage
                id='pages.process.lca.page.description'
                defaultMessage='Use the existing LCA query API to review the LCIA profile of a single process, compare selected processes by impact category, aggregate selected processes into grouped results, or run contribution path analysis for a selected process-impact pair across current-user, open-data, or all-data scopes. Charts support quick interpretation; tables preserve exact values.'
              />
            </Typography.Paragraph>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <Form layout='vertical'>
                  <Form.Item
                    label={
                      <FormattedMessage
                        id='pages.process.lca.page.dataScope.label'
                        defaultMessage='Data scope'
                      />
                    }
                  >
                    <Select
                      aria-label={intl.formatMessage({
                        id: 'pages.process.lca.page.dataScope.label',
                        defaultMessage: 'Data scope',
                      })}
                      value={selectedDataScope}
                      options={dataScopeOptions}
                      onChange={(value) => {
                        setSelectedDataScope(value as LcaAnalysisDataScope);
                      }}
                    />
                  </Form.Item>
                </Form>
              </Col>
              <Col xs={24} md={16}>
                <Form layout='vertical'>
                  <Form.Item
                    label={
                      <FormattedMessage
                        id='pages.process.lca.page.processes.searchLabel'
                        defaultMessage='Process search'
                      />
                    }
                  >
                    <Input.Search
                      allowClear={true}
                      enterButton={true}
                      loading={processOptionsLoading}
                      placeholder={intl.formatMessage({
                        id: 'pages.process.lca.page.processes.searchPlaceholder',
                        defaultMessage: 'Search processes in the selected data scope',
                      })}
                      value={processSearchKeyword}
                      onChange={(event) => setProcessSearchKeyword(event.target.value)}
                      onSearch={(value) => {
                        const nextKeyword = String(value);
                        setProcessSearchKeyword(nextKeyword);
                        setAppliedProcessSearchKeyword(nextKeyword);
                        void loadFirstProcessPage(nextKeyword, selectedDataScope);
                      }}
                    />
                  </Form.Item>
                </Form>
              </Col>
            </Row>
            <Space align='center' wrap={true}>
              <Typography.Text type='secondary'>
                <FormattedMessage
                  id='pages.process.lca.page.processes.count'
                  defaultMessage='{count} process rows are currently available for analysis.'
                  values={{
                    count: processTotalCount,
                  }}
                />
              </Typography.Text>
            </Space>
            {processOptionsError ? <Alert message={processOptionsError} type='error' /> : null}
            {impactOptionsError ? <Alert message={impactOptionsError} type='error' /> : null}
          </Space>
        </Card>

        <Tabs
          activeKey={activeTabKey}
          onChange={setActiveTabKey}
          items={[
            {
              key: 'profile',
              label: (
                <FormattedMessage
                  id='pages.process.lca.page.tab.profile'
                  defaultMessage='Process profile'
                />
              ),
              children: (
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <Card size='small'>
                    <Form layout='vertical'>
                      <Form.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.page.profile.field.process'
                            defaultMessage='Process'
                          />
                        }
                      >
                        <Select
                          showSearch={true}
                          aria-label={intl.formatMessage({
                            id: 'pages.process.lca.page.profile.field.process',
                            defaultMessage: 'Process',
                          })}
                          value={selectedProfileProcessId || undefined}
                          options={profileProcessOptions.map((item) => ({
                            ...item,
                            value: getProcessOptionSelectionKey(item),
                          }))}
                          disabled={processOptionsLoading || profileProcessOptions.length === 0}
                          optionFilterProp='label'
                          onChange={(value) => {
                            setSelectedProfileProcessId(String(value));
                            setProfileResult(null);
                            setProfileError(null);
                          }}
                        />
                      </Form.Item>
                      {processTotalCount > 0 ? (
                        <Space
                          align='center'
                          style={{ width: '100%', justifyContent: 'space-between' }}
                          wrap={true}
                        >
                          <Typography.Text type='secondary'>
                            <FormattedMessage
                              id='pages.process.lca.page.processes.range'
                              defaultMessage='Showing {start}-{end} on page {current} of {totalPages}.'
                              values={{
                                start: processRangeStart,
                                end: processRangeEnd,
                                current: processCurrentPage,
                                totalPages: processPageCount,
                              }}
                            />
                          </Typography.Text>
                          <Space size='small'>
                            <Button
                              size='small'
                              disabled={processOptionsLoading || processCurrentPage <= 1}
                              onClick={processSelectionPagination.onPrevious}
                            >
                              <FormattedMessage
                                id='pages.process.lca.page.processes.action.previousPage'
                                defaultMessage='Previous page'
                              />
                            </Button>
                            <Button
                              size='small'
                              disabled={
                                processOptionsLoading || processCurrentPage >= processPageCount
                              }
                              onClick={processSelectionPagination.onNext}
                            >
                              <FormattedMessage
                                id='pages.process.lca.page.processes.action.nextPage'
                                defaultMessage='Next page'
                              />
                            </Button>
                          </Space>
                        </Space>
                      ) : null}
                      <Button
                        type='primary'
                        loading={profileLoading}
                        disabled={!selectedProfileProcessId}
                        onClick={runProfileAnalysis}
                      >
                        <FormattedMessage
                          id='pages.process.lca.page.profile.action.run'
                          defaultMessage='Load profile'
                        />
                      </Button>
                    </Form>
                  </Card>

                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Typography.Text strong>
                        <FormattedMessage
                          id='pages.process.lca.analysis.section.results'
                          defaultMessage='Results'
                        />
                      </Typography.Text>
                      {profileError ? <Alert message={profileError} type='error' /> : null}
                      {!profileResult && !profileError ? (
                        <Typography.Paragraph type='secondary'>
                          <FormattedMessage
                            id='pages.process.lca.page.profile.empty'
                            defaultMessage='Select one process, then load its LCIA profile.'
                          />
                        </Typography.Paragraph>
                      ) : null}
                      <Spin spinning={profileLoading}>
                        {profileResult && profileModel ? (
                          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                            <QueryMetaCard
                              meta={{
                                snapshotId: profileResult.snapshotId,
                                resultId: profileResult.resultId,
                                source: profileResult.source,
                                computedAt: profileResult.computedAt,
                              }}
                            />

                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={12}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.profile.summary.process'
                                      defaultMessage='Selected process'
                                    />
                                  }
                                  value={profileResult.process.name}
                                />
                              </Col>
                              <Col xs={24} sm={12}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.view.lciaresults.profile.nonZeroCount'
                                      defaultMessage='Non-zero categories'
                                    />
                                  }
                                  value={profileModel.nonZeroCount}
                                />
                              </Col>
                            </Row>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.profile.chart.title'
                                  defaultMessage='Normalized profile chart'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.view.lciaresults.profile.subtitle'
                                    defaultMessage='Bars are normalized by the largest absolute impact value. Exact raw values remain in the table below.'
                                  />
                                </Typography.Paragraph>
                                {profileChartData.length > 0 ? (
                                  <Bar
                                    autoFit={true}
                                    data={profileChartData}
                                    xField='label'
                                    yField='value'
                                    colorField='direction'
                                    legend={false}
                                    height={profileChartHeight}
                                    theme={barChartTheme}
                                    scale={{
                                      color: {
                                        domain: ['negative', 'neutral', 'positive'],
                                        range: [
                                          token.colorError,
                                          token.colorTextSecondary,
                                          token.colorPrimary,
                                        ],
                                      },
                                    }}
                                  />
                                ) : (
                                  <Typography.Text type='secondary'>
                                    <FormattedMessage
                                      id='pages.process.view.lciaresults.profile.empty'
                                      defaultMessage='No LCIA results available for profile analysis.'
                                    />
                                  </Typography.Text>
                                )}
                              </Space>
                            </Card>

                            <LcaProfileSummary rows={profileResult.rows} lang={lang} />
                          </Space>
                        ) : null}
                      </Spin>
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'compare',
              label: (
                <FormattedMessage
                  id='pages.process.lca.page.tab.compare'
                  defaultMessage='Impact compare'
                />
              ),
              children: (
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Form layout='vertical'>
                        <Form.Item
                          label={
                            <FormattedMessage
                              id='pages.process.lca.analysis.field.impact'
                              defaultMessage='Impact category'
                            />
                          }
                        >
                          <Select
                            showSearch={true}
                            aria-label={intl.formatMessage({
                              id: 'pages.process.lca.analysis.field.impact',
                              defaultMessage: 'Impact category',
                            })}
                            value={selectedCompareImpactId || undefined}
                            options={impactOptions.map((item) => ({
                              value: item.value,
                              label: `${item.label} (${item.unit})`,
                            }))}
                            disabled={impactOptionsLoading || impactOptions.length === 0}
                            optionFilterProp='label'
                            onChange={(value) => {
                              setSelectedCompareImpactId(String(value));
                              setCompareResult(null);
                              setCompareError(null);
                            }}
                          />
                        </Form.Item>
                      </Form>

                      <LcaProcessSelectionTable
                        processOptions={processOptions}
                        selectedProcessIds={selectedCompareProcessIds}
                        selectedProcessOptions={selectedCompareProcesses}
                        totalProcessCount={processTotalCount}
                        pagination={processSelectionPagination}
                        titleMessage={{
                          id: 'pages.process.lca.page.compare.selectionTitle',
                          defaultMessage: 'Process selection',
                        }}
                        hintMessage={{
                          id: 'pages.process.lca.page.compare.selectionHint',
                          defaultMessage:
                            '{selectedCount} processes selected from {totalCount} available options.',
                        }}
                        emptyMessage={{
                          id: 'pages.process.lca.page.compare.selectionEmpty',
                          defaultMessage:
                            'No processes match the current data scope and search keyword.',
                        }}
                        onSelectionChange={(selectedProcessIds) => {
                          setSelectedCompareProcessIds(selectedProcessIds);
                          setCompareResult(null);
                          setCompareError(null);
                        }}
                      />

                      <Space>
                        <Button
                          onClick={() => {
                            setSelectedCompareProcessIds([]);
                            setCompareResult(null);
                            setCompareError(null);
                          }}
                          disabled={selectedCompareProcesses.length === 0}
                        >
                          <FormattedMessage
                            id='pages.process.lca.analysis.action.clearSelection'
                            defaultMessage='Clear selection'
                          />
                        </Button>
                        <Button
                          type='primary'
                          loading={compareLoading}
                          disabled={
                            !selectedCompareImpactId || selectedCompareProcesses.length === 0
                          }
                          onClick={runCompareAnalysis}
                        >
                          <FormattedMessage
                            id='pages.process.lca.analysis.action.run'
                            defaultMessage='Run analysis'
                          />
                        </Button>
                      </Space>
                    </Space>
                  </Card>

                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Typography.Text strong>
                        <FormattedMessage
                          id='pages.process.lca.analysis.section.results'
                          defaultMessage='Results'
                        />
                      </Typography.Text>
                      {compareError ? <Alert message={compareError} type='error' /> : null}
                      {!compareResult && !compareError ? (
                        <Typography.Paragraph type='secondary'>
                          <FormattedMessage
                            id='pages.process.lca.analysis.empty.results'
                            defaultMessage='Select one impact category and at least one process, then run the analysis.'
                          />
                        </Typography.Paragraph>
                      ) : null}
                      <Spin spinning={compareLoading}>
                        {compareResult ? (
                          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                            <QueryMetaCard
                              meta={{
                                snapshotId: compareResult.snapshotId,
                                resultId: compareResult.resultId,
                                source: compareResult.source,
                                computedAt: compareResult.computedAt,
                              }}
                            />

                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.analysis.summary.processCount'
                                      defaultMessage='Compared processes'
                                    />
                                  }
                                  value={compareResult.model.items.length}
                                />
                              </Col>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.analysis.summary.topContributor'
                                      defaultMessage='Top contributor'
                                    />
                                  }
                                  value={compareResult.model.topItem!.processName}
                                />
                              </Col>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.analysis.summary.totalAbsolute'
                                      defaultMessage='Absolute total'
                                    />
                                  }
                                  value={compareResult.model.totalAbsoluteValue}
                                  formatter={(value) => (
                                    <>
                                      <AlignedNumber value={Number(value)} />{' '}
                                      <Typography.Text type='secondary'>
                                        {compareUnit}
                                      </Typography.Text>
                                    </>
                                  )}
                                />
                              </Col>
                            </Row>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.compare.chart.title'
                                  defaultMessage='Impact comparison chart'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.lca.analysis.shareNote'
                                    defaultMessage='Shares are calculated from absolute values so positive and negative contributors remain comparable.'
                                  />
                                </Typography.Paragraph>
                                <Bar
                                  autoFit={true}
                                  data={compareChartData}
                                  xField='label'
                                  yField='value'
                                  colorField='direction'
                                  legend={false}
                                  height={compareChartHeight}
                                  theme={barChartTheme}
                                  scale={{
                                    color: {
                                      domain: ['negative', 'neutral', 'positive'],
                                      range: [
                                        token.colorError,
                                        token.colorTextSecondary,
                                        token.colorPrimary,
                                      ],
                                    },
                                  }}
                                />
                              </Space>
                            </Card>

                            <Table<LcaImpactCompareItem>
                              rowKey='processId'
                              size='small'
                              pagination={false}
                              columns={compareColumns}
                              dataSource={compareResult.model.items}
                            />
                          </Space>
                        ) : null}
                      </Spin>
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'grouped',
              label: (
                <FormattedMessage
                  id='pages.process.lca.page.tab.grouped'
                  defaultMessage='Grouped results'
                />
              ),
              children: (
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Form layout='vertical'>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.analysis.field.impact'
                                  defaultMessage='Impact category'
                                />
                              }
                            >
                              <Select
                                showSearch={true}
                                aria-label={intl.formatMessage({
                                  id: 'pages.process.lca.analysis.field.impact',
                                  defaultMessage: 'Impact category',
                                })}
                                value={selectedGroupedImpactId || undefined}
                                options={impactOptions.map((item) => ({
                                  value: item.value,
                                  label: `${item.label} (${item.unit})`,
                                }))}
                                disabled={impactOptionsLoading || impactOptions.length === 0}
                                optionFilterProp='label'
                                onChange={(value) => {
                                  setSelectedGroupedImpactId(String(value));
                                  setGroupedResult(null);
                                  setGroupedError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.grouped.groupBy.label'
                                  defaultMessage='Group by'
                                />
                              }
                            >
                              <Select
                                aria-label={intl.formatMessage({
                                  id: 'pages.process.lca.page.grouped.groupBy.label',
                                  defaultMessage: 'Group by',
                                })}
                                value={selectedGroupedBy}
                                options={groupedByOptions}
                                onChange={(value) => {
                                  setSelectedGroupedBy(value as LcaGroupedResultBy);
                                  setGroupedResult(null);
                                  setGroupedError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>

                      <LcaProcessSelectionTable
                        processOptions={processOptions}
                        selectedProcessIds={selectedGroupedProcessIds}
                        selectedProcessOptions={selectedGroupedProcessIds
                          .map((processId) => processOptionMap.get(processId))
                          .filter((item): item is LcaProcessOption => !!item)}
                        totalProcessCount={processTotalCount}
                        pagination={processSelectionPagination}
                        titleMessage={{
                          id: 'pages.process.lca.page.grouped.selectionTitle',
                          defaultMessage: 'Process selection',
                        }}
                        hintMessage={{
                          id: 'pages.process.lca.page.grouped.selectionHint',
                          defaultMessage:
                            '{selectedCount} processes selected from {totalCount} available options.',
                        }}
                        emptyMessage={{
                          id: 'pages.process.lca.page.grouped.selectionEmpty',
                          defaultMessage:
                            'No processes match the current data scope and search keyword.',
                        }}
                        onSelectionChange={(selectedProcessIds) => {
                          setSelectedGroupedProcessIds(selectedProcessIds);
                          setGroupedResult(null);
                          setGroupedError(null);
                        }}
                      />

                      <Space>
                        <Button
                          onClick={() => {
                            setSelectedGroupedProcessIds([]);
                            setGroupedResult(null);
                            setGroupedError(null);
                          }}
                          disabled={selectedGroupedProcesses.length === 0}
                        >
                          <FormattedMessage
                            id='pages.process.lca.analysis.action.clearSelection'
                            defaultMessage='Clear selection'
                          />
                        </Button>
                        <Button
                          type='primary'
                          loading={groupedLoading}
                          disabled={
                            !selectedGroupedImpactId || selectedGroupedProcesses.length === 0
                          }
                          onClick={runGroupedAnalysis}
                        >
                          <FormattedMessage
                            id='pages.process.lca.page.grouped.action.run'
                            defaultMessage='Run grouped analysis'
                          />
                        </Button>
                      </Space>
                    </Space>
                  </Card>

                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Typography.Text strong>
                        <FormattedMessage
                          id='pages.process.lca.analysis.section.results'
                          defaultMessage='Results'
                        />
                      </Typography.Text>
                      {groupedError ? <Alert message={groupedError} type='error' /> : null}
                      {!groupedResult && !groupedError ? (
                        <Typography.Paragraph type='secondary'>
                          <FormattedMessage
                            id='pages.process.lca.page.grouped.empty.results'
                            defaultMessage='Select one impact category, one grouping rule, and at least one process, then run grouped analysis.'
                          />
                        </Typography.Paragraph>
                      ) : null}
                      <Spin spinning={groupedLoading}>
                        {groupedResult ? (
                          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                            <QueryMetaCard
                              meta={{
                                snapshotId: groupedResult.snapshotId,
                                resultId: groupedResult.resultId,
                                source: groupedResult.source,
                                computedAt: groupedResult.computedAt,
                              }}
                            />

                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.grouped.summary.groupCount'
                                      defaultMessage='Groups'
                                    />
                                  }
                                  value={groupedResult.model.groupCount}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.grouped.summary.processCount'
                                      defaultMessage='Selected processes'
                                    />
                                  }
                                  value={groupedResult.model.processCount}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.grouped.summary.topGroup'
                                      defaultMessage='Top group'
                                    />
                                  }
                                  value={groupedResult.model.topItem!.groupLabel}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.grouped.summary.totalAbsolute'
                                      defaultMessage='Absolute total'
                                    />
                                  }
                                  value={groupedResult.model.totalAbsoluteValue}
                                  formatter={(value) => (
                                    <>
                                      <AlignedNumber value={Number(value)} />{' '}
                                      <Typography.Text type='secondary'>
                                        {groupedUnit}
                                      </Typography.Text>
                                    </>
                                  )}
                                />
                              </Col>
                            </Row>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.grouped.chart.title'
                                  defaultMessage='Grouped ranking chart'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.lca.page.grouped.shareNote'
                                    defaultMessage='Bars rank groups by aggregated absolute impact. Colors reflect the net signed direction, while the table below keeps exact net and absolute values.'
                                  />
                                </Typography.Paragraph>
                                <Bar
                                  autoFit={true}
                                  data={groupedChartData}
                                  xField='label'
                                  yField='value'
                                  colorField='direction'
                                  legend={false}
                                  height={groupedChartHeight}
                                  theme={barChartTheme}
                                  scale={{
                                    color: {
                                      domain: ['negative', 'neutral', 'positive'],
                                      range: [
                                        token.colorError,
                                        token.colorTextSecondary,
                                        token.colorPrimary,
                                      ],
                                    },
                                  }}
                                />
                              </Space>
                            </Card>

                            <Table<LcaGroupedResultItem>
                              rowKey='groupKey'
                              size='small'
                              pagination={false}
                              columns={groupedColumns}
                              dataSource={groupedResult.model.items}
                            />
                          </Space>
                        ) : null}
                      </Spin>
                    </Space>
                  </Card>
                </Space>
              ),
            },
            {
              key: 'path',
              label: (
                <FormattedMessage
                  id='pages.process.lca.page.tab.path'
                  defaultMessage='Contribution path'
                />
              ),
              children: (
                <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Form layout='vertical'>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.analysis.field.impact'
                                  defaultMessage='Impact category'
                                />
                              }
                            >
                              <Select
                                showSearch={true}
                                aria-label={intl.formatMessage({
                                  id: 'pages.process.lca.analysis.field.impact',
                                  defaultMessage: 'Impact category',
                                })}
                                value={selectedPathImpactId || undefined}
                                options={impactOptions.map((item) => ({
                                  value: item.value,
                                  label: `${item.label} (${item.unit})`,
                                }))}
                                disabled={impactOptionsLoading || impactOptions.length === 0}
                                optionFilterProp='label'
                                onChange={(value) => {
                                  setSelectedPathImpactId(String(value));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.field.amount'
                                  defaultMessage='Amount'
                                />
                              }
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                value={pathAmount}
                                onChange={(value) => {
                                  setPathAmount(Number(value ?? 1));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={6}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.field.maxDepth'
                                  defaultMessage='Max depth'
                                />
                              }
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={8}
                                value={pathMaxDepth}
                                onChange={(value) => {
                                  setPathMaxDepth(Number(value ?? 4));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={6}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.field.topKChildren'
                                  defaultMessage='Top-k children'
                                />
                              }
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                max={20}
                                value={pathTopKChildren}
                                onChange={(value) => {
                                  setPathTopKChildren(Number(value ?? 5));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={6}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.field.cutoffShare'
                                  defaultMessage='Cutoff share'
                                />
                              }
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={1}
                                step={0.001}
                                value={pathCutoffShare}
                                onChange={(value) => {
                                  setPathCutoffShare(Number(value ?? 0.01));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={6}>
                            <Form.Item
                              label={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.field.maxNodes'
                                  defaultMessage='Max nodes'
                                />
                              }
                            >
                              <InputNumber
                                style={{ width: '100%' }}
                                min={10}
                                max={2000}
                                value={pathMaxNodes}
                                onChange={(value) => {
                                  setPathMaxNodes(Number(value ?? 200));
                                  setPathResult(null);
                                  setPathError(null);
                                }}
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Form>

                      <LcaProcessSelectionTable
                        processOptions={processOptions}
                        selectedProcessIds={selectedPathProcessId ? [selectedPathProcessId] : []}
                        selectedProcessOptions={selectedPathProcess ? [selectedPathProcess] : []}
                        totalProcessCount={processTotalCount}
                        pagination={processSelectionPagination}
                        selectionType='radio'
                        titleMessage={{
                          id: 'pages.process.lca.page.path.selectionTitle',
                          defaultMessage: 'Root process selection',
                        }}
                        hintMessage={{
                          id: 'pages.process.lca.page.path.selectionHint',
                          defaultMessage:
                            '{selectedCount} root process selected from {totalCount} available options.',
                        }}
                        emptyMessage={{
                          id: 'pages.process.lca.page.path.selectionEmpty',
                          defaultMessage:
                            'No processes match the current data scope and search keyword.',
                        }}
                        onSelectionChange={(selectedProcessIds) => {
                          setSelectedPathProcessId(selectedProcessIds[0] ?? '');
                          setPathResult(null);
                          setPathError(null);
                        }}
                      />

                      <Space>
                        <Button
                          onClick={() => {
                            setSelectedPathProcessId('');
                            setPathResult(null);
                            setPathError(null);
                          }}
                          disabled={!selectedPathProcess}
                        >
                          <FormattedMessage
                            id='pages.process.lca.analysis.action.clearSelection'
                            defaultMessage='Clear selection'
                          />
                        </Button>
                        <Button
                          type='primary'
                          loading={pathLoading}
                          disabled={!selectedPathImpactId || !selectedPathProcess}
                          onClick={runContributionPathAnalysis}
                        >
                          <FormattedMessage
                            id='pages.process.lca.page.path.action.run'
                            defaultMessage='Run contribution path'
                          />
                        </Button>
                      </Space>
                    </Space>
                  </Card>

                  <Card size='small'>
                    <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                      <Typography.Text strong>
                        <FormattedMessage
                          id='pages.process.lca.analysis.section.results'
                          defaultMessage='Results'
                        />
                      </Typography.Text>
                      {pathError ? <Alert message={pathError} type='error' /> : null}
                      {!pathResult && !pathError ? (
                        <Typography.Paragraph type='secondary'>
                          <FormattedMessage
                            id='pages.process.lca.page.path.empty.results'
                            defaultMessage='Select one process and one impact category, then run contribution path analysis.'
                          />
                        </Typography.Paragraph>
                      ) : null}
                      <Spin spinning={pathLoading}>
                        {pathResult && resolvedPathModel ? (
                          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                            <QueryMetaCard
                              meta={{
                                snapshotId: pathResult.snapshotId,
                                resultId: pathResult.resultId,
                                source: pathResult.source,
                                computedAt: pathResult.computedAt,
                              }}
                            />

                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.summary.totalImpact'
                                      defaultMessage='Total impact'
                                    />
                                  }
                                  value={resolvedPathModel.summary.totalImpact}
                                  formatter={(value) => (
                                    <>
                                      <AlignedNumber value={Number(value)} />{' '}
                                      <Typography.Text type='secondary'>{pathUnit}</Typography.Text>
                                    </>
                                  )}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.summary.coverage'
                                      defaultMessage='Coverage'
                                    />
                                  }
                                  value={formatPercent(resolvedPathModel.summary.coverageRatio)}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.summary.expandedNodes'
                                      defaultMessage='Expanded nodes'
                                    />
                                  }
                                  value={resolvedPathModel.summary.expandedNodeCount}
                                />
                              </Col>
                              <Col xs={24} sm={12} lg={6}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.summary.truncatedNodes'
                                      defaultMessage='Truncated nodes'
                                    />
                                  }
                                  value={resolvedPathModel.summary.truncatedNodeCount}
                                />
                              </Col>
                            </Row>

                            <Card size='small'>
                              <Descriptions bordered size='small' column={1}>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.process'
                                      defaultMessage='Root process'
                                    />
                                  }
                                >
                                  {renderPathProcessTrigger(
                                    resolvedPathModel.root.processId,
                                    resolvedPathModel.root.label,
                                  )}
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.analysis.field.impact'
                                      defaultMessage='Impact category'
                                    />
                                  }
                                >
                                  {pathResult.impactLabel}
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.amount'
                                      defaultMessage='Amount'
                                    />
                                  }
                                >
                                  <AlignedNumber value={pathResult.amount} />
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.maxDepth'
                                      defaultMessage='Max depth'
                                    />
                                  }
                                >
                                  {resolvedPathModel.options.maxDepth}
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.topKChildren'
                                      defaultMessage='Top-k children'
                                    />
                                  }
                                >
                                  {resolvedPathModel.options.topKChildren}
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.cutoffShare'
                                      defaultMessage='Cutoff share'
                                    />
                                  }
                                >
                                  {formatPercent(resolvedPathModel.options.cutoffShare)}
                                </Descriptions.Item>
                                <Descriptions.Item
                                  label={
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.field.maxNodes'
                                      defaultMessage='Max nodes'
                                    />
                                  }
                                >
                                  {resolvedPathModel.options.maxNodes}
                                </Descriptions.Item>
                              </Descriptions>
                            </Card>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.chart.title'
                                  defaultMessage='Top direct contributors'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.lca.page.path.chart.note'
                                    defaultMessage='Bars show direct impact contributions per process, ranked by absolute magnitude. Exact branch and edge details remain in the tables below.'
                                  />
                                </Typography.Paragraph>
                                {pathChartData.length > 0 ? (
                                  <Bar
                                    autoFit={true}
                                    data={pathChartData}
                                    xField='label'
                                    yField='value'
                                    colorField='direction'
                                    legend={false}
                                    height={pathChartHeight}
                                    theme={barChartTheme}
                                    scale={{
                                      color: {
                                        domain: ['negative', 'neutral', 'positive'],
                                        range: [
                                          token.colorError,
                                          token.colorTextSecondary,
                                          token.colorPrimary,
                                        ],
                                      },
                                    }}
                                  />
                                ) : (
                                  <Typography.Text type='secondary'>
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.empty.chart'
                                      defaultMessage='No direct contributors are available for charting.'
                                    />
                                  </Typography.Text>
                                )}
                              </Space>
                            </Card>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.sankey.title'
                                  defaultMessage='Contribution path Sankey'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.lca.page.path.sankey.note'
                                    defaultMessage='The Sankey summarizes the explored path links by absolute direct impact. Revisited processes are split by depth so the chart can keep all traversed links visible. Use the tables below for exact values and link diagnostics.'
                                  />
                                </Typography.Paragraph>
                                {pathSankeyNeedsLayeringNote && pathSankeyData ? (
                                  <Alert
                                    type='info'
                                    showIcon={true}
                                    message={intl.formatMessage(
                                      {
                                        id: 'pages.process.lca.page.path.sankey.info.layered',
                                        defaultMessage:
                                          'Repeated or cycle-related processes are split by depth so Sankey can keep all traversed links visible. The current view includes {repeatCount} repeated node instance(s), {cycleCutCount} cycle-cut link(s), and {selfLoopCount} self-loop link(s).',
                                      },
                                      {
                                        repeatCount: pathSankeyData.repeatedNodeCount,
                                        cycleCutCount: pathSankeyData.cycleCutLinkCount,
                                        selfLoopCount: pathSankeyData.selfLoopLinkCount,
                                      },
                                    )}
                                  />
                                ) : null}
                                {hasPathSankey && pathSankeyData ? (
                                  <Sankey
                                    autoFit={true}
                                    height={pathSankeyHeight}
                                    theme={barChartTheme}
                                    data={pathSankeyData}
                                    scale={{
                                      color: {
                                        domain: ['node', 'negative', 'neutral', 'positive'],
                                        range: [
                                          token.colorPrimary,
                                          token.colorError,
                                          token.colorTextSecondary,
                                          token.colorPrimaryHover,
                                        ],
                                      },
                                    }}
                                    encode={{
                                      source: 'source',
                                      target: 'target',
                                      value: 'value',
                                      nodeKey: 'key',
                                      nodeColor: () => 'node',
                                      linkColor: (datum: SankeyGraphLinkDatum) =>
                                        resolvePathSankeyLinkMeta(datum)?.direction ?? 'neutral',
                                    }}
                                    layout={{
                                      nodeAlign: 'left',
                                      nodePadding: 0.03,
                                      nodeWidth: 0.018,
                                    }}
                                    style={{
                                      labelText: 'label',
                                      labelFill: token.colorText,
                                      labelFontSize: 12,
                                      nodeStroke: token.colorBorderSecondary,
                                      nodeLineWidth: 1,
                                      linkFillOpacity: 0.55,
                                    }}
                                    tooltip={{
                                      nodeTitle: (datum: SankeyGraphNodeDatum) =>
                                        datum.depth !== undefined
                                          ? `${datum.label ?? datum.key ?? '-'} · depth ${
                                              datum.depth
                                            }`
                                          : (datum.label ?? datum.key ?? '-'),
                                      nodeItems: [
                                        {
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.page.path.sankey.tooltip.nodeValue',
                                            defaultMessage: 'Node total',
                                          }),
                                          field: 'value',
                                        },
                                      ],
                                      linkTitle: '',
                                      linkItems: [
                                        (datum: SankeyGraphLinkDatum) => ({
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.page.path.sankey.tooltip.source',
                                            defaultMessage: 'Source',
                                          }),
                                          value:
                                            resolvePathSankeyLinkMeta(datum)?.sourceLabel ??
                                            resolveSankeyNodeKey(datum.source),
                                        }),
                                        (datum: SankeyGraphLinkDatum) => ({
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.page.path.sankey.tooltip.target',
                                            defaultMessage: 'Target',
                                          }),
                                          value:
                                            resolvePathSankeyLinkMeta(datum)?.targetLabel ??
                                            resolveSankeyNodeKey(datum.target),
                                        }),
                                        (datum: SankeyGraphLinkDatum) => ({
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.page.path.table.depth',
                                            defaultMessage: 'Depth',
                                          }),
                                          value: (() => {
                                            const meta = resolvePathSankeyLinkMeta(datum);
                                            return meta
                                              ? `${meta.sourceDepth} -> ${meta.targetDepth}`
                                              : '-';
                                          })(),
                                        }),
                                        (datum: SankeyGraphLinkDatum) => ({
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.page.path.table.directImpact',
                                            defaultMessage: 'Direct impact',
                                          }),
                                          value: `${normalizeNumber(
                                            resolvePathSankeyLinkMeta(datum)?.directImpact,
                                          )} ${pathUnit}`,
                                        }),
                                        (datum: SankeyGraphLinkDatum) => ({
                                          name: intl.formatMessage({
                                            id: 'pages.process.lca.analysis.table.share',
                                            defaultMessage: 'Absolute share',
                                          }),
                                          value: formatPercent(
                                            normalizeNumber(
                                              resolvePathSankeyLinkMeta(datum)?.shareOfTotal,
                                            ),
                                          ),
                                        }),
                                      ],
                                    }}
                                  />
                                ) : (
                                  <Typography.Text type='secondary'>
                                    <FormattedMessage
                                      id='pages.process.lca.page.path.sankey.empty'
                                      defaultMessage='No traversed links are available for Sankey visualization.'
                                    />
                                  </Typography.Text>
                                )}
                              </Space>
                            </Card>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.section.contributors'
                                  defaultMessage='Process contributors'
                                />
                              }
                            >
                              <Table<LcaContributionPathContributorItem>
                                rowKey='processId'
                                size='small'
                                pagination={false}
                                columns={contributionPathContributorColumns}
                                dataSource={resolvedPathModel.contributors}
                              />
                            </Card>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.section.branches'
                                  defaultMessage='Explored branches'
                                />
                              }
                            >
                              <Table<LcaContributionPathBranchItem>
                                rowKey='key'
                                size='small'
                                pagination={{
                                  pageSize: 10,
                                  size: 'small',
                                  showSizeChanger: false,
                                }}
                                columns={contributionPathBranchColumns}
                                dataSource={resolvedPathModel.branches}
                              />
                            </Card>

                            <Card
                              size='small'
                              title={
                                <FormattedMessage
                                  id='pages.process.lca.page.path.section.links'
                                  defaultMessage='Traversal links'
                                />
                              }
                            >
                              <Table<LcaContributionPathLinkItem>
                                rowKey='key'
                                size='small'
                                pagination={{
                                  pageSize: 10,
                                  size: 'small',
                                  showSizeChanger: false,
                                }}
                                columns={contributionPathLinkColumns}
                                dataSource={resolvedPathModel.links}
                              />
                            </Card>
                          </Space>
                        ) : null}
                      </Spin>
                    </Space>
                  </Card>
                </Space>
              ),
            },
          ]}
        />
      </Space>
    </PageContainer>
  );
};

export default LcaAnalysisPage;
