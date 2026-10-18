import { resolveContentLanguage } from '@/services/general/contentLanguageRegistry';
import {
  createResultMetadataReader,
  resultReferenceKey,
  resultMethodMetadata,
  type ResultMetadata,
} from '@/services/lcaReleases/presentation';
import {
  fetchCalculationBundleArtifactText,
  fetchCalculationBundleRecords,
  fetchFreshCalculationBundleDownloadBlob,
  getCalculationBundle,
  type CalculationBundleArtifact,
  type CalculationBundleLciRecord,
  type CalculationBundleLciaRecord,
  type CalculationBundleProcessRecord,
  type CalculationBundleProjection,
  type CalculationBundleSignedDownload,
  type CalculationProductDownload,
} from '@/services/lcaReleases';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './index.less';
import CalculationExportsPanel from './CalculationExportsPanel';

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

export function saveBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

function downloadText(filename: string, text: string, mediaType: string): void {
  saveBlobDownload(filename, new Blob([text], { type: mediaType }));
}

function hashValue(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : '-';
}

type Props = {
  packageId: string;
  view?: 'results' | 'exports';
  onReviewCalculation?: () => void;
  initialProcessId?: string;
  initialProcessVersion?: string;
  processName?: string;
};

const CalculationBundlePanel = ({
  packageId,
  view,
  onReviewCalculation,
  initialProcessId,
  initialProcessVersion,
  processName,
}: Props) => {
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
  const [downloadIssue, setDownloadIssue] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const language = resolveContentLanguage(intl.locale);
  const readMetadata = useMemo(() => createResultMetadataReader(language), [language, packageId]);
  const [flowMetadata, setFlowMetadata] = useState<Record<string, ResultMetadata>>({});
  const [resolvedProcessName, setResolvedProcessName] = useState('');
  const [lciPage, setLciPage] = useState(1);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [activeResultTab, setActiveResultTab] = useState('lcia');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setIssue(null);
      setBundle(null);
      setProcesses([]);
      setLciRows([]);
      setLciaRows([]);
      setSelectedProcessIndex(undefined);
      setCoverage(null);
      setDownloadIssue(null);
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
            process.rootProcess.version === initialProcessVersion,
        );
        setBundle(nextBundle);
        setProcesses(processRows);
        setCoverage(coveragePayload);
        setSelectedProcessIndex(
          initialProcessId ? preferred?.processIndex : processRows[0]?.processIndex,
        );
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
      if (view === 'exports' || !bundle || selectedProcessIndex === undefined) return;
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
  }, [bundle, selectedProcessIndex, view]);

  const selectedProcess = processes.find(
    (process) => process.processIndex === selectedProcessIndex,
  );
  useEffect(() => {
    let cancelled = false;
    setLciPage(1);
    setResolvedProcessName('');
    if (selectedProcess && view !== 'exports') {
      void readMetadata('processes', [selectedProcess.rootProcess]).then((metadata) => {
        if (!cancelled)
          setResolvedProcessName(
            metadata[resultReferenceKey(selectedProcess.rootProcess)]?.name ?? '',
          );
      });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedProcess, readMetadata, view, metadataRetry]);

  useEffect(() => {
    let cancelled = false;
    setFlowMetadata({});
    if (!selectedProcess || view === 'exports') return;
    setMetadataLoading(true);
    const references = [
      selectedProcess.quantitativeReference.flow,
      ...lciRows.slice((lciPage - 1) * 25, lciPage * 25).map((row) => row.flow),
    ];
    void readMetadata('flows', references).then((metadata) => {
      if (!cancelled) {
        setFlowMetadata(metadata);
        setMetadataLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProcess, lciRows, lciPage, readMetadata, view, metadataRetry]);

  const displayName = processName || resolvedProcessName;
  const reference = selectedProcess?.quantitativeReference;
  const referenceName = reference && flowMetadata[resultReferenceKey(reference.flow)]?.name;
  const metadataUnavailable =
    !metadataLoading &&
    selectedProcess &&
    (!displayName ||
      !referenceName ||
      lciRows
        .slice((lciPage - 1) * 25, lciPage * 25)
        .some((row) => !flowMetadata[resultReferenceKey(row.flow)]));
  const processOptions = processes.map((process) => ({
    label: processOptionLabel(process),
    value: String(process.processIndex),
  }));
  const bundleData = bundle?.calculationBundle;
  const manifest = bundleData?.manifest;
  const coverageComplete = coverage?.complete;
  const productDownloads = bundleData?.downloads ?? [];
  const downloadsFor = (group: CalculationProductDownload['group']) =>
    productDownloads.filter((download) => download.group === group);

  const exportLciCsv = () =>
    downloadText(
      `lci-${selectedProcess!.rootProcess.id}.csv`,
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
      `${kind}-${selectedProcess!.rootProcess.id}.json`,
      `${JSON.stringify(rows, null, 2)}\n`,
      'application/json',
    );

  const downloadVerifiedArtifact = async (
    key: string,
    artifactPath: string | null,
    filename: string,
    download: Pick<
      CalculationBundleSignedDownload,
      'signedDownloadUrl' | 'sha256' | 'byteSize' | 'mediaType'
    >,
  ) => {
    setDownloadIssue(null);
    setDownloadingPath(key);
    try {
      const blob = await fetchFreshCalculationBundleDownloadBlob(packageId, artifactPath, download);
      saveBlobDownload(filename, blob);
    } catch (error) {
      setDownloadIssue(error instanceof Error ? error.message : String(error));
    } finally {
      setDownloadingPath(null);
    }
  };

  const lciColumns = useMemo(
    () => [
      {
        title: t('pages.dataProcessing.resultView.flow', 'Flow'),
        dataIndex: ['flow', 'id'],
        render: (id: string, row: CalculationBundleLciRecord) => (
          <span title={`${id} · ${row.flow.version}`}>
            {flowMetadata[resultReferenceKey(row.flow)]?.name || id}
          </span>
        ),
      },
      {
        title: t('pages.dataProcessing.bundle.version', 'Version'),
        dataIndex: ['flow', 'version'],
      },
      {
        title: t('pages.dataProcessing.bundle.direction', 'Direction'),
        dataIndex: 'direction',
        render: (value: string) =>
          value === 'Input'
            ? t('pages.dataProcessing.resultView.input', 'Input')
            : value === 'Output'
              ? t('pages.dataProcessing.resultView.output', 'Output')
              : value,
      },
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
    [t, flowMetadata],
  );
  const lciaColumns = useMemo(
    () => [
      {
        title: t('pages.dataProcessing.preview.lciaMethod', 'LCIA method'),
        dataIndex: ['method', 'id'],
        render: (id: string, row: CalculationBundleLciaRecord) => {
          const metadata = resultMethodMetadata(row.method, language);
          return (
            <span title={`${id} · ${row.method.version}`}>
              {metadata.name === '-' ? id : metadata.name}
            </span>
          );
        },
      },
      {
        title: t('pages.dataProcessing.bundle.version', 'Version'),
        dataIndex: ['method', 'version'],
      },
      {
        title: t('pages.dataProcessing.preview.value', 'Value'),
        dataIndex: 'meanAmount',
        render: (value: number) => formatBundleNumber(value),
      },
      {
        title: t('pages.dataProcessing.bundle.unit', 'Unit'),
        key: 'unit',
        render: (_: unknown, row: CalculationBundleLciaRecord) =>
          resultMethodMetadata(row.method, language).unit,
      },
    ],
    [t, language],
  );

  if (loading) return <Spin spinning={true} />;
  if (issue) {
    const legacy = issue.code === 'calculation_bundle_not_available';
    return (
      <Space orientation='vertical' className={styles.previewDetails}>
        <Alert
          type={legacy ? 'info' : 'error'}
          title={
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

  const resultNotice = recordsIssue ? (
    <Alert type='warning' title={recordsIssue} />
  ) : initialProcessId && !selectedProcess ? (
    <Alert
      type='info'
      title={t(
        'pages.dataProcessing.resultView.processUnavailable',
        'This process version is not included in this calculation.',
      )}
    />
  ) : null;
  const processControl = (
    <Space className={styles.bundleToolbar} wrap>
      <span>{t('pages.dataProcessing.bundle.process', 'Process')}</span>
      {initialProcessId ? (
        <Typography.Text strong>
          {displayName || initialProcessId} · {initialProcessVersion}
        </Typography.Text>
      ) : (
        <Select
          aria-label={t('pages.dataProcessing.bundle.process', 'Process')}
          className={styles.bundleProcessSelect}
          value={selectedProcessIndex === undefined ? undefined : String(selectedProcessIndex)}
          options={processOptions}
          showSearch={{ optionFilterProp: 'label' }}
          onChange={(value) => setSelectedProcessIndex(Number(value))}
        />
      )}
      {reference ? (
        <Typography.Text type='secondary'>
          {t('pages.dataProcessing.resultView.reference', 'Dataset reference quantity')}:{' '}
          {referenceName || reference.flow.id} · {formatBundleNumber(reference.meanAmount)}{' '}
          {reference.referenceUnit}
        </Typography.Text>
      ) : null}
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
        {t('pages.dataProcessing.workspace.currentCsv', 'Current process CSV')}
      </Button>
      <Button
        size='small'
        icon={<DownloadOutlined />}
        onClick={() => exportJson('lci', lciRows)}
        disabled={!lciRows.length}
      >
        {t('pages.dataProcessing.workspace.currentJson', 'Current process JSON')}
      </Button>
    </Space>
  );
  const productDownloadCards = (downloads: CalculationProductDownload[]) =>
    downloads.map((download) => (
      <section key={download.role} className={styles.bundleDownloadItem}>
        <strong>{download.fileName}</strong>
        <span>
          {download.recordCount} {t('pages.dataProcessing.bundle.records', 'records')}
        </span>
        <code>{download.sha256}</code>
        <Button
          size='small'
          icon={<DownloadOutlined />}
          loading={downloadingPath === `download:${download.role}`}
          disabled={downloadingPath !== null}
          onClick={() =>
            void downloadVerifiedArtifact(
              `download:${download.role}`,
              `download:${download.role}`,
              download.fileName,
              download,
            )
          }
        >
          {t('pages.dataProcessing.bundle.download', 'Download')}
        </Button>
      </section>
    ));

  return (
    <Card
      className={styles.bundleCard}
      title={t('pages.dataProcessing.resultView.title', 'Process results')}
    >
      <Space orientation='vertical' size='middle' className={styles.previewDetails}>
        {view !== 'exports' ? processControl : null}
        {metadataUnavailable && view !== 'exports' ? (
          <Space>
            <Typography.Text type='secondary'>
              {t(
                'pages.dataProcessing.resultView.metadataUnavailable',
                'Some names are unavailable. Exact identifiers remain visible; results are unchanged.',
              )}
            </Typography.Text>
            <Button size='small' onClick={() => setMetadataRetry((value) => value + 1)}>
              {t('pages.dataProcessing.bundle.retry', 'Retry')}
            </Button>
          </Space>
        ) : null}
        <Spin spinning={recordsLoading}>
          <Tabs
            activeKey={view === 'exports' ? 'downloads' : activeResultTab}
            onChange={setActiveResultTab}
            items={[
              {
                key: 'lci',
                label: 'LCI',
                children: (
                  <Space orientation='vertical' size='middle' className={styles.previewDetails}>
                    {resultNotice}
                    {rawActions}
                    <Table
                      size='small'
                      rowKey={(row: CalculationBundleLciRecord) =>
                        `${row.processIndex}:${row.flow.id}:${row.flow.version}:${row.direction}:${row.location ?? ''}`
                      }
                      columns={lciColumns}
                      dataSource={lciRows}
                      pagination={{
                        current: lciPage,
                        pageSize: 25,
                        showSizeChanger: false,
                        onChange: setLciPage,
                      }}
                      scroll={{ x: 700, y: 480 }}
                    />
                  </Space>
                ),
              },
              {
                key: 'lcia',
                label: 'LCIA',
                children: (
                  <Space orientation='vertical' size='middle' className={styles.previewDetails}>
                    {resultNotice}
                    <Button
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={() => exportJson('lcia', lciaRows)}
                      disabled={!lciaRows.length}
                    >
                      {t('pages.dataProcessing.workspace.currentJson', 'Current process JSON')}
                    </Button>
                    <Table
                      size='small'
                      rowKey={(row: CalculationBundleLciaRecord) =>
                        `${row.processIndex}:${row.method.id}:${row.method.version}`
                      }
                      columns={lciaColumns}
                      dataSource={lciaRows}
                      pagination={false}
                      scroll={{ x: 600, y: 480 }}
                    />
                  </Space>
                ),
              },
              {
                key: 'downloads',
                label: t('pages.dataProcessing.bundle.downloads', 'Downloads'),
                children: (
                  <Space orientation='vertical' size='middle' className={styles.previewDetails}>
                    {downloadIssue ? (
                      <Alert
                        type='error'
                        title={downloadIssue}
                        action={
                          <Button size='small' onClick={() => setReloadToken((value) => value + 1)}>
                            {t('pages.dataProcessing.bundle.refresh', 'Refresh secure links')}
                          </Button>
                        }
                      />
                    ) : null}
                    <CalculationExportsPanel
                      packageId={packageId}
                      onReviewCalculation={onReviewCalculation}
                    />
                    <strong>{t('pages.dataProcessing.bundle.resultFiles', 'Result files')}</strong>
                    <div className={styles.bundleDownloadGrid}>
                      {productDownloadCards(downloadsFor('results'))}
                    </div>
                    <strong>
                      {t('pages.dataProcessing.bundle.advancedFiles', 'Advanced data')}
                    </strong>
                    <div className={styles.bundleDownloadGrid}>
                      {productDownloadCards(downloadsFor('advanced_data'))}
                    </div>
                    <strong>{t('pages.dataProcessing.bundle.auditFiles', 'Audit evidence')}</strong>
                    <div className={styles.bundleDownloadGrid}>
                      <section className={styles.bundleDownloadItem}>
                        <strong>calculation-bundle.json</strong>
                        <code>{bundleData.manifestSha256}</code>
                        <Button
                          size='small'
                          icon={<DownloadOutlined />}
                          loading={downloadingPath === 'calculation-bundle.json'}
                          disabled={downloadingPath !== null}
                          onClick={() =>
                            void downloadVerifiedArtifact(
                              'calculation-bundle.json',
                              null,
                              'calculation-bundle.json',
                              bundleData.manifestDownload,
                            )
                          }
                        >
                          {t('pages.dataProcessing.bundle.download', 'Download')}
                        </Button>
                      </section>
                      {productDownloadCards(downloadsFor('audit_evidence'))}
                    </div>
                  </Space>
                ),
              },
            ].filter(
              (item) =>
                !view || (view === 'exports' ? item.key === 'downloads' : item.key !== 'downloads'),
            )}
          />
        </Spin>
        <Collapse
          items={[
            {
              key: 'identity',
              label: t('pages.dataProcessing.workspace.evidence', 'Technical evidence'),
              children: (
                <Descriptions
                  bordered
                  size='small'
                  column={2}
                  items={[
                    {
                      key: 'selection-hash',
                      label: t('pages.dataProcessing.bundle.selectionHash', 'Selection hash'),
                      children: <code>{manifest.scope.selectionManifestHash}</code>,
                    },
                    {
                      key: 'snapshot-hash',
                      label: t('pages.dataProcessing.bundle.snapshotHash', 'Snapshot hash'),
                      children: <code>{manifest.snapshot.sha256}</code>,
                    },
                    {
                      key: 'method-set-hash',
                      label: t('pages.dataProcessing.bundle.methodSetHash', 'Method identity hash'),
                      children: (
                        <code>{hashValue(manifest.methodSet.methodIdentityManifestSha256)}</code>
                      ),
                    },
                    {
                      key: 'factor-hash',
                      label: t('pages.dataProcessing.bundle.factorHash', 'Factor hash'),
                      children: <code>{hashValue(manifest.methodSet.factorManifestSha256)}</code>,
                    },
                    {
                      key: 'artifact-count',
                      label: t('pages.dataProcessing.bundle.artifactCount', 'Verified artifacts'),
                      children: bundleData.artifactCount,
                    },

                    {
                      key: 'contract',
                      label: t('pages.dataProcessing.bundle.schema', 'Contract'),
                      children: manifest.schemaVersion,
                    },
                    {
                      key: 'coverage',
                      label: t('pages.dataProcessing.bundle.coverage', 'Coverage'),
                      children:
                        coverageComplete === true
                          ? t('pages.dataProcessing.bundle.complete', 'Complete')
                          : t('pages.dataProcessing.bundle.blocked', 'Incomplete / blocked'),
                    },
                    {
                      key: 'process-count',
                      label: t('pages.dataProcessing.bundle.processCount', 'Processes'),
                      children: manifest.scope.processCount,
                    },
                    {
                      key: 'impact-count',
                      label: t('pages.dataProcessing.bundle.impactCount', 'LCIA methods'),
                      children: manifest.snapshot.impactCount,
                    },
                    {
                      key: 'snapshot',
                      label: t('pages.dataProcessing.bundle.snapshot', 'Snapshot'),
                      children: <code>{manifest.snapshot.id}</code>,
                    },
                    {
                      key: 'content-hash',
                      label: t('pages.dataProcessing.bundle.contentHash', 'Bundle hash'),
                      children: <code>{manifest.bundleContentHash}</code>,
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
};

export default CalculationBundlePanel;
