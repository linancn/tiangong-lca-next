import AlignedNumber from '@/components/AlignedNumber';
import {
  buildLcaImpactCompareModel,
  type LcaImpactCompareItem,
} from '@/pages/Processes/Components/lcaImpactCompareToolbar';
import {
  buildSelectedProcessHotspotModel,
  type LcaImpactHotspotItem,
  type LcaImpactHotspotModel,
} from '@/pages/Processes/Components/lcaImpactHotspotToolbar';
import LcaProcessSelectionTable from '@/pages/Processes/Components/lcaProcessSelectionTable';
import LcaProfileSummary, {
  buildLcaProfileModel,
} from '@/pages/Processes/Components/lcaProfileSummary';
import { getLang } from '@/services/general/util';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessTableAll, getProcessTablePgroongaSearch } from '@/services/processes/api';
import { Bar } from '@ant-design/charts';
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
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, history, useIntl } from 'umi';
import {
  LCA_SCOPE,
  buildLcaProcessOptions,
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
const G2_TOOLTIP_SELECTOR = '.g2-tooltip';
const G2_TOOLTIP_TITLE_SELECTOR = '.g2-tooltip-title';
const G2_TOOLTIP_NAME_SELECTOR = '.g2-tooltip-list-item-name-label';
const G2_TOOLTIP_VALUE_SELECTOR = '.g2-tooltip-list-item-value';

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

type HotspotResultState = QueryMeta & {
  impactId: string;
  impactLabel: string;
  unit: string;
  model: LcaImpactHotspotModel;
};

function mapAnalysisDataScopeToProcessDataSource(scope: LcaAnalysisDataScope): string {
  if (scope === 'open_data') {
    return 'tg';
  }
  if (scope === 'all_data') {
    return '';
  }
  return 'my';
}

function truncateChartLabel(value: string, maxLength = DEFAULT_CHART_LABEL_MAX_LENGTH): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
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

const LcaAnalysisPage = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const lang = getLang(intl.locale);
  const barChartTheme = useMemo(() => buildLcaBarChartTheme(token), [token]);

  const [activeTabKey, setActiveTabKey] = useState('profile');
  const [selectedDataScope, setSelectedDataScope] = useState<LcaAnalysisDataScope>('current_user');
  const [processSearchKeyword, setProcessSearchKeyword] = useState('');
  const [processOptions, setProcessOptions] = useState<LcaProcessOption[]>([]);
  const [processOptionsLoading, setProcessOptionsLoading] = useState(false);
  const [processOptionsError, setProcessOptionsError] = useState<string | null>(null);
  const [impactOptions, setImpactOptions] = useState<ImpactOption[]>([]);
  const [impactOptionsLoading, setImpactOptionsLoading] = useState(false);
  const [impactOptionsError, setImpactOptionsError] = useState<string | null>(null);

  const [selectedProfileProcessId, setSelectedProfileProcessId] = useState('');
  const [selectedCompareImpactId, setSelectedCompareImpactId] = useState('');
  const [selectedCompareProcessIds, setSelectedCompareProcessIds] = useState<string[]>([]);
  const [selectedHotspotImpactId, setSelectedHotspotImpactId] = useState('');
  const [selectedHotspotProcessIds, setSelectedHotspotProcessIds] = useState<string[]>([]);

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<ProfileResultState | null>(null);

  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResultState | null>(null);

  const [hotspotLoading, setHotspotLoading] = useState(false);
  const [hotspotError, setHotspotError] = useState<string | null>(null);
  const [hotspotResult, setHotspotResult] = useState<HotspotResultState | null>(null);

  const processOptionMap = useMemo(
    () => new Map(processOptions.map((item) => [item.value, item])),
    [processOptions],
  );
  const selectedCompareProcesses = useMemo(
    () =>
      selectedCompareProcessIds
        .map((processId) => processOptionMap.get(processId))
        .filter((item): item is LcaProcessOption => !!item),
    [processOptionMap, selectedCompareProcessIds],
  );
  const selectedHotspotProcesses = useMemo(
    () =>
      selectedHotspotProcessIds
        .map((processId) => processOptionMap.get(processId))
        .filter((item): item is LcaProcessOption => !!item),
    [processOptionMap, selectedHotspotProcessIds],
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

  useEffect(() => {
    if (impactOptions.length === 0) {
      return;
    }

    setSelectedCompareImpactId((current) =>
      current && impactOptions.some((item) => item.value === current)
        ? current
        : impactOptions[0].value,
    );
    setSelectedHotspotImpactId((current) =>
      current && impactOptions.some((item) => item.value === current)
        ? current
        : impactOptions[0].value,
    );
  }, [impactOptions]);

  useEffect(() => {
    if (processOptions.length === 0) {
      setSelectedProfileProcessId('');
      setSelectedCompareProcessIds([]);
      setSelectedHotspotProcessIds([]);
      return;
    }

    setSelectedProfileProcessId((current) =>
      current && processOptionMap.has(current) ? current : processOptions[0].value,
    );

    setSelectedCompareProcessIds((current) => {
      const filtered = current.filter((item) => processOptionMap.has(item));
      if (filtered.length > 0) {
        return filtered;
      }
      return processOptions
        .slice(0, Math.max(1, Math.min(DEFAULT_COMPARE_SELECTION_LIMIT, processOptions.length)))
        .map((item) => item.value);
    });

    setSelectedHotspotProcessIds((current) => {
      const filtered = current.filter((item) => processOptionMap.has(item));
      if (filtered.length > 0) {
        return filtered;
      }
      return processOptions
        .slice(0, Math.max(1, Math.min(DEFAULT_COMPARE_SELECTION_LIMIT, processOptions.length)))
        .map((item) => item.value);
    });
  }, [processOptionMap, processOptions]);

  const loadProcessOptions = async (
    keyword = '',
    dataScope: LcaAnalysisDataScope = selectedDataScope,
  ) => {
    setProcessOptionsLoading(true);
    setProcessOptionsError(null);

    try {
      const trimmedKeyword = keyword.trim();
      const processDataSource = mapAnalysisDataScopeToProcessDataSource(dataScope);
      const result = trimmedKeyword
        ? await getProcessTablePgroongaSearch(
            {
              current: 1,
              pageSize: DEFAULT_ANALYSIS_PAGE_SIZE,
            },
            lang,
            processDataSource,
            trimmedKeyword,
            {},
            'all',
            'all',
          )
        : await getProcessTableAll(
            {
              current: 1,
              pageSize: DEFAULT_ANALYSIS_PAGE_SIZE,
            },
            {},
            lang,
            processDataSource,
            '',
            'all',
            'all',
          );

      const rows = Array.isArray(result?.data) ? result.data : [];
      setProcessOptions(buildLcaProcessOptions(rows));
      if (rows.length === 0) {
        setProcessOptionsError(
          intl.formatMessage({
            id: 'pages.process.lca.page.processes.empty',
            defaultMessage: 'No processes are available for the selected data scope.',
          }),
        );
      }
    } catch (_error) {
      setProcessOptions([]);
      setProcessOptionsError(
        intl.formatMessage({
          id: 'pages.process.lca.page.processes.loadFailed',
          defaultMessage: 'Failed to load processes for analysis.',
        }),
      );
    } finally {
      setProcessOptionsLoading(false);
    }
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
    setProfileResult(null);
    setCompareResult(null);
    setHotspotResult(null);
    setProfileError(null);
    setCompareError(null);
    setHotspotError(null);
    void loadProcessOptions(processSearchKeyword, selectedDataScope);
  }, [lang, selectedDataScope]);

  useEffect(() => {
    void loadAnalysisOptions();
  }, [lang]);

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
        process_id: selectedProcess.value,
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
    if (!selectedCompareImpactId) {
      setCompareError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.validation.impactRequired',
          defaultMessage: 'Please select an impact category.',
        }),
      );
      return;
    }

    if (selectedCompareProcesses.length === 0) {
      setCompareError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.validation.processRequired',
          defaultMessage: 'Please select at least one process.',
        }),
      );
      return;
    }

    if (selectedCompareProcesses.length === 0) {
      setCompareError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.validation.processRequired',
          defaultMessage: 'Please select at least one process.',
        }),
      );
      return;
    }

    setCompareLoading(true);
    setCompareError(null);

    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        mode: 'processes_one_impact',
        process_ids: selectedCompareProcesses.map((item) => item.value),
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

  const runHotspotAnalysis = async () => {
    if (!selectedHotspotImpactId) {
      setHotspotError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.validation.impactRequired',
          defaultMessage: 'Please select an impact category.',
        }),
      );
      return;
    }

    if (selectedHotspotProcesses.length === 0) {
      setHotspotError(
        intl.formatMessage({
          id: 'pages.process.lca.analysis.validation.processRequired',
          defaultMessage: 'Please select at least one process.',
        }),
      );
      return;
    }

    setHotspotLoading(true);
    setHotspotError(null);

    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        data_scope: selectedDataScope,
        mode: 'processes_one_impact',
        process_ids: selectedHotspotProcesses.map((item) => item.value),
        impact_id: selectedHotspotImpactId,
        allow_fallback: false,
      });

      const values = (queried.data as { values?: Record<string, unknown> })?.values;
      const valuesByProcessId =
        values && typeof values === 'object' && !Array.isArray(values)
          ? (values as Record<string, unknown>)
          : {};
      const selectedImpact = impactOptions.find((item) => item.value === selectedHotspotImpactId);

      setHotspotResult({
        impactId: selectedHotspotImpactId,
        impactLabel: selectedImpact?.label || selectedHotspotImpactId,
        unit: selectedImpact?.unit || '-',
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
        model: buildSelectedProcessHotspotModel(selectedHotspotProcesses, valuesByProcessId),
      });
    } catch (error: unknown) {
      setHotspotResult(null);
      setHotspotError(
        resolveQueuedSnapshotMessage(
          error,
          intl,
          intl.formatMessage({
            id: 'pages.process.lca.hotspots.message.runFailed',
            defaultMessage: 'Failed to run hotspot analysis.',
          }),
        ),
      );
    } finally {
      setHotspotLoading(false);
    }
  };

  const profileModel = useMemo(
    () => (profileResult ? buildLcaProfileModel(profileResult.rows, lang) : null),
    [lang, profileResult],
  );

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

  const hotspotChartData = useMemo(
    () =>
      (hotspotResult?.model.items ?? []).map((item) => ({
        key: item.processId,
        label: truncateChartLabel(`#${item.rank} ${item.processName}`),
        fullLabel: `#${item.rank} ${item.processName}`,
        value: item.value,
        direction: item.direction,
      })),
    [hotspotResult],
  );

  const profileChartHeight = Math.max(280, profileChartData.length * 44 + 80);
  const compareChartHeight = Math.max(280, compareChartData.length * 44 + 80);
  const hotspotChartHeight = Math.max(280, hotspotChartData.length * 44 + 80);

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
          <Typography.Text type='secondary'>{compareResult?.unit ?? '-'}</Typography.Text>
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

  const hotspotColumns: ColumnsType<LcaImpactHotspotItem> = [
    {
      title: (
        <FormattedMessage id='pages.process.lca.page.hotspots.table.rank' defaultMessage='Rank' />
      ),
      dataIndex: 'rank',
      key: 'rank',
    },
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
          <Typography.Text type='secondary'>{hotspotResult?.unit ?? '-'}</Typography.Text>
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
          void loadProcessOptions(processSearchKeyword, selectedDataScope);
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
                defaultMessage='Use the existing LCA query API to inspect one process profile, compare selected processes, or rank hotspots within a selected process set. Charts summarize the result; tables remain the exact source of truth.'
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
                        const nextKeyword = String(value ?? '');
                        setProcessSearchKeyword(nextKeyword);
                        setProfileResult(null);
                        setCompareResult(null);
                        setHotspotResult(null);
                        void loadProcessOptions(nextKeyword, selectedDataScope);
                      }}
                    />
                  </Form.Item>
                </Form>
              </Col>
            </Row>
            <Typography.Text type='secondary'>
              <FormattedMessage
                id='pages.process.lca.page.processes.count'
                defaultMessage='{count} process options are currently available for analysis.'
                values={{
                  count: processOptions.length,
                }}
              />
            </Typography.Text>
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
                          options={processOptions}
                          disabled={processOptionsLoading || processOptions.length === 0}
                          optionFilterProp='label'
                          onChange={(value) => {
                            setSelectedProfileProcessId(String(value ?? ''));
                            setProfileResult(null);
                            setProfileError(null);
                          }}
                        />
                      </Form.Item>
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
                              setSelectedCompareImpactId(String(value ?? ''));
                              setCompareResult(null);
                              setCompareError(null);
                            }}
                          />
                        </Form.Item>
                      </Form>

                      <LcaProcessSelectionTable
                        processOptions={processOptions}
                        selectedProcessIds={selectedCompareProcessIds}
                        titleMessage={{
                          id: 'pages.process.lca.page.compare.selectionTitle',
                          defaultMessage: 'Process selection',
                        }}
                        hintMessage={{
                          id: 'pages.process.lca.page.compare.selectionHint',
                          defaultMessage:
                            '{selectedCount} processes selected from {totalCount} loaded options.',
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
                                  value={compareResult.model.topItem?.processName ?? '-'}
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
                                      <AlignedNumber value={Number(value ?? 0)} />{' '}
                                      <Typography.Text type='secondary'>
                                        {compareResult.unit}
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
              key: 'hotspots',
              label: (
                <FormattedMessage
                  id='pages.process.lca.page.tab.hotspots'
                  defaultMessage='Impact hotspots'
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
                            value={selectedHotspotImpactId || undefined}
                            options={impactOptions.map((item) => ({
                              value: item.value,
                              label: `${item.label} (${item.unit})`,
                            }))}
                            disabled={impactOptionsLoading || impactOptions.length === 0}
                            optionFilterProp='label'
                            onChange={(value) => {
                              setSelectedHotspotImpactId(String(value ?? ''));
                              setHotspotResult(null);
                              setHotspotError(null);
                            }}
                          />
                        </Form.Item>
                      </Form>

                      <LcaProcessSelectionTable
                        processOptions={processOptions}
                        selectedProcessIds={selectedHotspotProcessIds}
                        titleMessage={{
                          id: 'pages.process.lca.page.hotspots.selectionTitle',
                          defaultMessage: 'Process selection',
                        }}
                        hintMessage={{
                          id: 'pages.process.lca.page.hotspots.selectionHint',
                          defaultMessage:
                            '{selectedCount} processes selected from {totalCount} loaded options.',
                        }}
                        emptyMessage={{
                          id: 'pages.process.lca.page.hotspots.selectionEmpty',
                          defaultMessage:
                            'No processes match the current data scope and search keyword.',
                        }}
                        onSelectionChange={(selectedProcessIds) => {
                          setSelectedHotspotProcessIds(selectedProcessIds);
                          setHotspotResult(null);
                          setHotspotError(null);
                        }}
                      />

                      <Space>
                        <Button
                          onClick={() => {
                            setSelectedHotspotProcessIds([]);
                            setHotspotResult(null);
                            setHotspotError(null);
                          }}
                          disabled={selectedHotspotProcesses.length === 0}
                        >
                          <FormattedMessage
                            id='pages.process.lca.analysis.action.clearSelection'
                            defaultMessage='Clear selection'
                          />
                        </Button>
                        <Button
                          type='primary'
                          loading={hotspotLoading}
                          disabled={
                            !selectedHotspotImpactId || selectedHotspotProcesses.length === 0
                          }
                          onClick={runHotspotAnalysis}
                        >
                          <FormattedMessage
                            id='pages.process.lca.page.hotspots.action.run'
                            defaultMessage='Run hotspot analysis'
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
                      {hotspotError ? <Alert message={hotspotError} type='error' /> : null}
                      {!hotspotResult && !hotspotError ? (
                        <Typography.Paragraph type='secondary'>
                          <FormattedMessage
                            id='pages.process.lca.page.hotspots.empty.results'
                            defaultMessage='Select one impact category and at least one process, then run the hotspot analysis.'
                          />
                        </Typography.Paragraph>
                      ) : null}
                      <Spin spinning={hotspotLoading}>
                        {hotspotResult ? (
                          <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                            <QueryMetaCard
                              meta={{
                                snapshotId: hotspotResult.snapshotId,
                                resultId: hotspotResult.resultId,
                                source: hotspotResult.source,
                                computedAt: hotspotResult.computedAt,
                              }}
                            />

                            <Row gutter={[16, 16]}>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.hotspots.summary.rankWindow'
                                      defaultMessage='Displayed ranks'
                                    />
                                  }
                                  value={`#1 - #${hotspotResult.model.items.length}`}
                                />
                              </Col>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.hotspots.summary.coverage'
                                      defaultMessage='Displayed coverage'
                                    />
                                  }
                                  value={formatPercent(hotspotResult.model.coverageShare)}
                                />
                              </Col>
                              <Col xs={24} sm={8}>
                                <Statistic
                                  title={
                                    <FormattedMessage
                                      id='pages.process.lca.page.hotspots.summary.totalAbsolute'
                                      defaultMessage='Selected-set absolute total'
                                    />
                                  }
                                  value={hotspotResult.model.totalAbsoluteValue}
                                  formatter={(value) => (
                                    <>
                                      <AlignedNumber value={Number(value ?? 0)} />{' '}
                                      <Typography.Text type='secondary'>
                                        {hotspotResult.unit}
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
                                  id='pages.process.lca.page.hotspots.chart.title'
                                  defaultMessage='Hotspot ranking chart'
                                />
                              }
                            >
                              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                                <Typography.Paragraph type='secondary'>
                                  <FormattedMessage
                                    id='pages.process.lca.page.hotspots.shareNote'
                                    defaultMessage='Shares are calculated from the selected processes only, so the ranking reflects the chosen comparison set.'
                                  />
                                </Typography.Paragraph>
                                <Bar
                                  autoFit={true}
                                  data={hotspotChartData}
                                  xField='label'
                                  yField='value'
                                  colorField='direction'
                                  legend={false}
                                  height={hotspotChartHeight}
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

                            <Table<LcaImpactHotspotItem>
                              rowKey='processId'
                              size='small'
                              pagination={false}
                              columns={hotspotColumns}
                              dataSource={hotspotResult.model.items}
                            />
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
