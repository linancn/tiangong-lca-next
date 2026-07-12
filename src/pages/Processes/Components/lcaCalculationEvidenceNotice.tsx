import { getLangText } from '@/services/general/util';
import type {
  LcaUncharacterizedEvidenceArtifactV1,
  LcaUncharacterizedEvidenceArtifactV2,
  LciaCalculationStatus,
  LciaMethodFactorCoverageMatrix,
} from '@/services/lciaMethods/data';
import {
  parseStaticLciaReport,
  resolveServiceLciaStatus,
  STATIC_LCIA_METHOD_LIST,
} from '@/services/lciaMethods/evidence';
import { DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Collapse, Descriptions, Space, Table, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'umi';

type Props = {
  staticEvidence?: unknown;
  calculationEvidence?: unknown;
  methodFactorCoverage?: unknown;
};

type ResolvedEvidence = {
  status: LciaCalculationStatus;
  matrix: LciaMethodFactorCoverageMatrix<
    LcaUncharacterizedEvidenceArtifactV1 | LcaUncharacterizedEvidenceArtifactV2
  > | null;
  reason: string | null;
  payload: unknown;
  sourceKind: 'static' | 'worker' | 'legacy' | 'unknown';
  bundleVersion?: string;
};

function downloadText(filename: string, text: string, mediaType: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resolveStaticEvidence(raw: unknown): ResolvedEvidence | null {
  const report = parseStaticLciaReport(raw);
  if (!report) return null;
  return {
    status: report.calculation_status,
    matrix: report.method_factor_coverage,
    reason: report.failure_reason,
    payload: report,
    sourceKind: 'static',
    bundleVersion: report.source.bundle_version,
  };
}

function statusPresentation(
  status: LciaCalculationStatus,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
) {
  switch (status) {
    case 'complete':
      return {
        type: 'success' as const,
        title: formatMessage({ id: 'pages.process.lca.evidence.complete.title' }),
        detail: formatMessage({ id: 'pages.process.lca.evidence.complete.detail' }),
      };
    case 'incomplete_coverage':
      return {
        type: 'warning' as const,
        title: formatMessage({ id: 'pages.process.lca.evidence.incomplete.title' }),
        detail: formatMessage({ id: 'pages.process.lca.evidence.incomplete.detail' }),
      };
    case 'calculation_failure':
      return {
        type: 'error' as const,
        title: formatMessage({ id: 'pages.process.lca.evidence.failure.title' }),
        detail: formatMessage({ id: 'pages.process.lca.evidence.failure.detail' }),
      };
    default:
      return {
        type: 'error' as const,
        title: formatMessage({ id: 'pages.process.lca.evidence.drift.title' }),
        detail: formatMessage({ id: 'pages.process.lca.evidence.drift.detail' }),
      };
  }
}

export function isTrustedLciaGapArtifactUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '[::1]')
    );
  } catch {
    return false;
  }
}

export default function LcaCalculationEvidenceNotice({
  staticEvidence,
  calculationEvidence,
  methodFactorCoverage,
}: Props) {
  const intl = useIntl();
  const resolved = useMemo<ResolvedEvidence>(() => {
    if (calculationEvidence !== undefined || methodFactorCoverage !== undefined) {
      const service = resolveServiceLciaStatus(calculationEvidence, methodFactorCoverage);
      return {
        status: service.status,
        matrix: service.matrix,
        reason: service.reason,
        payload: {
          calculation_evidence: service.evidence ?? calculationEvidence,
          method_factor_coverage: service.matrix ?? methodFactorCoverage,
        },
        sourceKind:
          service.evidence?.schema_version === 'lca.calculation_evidence.v2' ? 'worker' : 'legacy',
        ...(service.evidence?.schema_version === 'lca.calculation_evidence.v2'
          ? { bundleVersion: service.evidence.lcia_method_factor_source.bundle_version }
          : {}),
      };
    }
    return (
      resolveStaticEvidence(staticEvidence) ?? {
        status: 'method_source_drift',
        matrix: null,
        reason: 'calculation_evidence_missing_or_invalid',
        payload: staticEvidence ?? null,
        sourceKind: 'unknown',
      }
    );
  }, [calculationEvidence, methodFactorCoverage, staticEvidence]);

  const presentation = statusPresentation(resolved.status, intl.formatMessage);
  const matrix = resolved.matrix;
  const incompleteCount = matrix
    ? matrix.counts.unmatched + matrix.counts.invalid + matrix.counts.unsupported_direction
    : null;

  const sourceLabel = intl.formatMessage(
    { id: `pages.process.lca.evidence.source.${resolved.sourceKind}` },
    { version: resolved.bundleVersion ?? '-' },
  );
  const reasonLabel = resolved.reason
    ? intl.formatMessage({
        id: `pages.process.lca.evidence.reason.${resolved.reason}`,
        defaultMessage: intl.formatMessage({ id: 'pages.process.lca.evidence.reason.unknown' }),
      })
    : null;
  const methodDescriptionById = useMemo(() => {
    const language = typeof intl.locale === 'string' && intl.locale.startsWith('zh') ? 'zh' : 'en';
    return new Map(
      STATIC_LCIA_METHOD_LIST.files.map((method) => [
        method.id,
        getLangText(method.description, language),
      ]),
    );
  }, [intl.locale]);

  const details = matrix ? (
    <Space direction='vertical' size='small' style={{ width: '100%' }}>
      <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size='small'>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.process.lca.evidence.source' })}>
          {sourceLabel}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.process.lca.evidence.matched' })}>
          {matrix.counts.matched}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.process.lca.evidence.missing' })}>
          {matrix.counts.unmatched}
        </Descriptions.Item>
        <Descriptions.Item label={intl.formatMessage({ id: 'pages.process.lca.evidence.invalid' })}>
          {matrix.counts.invalid + matrix.counts.unsupported_direction}
        </Descriptions.Item>
      </Descriptions>
      <Table
        columns={[
          {
            title: intl.formatMessage({ id: 'pages.process.lca.evidence.method' }),
            dataIndex: 'method_id',
            ellipsis: true,
            render: (methodId: string, row) => (
              <Space direction='vertical' size={0}>
                <Typography.Text>
                  {methodDescriptionById.get(row.artifact_locator_id) ||
                    intl.formatMessage({ id: 'pages.process.lca.evidence.method.unnamed' })}
                </Typography.Text>
                <Typography.Text type='secondary' copyable={{ text: methodId }}>
                  {methodId}
                </Typography.Text>
              </Space>
            ),
          },
          {
            title: intl.formatMessage({ id: 'pages.process.lca.evidence.version' }),
            dataIndex: 'method_version',
            width: 110,
          },
          {
            title: intl.formatMessage({ id: 'pages.process.lca.evidence.matched' }),
            dataIndex: ['counts', 'matched'],
            width: 90,
          },
          {
            title: intl.formatMessage({ id: 'pages.process.lca.evidence.missing' }),
            dataIndex: ['counts', 'unmatched'],
            width: 90,
          },
          {
            title: intl.formatMessage({ id: 'pages.process.lca.evidence.invalid.short' }),
            key: 'invalid',
            width: 90,
            render: (_, row) => row.counts.invalid + row.counts.unsupported_direction,
          },
        ]}
        dataSource={matrix.by_method}
        pagination={false}
        rowKey={(row) => `${row.method_id}:${row.method_version}`}
        scroll={{ y: 280 }}
        size='small'
      />
      <Typography.Text type='secondary' copyable={{ text: matrix.source_snapshot_sha256 }}>
        {intl.formatMessage({ id: 'pages.process.lca.evidence.snapshot' })}:{' '}
        {matrix.source_snapshot_sha256}
      </Typography.Text>
      {matrix.uncharacterized_evidence ? (
        <Descriptions column={1} size='small'>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.process.lca.evidence.artifact.count' })}
          >
            {matrix.uncharacterized_evidence.record_count}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'pages.process.lca.evidence.artifact.sha256' })}
          >
            <Typography.Text copyable={{ text: matrix.uncharacterized_evidence.artifact_sha256 }}>
              {matrix.uncharacterized_evidence.artifact_sha256}
            </Typography.Text>
          </Descriptions.Item>
        </Descriptions>
      ) : null}
      <Space wrap>
        <Button
          icon={<DownloadOutlined />}
          size='small'
          onClick={() =>
            downloadText(
              'lcia-calculation-evidence.json',
              `${JSON.stringify(resolved.payload, null, 2)}\n`,
              'application/json',
            )
          }
        >
          {intl.formatMessage({ id: 'pages.process.lca.evidence.download.json' })}
        </Button>
        {matrix.uncharacterized_exchanges?.length ? (
          <Button
            size='small'
            onClick={() =>
              downloadText(
                'lcia-uncharacterized.jsonl',
                `${matrix
                  .uncharacterized_exchanges!.map((gap) => JSON.stringify(gap))
                  .join('\n')}\n`,
                'application/x-ndjson',
              )
            }
          >
            {intl.formatMessage(
              { id: 'pages.process.lca.evidence.download.gaps' },
              { count: matrix.uncharacterized_exchanges.length },
            )}
          </Button>
        ) : matrix.uncharacterized_evidence &&
          isTrustedLciaGapArtifactUrl(matrix.uncharacterized_evidence.artifact_url) ? (
          <Button
            href={matrix.uncharacterized_evidence.artifact_url}
            rel='noreferrer'
            size='small'
            target='_blank'
          >
            {intl.formatMessage(
              { id: 'pages.process.lca.evidence.download.artifact' },
              { count: matrix.uncharacterized_evidence.record_count },
            )}
          </Button>
        ) : null}
      </Space>
    </Space>
  ) : (
    <Typography.Text type='secondary'>
      {intl.formatMessage({ id: 'pages.process.lca.evidence.matrix.missing' })}
    </Typography.Text>
  );

  return (
    <Alert
      type={presentation.type}
      showIcon={true}
      message={
        <Space wrap>
          <span>{presentation.title}</span>
          <Tag>
            {intl.formatMessage({ id: `pages.process.lca.evidence.status.${resolved.status}` })}
          </Tag>
          {incompleteCount !== null && incompleteCount > 0 ? (
            <Tag color='orange'>
              {intl.formatMessage(
                { id: 'pages.process.lca.evidence.gaps' },
                { count: incompleteCount },
              )}
            </Tag>
          ) : null}
        </Space>
      }
      description={
        <Space direction='vertical' size='small' style={{ width: '100%' }}>
          <Typography.Text>
            {presentation.detail}
            {reasonLabel ? ` ${reasonLabel}` : ''}
          </Typography.Text>
          <Collapse
            ghost={true}
            items={[
              {
                key: 'evidence',
                label: intl.formatMessage({ id: 'pages.process.lca.evidence.review' }),
                children: details,
              },
            ]}
          />
        </Space>
      }
    />
  );
}
