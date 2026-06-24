import AlignedNumber from '@/components/AlignedNumber';
import {
  getPublishedLciaResultPackage,
  type PublishedLciaResultValue,
} from '@/services/dataProducts';
import { ListPagination } from '@/services/general/data';
import { getLangText } from '@/services/general/util';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { getReferenceQuantityFromMethod } from '@/services/lciaMethods/util';
import { InfoCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useIntl, useLocation } from 'umi';
import {
  buildMergedLcaRows,
  getDefaultLcaDataScopeForPath,
  getLcaMethodMetaMap,
  LCA_SCOPE,
  type LcaAnalysisDataScope,
  type SolverLcaImpactValueRow,
} from './lcaAnalysisShared';
import LcaProfileSummary from './lcaProfileSummary';

type Props = {
  baseRows: LCIAResultTable[];
  lang: string;
  processId?: string;
  processVersion?: string;
  lcaDataScope?: Exclude<LcaAnalysisDataScope, 'all_data'>;
  queryScope?: string;
  enableSolverRefresh?: boolean;
  enablePublishedPackageReader?: boolean;
};

type SolverLciaPendingJob = {
  kind: 'snapshot_build' | 'all_unit_solve';
  jobId: string;
  snapshotId: string;
};

type PublishedLciaMeta = {
  publicationId: string;
  packageId: string;
  rowCount: number;
};

function normalizePublishedLciaValues(values: PublishedLciaResultValue[] | undefined) {
  return (Array.isArray(values) ? values : [])
    .map((row) => ({
      impact_id: String(row.impact_id ?? ''),
      impact_index: Number(row.impact_index ?? 0),
      impact_name: String(row.impact_name ?? ''),
      unit: String(row.unit ?? ''),
      value: Number(row.value ?? 0),
    }))
    .filter((row) => row.impact_id.length > 0)
    .sort((left, right) => Number(left.impact_index) - Number(right.impact_index));
}

function readRecordId(record: Record<string, unknown> | null | undefined, fallback: string) {
  if (!record) {
    return fallback;
  }

  const candidates = [
    record.id,
    record.publication_id,
    record.package_id,
    record.result_package_id,
  ];
  const matched = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof matched === 'string' ? matched.trim() : fallback;
}

const ProcessLciaResultsPanel: FC<Props> = ({
  baseRows,
  lang,
  processId,
  processVersion,
  lcaDataScope,
  queryScope = LCA_SCOPE,
  enableSolverRefresh = true,
  enablePublishedPackageReader = false,
}) => {
  const location = useLocation();
  const intl = useIntl();
  const resolvedDataScope = lcaDataScope ?? getDefaultLcaDataScopeForPath(location.pathname ?? '');
  const shouldPreferPublishedPackage =
    enablePublishedPackageReader && resolvedDataScope === 'open_data' && !!processId;
  const shouldUsePublishedPackage = shouldPreferPublishedPackage && !!processVersion;
  const canQuerySolver = enableSolverRefresh && !!processId && !shouldPreferPublishedPackage;
  const [normalizedBaseRows, setNormalizedBaseRows] = useState<LCIAResultTable[]>([]);
  const [rows, setRows] = useState<LCIAResultTable[]>([]);
  const [baseRowsReady, setBaseRowsReady] = useState(false);
  const [solverLciaLoading, setSolverLciaLoading] = useState(false);
  const [solverLciaLoaded, setSolverLciaLoaded] = useState(false);
  const [solverLciaError, setSolverLciaError] = useState<string | null>(null);
  const [solverLciaMeta, setSolverLciaMeta] = useState<{
    snapshotId: string;
    resultId: string;
    source: string;
    computedAt: string;
  } | null>(null);
  const [solverLciaPendingJob, setSolverLciaPendingJob] = useState<SolverLciaPendingJob | null>(
    null,
  );
  const [publishedLciaLoading, setPublishedLciaLoading] = useState(false);
  const [publishedLciaLoaded, setPublishedLciaLoaded] = useState(false);
  const [publishedLciaError, setPublishedLciaError] = useState<string | null>(null);
  const [publishedLciaMeta, setPublishedLciaMeta] = useState<PublishedLciaMeta | null>(null);
  const [publishedLciaEmpty, setPublishedLciaEmpty] = useState(false);
  const lciaLoading = solverLciaLoading || publishedLciaLoading;

  const lciaDiagnostics = useMemo(() => {
    if (shouldUsePublishedPackage && publishedLciaMeta) {
      return {
        label: intl.formatMessage({
          id: 'pages.process.view.lciaresults.published.details',
          defaultMessage: 'Published result details',
        }),
        text: `source=published_package, publication=${publishedLciaMeta.publicationId}, package=${publishedLciaMeta.packageId}, rows=${publishedLciaMeta.rowCount}`,
      };
    }

    if (solverLciaMeta) {
      return {
        label: intl.formatMessage({
          id: 'pages.process.view.lciaresults.solver.details',
          defaultMessage: 'Calculated result details',
        }),
        text: `source=${solverLciaMeta.source}, snapshot=${solverLciaMeta.snapshotId}, result=${solverLciaMeta.resultId}, computed_at=${solverLciaMeta.computedAt}`,
      };
    }

    return null;
  }, [intl, publishedLciaMeta, shouldUsePublishedPackage, solverLciaMeta]);

  const lciaProfileHeaderExtra = lciaDiagnostics ? (
    <Tooltip title={lciaDiagnostics.text}>
      <Button
        aria-label={lciaDiagnostics.label}
        icon={<InfoCircleOutlined />}
        size='small'
        type='text'
      />
    </Tooltip>
  ) : null;

  const publishedErrorDetailLabel = intl.formatMessage({
    id: 'pages.process.view.lciaresults.published.errorDetails',
    defaultMessage: 'Published result error details',
  });

  const lciaProfileNotice = (
    <>
      {solverLciaError && !solverLciaPendingJob && (
        <Typography.Text type='danger'>
          <FormattedMessage
            id='pages.process.view.lciaresults.solver.error'
            defaultMessage='Result query failed: {message}'
            values={{ message: solverLciaError }}
          />
        </Typography.Text>
      )}
      {publishedLciaEmpty && (
        <Typography.Text type='secondary'>
          <FormattedMessage
            id='pages.process.view.lciaresults.published.empty'
            defaultMessage='No published LCIA result rows are available for this process.'
          />
        </Typography.Text>
      )}
      {publishedLciaError && (
        <Space align='center' size={4} wrap>
          <Typography.Text type='secondary'>
            <WarningOutlined style={{ color: '#d48806' }} />{' '}
            <FormattedMessage
              id='pages.process.view.lciaresults.published.unavailable'
              defaultMessage='Published LCIA results are unavailable.'
            />
          </Typography.Text>
          <Tooltip
            title={intl.formatMessage(
              {
                id: 'pages.process.view.lciaresults.published.errorDetailMessage',
                defaultMessage: 'Detail: {message}',
              },
              { message: publishedLciaError },
            )}
          >
            <Button
              aria-label={publishedErrorDetailLabel}
              icon={<InfoCircleOutlined />}
              size='small'
              type='text'
            />
          </Tooltip>
        </Space>
      )}
    </>
  );

  const columns = useMemo<ProColumns<LCIAResultTable>[]>(
    () => [
      {
        title: <FormattedMessage id='pages.table.title.index' defaultMessage='Index' />,
        dataIndex: 'index',
        valueType: 'index',
        search: false,
        width: 70,
      },
      {
        title: (
          <FormattedMessage
            id='pages.process.view.lciaresults.shortDescription'
            defaultMessage='LCIA'
          />
        ),
        dataIndex: 'Name',
        search: false,
        width: 500,
        render: (_, row) => {
          return [
            <span key={0}>
              {getLangText(row?.referenceToLCIAMethodDataSet?.['common:shortDescription'], lang)}
            </span>,
          ];
        },
      },
      {
        title: (
          <FormattedMessage
            id='pages.process.view.lciaresults.meanAmount'
            defaultMessage='Mean amount'
          />
        ),
        dataIndex: 'meanAmount',
        search: false,
        render: (_, row) => {
          return [<AlignedNumber key={0} value={row.meanAmount} />];
        },
      },
      {
        title: <FormattedMessage id='pages.process.view.lciaresults.unit' defaultMessage='Unit' />,
        dataIndex: 'referenceQuantity',
        search: false,
        render: (_, row) => {
          return [<span key={0}>{getLangText(row?.referenceQuantityDesc, lang) || '-'}</span>];
        },
      },
      {
        title: (
          <FormattedMessage
            id='pages.process.view.lciaresults.referenceToLCIAMethodDataSetVersion'
            defaultMessage='Version'
          />
        ),
        dataIndex: 'Version',
        search: false,
        render: (_, row) => {
          const version = row.referenceToLCIAMethodDataSet?.['@version'] ?? '-';
          return [
            <Tooltip key={0} placement='topLeft' title={version}>
              {version}
            </Tooltip>,
          ];
        },
      },
    ],
    [lang],
  );

  useEffect(() => {
    let cancelled = false;

    setBaseRowsReady(false);
    setSolverLciaLoaded(false);
    setSolverLciaError(null);
    setSolverLciaMeta(null);
    setSolverLciaPendingJob(null);
    setPublishedLciaLoaded(false);
    setPublishedLciaError(null);
    setPublishedLciaMeta(null);
    setPublishedLciaEmpty(false);

    const syncBaseRows = async () => {
      const sourceRows = JSON.parse(JSON.stringify(baseRows ?? [])) as LCIAResultTable[];
      try {
        await getReferenceQuantityFromMethod(sourceRows);
      } catch {
        // Keep the tab usable even if method metadata cannot be enriched.
      }

      if (cancelled) {
        return;
      }

      setNormalizedBaseRows(sourceRows);
      setRows(sourceRows);
      setBaseRowsReady(true);
    };

    void syncBaseRows();

    return () => {
      cancelled = true;
    };
  }, [baseRows]);

  const loadPublishedLciaResults = useCallback(
    async (forceReload: boolean) => {
      if (publishedLciaLoading) {
        return;
      }
      if (publishedLciaLoaded && !forceReload) {
        return;
      }

      setPublishedLciaLoading(true);
      setPublishedLciaError(null);
      setPublishedLciaEmpty(false);

      try {
        const result = await getPublishedLciaResultPackage({
          processId: processId as string,
          processVersion: processVersion as string,
        });

        if (result.error || !result.data) {
          throw new Error(result.error?.message || 'Published LCIA result package is unavailable.');
        }

        const publishedRows = normalizePublishedLciaValues(result.data.values);
        setPublishedLciaMeta({
          publicationId: readRecordId(result.data.publication, '-'),
          packageId: readRecordId(result.data.package, '-'),
          rowCount: result.data.rowCount ?? publishedRows.length,
        });

        if (publishedRows.length === 0) {
          setRows([]);
          setPublishedLciaEmpty(true);
          setPublishedLciaLoaded(true);
          return;
        }

        const methodMetaById = await getLcaMethodMetaMap(
          publishedRows.map((publishedRow) => publishedRow.impact_id),
        );
        setRows(buildMergedLcaRows([], publishedRows, methodMetaById));
        setPublishedLciaLoaded(true);
      } catch (error: unknown) {
        setRows([]);
        setPublishedLciaMeta(null);
        setPublishedLciaError(error instanceof Error ? error.message : String(error));
        setPublishedLciaLoaded(true);
      } finally {
        setPublishedLciaLoading(false);
      }
    },
    [processId, processVersion, publishedLciaLoaded, publishedLciaLoading],
  );

  const loadSolverLciaResults = useCallback(
    async (forceReload: boolean) => {
      if (!canQuerySolver || !baseRowsReady || !processId) {
        return;
      }
      if (solverLciaLoading) {
        return;
      }
      if (solverLciaLoaded && !forceReload) {
        return;
      }

      setSolverLciaLoading(true);
      setSolverLciaError(null);
      setSolverLciaPendingJob(null);

      try {
        const queried = await queryLcaResults({
          scope: queryScope,
          ...(resolvedDataScope ? { data_scope: resolvedDataScope } : {}),
          mode: 'process_all_impacts',
          process_id: processId,
          ...(processVersion ? { process_version: processVersion } : {}),
          allow_fallback: false,
        });
        const values = (queried.data as { values?: unknown[] })?.values;
        const solverRows = (Array.isArray(values) ? values : [])
          .map((item) => {
            const row = item as {
              impact_id?: unknown;
              impact_index?: unknown;
              impact_name?: unknown;
              unit?: unknown;
              value?: unknown;
            };

            return {
              impact_id: String(row.impact_id ?? ''),
              impact_index: Number(row.impact_index ?? 0),
              impact_name: String(row.impact_name ?? ''),
              unit: String(row.unit ?? ''),
              value: Number(row.value ?? 0),
            } as SolverLcaImpactValueRow;
          })
          .filter((row) => row.impact_id.length > 0)
          .sort((left, right) => Number(left.impact_index) - Number(right.impact_index));
        const methodMetaById = await getLcaMethodMetaMap(
          solverRows.map((solverRow) => solverRow.impact_id),
        );
        const mergedRows = buildMergedLcaRows(normalizedBaseRows, solverRows, methodMetaById);

        setRows(mergedRows);
        setSolverLciaMeta({
          snapshotId: queried.snapshot_id,
          resultId: queried.result_id,
          source: queried.source,
          computedAt: queried.meta.computed_at,
        });
        setSolverLciaPendingJob(null);
        setSolverLciaLoaded(true);
      } catch (error: unknown) {
        if (isLcaFunctionInvokeError(error) && error.code === 'snapshot_build_queued') {
          const buildJobId =
            typeof error.body?.build_job_id === 'string' ? error.body.build_job_id.trim() : '';
          const buildSnapshotId =
            typeof error.body?.build_snapshot_id === 'string'
              ? error.body.build_snapshot_id.trim()
              : '';

          if (buildJobId && buildSnapshotId) {
            setSolverLciaPendingJob({
              kind: 'snapshot_build',
              jobId: buildJobId,
              snapshotId: buildSnapshotId,
            });
            setSolverLciaMeta(null);
            setSolverLciaError(null);
            setSolverLciaLoaded(true);
            return;
          }
        }

        if (isLcaFunctionInvokeError(error) && error.code === 'all_unit_result_queued') {
          const solveJobId =
            typeof error.body?.solve_job_id === 'string' ? error.body.solve_job_id.trim() : '';
          const solveWorkerJobId =
            typeof error.body?.solve_worker_job_id === 'string'
              ? error.body.solve_worker_job_id.trim()
              : '';
          const snapshotId =
            typeof error.body?.snapshot_id === 'string' ? error.body.snapshot_id.trim() : '';
          const displayJobId = solveJobId || solveWorkerJobId;

          if (displayJobId && snapshotId) {
            setSolverLciaPendingJob({
              kind: 'all_unit_solve',
              jobId: displayJobId,
              snapshotId,
            });
            setSolverLciaMeta(null);
            setSolverLciaError(null);
            setSolverLciaLoaded(true);
            return;
          }

          setSolverLciaError('LCIA result calculation is queued. Please retry in a moment.');
          setSolverLciaPendingJob(null);
          setRows(normalizedBaseRows);
          setSolverLciaMeta(null);
          setSolverLciaLoaded(true);
          return;
        }

        setSolverLciaPendingJob(null);
        setRows(normalizedBaseRows);
        setSolverLciaMeta(null);
        setSolverLciaError(error instanceof Error ? error.message : String(error));
        setSolverLciaLoaded(true);
      } finally {
        setSolverLciaLoading(false);
      }
    },
    [
      baseRowsReady,
      canQuerySolver,
      normalizedBaseRows,
      processId,
      processVersion,
      queryScope,
      resolvedDataScope,
      solverLciaLoaded,
      solverLciaLoading,
    ],
  );

  useEffect(() => {
    if (!canQuerySolver || !baseRowsReady) {
      return;
    }

    void loadSolverLciaResults(false);
  }, [baseRowsReady, canQuerySolver, loadSolverLciaResults]);

  useEffect(() => {
    if (!shouldUsePublishedPackage || !baseRowsReady) {
      return;
    }

    void loadPublishedLciaResults(false);
  }, [baseRowsReady, loadPublishedLciaResults, shouldUsePublishedPackage]);

  useEffect(() => {
    if (!canQuerySolver || !solverLciaPendingJob) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      void loadSolverLciaResults(true);
    }, 4000);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [canQuerySolver, loadSolverLciaResults, solverLciaPendingJob]);

  return (
    <Space direction='vertical' size={'middle'} style={{ width: '100%' }}>
      {canQuerySolver && (
        <Space size={'middle'} wrap>
          <Button
            size='small'
            loading={solverLciaLoading}
            onClick={() => {
              void loadSolverLciaResults(true);
            }}
          >
            <FormattedMessage
              id='pages.process.view.lciaresults.solver.reload'
              defaultMessage='Refresh latest calculated results'
            />
          </Button>
          {solverLciaPendingJob?.kind === 'snapshot_build' && (
            <Typography.Text type='secondary'>
              <FormattedMessage
                id='pages.process.view.lciaresults.solver.snapshotBuilding'
                defaultMessage='Snapshot is rebuilding (job {jobId}). Retrying automatically...'
                values={{ jobId: solverLciaPendingJob.jobId }}
              />
            </Typography.Text>
          )}
          {solverLciaPendingJob?.kind === 'all_unit_solve' && (
            <Typography.Text type='secondary'>
              <FormattedMessage
                id='pages.process.view.lciaresults.solver.allUnitSolving'
                defaultMessage='LCIA results are being calculated (job {jobId}). Retrying automatically...'
                values={{ jobId: solverLciaPendingJob.jobId }}
              />
            </Typography.Text>
          )}
        </Space>
      )}
      <LcaProfileSummary
        rows={rows}
        lang={lang}
        headerExtra={lciaProfileHeaderExtra}
        loading={lciaLoading}
        notice={lciaProfileNotice}
      />
      <ProTable<LCIAResultTable, ListPagination>
        rowKey={(row) => row.referenceToLCIAMethodDataSet?.['@refObjectId'] || row.key}
        loading={lciaLoading}
        search={false}
        options={false}
        dataSource={rows}
        columns={columns}
      />
    </Space>
  );
};

export default ProcessLciaResultsPanel;
