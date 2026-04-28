import AlignedNumber from '@/components/AlignedNumber';
import { ListPagination } from '@/services/general/data';
import { getLangText } from '@/services/general/util';
import { isLcaFunctionInvokeError, queryLcaResults } from '@/services/lca';
import type { LCIAResultTable } from '@/services/lciaMethods/data';
import { getReferenceQuantityFromMethod } from '@/services/lciaMethods/util';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage, useLocation } from 'umi';
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
};

const ProcessLciaResultsPanel: FC<Props> = ({
  baseRows,
  lang,
  processId,
  processVersion,
  lcaDataScope,
  queryScope = LCA_SCOPE,
  enableSolverRefresh = true,
}) => {
  const location = useLocation();
  const resolvedDataScope = lcaDataScope ?? getDefaultLcaDataScopeForPath(location.pathname ?? '');
  const canQuerySolver = enableSolverRefresh && !!processId;
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
  const [solverLciaPendingBuild, setSolverLciaPendingBuild] = useState<{
    jobId: string;
    snapshotId: string;
  } | null>(null);

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
    setSolverLciaPendingBuild(null);

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
      setSolverLciaPendingBuild(null);

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
          .sort((left, right) => (left.impact_index ?? 0) - (right.impact_index ?? 0));
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
        setSolverLciaPendingBuild(null);
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
            setSolverLciaPendingBuild({
              jobId: buildJobId,
              snapshotId: buildSnapshotId,
            });
            setSolverLciaMeta(null);
            setSolverLciaError(null);
            setSolverLciaLoaded(true);
            return;
          }
        }

        setSolverLciaPendingBuild(null);
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
    if (!canQuerySolver || !solverLciaPendingBuild) {
      return;
    }

    const timer = globalThis.setTimeout(() => {
      void loadSolverLciaResults(true);
    }, 4000);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [canQuerySolver, loadSolverLciaResults, solverLciaPendingBuild]);

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
          {solverLciaMeta && (
            <Typography.Text type='secondary'>
              {`source=${solverLciaMeta.source}, snapshot=${solverLciaMeta.snapshotId}, result=${solverLciaMeta.resultId}, computed_at=${solverLciaMeta.computedAt}`}
            </Typography.Text>
          )}
          {solverLciaPendingBuild && (
            <Typography.Text type='secondary'>
              <FormattedMessage
                id='pages.process.view.lciaresults.solver.snapshotBuilding'
                defaultMessage='Snapshot is rebuilding (job {jobId}). Retrying automatically...'
                values={{ jobId: solverLciaPendingBuild.jobId }}
              />
            </Typography.Text>
          )}
        </Space>
      )}
      {solverLciaError && !solverLciaPendingBuild && (
        <Typography.Text type='danger'>
          <FormattedMessage
            id='pages.process.view.lciaresults.solver.error'
            defaultMessage='Result query failed: {message}'
            values={{ message: solverLciaError }}
          />
        </Typography.Text>
      )}
      <LcaProfileSummary rows={rows} lang={lang} loading={solverLciaLoading} />
      <ProTable<LCIAResultTable, ListPagination>
        rowKey={(row) => row.referenceToLCIAMethodDataSet?.['@refObjectId'] || row.key}
        loading={solverLciaLoading}
        search={false}
        options={false}
        dataSource={rows}
        columns={columns}
      />
    </Space>
  );
};

export default ProcessLciaResultsPanel;
