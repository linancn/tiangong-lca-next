import {
  requestReviewQualityDiagnosticApi,
  type ReviewQualityDiagnosticFinding,
  type ReviewQualityDiagnosticOutcome,
  type ReviewQualityDiagnosticRun,
  type ReviewQualityDiagnosticSection,
  type ReviewQualityDiagnosticStatus,
} from '@/services/reviews/api';
import { ExperimentOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Collapse, Empty, List, Space, Tag, Typography, theme } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

const { Paragraph, Text } = Typography;

const DIAGNOSTIC_POLL_INTERVAL_MS = 3000;
const ACTIVE_DIAGNOSTIC_STATUSES = new Set<ReviewQualityDiagnosticStatus>([
  'queued',
  'running',
  'waiting',
  'stale',
]);

type DiagnosticIntl = ReturnType<typeof useIntl>;

const formatDiagnosticStatus = (intl: DiagnosticIntl, status: ReviewQualityDiagnosticStatus) => {
  switch (status) {
    case 'queued':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.queued',
        defaultMessage: 'Queued',
      });
    case 'running':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.running',
        defaultMessage: 'Running',
      });
    case 'waiting':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.waiting',
        defaultMessage: 'Waiting',
      });
    case 'stale':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.stale',
        defaultMessage: 'Stale',
      });
    case 'completed':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.completed',
        defaultMessage: 'Completed',
      });
    case 'failed':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.failed',
        defaultMessage: 'Failed',
      });
    case 'cancelled':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.status.cancelled',
        defaultMessage: 'Cancelled',
      });
  }
};

const formatDiagnosticOutcome = (intl: DiagnosticIntl, outcome: ReviewQualityDiagnosticOutcome) => {
  switch (outcome) {
    case 'clear':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.outcome.clear',
        defaultMessage: 'Clear',
      });
    case 'findings':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.outcome.findings',
        defaultMessage: 'Findings detected',
      });
    case 'not_evaluable':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.outcome.not_evaluable',
        defaultMessage: 'Not evaluable',
      });
  }
};

const formatDiagnosticSection = (
  intl: DiagnosticIntl,
  section: ReviewQualityDiagnosticSection['key'],
) => {
  switch (section) {
    case 'completeness':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.section.completeness',
        defaultMessage: 'Data completeness',
      });
    case 'numerical_stability':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.section.numericalStability',
        defaultMessage: 'Numerical stability',
      });
  }
};

const formatDiagnosticSectionStatus = (
  intl: DiagnosticIntl,
  status: ReviewQualityDiagnosticSection['status'],
) => {
  switch (status) {
    case 'clear':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.sectionStatus.clear',
        defaultMessage: 'Clear',
      });
    case 'findings':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.sectionStatus.findings',
        defaultMessage: 'Findings detected',
      });
    case 'not_evaluable':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.sectionStatus.notEvaluable',
        defaultMessage: 'Not evaluable',
      });
    case 'not_applicable':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.sectionStatus.notApplicable',
        defaultMessage: 'Not applicable',
      });
  }
};

const formatDiagnosticFindingLevel = (
  intl: DiagnosticIntl,
  level: ReviewQualityDiagnosticFinding['level'],
) => {
  switch (level) {
    case 'info':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.findingLevel.info',
        defaultMessage: 'Info',
      });
    case 'warning':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.findingLevel.warning',
        defaultMessage: 'Warning',
      });
    case 'error':
      return intl.formatMessage({
        id: 'pages.review.qualityDiagnostic.findingLevel.error',
        defaultMessage: 'Error',
      });
  }
};

const isDiagnosticActive = (status?: ReviewQualityDiagnosticStatus) =>
  Boolean(status && ACTIVE_DIAGNOSTIC_STATUSES.has(status));

const statusColor = (status: ReviewQualityDiagnosticStatus) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
    case 'cancelled':
      return 'error';
    default:
      return 'processing';
  }
};

const outcomeColor = (outcome?: ReviewQualityDiagnosticOutcome) => {
  switch (outcome) {
    case 'clear':
      return 'success';
    case 'findings':
      return 'warning';
    case 'not_evaluable':
      return 'warning';
    default:
      return 'default';
  }
};

const findingColor = (level: ReviewQualityDiagnosticFinding['level']) => {
  switch (level) {
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    default:
      return 'blue';
  }
};

const sectionColor = (status: ReviewQualityDiagnosticSection['status']) => {
  switch (status) {
    case 'clear':
      return 'success';
    case 'findings':
      return 'warning';
    case 'not_evaluable':
      return 'warning';
    default:
      return 'default';
  }
};

const formatDetails = (details: unknown) => {
  if (details === undefined || details === null) return '';
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch (_error) {
    return String(details);
  }
};

const Metric = ({ label, value }: { label: React.ReactNode; value?: number }) => {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        minWidth: 120,
        padding: '10px 12px',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorFillAlter,
      }}
    >
      <Text type='secondary' style={{ display: 'block', fontSize: 12 }}>
        {label}
      </Text>
      <Text strong style={{ display: 'block', marginTop: 2, fontSize: 20 }}>
        {value ?? '—'}
      </Text>
    </div>
  );
};

const ReviewQualityDiagnostic = () => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const [diagnostic, setDiagnostic] = useState<ReviewQualityDiagnosticRun>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [requestError, setRequestError] = useState<string>();

  const readDiagnostic = useCallback(
    async (runId?: string, options: { background?: boolean } = {}) => {
      if (!options.background) setRefreshing(true);
      const result = await requestReviewQualityDiagnosticApi(
        runId ? { action: 'read', runId } : { action: 'read' },
      );
      if (result.error) {
        setRequestError(result.error.message);
      } else {
        setRequestError(undefined);
        setDiagnostic(result.data?.[0]);
      }
      setInitialLoading(false);
      if (!options.background) setRefreshing(false);
    },
    [],
  );

  useEffect(() => {
    void readDiagnostic(undefined, { background: true });
  }, [readDiagnostic]);

  useEffect(() => {
    if (!diagnostic?.runId || !isDiagnosticActive(diagnostic.status)) return undefined;

    const intervalId = window.setInterval(() => {
      void readDiagnostic(diagnostic.runId, { background: true });
    }, DIAGNOSTIC_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [diagnostic?.runId, diagnostic?.status, readDiagnostic]);

  const startDiagnostic = async () => {
    setStarting(true);
    setRequestError(undefined);
    const result = await requestReviewQualityDiagnosticApi({ action: 'start' });
    if (result.error) {
      setRequestError(result.error.message);
    } else {
      setDiagnostic(result.data?.[0]);
    }
    setInitialLoading(false);
    setStarting(false);
  };

  const report = diagnostic?.report;
  const scope = report?.scope;
  const findingCount =
    typeof report?.summary?.findingCount === 'number'
      ? report.summary.findingCount
      : report?.findings?.length;

  const sectionItems = useMemo(
    () =>
      (report?.sections ?? []).map((section) => ({
        key: section.key,
        label: (
          <Space wrap>
            <Text strong>{formatDiagnosticSection(intl, section.key)}</Text>
            <Tag color={sectionColor(section.status)}>
              {formatDiagnosticSectionStatus(intl, section.status)}
            </Tag>
            <Text type='secondary'>
              {intl.formatMessage(
                {
                  id: 'pages.review.qualityDiagnostic.findingCount',
                  defaultMessage: '{count} findings',
                },
                { count: section.findings?.length ?? 0 },
              )}
            </Text>
          </Space>
        ),
        children:
          section.findings?.length > 0 ? (
            <List
              size='small'
              dataSource={section.findings}
              renderItem={(finding, index) => {
                const details = formatDetails(finding.details);
                return (
                  <List.Item key={`${finding.code}-${index}`}>
                    <Space direction='vertical' size={4} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={findingColor(finding.level)}>
                          {formatDiagnosticFindingLevel(intl, finding.level)}
                        </Tag>
                        <Text code>{finding.code}</Text>
                      </Space>
                      <Text>{finding.message}</Text>
                      {details && (
                        <pre
                          aria-label={intl.formatMessage({
                            id: 'pages.review.qualityDiagnostic.findingDetails',
                            defaultMessage: 'Finding details',
                          })}
                          style={{
                            maxHeight: 220,
                            margin: 0,
                            padding: '8px 10px',
                            overflow: 'auto',
                            borderRadius: token.borderRadius,
                            background: token.colorFillAlter,
                            color: token.colorTextSecondary,
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {details}
                        </pre>
                      )}
                    </Space>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Text type='secondary'>
              {intl.formatMessage({
                id: 'pages.review.qualityDiagnostic.noSectionFindings',
                defaultMessage: 'No findings in this section.',
              })}
            </Text>
          ),
      })),
    [intl, report?.sections, token],
  );

  const statusLabel = diagnostic ? formatDiagnosticStatus(intl, diagnostic.status) : null;
  const outcome = diagnostic?.outcome ?? report?.outcome;
  const outcomeLabel = outcome ? formatDiagnosticOutcome(intl, outcome) : null;
  const lastUpdatedAt = diagnostic?.updatedAt ?? diagnostic?.finishedAt ?? diagnostic?.requestedAt;
  const isActive = isDiagnosticActive(diagnostic?.status);

  return (
    <Card
      data-testid='review-quality-diagnostic'
      size='small'
      style={{
        marginBottom: 16,
        borderInlineStart: `3px solid ${token.colorInfo}`,
        boxShadow: token.boxShadowTertiary,
      }}
      title={
        <Space wrap>
          <ExperimentOutlined />
          <span>
            {intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.title',
              defaultMessage: 'Pending-review quality diagnostic',
            })}
          </span>
          <Tag icon={<InfoCircleOutlined />} color='blue'>
            {intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.informationalOnly',
              defaultMessage: 'Informational only',
            })}
          </Tag>
        </Space>
      }
      extra={
        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={() => void readDiagnostic()}
          >
            {intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.refresh',
              defaultMessage: 'Refresh report',
            })}
          </Button>
          <Button
            type='primary'
            icon={<ExperimentOutlined />}
            loading={starting}
            disabled={isActive}
            onClick={() => void startDiagnostic()}
          >
            {diagnostic?.status === 'failed'
              ? intl.formatMessage({
                  id: 'pages.review.qualityDiagnostic.retry',
                  defaultMessage: 'Run again',
                })
              : intl.formatMessage({
                  id: 'pages.review.qualityDiagnostic.run',
                  defaultMessage: 'Run quality diagnostic',
                })}
          </Button>
        </Space>
      }
    >
      <Space direction='vertical' size='middle' style={{ width: '100%' }} aria-live='polite'>
        <Alert
          showIcon
          type='info'
          message={intl.formatMessage({
            id: 'pages.review.qualityDiagnostic.nonBlockingNotice',
            defaultMessage:
              'This manual report checks the joint pending-review matrix. Its findings and failures never disable assignment, approval, or rejection.',
          })}
        />

        {requestError && (
          <Alert
            showIcon
            type='error'
            message={intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.requestFailed',
              defaultMessage: 'Quality diagnostic request failed',
            })}
            description={requestError}
          />
        )}

        {initialLoading ? (
          <Text type='secondary'>
            {intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.loadingLatest',
              defaultMessage: 'Loading the latest report…',
            })}
          </Text>
        ) : !diagnostic ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={intl.formatMessage({
              id: 'pages.review.qualityDiagnostic.empty',
              defaultMessage: 'No quality diagnostic has been run yet.',
            })}
          />
        ) : (
          <>
            <Space wrap>
              <Tag color={statusColor(diagnostic.status)}>{statusLabel}</Tag>
              {outcomeLabel && <Tag color={outcomeColor(outcome)}>{outcomeLabel}</Tag>}
              <Text type='secondary' copyable={{ text: diagnostic.runId }}>
                {diagnostic.runId}
              </Text>
              {lastUpdatedAt && (
                <Text type='secondary'>
                  {intl.formatMessage(
                    {
                      id: 'pages.review.qualityDiagnostic.updatedAt',
                      defaultMessage: 'Updated {time}',
                    },
                    { time: new Date(lastUpdatedAt).toLocaleString(intl.locale) },
                  )}
                </Text>
              )}
            </Space>

            {diagnostic.status === 'failed' && (
              <Alert
                showIcon
                type='error'
                message={intl.formatMessage({
                  id: 'pages.review.qualityDiagnostic.runtimeFailed',
                  defaultMessage: 'The diagnostic did not produce a report.',
                })}
                description={diagnostic.error?.message ?? diagnostic.error?.code}
              />
            )}

            {isActive && (
              <Alert
                showIcon
                type='info'
                message={intl.formatMessage({
                  id: 'pages.review.qualityDiagnostic.running',
                  defaultMessage:
                    'The diagnostic is running in the background. Review actions remain available.',
                })}
              />
            )}

            {report && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 8,
                  }}
                >
                  <Metric
                    label={intl.formatMessage({
                      id: 'pages.review.qualityDiagnostic.scope.reviews',
                      defaultMessage: 'Reviews checked',
                    })}
                    value={scope?.reviewCount}
                  />
                  <Metric
                    label={intl.formatMessage({
                      id: 'pages.review.qualityDiagnostic.scope.datasets',
                      defaultMessage: 'Datasets checked',
                    })}
                    value={scope?.datasetCount}
                  />
                  <Metric
                    label={intl.formatMessage({
                      id: 'pages.review.qualityDiagnostic.scope.processes',
                      defaultMessage: 'Pending Processes',
                    })}
                    value={scope?.pendingProcessCount}
                  />
                  <Metric
                    label={intl.formatMessage({
                      id: 'pages.review.qualityDiagnostic.scope.findings',
                      defaultMessage: 'Findings',
                    })}
                    value={findingCount}
                  />
                </div>

                {scope?.datasetCounts && Object.keys(scope.datasetCounts).length > 0 && (
                  <Space wrap>
                    <Text type='secondary'>
                      {intl.formatMessage({
                        id: 'pages.review.qualityDiagnostic.scope.datasetTypes',
                        defaultMessage: 'Dataset scope',
                      })}
                    </Text>
                    {Object.entries(scope.datasetCounts).map(([table, count]) => (
                      <Tag key={table}>{`${table}: ${count}`}</Tag>
                    ))}
                  </Space>
                )}

                {(scope?.pendingProcessSample?.length ?? 0) > 0 && (
                  <div>
                    <Text type='secondary'>
                      {intl.formatMessage({
                        id: 'pages.review.qualityDiagnostic.scope.processSample',
                        defaultMessage: 'Process sample',
                      })}
                    </Text>
                    <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                      <Space wrap>
                        {scope?.pendingProcessSample?.map((process) => (
                          <Text code key={`${process.id}:${process.version}`}>
                            {`${process.id} @ ${process.version}`}
                          </Text>
                        ))}
                        {scope?.pendingProcessSampleTruncated && (
                          <Text type='secondary'>
                            {intl.formatMessage({
                              id: 'pages.review.qualityDiagnostic.scope.sampleTruncated',
                              defaultMessage: 'Additional Processes are included in the run.',
                            })}
                          </Text>
                        )}
                      </Space>
                    </Paragraph>
                  </div>
                )}

                <Collapse size='small' items={sectionItems} />
              </>
            )}
          </>
        )}
      </Space>
    </Card>
  );
};

export default ReviewQualityDiagnostic;
