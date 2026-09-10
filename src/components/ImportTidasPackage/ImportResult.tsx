import {
  fetchPackageReport,
  getTidasPackageJobApi,
  type TidasPackageJobResponse,
  type TidasPartialImportReport,
} from '@/services/general/api';
import { Alert, Button, Flex, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'umi';

type MessageIntl = { formatMessage: (message: { id: string; defaultMessage: string }) => string };

export function importOutcomeLabel(value: string, intl: MessageIntl): string {
  if (value === 'success')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.success',
      defaultMessage: 'All process and model groups imported',
    });
  if (value === 'partial')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.partial',
      defaultMessage: 'Partially imported',
    });
  if (value === 'none')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.none',
      defaultMessage: 'No process or model group imported',
    });
  if (value === 'interrupted')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.interrupted',
      defaultMessage: 'Import interrupted; committed data is retained',
    });
  return '';
}

export function rootStatusLabel(value: string, intl: MessageIntl): string {
  if (value === 'blocked')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.blocked',
      defaultMessage: 'Validation blocked this group',
    });
  if (value === 'write_failed')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.writeFailed',
      defaultMessage: 'This group was rolled back after a write failure',
    });
  if (value === 'not_attempted')
    return intl.formatMessage({
      id: 'component.tidasPackage.import.result.notAttempted',
      defaultMessage: 'This group was not attempted',
    });
  return '';
}

export default function TidasImportResult({ jobId }: { jobId: string }) {
  const intl = useIntl();
  const [job, setJob] = useState<TidasPackageJobResponse>();
  const [report, setReport] = useState<TidasPartialImportReport>();
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setJob(undefined);
    setReport(undefined);
    setFailed(false);
    void (async () => {
      try {
        const result = await getTidasPackageJobApi(jobId);
        if (controller.signal.aborted) return;
        if (result.error || !result.data?.ok) throw new Error('package_read_failed');
        setJob(result.data);
        const artifact = result.data.artifacts_by_kind.import_report;
        if (
          artifact?.artifact_format === 'tidas-package-import-report:v2' &&
          artifact.signed_download_url
        ) {
          const value = await fetchPackageReport<TidasPartialImportReport>(
            artifact,
            controller.signal,
          );
          if (
            value.report_version !== 2 ||
            !['success', 'partial', 'none', 'interrupted'].includes(value.outcome) ||
            !Array.isArray(value.roots)
          )
            throw new Error('invalid_report');
          if (!controller.signal.aborted) setReport(value);
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [jobId, refresh]);
  const summary = report?.summary ?? job?.import_progress;
  return (
    <Flex vertical gap='small'>
      {report && (
        <Alert
          type={report.outcome === 'success' ? 'success' : 'warning'}
          showIcon
          title={importOutcomeLabel(report.outcome, intl)}
        />
      )}
      {summary && (
        <Typography.Text>
          {intl.formatMessage(
            {
              id: 'component.tidasPackage.import.result.counts',
              defaultMessage:
                'Imported: {imported}; already present: {existing}; successful groups: {groups}',
            },
            {
              imported: summary.imported_count,
              existing: summary.existing_count,
              groups: summary.successful_root_count,
            },
          )}
        </Typography.Text>
      )}
      {!report && job?.import_progress && (
        <Typography.Text type='secondary'>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.result.receipts',
            defaultMessage:
              'Counts reflect committed groups. The final report is not yet available.',
          })}
        </Typography.Text>
      )}
      {failed && (
        <Typography.Text type='warning'>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.result.unavailable',
            defaultMessage:
              'Unable to load the latest result. This does not mean the import failed.',
          })}
        </Typography.Text>
      )}
      {report?.roots
        .filter((root) => root.status !== 'imported' && root.status !== 'reused')
        .map((item) => (
          <Typography.Paragraph
            key={`${item.root.table}:${item.root.id}:${item.root.version}`}
            style={{ marginBottom: 0 }}
          >
            {item.root.table} · {item.root.id} @ {item.root.version}
            {rootStatusLabel(item.status, intl) && (
              <Typography.Text type='warning'>
                {' '}
                · {rootStatusLabel(item.status, intl)}
              </Typography.Text>
            )}
            {item.blocking_path?.length > 0 && (
              <Typography.Text type='secondary'>
                {' → '}
                {item.blocking_path
                  .map((ref) => `${ref.table}:${ref.id}@${ref.version}`)
                  .join(' → ')}
              </Typography.Text>
            )}
          </Typography.Paragraph>
        ))}
      {report?.roots_truncated && (
        <Typography.Text type='secondary'>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.result.sample',
            defaultMessage:
              'Only the first groups are shown. Download the complete details for every group and validation issue.',
          })}
        </Typography.Text>
      )}
      <Flex gap='small' wrap>
        <Button size='small' onClick={() => setRefresh((value) => value + 1)}>
          {intl.formatMessage({
            id: 'component.tidasPackage.import.result.refresh',
            defaultMessage: 'Refresh result',
          })}
        </Button>
        {(['import_report', 'import_details'] as const).map((kind) => {
          const artifact = job?.artifacts_by_kind[kind];
          return artifact?.signed_download_url ? (
            <Button
              key={kind}
              size='small'
              href={artifact.signed_download_url}
              target='_blank'
              rel='noreferrer'
            >
              {kind === 'import_details'
                ? intl.formatMessage({
                    id: 'component.tidasPackage.import.result.details',
                    defaultMessage: 'Download complete details',
                  })
                : intl.formatMessage({
                    id: 'component.tidasPackage.import.result.report',
                    defaultMessage: 'Download report',
                  })}
            </Button>
          ) : null;
        })}
      </Flex>
    </Flex>
  );
}
