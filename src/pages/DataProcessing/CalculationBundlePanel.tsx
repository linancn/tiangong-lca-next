import {
  fetchCalculationBundleArtifactText,
  fetchCalculationBundleRecords,
  getCalculationBundle,
  type CalculationBundleArtifact,
  type CalculationBundleLciRecord,
  type CalculationBundleLciaRecord,
  type CalculationBundleProcessRecord,
  type CalculationBundleProjection,
} from '@/services/lcaReleases';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Alert, Button, Card, Descriptions, Select, Space, Spin, Table, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './index.less';

const MAX_INLINE_ARTIFACT_BYTES = 24 * 1024 * 1024;

type BundleIssue = { code: string; message: string };

export function artifactForProcess(
  artifacts: CalculationBundleArtifact[],
  kind: string,
  processIndex: number,
): CalculationBundleArtifact | undefined {
  return artifacts.find(
    (artifact) =>
      artifact.kind === kind &&
      (artifact.firstProcessIndex ?? -1) <= processIndex &&
      (artifact.lastProcessIndex ?? -1) >= processIndex,
  );
}

export function artifactInlineByteSize(artifact: CalculationBundleArtifact): number {
  return Math.max(artifact.byteSize, artifact.uncompressedByteSize ?? artifact.byteSize);
}

function assertInlineArtifact(artifact: CalculationBundleArtifact): void {
  if (artifactInlineByteSize(artifact) > MAX_INLINE_ARTIFACT_BYTES) {
    throw new Error(
      'This result chunk is too large for inline preview. Use the verified raw downloads below.',
    );
  }
}

export function formatBundleNumber(value: number): string {
  if (!Number.isFinite(value)) return '-';
  if (value === 0) return '0';
  const absolute = Math.abs(value);
  return absolute >= 1e6 || absolute < 1e-4 ? value.toExponential(6) : value.toPrecision(8);
}

export function processOptionLabel(process: CalculationBundleProcessRecord): string {
  return `${process.rootProcess.id} · ${process.rootProcess.version} · #${process.processIndex}`;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function recordsToCsv(headers: string[], rows: unknown[][]): string {
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function downloadText(filename: string, text: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function hashValue(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : '-';
}

type Props = {
  packageId: string;
  initialProcessId?: string;
  initialProcessVersion?: string;
};

const CalculationBundlePanel = ({ packageId, initialProcessId, initialProcessVersion }: Props) => {
  const intl = useIntl();
  const t = useCallback(
    (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const [bundle, setBundle] = useState<CalculationBundleProjection | null>(null);
  const [processes, setProcesses] = useState<CalculationBundleProcessRecord[]>([]);
  const [selectedProcessIndex, setSelectedProcessIndex] = useState<number | undefined>();
  const [lciRows, setLciRows] = useState<CalculationBundleLciRecord[]>([]);
  const [lciaRows, setLciaRows] = useState<CalculationBundleLciaRecord[]>([]);
  const [coverage, setCoverage] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [issue, setIssue] = useState<BundleIssue | null>(null);
  const [recordsIssue, setRecordsIssue] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeResultTab, setActiveResultTab] = useState('lci');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setIssue(null);
      setBundle(null);
      setProcesses([]);
      setSelectedProcessIndex(undefined);
      setCoverage(null);
      const result = await getCalculationBundle(packageId);
      if (cancelled) return;
      if (result.error || !result.data) {
        setIssue({
          code: result.error?.code ?? 'calculation_bundle_unavailable',
          message: result.error?.message ?? 'Calculation Bundle is unavailable.',
        });
        setLoading(false);
        return;
      }
      try {
        const nextBundle = result.data;
        const processArtifacts = nextBundle.calculationBundle.artifacts.filter(
          (artifact) => artifact.kind === 'process_axis',
        );
        processArtifacts.forEach(assertInlineArtifact);
        const processRows = (
          await Promise.all(
            processArtifacts.map((artifact) =>
              fetchCalculationBundleRecords<CalculationBundleProcessRecord>(artifact),
            ),
          )
        )
          .flat()
          .sort((left, right) => left.processIndex - right.processIndex);
        const coverageArtifact = nextBundle.calculationBundle.artifacts.find(
          (artifact) => artifact.kind === 'coverage',
        );
        if (coverageArtifact) assertInlineArtifact(coverageArtifact);
        const coveragePayload = coverageArtifact
          ? JSON.parse(await fetchCalculationBundleArtifactText(coverageArtifact))
          : null;
        if (cancelled) return;
        const preferred = processRows.find(
          (process) =>
            process.rootProcess.id === initialProcessId &&
            (!initialProcessVersion || process.rootProcess.version === initialProcessVersion),
        );
        setBundle(nextBundle);
        setProcesses(processRows);
        setCoverage(coveragePayload);
        setSelectedProcessIndex(preferred?.processIndex ?? processRows[0]?.processIndex);
      } catch (error) {
        if (!cancelled) {
          setIssue({
            code: 'calculation_bundle_preview_failed',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialProcessId, initialProcessVersion, packageId, reloadToken]);

  useEffect(() => {
    let cancelled = false;
    const loadRecords = async () => {
      if (!bundle || selectedProcessIndex === undefined) return;
      setRecordsLoading(true);
      setRecordsIssue(null);
      setLciRows([]);
      setLciaRows([]);
      const artifacts = bundle.calculationBundle.artifacts;
      const lciArtifact = artifactForProcess(artifacts, 'lci', selectedProcessIndex);
      const lciaArtifact = artifactForProcess(artifacts, 'lcia', selectedProcessIndex);
      if (!lciArtifact || !lciaArtifact) {
        setRecordsIssue('Calculation Bundle result chunks are incomplete for this process.');
        setRecordsLoading(false);
        return;
      }
      if (
        artifactInlineByteSize(lciArtifact) > MAX_INLINE_ARTIFACT_BYTES ||
        artifactInlineByteSize(lciaArtifact) > MAX_INLINE_ARTIFACT_BYTES
      ) {
        setRecordsIssue(
          'This result chunk is too large for inline preview. Use the verified raw downloads below.',
        );
        setRecordsLoading(false);
        return;
      }
      try {
        const [nextLciRows, nextLciaRows] = await Promise.all([
          fetchCalculationBundleRecords<CalculationBundleLciRecord>(lciArtifact),
          fetchCalculationBundleRecords<CalculationBundleLciaRecord>(lciaArtifact),
        ]);
        if (cancelled) return;
        setLciRows(nextLciRows.filter((row) => row.processIndex === selectedProcessIndex));
        setLciaRows(nextLciaRows.filter((row) => row.processIndex === selectedProcessIndex));
      } catch (error) {
        if (!cancelled) setRecordsIssue(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    };
    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [bundle, selectedProcessIndex]);

  const selectedProcess = processes.find(
    (process) => process.processIndex === selectedProcessIndex,
  );
  const processOptions = processes.map((process) => ({
    label: processOptionLabel(process),
    value: String(process.processIndex),
  }));
  const bundleData = bundle?.calculationBundle;
  const manifest = bundleData?.manifest;
  const coverageComplete = coverage?.complete;

  const exportLciCsv = () =>
    downloadText(
      `lci-${selectedProcess?.rootProcess.id ?? 'process'}.csv`,
      recordsToCsv(
        ['flow_uuid', 'flow_version', 'direction', 'unit', 'location', 'mean_amount'],
        lciRows.map((row) => [
          row.flow.id,
          row.flow.version,
          row.direction,
          row.unit,
          row.location ?? '',
          row.meanAmount,
        ]),
      ),
      'text/csv;charset=utf-8',
    );
  const exportJson = (kind: 'lci' | 'lcia', rows: unknown[]) =>
    downloadText(
      `${kind}-${selectedProcess?.rootProcess.id ?? 'process'}.json`,
      `${JSON.stringify(rows, null, 2)}\n`,
      'application/json',
    );

  const lciColumns = useMemo(
    () => [
      { title: t('pages.dataProcessing.bundle.flow', 'Flow UUID'), dataIndex: ['flow', 'id'] },
      {
        title: t('pages.dataProcessing.bundle.version', 'Version'),
        dataIndex: ['flow', 'version'],
      },
      { title: t('pages.dataProcessing.bundle.direction', 'Direction'), dataIndex: 'direction' },
      { title: t('pages.dataProcessing.bundle.unit', 'Unit'), dataIndex: 'unit' },
      {
        title: t('pages.dataProcessing.bundle.location', 'Location'),
        dataIndex: 'location',
        render: (value: unknown) => hashValue(value),
      },
      {
        title: t('pages.dataProcessing.bundle.amount', 'Amount'),
        dataIndex: 'meanAmount',
        render: (value: number) => formatBundleNumber(value),
      },
    ],
    [t],
  );
  const lciaColumns = useMemo(
    () => [
      {
        title: t('pages.dataProcessing.bundle.method', 'LCIA method UUID'),
        dataIndex: ['method', 'id'],
      },
      {
        title: t('pages.dataProcessing.bundle.version', 'Version'),
        dataIndex: ['method', 'version'],
      },
      {
        title: t('pages.dataProcessing.bundle.amount', 'Amount'),
        dataIndex: 'meanAmount',
        render: (value: number) => formatBundleNumber(value),
      },
    ],
    [t],
  );

  if (loading) return <Spin spinning={true} />;
  if (issue) {
    const legacy = issue.code === 'calculation_bundle_not_available';
    return (
      <Space direction='vertical' className={styles.previewDetails}>
        <Alert
          type={legacy ? 'info' : 'error'}
          message={
            legacy
              ? t(
                  'pages.dataProcessing.bundle.legacy',
                  'Legacy LCIA-only result set: no Calculation Bundle or directional LCI is available.',
                )
              : issue.message
          }
        />
        <Button size='small' icon={<ReloadOutlined />} onClick={() => setReloadToken((v) => v + 1)}>
          {t('pages.dataProcessing.bundle.retry', 'Retry')}
        </Button>
      </Space>
    );
  }
  if (!bundleData || !manifest) return null;

  const resultNotice = recordsIssue ? <Alert type='warning' message={recordsIssue} /> : null;
  const processControl = (
    <Space className={styles.bundleToolbar} wrap>
      <span>{t('pages.dataProcessing.bundle.process', 'Process')}</span>
      <Select
        aria-label={t('pages.dataProcessing.bundle.process', 'Process')}
        value={selectedProcessIndex === undefined ? undefined : String(selectedProcessIndex)}
        options={processOptions}
        showSearch
        optionFilterProp='label'
        onChange={(value) => setSelectedProcessIndex(Number(value))}
      />
    </Space>
  );
  const rawActions = (
    <Space wrap>
      <Button
        size='small'
        icon={<DownloadOutlined />}
        onClick={exportLciCsv}
        disabled={!lciRows.length}
      >
        {t('pages.dataProcessing.bundle.exportCsv', 'Export CSV')}
      </Button>
      <Button
        size='small'
        icon={<DownloadOutlined />}
        onClick={() => exportJson('lci', lciRows)}
        disabled={!lciRows.length}
      >
        {t('pages.dataProcessing.bundle.exportJson', 'Export JSON')}
      </Button>
    </Space>
  );

  return (
    <Card
      className={styles.bundleCard}
      title={t('pages.dataProcessing.bundle.title', 'Calculation Bundle')}
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => setReloadToken((value) => value + 1)}>
          {t('pages.dataProcessing.bundle.refresh', 'Refresh secure links')}
        </Button>
      }
    >
      <Space direction='vertical' size='middle' className={styles.previewDetails}>
        <Descriptions bordered size='small' column={2}>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.schema', 'Contract')}>
            {manifest.schemaVersion}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.coverage', 'Coverage')}>
            {coverageComplete === true
              ? t('pages.dataProcessing.bundle.complete', 'Complete')
              : t('pages.dataProcessing.bundle.blocked', 'Incomplete / blocked')}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.processCount', 'Processes')}>
            {manifest.scope.processCount}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.impactCount', 'LCIA methods')}>
            {manifest.snapshot.impactCount}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.snapshot', 'Snapshot')}>
            <code>{manifest.snapshot.id}</code>
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.dataProcessing.bundle.contentHash', 'Bundle hash')}>
            <code>{manifest.bundleContentHash}</code>
          </Descriptions.Item>
        </Descriptions>
        {processControl}
        <Spin spinning={recordsLoading}>
          <Tabs
            activeKey={activeResultTab}
            onChange={setActiveResultTab}
            items={[
              {
                key: 'lci',
                label: 'LCI',
                children: (
                  <Space direction='vertical' size='middle' className={styles.previewDetails}>
                    {resultNotice}
                    {rawActions}
                    <Table
                      size='small'
                      rowKey={(row: CalculationBundleLciRecord) =>
                        `${row.processIndex}:${row.flow.id}:${row.flow.version}:${row.direction}:${row.location ?? ''}`
                      }
                      columns={lciColumns}
                      dataSource={lciRows}
                      pagination={{ pageSize: 25 }}
                    />
                  </Space>
                ),
              },
              {
                key: 'lcia',
                label: 'LCIA',
                children: (
                  <Space direction='vertical' size='middle' className={styles.previewDetails}>
                    {resultNotice}
                    <Button
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={() => exportJson('lcia', lciaRows)}
                      disabled={!lciaRows.length}
                    >
                      {t('pages.dataProcessing.bundle.exportJson', 'Export JSON')}
                    </Button>
                    <Table
                      size='small'
                      rowKey={(row: CalculationBundleLciaRecord) =>
                        `${row.processIndex}:${row.method.id}:${row.method.version}`
                      }
                      columns={lciaColumns}
                      dataSource={lciaRows}
                      pagination={{ pageSize: 25 }}
                    />
                  </Space>
                ),
              },
              {
                key: 'evidence',
                label: t('pages.dataProcessing.bundle.evidence', 'Evidence'),
                children: (
                  <Descriptions bordered size='small' column={1}>
                    <Descriptions.Item
                      label={t('pages.dataProcessing.bundle.selectionHash', 'Selection hash')}
                    >
                      <code>{manifest.scope.selectionManifestHash}</code>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('pages.dataProcessing.bundle.snapshotHash', 'Snapshot hash')}
                    >
                      <code>{manifest.snapshot.sha256}</code>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('pages.dataProcessing.bundle.methodSetHash', 'Method identity hash')}
                    >
                      <code>{hashValue(manifest.methodSet.methodIdentityManifestSha256)}</code>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('pages.dataProcessing.bundle.factorHash', 'Factor hash')}
                    >
                      <code>{hashValue(manifest.methodSet.factorManifestSha256)}</code>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('pages.dataProcessing.bundle.artifactCount', 'Verified artifacts')}
                    >
                      {bundleData.artifactCount}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'downloads',
                label: t('pages.dataProcessing.bundle.downloads', 'Downloads'),
                children: (
                  <div className={styles.bundleDownloadGrid}>
                    <section className={styles.bundleDownloadItem}>
                      <strong>calculation-bundle.json</strong>
                      <code>{bundleData.manifestSha256}</code>
                      <a
                        href={bundleData.manifestDownload.signedDownloadUrl}
                        download='calculation-bundle.json'
                        rel='noreferrer'
                      >
                        <Button size='small' icon={<DownloadOutlined />}>
                          {t('pages.dataProcessing.bundle.download', 'Download')}
                        </Button>
                      </a>
                    </section>
                    {bundleData.artifacts.map((artifact) => (
                      <section key={artifact.path} className={styles.bundleDownloadItem}>
                        <strong>{artifact.path}</strong>
                        <span>
                          {artifact.kind} · {artifact.recordCount} records
                        </span>
                        <code>{artifact.sha256}</code>
                        <a
                          href={artifact.signedDownloadUrl}
                          download={artifact.path.split('/').pop()}
                          rel='noreferrer'
                        >
                          <Button size='small' icon={<DownloadOutlined />}>
                            {t('pages.dataProcessing.bundle.download', 'Download')}
                          </Button>
                        </a>
                      </section>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Spin>
      </Space>
    </Card>
  );
};

export default CalculationBundlePanel;
