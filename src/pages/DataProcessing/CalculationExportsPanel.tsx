import {
  getCalculationExport,
  requestCalculationExport,
  fetchFreshCalculationExportBlob,
  type CalculationExportFormat,
  type CalculationExportProjection,
  type CalculationExportFile,
} from '@/services/lcaReleases';
import { useIntl } from '@umijs/max';
import { Alert, Button, Collapse, Select, Space, Table } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function CalculationExportsPanel({
  packageId,
  onReviewCalculation,
}: {
  packageId: string;
  onReviewCalculation?: () => void;
}) {
  const intl = useIntl();
  const [format, setFormat] = useState<CalculationExportFormat>('parquet');
  const [projection, setProjection] = useState<CalculationExportProjection | null>(null);
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const generation = useRef(0);
  const active =
    projection !== null && ['queued', 'running', 'waiting', 'stale'].includes(projection.status);

  useEffect(() => {
    const token = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setProjection(null);
    setError(null);
    setBusy(false);
    setDownloading(null);
    const read = async () => {
      try {
        const response = await getCalculationExport(packageId, format, offset);
        if (generation.current !== token) return;
        if (response.error || !response.data)
          throw new Error(response.error?.message ?? 'Export status unavailable');
        setProjection(response.data);
        if (['queued', 'running', 'waiting', 'stale'].includes(response.data.status))
          timer = setTimeout(() => void read(), 4000);
      } catch (cause) {
        if (generation.current === token)
          setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void read();
    return () => {
      generation.current++;
      if (timer) clearTimeout(timer);
    };
  }, [packageId, format, offset, reload]);

  const start = async () => {
    const token = generation.current;
    setBusy(true);
    setError(null);
    try {
      const response = await requestCalculationExport(packageId, format);
      if (generation.current !== token) return;
      if (response.error || !response.data)
        throw new Error(response.error?.message ?? 'Export request failed');
      setProjection(response.data);
      setReload((value) => value + 1);
    } catch (cause) {
      if (generation.current === token)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (generation.current === token) setBusy(false);
    }
  };
  const download = useCallback(
    async (file: CalculationExportFile) => {
      const token = generation.current;
      setDownloading(file.fileName);
      setError(null);
      try {
        const blob = await fetchFreshCalculationExportBlob(projection!, file);
        if (generation.current !== token) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        try {
          link.href = url;
          link.download = file.fileName;
          document.body.appendChild(link);
          link.click();
        } finally {
          link.remove();
          URL.revokeObjectURL(url);
        }
      } catch (cause) {
        if (generation.current === token)
          setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (generation.current === token) setDownloading(null);
      }
    },
    [projection],
  );
  const terminal = projection && ['failed', 'cancelled', 'blocked'].includes(projection.status);
  const result = projection?.result;
  return (
    <Space orientation='vertical' style={{ width: '100%' }}>
      <strong>
        {intl.formatMessage({
          id: 'pages.dataProcessing.exports.title',
          defaultMessage: 'On-demand exports',
        })}
      </strong>
      <span>
        {intl.formatMessage({
          id: 'pages.dataProcessing.exports.description',
          defaultMessage:
            'Calculation results are ready independently of exports. CSV files contain at most 250,000 rows and 64 MiB each.',
        })}
      </span>
      <span>
        {intl.formatMessage({
          id: 'pages.dataProcessing.workspace.exportScope',
          defaultMessage:
            'All results in this calculation version. Parquet and CSV parts contain LCI; LCIA formats contain impact results.',
        })}
      </span>
      <Space wrap>
        <Select
          aria-label={intl.formatMessage({
            id: 'pages.dataProcessing.exports.format',
            defaultMessage: 'Export format',
          })}
          value={format}
          onChange={(value) => {
            setFormat(value);
            setOffset(0);
          }}
          options={[
            { value: 'parquet', label: 'Parquet' },
            {
              value: 'csv',
              label: intl.formatMessage({
                id: 'pages.dataProcessing.exports.csv',
                defaultMessage: 'CSV parts',
              }),
            },
            { value: 'lcia_xlsx', label: 'LCIA XLSX' },
            { value: 'lcia_csv', label: 'LCIA CSV' },
            {
              value: 'audit',
              label: intl.formatMessage({
                id: 'pages.dataProcessing.exports.audit',
                defaultMessage: 'Audit files',
              }),
            },
          ]}
          style={{ minWidth: 180 }}
        />
        <Button
          onClick={() => void start()}
          loading={busy}
          disabled={!projection || projection.status !== 'not_requested'}
        >
          {intl.formatMessage({
            id: 'pages.dataProcessing.exports.generate',
            defaultMessage: 'Generate export',
          })}
        </Button>
        <Button onClick={() => setReload((value) => value + 1)}>
          {intl.formatMessage({
            id: 'pages.dataProcessing.exports.refresh',
            defaultMessage: 'Refresh export status',
          })}
        </Button>
        {active ? (
          <span>
            {intl.formatMessage({
              id: 'pages.dataProcessing.exports.pending',
              defaultMessage: 'Export in progress',
            })}{' '}
            {projection?.progress === null ? '' : `${Math.round(projection.progress * 100)}%`}
          </span>
        ) : null}
      </Space>
      {terminal ? (
        <Alert
          type='warning'
          title={intl.formatMessage({
            id: 'pages.dataProcessing.exports.failed',
            defaultMessage: 'Export stopped. Calculation results remain available.',
          })}
          description={
            <Space orientation='vertical'>
              <span>
                {projection.errorCode === 'frozen_method_axis_missing'
                  ? intl.formatMessage({
                      id: 'pages.dataProcessing.workspace.exportIncompatible',
                      defaultMessage:
                        'This calculation lacks the frozen method data required for this format. A compatible calculation is needed; refreshing or repeating the export will not repair it.',
                    })
                  : intl.formatMessage({
                      id: 'pages.dataProcessing.workspace.exportRecovery',
                      defaultMessage:
                        'Refreshing only checks status. This screen cannot retry a stopped export. Review the calculation and share the technical details with an administrator.',
                    })}
              </span>
              {onReviewCalculation ? (
                <Button onClick={onReviewCalculation}>
                  {intl.formatMessage({
                    id: 'pages.dataProcessing.workspace.reviewCalculation',
                    defaultMessage: 'Review calculation',
                  })}
                </Button>
              ) : null}
              <Collapse
                items={[
                  {
                    key: 'error',
                    label: intl.formatMessage({
                      id: 'pages.dataProcessing.workspace.evidence',
                      defaultMessage: 'Technical evidence',
                    }),
                    children: (
                      <code
                        style={{ overflowWrap: 'anywhere' }}
                      >{`${projection.errorCode ?? projection.status} (${projection.workerJobId ?? ''}): ${projection.errorMessage ?? ''}`}</code>
                    ),
                  },
                ]}
              />
            </Space>
          }
        />
      ) : null}
      {error ? <Alert type='error' title={error} /> : null}
      {result ? (
        <>
          <Button disabled={downloading !== null} onClick={() => void download(result.manifest)}>
            {intl.formatMessage({
              id: 'pages.dataProcessing.exports.manifest',
              defaultMessage: 'Download export manifest',
            })}
          </Button>
          <span>
            {intl.formatMessage(
              {
                id: 'pages.dataProcessing.workspace.fileCount',
                defaultMessage:
                  '{count} files. Download files individually; the manifest describes the complete export.',
              },
              { count: result.totalFiles },
            )}
          </span>
          <Table<CalculationExportFile>
            scroll={{ x: 560 }}
            size='small'
            rowKey='fileName'
            dataSource={result.files}
            pagination={{
              current: Math.floor(offset / 20) + 1,
              pageSize: 20,
              total: result.totalFiles,
              showSizeChanger: false,
              onChange: (page) => setOffset((page - 1) * 20),
            }}
            columns={[
              {
                title: intl.formatMessage({
                  id: 'pages.dataProcessing.exports.file',
                  defaultMessage: 'File',
                }),
                dataIndex: 'fileName',
              },
              {
                title: intl.formatMessage({
                  id: 'pages.dataProcessing.exports.rows',
                  defaultMessage: 'Rows',
                }),
                dataIndex: 'recordCount',
              },
              {
                title: intl.formatMessage({
                  id: 'pages.dataProcessing.exports.size',
                  defaultMessage: 'Size',
                }),
                dataIndex: 'byteSize',
                render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MiB`,
              },
              {
                title: intl.formatMessage({
                  id: 'pages.dataProcessing.exports.download',
                  defaultMessage: 'Download',
                }),
                render: (_, file) => (
                  <Button
                    size='small'
                    aria-label={intl.formatMessage(
                      {
                        id: 'pages.dataProcessing.workspace.downloadFile',
                        defaultMessage: 'Download {name}',
                      },
                      { name: file.fileName },
                    )}
                    loading={downloading === file.fileName}
                    disabled={downloading !== null}
                    onClick={() => void download(file)}
                  >
                    {intl.formatMessage({
                      id: 'pages.dataProcessing.exports.download',
                      defaultMessage: 'Download',
                    })}
                  </Button>
                ),
              },
            ]}
          />
        </>
      ) : null}
    </Space>
  );
}
