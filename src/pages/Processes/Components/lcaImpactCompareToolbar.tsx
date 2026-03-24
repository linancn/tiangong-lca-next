import AlignedNumber from '@/components/AlignedNumber';
import ToolBarButton from '@/components/ToolBarButton';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import type { ProcessTable } from '@/services/processes/data';
import { BarChartOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import {
  buildLcaProcessOptions,
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

const DEFAULT_SELECTION_LIMIT = 5;
type ProcessOption = LcaProcessOption;

export type LcaImpactCompareItem = {
  processId: string;
  processName: string;
  version: string;
  value: number;
  absoluteValue: number;
  normalizedValue: number;
  share: number;
  cumulativeShare: number;
  rank: number;
  direction: 'positive' | 'negative' | 'neutral';
};

export type LcaImpactCompareModel = {
  items: LcaImpactCompareItem[];
  topItem?: LcaImpactCompareItem;
  topPositiveItem?: LcaImpactCompareItem;
  topNegativeItem?: LcaImpactCompareItem;
  totalAbsoluteValue: number;
};

type QueryDataValues = {
  values?: Record<string, unknown>;
};

type CompareResultState = {
  impactId: string;
  impactLabel: string;
  unit: string;
  snapshotId: string;
  resultId: string;
  source: string;
  computedAt: string;
  model: LcaImpactCompareModel;
};

function toDirection(value: number): LcaImpactCompareItem['direction'] {
  if (value > VALUE_EPSILON) {
    return 'positive';
  }
  if (value < -VALUE_EPSILON) {
    return 'negative';
  }
  return 'neutral';
}

export function buildLcaImpactCompareModel(
  processes: ProcessOption[],
  valuesByProcessId: Record<string, unknown>,
): LcaImpactCompareModel {
  const baseItems = processes
    .map((process) => {
      const value = normalizeNumber(valuesByProcessId[process.value]);
      const absoluteValue = Math.abs(value);

      return {
        processId: process.value,
        processName: process.name,
        version: process.version,
        value,
        absoluteValue,
        normalizedValue: 0,
        share: 0,
        cumulativeShare: 0,
        rank: 0,
        direction: toDirection(value),
      } satisfies LcaImpactCompareItem;
    })
    .sort((left, right) => {
      if (right.absoluteValue !== left.absoluteValue) {
        return right.absoluteValue - left.absoluteValue;
      }
      return left.processName.localeCompare(right.processName);
    });

  const totalAbsoluteValue = baseItems.reduce((sum, item) => sum + item.absoluteValue, 0);
  const maxAbsoluteValue = baseItems[0]?.absoluteValue ?? 0;
  let cumulativeAbsoluteValue = 0;

  const items = baseItems.map((item, index) => {
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
    };
  });

  return {
    items,
    topItem: items[0],
    topPositiveItem: items.find((item) => item.direction === 'positive'),
    topNegativeItem: items.find((item) => item.direction === 'negative'),
    totalAbsoluteValue,
  };
}

const LcaImpactCompareToolbar: FC<{
  lang: string;
  processes: ProcessTable[];
}> = ({ lang, processes }) => {
  const intl = useIntl();
  const location = useLocation();
  const defaultLcaDataScope = getDefaultLcaDataScopeForPath(location.pathname);
  const processOptions = useMemo(() => buildLcaProcessOptions(processes), [processes]);
  const processOptionMap = useMemo(
    () => new Map(processOptions.map((item) => [item.value, item])),
    [processOptions],
  );
  const defaultSelectedProcessIds = useMemo(
    () =>
      processOptions
        .slice(0, Math.max(1, Math.min(DEFAULT_SELECTION_LIMIT, processOptions.length)))
        .map((item) => item.value),
    [processOptions],
  );

  const [open, setOpen] = useState(false);
  const [impactOptions, setImpactOptions] = useState<ImpactOption[]>([]);
  const [impactOptionsLoading, setImpactOptionsLoading] = useState(false);
  const [impactOptionsError, setImpactOptionsError] = useState<string | null>(null);
  const [selectedImpactId, setSelectedImpactId] = useState('');
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CompareResultState | null>(null);
  const analysisUnit = analysisResult?.unit ?? '-';

  useEffect(() => {
    if (!open) {
      return;
    }

    const validProcessIds = new Set(processOptions.map((item) => item.value));
    setSelectedProcessIds((current) => {
      const filtered = current.filter((item) => validProcessIds.has(item));
      if (filtered.length > 0) {
        return filtered;
      }
      return defaultSelectedProcessIds;
    });
  }, [defaultSelectedProcessIds, open, processOptions]);

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

  const onOpen = () => {
    setOpen(true);
    setSelectedImpactId('');
    setSelectedProcessIds(defaultSelectedProcessIds);
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

  const toggleProcess = (processId: string) => {
    setSelectedProcessIds((current) =>
      current.includes(processId)
        ? current.filter((item) => item !== processId)
        : [...current, processId],
    );
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const runAnalysis = async () => {
    const selectedProcesses = selectedProcessIds
      .map((processId) => processOptionMap.get(processId))
      .filter((item): item is ProcessOption => !!item);

    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const queried = await queryLcaResults({
        scope: LCA_SCOPE,
        ...(defaultLcaDataScope ? { data_scope: defaultLcaDataScope } : {}),
        mode: 'processes_one_impact',
        process_ids: selectedProcesses.map((item) => item.value),
        impact_id: selectedImpactId,
        allow_fallback: false,
      });

      const values = (queried.data as QueryDataValues)?.values;
      const valuesByProcessId =
        values && typeof values === 'object' && !Array.isArray(values)
          ? (values as Record<string, unknown>)
          : {};

      const selectedImpact = impactOptions.find((item) => item.value === selectedImpactId)!;
      setAnalysisResult({
        impactId: selectedImpactId,
        impactLabel: selectedImpact.label,
        unit: selectedImpact.unit,
        snapshotId: queried.snapshot_id,
        resultId: queried.result_id,
        source: queried.source,
        computedAt: queried.meta.computed_at,
        model: buildLcaImpactCompareModel(selectedProcesses, valuesByProcessId),
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
      } else {
        setAnalysisError(
          error instanceof Error
            ? error.message
            : intl.formatMessage({
                id: 'pages.process.lca.analysis.message.runFailed',
                defaultMessage: 'Failed to run impact analysis.',
              }),
        );
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  const triggerTooltip =
    processOptions.length > 0
      ? intl.formatMessage({
          id: 'pages.process.lca.analysis.toolbar.tooltip',
          defaultMessage: 'Impact compare',
        })
      : intl.formatMessage({
          id: 'pages.process.lca.analysis.empty.visibleProcesses',
          defaultMessage: 'No processes are available on the current page.',
        });

  const compareColumns: ColumnsType<LcaImpactCompareItem> = [
    {
      title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
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
        icon={<BarChartOutlined />}
        tooltip={triggerTooltip}
        onClick={onOpen}
        disabled={processOptions.length === 0}
      />
      <Drawer
        width={760}
        open={open}
        onClose={onClose}
        title={intl.formatMessage({
          id: 'pages.process.lca.analysis.drawer.title',
          defaultMessage: 'LCA Impact Compare',
        })}
        footer={
          <Space>
            <Button onClick={onClose} disabled={analysisLoading}>
              <FormattedMessage id='pages.process.lca.modal.cancel' defaultMessage='Close' />
            </Button>
            <Button
              type='primary'
              onClick={runAnalysis}
              loading={analysisLoading}
              disabled={
                impactOptionsLoading || selectedProcessIds.length === 0 || !selectedImpactId
              }
            >
              <FormattedMessage
                id='pages.process.lca.analysis.action.run'
                defaultMessage='Run analysis'
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
                  id='pages.process.lca.analysis.description'
                  defaultMessage='Compare the current page processes against one impact category using the existing solver query API.'
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
              {impactOptionsError ? <Alert message={impactOptionsError} type='error' /> : null}
            </Space>
          </Card>

          <Card size='small'>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <Typography.Text strong>
                <FormattedMessage
                  id='pages.process.lca.analysis.section.processes'
                  defaultMessage='Processes'
                />
              </Typography.Text>
              <Typography.Paragraph>
                <FormattedMessage
                  id='pages.process.lca.analysis.processHint'
                  defaultMessage='{selectedCount} selected from {totalCount} visible process rows on this page.'
                  values={{
                    selectedCount: selectedProcessIds.length,
                    totalCount: processOptions.length,
                  }}
                />
              </Typography.Paragraph>
              <Space>
                <Button
                  onClick={() => {
                    setSelectedProcessIds(processOptions.map((item) => item.value));
                    setAnalysisResult(null);
                    setAnalysisError(null);
                  }}
                  disabled={processOptions.length === 0}
                >
                  <FormattedMessage
                    id='pages.process.lca.analysis.action.selectAllVisible'
                    defaultMessage='Select all visible'
                  />
                </Button>
                <Button
                  onClick={() => {
                    setSelectedProcessIds([]);
                    setAnalysisResult(null);
                    setAnalysisError(null);
                  }}
                  disabled={selectedProcessIds.length === 0}
                >
                  <FormattedMessage
                    id='pages.process.lca.analysis.action.clearSelection'
                    defaultMessage='Clear selection'
                  />
                </Button>
              </Space>
              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                {processOptions.map((item) => (
                  <Checkbox
                    key={item.value}
                    checked={selectedProcessIds.includes(item.value)}
                    onChange={() => toggleProcess(item.value)}
                  >
                    <Space size='small'>
                      <Typography.Text strong>{item.name}</Typography.Text>
                      <Typography.Text type='secondary'>{item.version}</Typography.Text>
                    </Space>
                  </Checkbox>
                ))}
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
              {analysisError ? <Alert message={analysisError} type='error' /> : null}
              {!analysisResult && !analysisError ? (
                <Typography.Paragraph type='secondary'>
                  <FormattedMessage
                    id='pages.process.lca.analysis.empty.results'
                    defaultMessage='Select one impact category and at least one process, then run the analysis.'
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
                      <Col xs={24} md={8}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.analysis.summary.processCount'
                              defaultMessage='Compared processes'
                            />
                          }
                          value={analysisResult.model.items.length}
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.analysis.summary.topContributor'
                              defaultMessage='Top contributor'
                            />
                          }
                          value={analysisResult.model.topItem?.processName}
                        />
                      </Col>
                      <Col xs={24} md={8}>
                        <Statistic
                          title={
                            <FormattedMessage
                              id='pages.process.lca.analysis.summary.totalAbsolute'
                              defaultMessage='Absolute total'
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
                        id='pages.process.lca.analysis.shareNote'
                        defaultMessage='Shares are calculated from absolute values so positive and negative contributors remain comparable.'
                      />
                    </Typography.Paragraph>

                    <Table<LcaImpactCompareItem>
                      rowKey='processId'
                      size='small'
                      pagination={false}
                      columns={compareColumns}
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

export default LcaImpactCompareToolbar;
