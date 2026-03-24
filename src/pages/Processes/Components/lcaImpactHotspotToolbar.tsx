import AlignedNumber from '@/components/AlignedNumber';
import ToolBarButton from '@/components/ToolBarButton';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import { getProcessesByIdAndVersion } from '@/services/processes/api';
import { OrderedListOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import {
  formatPercent,
  formatSourceLabel,
  getDefaultLcaDataScopeForPath,
  ImpactOption,
  LCA_SCOPE,
  LcaProcessOption,
  loadImpactOptions,
  normalizeNumber,
  toProgressPercent,
  toProgressStatus,
  VALUE_EPSILON,
} from './lcaAnalysisShared';

const DEFAULT_HOTSPOT_LIMIT = 20;
const HOTSPOT_LIMIT_OPTIONS = [10, 20, 50, 100];

type RankedProcessValue = {
  process_id: string;
  process_version: string;
  process_index: number;
  value: number;
  absolute_value: number;
};

type RankedProcessesQueryData = {
  kind?: string;
  impact_id?: string;
  impact_index?: unknown;
  sort_by?: unknown;
  sort_direction?: unknown;
  offset?: unknown;
  limit?: unknown;
  returned_count?: unknown;
  total_process_count?: unknown;
  total_absolute_value?: unknown;
  values?: unknown;
};

export type LcaImpactHotspotItem = {
  processId: string;
  processName: string;
  version: string;
  processIndex: number;
  value: number;
  absoluteValue: number;
  normalizedValue: number;
  share: number;
  cumulativeShare: number;
  rank: number;
  globalRank: number;
  direction: 'positive' | 'negative' | 'neutral';
};

export type LcaImpactHotspotModel = {
  items: LcaImpactHotspotItem[];
  offset: number;
  limit: number;
  totalProcessCount: number;
  totalAbsoluteValue: number;
  displayedAbsoluteValue: number;
  coverageShare: number;
  topItem?: LcaImpactHotspotItem;
  topPositiveItem?: LcaImpactHotspotItem;
  topNegativeItem?: LcaImpactHotspotItem;
};

type HotspotResultState = {
  impactId: string;
  impactLabel: string;
  unit: string;
  snapshotId: string;
  resultId: string;
  source: string;
  computedAt: string;
  model: LcaImpactHotspotModel;
};

function processLookupKey(processId: string, version: string): string {
  return `${processId}:${version}`;
}

function toDirection(value: number): LcaImpactHotspotItem['direction'] {
  if (value > VALUE_EPSILON) {
    return 'positive';
  }
  if (value < -VALUE_EPSILON) {
    return 'negative';
  }
  return 'neutral';
}

async function buildProcessNameLookup(
  values: RankedProcessValue[],
  lang: string,
): Promise<Map<string, string>> {
  const uniqueParams = Array.from(
    new Map(
      values.map((item) => [
        processLookupKey(item.process_id, item.process_version),
        {
          id: item.process_id,
          version: item.process_version,
        },
      ]),
    ).values(),
  );

  if (uniqueParams.length === 0) {
    return new Map<string, string>();
  }

  const result = await getProcessesByIdAndVersion(uniqueParams, lang);
  const rows = Array.isArray(result?.data) ? result.data : [];
  const lookup = new Map<string, string>();

  rows.forEach((row: Record<string, unknown>) => {
    const processId = String(row?.id ?? '').trim();
    const version = String(row?.version ?? '').trim();
    if (!processId || !version) {
      return;
    }
    const name = String(row?.name ?? '').trim() || processId;
    lookup.set(processLookupKey(processId, version), name);
  });

  return lookup;
}

export function buildLcaImpactHotspotModel(
  values: RankedProcessValue[],
  processNameLookup: Map<string, string>,
  options: {
    offset: number;
    limit: number;
    totalProcessCount: number;
    totalAbsoluteValue: number;
  },
): LcaImpactHotspotModel {
  const maxAbsoluteValue = values.reduce(
    (currentMax, item) => Math.max(currentMax, normalizeNumber(item.absolute_value)),
    0,
  );
  const fallbackTotalAbsoluteValue = values.reduce(
    (sum, item) => sum + normalizeNumber(item.absolute_value),
    0,
  );
  const totalAbsoluteValue =
    options.totalAbsoluteValue > VALUE_EPSILON
      ? options.totalAbsoluteValue
      : fallbackTotalAbsoluteValue;
  const displayedAbsoluteValue = values.reduce(
    (sum, item) => sum + normalizeNumber(item.absolute_value),
    0,
  );
  let cumulativeAbsoluteValue = 0;

  const items = values.map((item, index) => {
    const absoluteValue = normalizeNumber(item.absolute_value);
    cumulativeAbsoluteValue += absoluteValue;

    return {
      processId: item.process_id,
      processName:
        processNameLookup.get(processLookupKey(item.process_id, item.process_version)) ??
        item.process_id,
      version: item.process_version || '-',
      processIndex: Number.isInteger(item.process_index) ? item.process_index : -1,
      value: normalizeNumber(item.value),
      absoluteValue,
      normalizedValue: maxAbsoluteValue > VALUE_EPSILON ? absoluteValue / maxAbsoluteValue : 0,
      share: totalAbsoluteValue > VALUE_EPSILON ? absoluteValue / totalAbsoluteValue : 0,
      cumulativeShare:
        totalAbsoluteValue > VALUE_EPSILON ? cumulativeAbsoluteValue / totalAbsoluteValue : 0,
      rank: index + 1,
      globalRank: options.offset + index + 1,
      direction: toDirection(normalizeNumber(item.value)),
    } satisfies LcaImpactHotspotItem;
  });

  return {
    items,
    offset: options.offset,
    limit: options.limit,
    totalProcessCount: options.totalProcessCount,
    totalAbsoluteValue,
    displayedAbsoluteValue,
    coverageShare:
      totalAbsoluteValue > VALUE_EPSILON ? displayedAbsoluteValue / totalAbsoluteValue : 0,
    topItem: items[0],
    topPositiveItem: items.find((item) => item.direction === 'positive'),
    topNegativeItem: items.find((item) => item.direction === 'negative'),
  };
}

export function buildSelectedProcessHotspotModel(
  processes: LcaProcessOption[],
  valuesByProcessId: Record<string, unknown>,
  options?: {
    limit?: number;
  },
): LcaImpactHotspotModel {
  const baseItems = processes
    .map((process) => {
      const value = normalizeNumber(valuesByProcessId[process.value]);
      const absoluteValue = Math.abs(value);

      return {
        processId: process.value,
        processName: process.name,
        version: process.version,
        processIndex: -1,
        value,
        absoluteValue,
        normalizedValue: 0,
        share: 0,
        cumulativeShare: 0,
        rank: 0,
        globalRank: 0,
        direction: toDirection(value),
      } satisfies LcaImpactHotspotItem;
    })
    .sort((left, right) => {
      if (right.absoluteValue !== left.absoluteValue) {
        return right.absoluteValue - left.absoluteValue;
      }
      return left.processName.localeCompare(right.processName);
    });

  const totalAbsoluteValue = baseItems.reduce((sum, item) => sum + item.absoluteValue, 0);
  const maxAbsoluteValue = baseItems[0]?.absoluteValue ?? 0;
  const limit =
    typeof options?.limit === 'number' && options.limit > 0
      ? Math.min(options.limit, baseItems.length)
      : baseItems.length;
  let cumulativeAbsoluteValue = 0;

  const items = baseItems.slice(0, limit).map((item, index) => {
    cumulativeAbsoluteValue += item.absoluteValue;
    const share = totalAbsoluteValue > VALUE_EPSILON ? item.absoluteValue / totalAbsoluteValue : 0;
    const cumulativeShare =
      totalAbsoluteValue > VALUE_EPSILON ? cumulativeAbsoluteValue / totalAbsoluteValue : 0;

    return {
      ...item,
      normalizedValue: maxAbsoluteValue > VALUE_EPSILON ? item.absoluteValue / maxAbsoluteValue : 0,
      share,
      cumulativeShare,
      rank: index + 1,
      globalRank: index + 1,
    };
  });

  const displayedAbsoluteValue = items.reduce((sum, item) => sum + item.absoluteValue, 0);

  return {
    items,
    offset: 0,
    limit,
    totalProcessCount: baseItems.length,
    totalAbsoluteValue,
    displayedAbsoluteValue,
    coverageShare:
      totalAbsoluteValue > VALUE_EPSILON ? displayedAbsoluteValue / totalAbsoluteValue : 0,
    topItem: items[0],
    topPositiveItem: items.find((item) => item.direction === 'positive'),
    topNegativeItem: items.find((item) => item.direction === 'negative'),
  };
}

const LcaImpactHotspotToolbar: FC<{
  lang: string;
}> = ({ lang }) => {
  const intl = useIntl();
  const location = useLocation();
  const defaultLcaDataScope = getDefaultLcaDataScopeForPath(location.pathname);
  const topNOptions = useMemo(
    () =>
      HOTSPOT_LIMIT_OPTIONS.map((value) => ({
        value,
        label: intl.formatMessage(
          {
            id: 'pages.process.lca.hotspots.option.topN',
            defaultMessage: 'Top {count}',
          },
          { count: value },
        ),
      })),
    [intl],
  );

  const [open, setOpen] = useState(false);
  const [impactOptions, setImpactOptions] = useState<ImpactOption[]>([]);
  const [impactOptionsLoading, setImpactOptionsLoading] = useState(false);
  const [impactOptionsError, setImpactOptionsError] = useState<string | null>(null);
  const [selectedImpactId, setSelectedImpactId] = useState('');
  const [selectedTopN, setSelectedTopN] = useState(DEFAULT_HOTSPOT_LIMIT);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<HotspotResultState | null>(null);
  const analysisUnit = analysisResult?.unit ?? '-';

  const loadImpactOptionList = async () => {
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

  const runAnalysis = async (requestedOffset: number) => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        ...(defaultLcaDataScope ? { data_scope: defaultLcaDataScope } : {}),
        mode: 'processes_one_impact',
        impact_id: selectedImpactId,
        top_n: selectedTopN,
        offset: requestedOffset,
        sort_by: 'absolute_value',
        sort_direction: 'desc',
        allow_fallback: false,
      });

      const data = queried.data as RankedProcessesQueryData;
      if (data?.kind !== 'ranked_processes') {
        throw new Error(
          intl.formatMessage({
            id: 'pages.process.lca.hotspots.message.invalidPayload',
            defaultMessage: 'Unexpected hotspot payload returned from the query API.',
          }),
        );
      }

      const rankedValues = Array.isArray(data.values)
        ? (data.values as RankedProcessValue[]).map((item) => ({
            process_id: String(item?.process_id ?? '').trim(),
            process_version: String(item?.process_version ?? '').trim(),
            process_index: Number(item?.process_index ?? -1),
            value: normalizeNumber(item?.value),
            absolute_value: normalizeNumber(item?.absolute_value),
          }))
        : [];

      let processNameLookup = new Map<string, string>();
      try {
        processNameLookup = await buildProcessNameLookup(rankedValues, lang);
      } catch (_error) {
        processNameLookup = new Map<string, string>();
      }
      const selectedImpact = impactOptions.find((item) => item.value === selectedImpactId)!;
      const offsetValue = Number(data.offset ?? requestedOffset);
      const limitValue = Number(data.limit ?? selectedTopN);
      const totalProcessCount = Number(data.total_process_count ?? rankedValues.length);
      const totalAbsoluteValue = normalizeNumber(data.total_absolute_value);

      setAnalysisResult({
        impactId: selectedImpactId,
        impactLabel: selectedImpact.label,
        unit: selectedImpact.unit,
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
        model: buildLcaImpactHotspotModel(rankedValues, processNameLookup, {
          offset: Number.isFinite(offsetValue) ? offsetValue : 0,
          limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : selectedTopN,
          totalProcessCount:
            Number.isFinite(totalProcessCount) && totalProcessCount >= 0
              ? totalProcessCount
              : rankedValues.length,
          totalAbsoluteValue,
        }),
      });
    } catch (error: unknown) {
      setAnalysisResult(null);
      if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
        const buildJobId =
          typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
        setAnalysisError(
          intl.formatMessage(
            {
              id: 'pages.process.lca.analysis.error.snapshotBuilding',
              defaultMessage:
                'Snapshot build is still running{jobSuffix}. Wait for it to finish, then rerun the analysis.',
            },
            {
              jobSuffix: buildJobId ? ` (job ${buildJobId})` : '',
            },
          ),
        );
      } else if (isLcaFunctionInvokeError(error) && error.code === 'process_ids_required') {
        setAnalysisError(
          intl.formatMessage({
            id: 'pages.process.lca.hotspots.error.backendNotReady',
            defaultMessage:
              'The current lca_query_results backend is still on the old compare-only version. Deploy or restart the updated edge function before using hotspot ranking.',
          }),
        );
      } else {
        setAnalysisError(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: 'pages.process.lca.hotspots.message.runFailed',
                defaultMessage: 'Failed to run hotspot analysis.',
              }),
        );
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const onOpen = () => {
    setOpen(true);
    setSelectedImpactId('');
    setSelectedTopN(DEFAULT_HOTSPOT_LIMIT);
    setAnalysisResult(null);
    setAnalysisError(null);
    void loadImpactOptionList();
  };

  const onClose = () => {
    if (analysisLoading) {
      return;
    }
    setOpen(false);
  };

  const hasPreviousSlice = (analysisResult?.model.offset ?? 0) > 0;
  const hasNextSlice = analysisResult
    ? analysisResult.model.offset + analysisResult.model.items.length <
      analysisResult.model.totalProcessCount
    : false;
  const displayedStart =
    analysisResult && analysisResult.model.items.length > 0 ? analysisResult.model.offset + 1 : 0;
  const displayedEnd = analysisResult
    ? analysisResult.model.offset + analysisResult.model.items.length
    : 0;

  const hotspotColumns: ColumnsType<LcaImpactHotspotItem> = [
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.hotspots.table.globalRank'
          defaultMessage='Global rank'
        />
      ),
      dataIndex: 'globalRank',
      key: 'globalRank',
      width: 100,
    },
    {
      title: <FormattedMessage id='pages.table.title.name' defaultMessage='Name' />,
      dataIndex: 'processName',
      key: 'processName',
    },
    {
      title: <FormattedMessage id='pages.table.title.version' defaultMessage='Version' />,
      dataIndex: 'version',
      key: 'version',
      width: 140,
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.hotspots.table.processIndex'
          defaultMessage='Process index'
        />
      ),
      dataIndex: 'processIndex',
      key: 'processIndex',
      width: 120,
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
          <Typography.Text type='secondary'>{analysisUnit}</Typography.Text>
        </>
      ),
    },
    {
      title: (
        <FormattedMessage
          id='pages.process.lca.analysis.table.relativeMagnitude'
          defaultMessage='Relative magnitude'
        />
      ),
      key: 'normalizedValue',
      render: (_, item) => (
        <Progress
          percent={toProgressPercent(item.normalizedValue)}
          showInfo={false}
          status={toProgressStatus(item.direction)}
        />
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

  return (
    <>
      <ToolBarButton
        icon={<OrderedListOutlined />}
        tooltip={intl.formatMessage({
          id: 'pages.process.lca.hotspots.toolbar.tooltip',
          defaultMessage: 'Impact hotspots',
        })}
        onClick={onOpen}
      />
      <Drawer
        width={760}
        open={open}
        onClose={onClose}
        title={intl.formatMessage({
          id: 'pages.process.lca.hotspots.drawer.title',
          defaultMessage: 'LCA Impact Hotspots',
        })}
        footer={
          <Space>
            <Button onClick={onClose} disabled={analysisLoading}>
              <FormattedMessage id='pages.process.lca.modal.cancel' defaultMessage='Close' />
            </Button>
            <Button
              type='primary'
              onClick={() => void runAnalysis(0)}
              loading={analysisLoading}
              disabled={impactOptionsLoading || !selectedImpactId}
            >
              <FormattedMessage
                id='pages.process.lca.hotspots.action.run'
                defaultMessage='Run hotspot ranking'
              />
            </Button>
          </Space>
        }
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          <Card size='small'>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <Typography.Text strong>
                <FormattedMessage
                  id='pages.process.lca.analysis.section.controls'
                  defaultMessage='Controls'
                />
              </Typography.Text>
              <Typography.Paragraph>
                <FormattedMessage
                  id='pages.process.lca.hotspots.description'
                  defaultMessage='Rank the full ready snapshot by absolute impact contribution for one impact category.'
                />
              </Typography.Paragraph>

              <Typography.Text strong>
                <FormattedMessage
                  id='pages.process.lca.analysis.field.impact'
                  defaultMessage='Impact category'
                />
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                aria-label={intl.formatMessage({
                  id: 'pages.process.lca.analysis.field.impact',
                  defaultMessage: 'Impact category',
                })}
                placeholder={intl.formatMessage({
                  id: 'pages.process.lca.analysis.placeholder.impact',
                  defaultMessage: 'Select one impact category',
                })}
                disabled={impactOptionsLoading}
                value={selectedImpactId || undefined}
                options={impactOptions.map((item) => ({
                  value: item.value,
                  label: `${item.label} (${item.unit})`,
                }))}
                onChange={(value) => {
                  setSelectedImpactId(String(value));
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
              />

              <Typography.Text strong>
                <FormattedMessage
                  id='pages.process.lca.hotspots.field.topN'
                  defaultMessage='Rank window'
                />
              </Typography.Text>
              <Select
                style={{ width: '100%' }}
                aria-label={intl.formatMessage({
                  id: 'pages.process.lca.hotspots.field.topN',
                  defaultMessage: 'Rank window',
                })}
                value={selectedTopN}
                options={topNOptions}
                onChange={(value) => {
                  setSelectedTopN(Number(value));
                  setAnalysisResult(null);
                  setAnalysisError(null);
                }}
              />

              {impactOptionsError ? <Alert message={impactOptionsError} type='error' /> : null}
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
              {analysisError ? <Alert message={analysisError} type='error' /> : null}
              {!analysisResult && !analysisError ? (
                <Typography.Paragraph type='secondary'>
                  <FormattedMessage
                    id='pages.process.lca.hotspots.empty.results'
                    defaultMessage='Select one impact category, then run the hotspot ranking.'
                  />
                </Typography.Paragraph>
              ) : null}
              <Spin spinning={analysisLoading}>
                {analysisResult ? (
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    <Descriptions bordered size='small' column={1}>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.analysis.field.impact'
                            defaultMessage='Impact category'
                          />
                        }
                      >
                        {analysisResult.impactLabel}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.view.lciaresults.unit'
                            defaultMessage='Unit'
                          />
                        }
                      >
                        {analysisResult.unit}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.taskCenter.detail.snapshotId'
                            defaultMessage='snapshot_id'
                          />
                        }
                      >
                        {analysisResult.snapshotId}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.taskCenter.detail.resultId'
                            defaultMessage='result_id'
                          />
                        }
                      >
                        {analysisResult.resultId}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.analysis.meta.source'
                            defaultMessage='source'
                          />
                        }
                      >
                        {formatSourceLabel(analysisResult.source)}
                      </Descriptions.Item>
                      <Descriptions.Item
                        label={
                          <FormattedMessage
                            id='pages.process.lca.analysis.meta.computedAt'
                            defaultMessage='computed_at'
                          />
                        }
                      >
                        {analysisResult.computedAt}
                      </Descriptions.Item>
                    </Descriptions>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.hotspots.summary.rankWindow'
                              defaultMessage='Displayed ranks'
                            />
                          }
                          value={displayedStart > 0 ? `#${displayedStart} - #${displayedEnd}` : '-'}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.hotspots.summary.coverage'
                              defaultMessage='Displayed coverage'
                            />
                          }
                          value={formatPercent(analysisResult.model.coverageShare)}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.analysis.summary.topContributor'
                              defaultMessage='Top contributor'
                            />
                          }
                          value={analysisResult.model.topItem?.processName ?? '-'}
                        />
                      </Col>
                      <Col xs={24} md={12}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.hotspots.summary.totalAbsolute'
                              defaultMessage='Snapshot absolute total'
                            />
                          }
                          value={analysisResult.model.totalAbsoluteValue}
                          formatter={(value) => (
                            <>
                              <AlignedNumber value={normalizeNumber(value)} />{' '}
                              <Typography.Text type='secondary'>
                                {analysisResult.unit}
                              </Typography.Text>
                            </>
                          )}
                        />
                      </Col>
                    </Row>

                    <Typography.Paragraph type='secondary'>
                      <FormattedMessage
                        id='pages.process.lca.hotspots.shareNote'
                        defaultMessage='Shares use the full snapshot absolute total, so each slice shows its true contribution to the whole result.'
                      />
                    </Typography.Paragraph>

                    <Space>
                      <Button
                        onClick={() =>
                          void runAnalysis(
                            Math.max(0, analysisResult.model.offset - analysisResult.model.limit),
                          )
                        }
                        disabled={!hasPreviousSlice || analysisLoading}
                      >
                        <FormattedMessage
                          id='pages.process.lca.hotspots.action.previous'
                          defaultMessage='Previous slice'
                        />
                      </Button>
                      <Button
                        onClick={() =>
                          void runAnalysis(analysisResult.model.offset + analysisResult.model.limit)
                        }
                        disabled={!hasNextSlice || analysisLoading}
                      >
                        <FormattedMessage
                          id='pages.process.lca.hotspots.action.next'
                          defaultMessage='Next slice'
                        />
                      </Button>
                    </Space>

                    <Table<LcaImpactHotspotItem>
                      rowKey={(item) => `${item.processId}:${item.version}`}
                      size='small'
                      pagination={false}
                      columns={hotspotColumns}
                      dataSource={analysisResult.model.items}
                    />
                  </Space>
                ) : null}
              </Spin>
            </Space>
          </Card>
        </Space>
      </Drawer>
    </>
  );
};

export default LcaImpactHotspotToolbar;
