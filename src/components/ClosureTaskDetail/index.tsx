import {
  createClosureReportDownload,
  getClosureCheck,
  type ClosureArtifactLifecycleState,
  type ClosureArtifactRole,
  type ClosureArtifactV1,
  type ClosureCheckSummaryV1,
} from '@/services/dataProducts';
import { useAntdAppApi } from '@/contexts/AntdAppContext';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Space, Spin, Tag, Typography, theme } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'umi';

export const closureCheckPollIntervalMs = 2_000;
export const closureCheckPollMaxAttempts = 30;

const closureArtifactRoles: ClosureArtifactRole[] = [
  'closure_report_xlsx',
  'closure_issue_manifest',
];

type IntlShapeLike = ReturnType<typeof useIntl>;

function closureMessages(intl: IntlShapeLike) {
  return {
    artifactAvailableUntil: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.availableUntil',
      defaultMessage: 'Available until',
    }),
    artifactDownloadFailed: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.downloadFailed',
      defaultMessage: 'This download is currently unavailable. Please try again later.',
    }),
    artifactExpired: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.expiredGuidance',
      defaultMessage:
        'This artifact has expired. Run the data completeness check again to prepare a new download.',
    }),
    artifactFailed: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.failedGuidance',
      defaultMessage: 'Artifact preparation failed. Run the data completeness check again.',
    }),
    artifactMachineResult: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.machineResult',
      defaultMessage: 'Machine result manifest',
    }),
    artifactPreparing: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.preparing',
      defaultMessage: 'Preparing this artifact.',
    }),
    artifactsTitle: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifacts.title',
      defaultMessage: 'Result artifacts',
    }),
    artifactUnavailable: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.unavailable',
      defaultMessage: 'This artifact is unavailable.',
    }),
    artifactXlsxReport: intl.formatMessage({
      id: 'pages.dataProcessing.closure.artifact.humanReport',
      defaultMessage: 'Human issue report (XLSX)',
    }),
    certificate: intl.formatMessage({
      id: 'pages.dataProcessing.closure.certificate',
      defaultMessage: 'Certificate',
    }),
    closureCheckId: intl.formatMessage({
      id: 'pages.dataProcessing.command.closureCheckId',
      defaultMessage: 'Closure check ID',
    }),
    completeness: intl.formatMessage({
      id: 'pages.dataProcessing.closure.completeness',
      defaultMessage: 'Scan completeness',
    }),
    detailLoading: intl.formatMessage({
      id: 'pages.dataProcessing.closure.detailLoading',
      defaultMessage: 'Loading task details...',
    }),
    detailUnavailable: intl.formatMessage({
      id: 'pages.dataProcessing.closure.detailUnavailable',
      defaultMessage: 'Task details are currently unavailable.',
    }),
    downloadMachineResult: intl.formatMessage({
      id: 'pages.dataProcessing.action.downloadClosureMachineResult',
      defaultMessage: 'Download machine result manifest',
    }),
    downloadXlsxReport: intl.formatMessage({
      id: 'pages.dataProcessing.action.downloadClosureReport',
      defaultMessage: 'Download issue report',
    }),
    executionCancelled: intl.formatMessage({
      id: 'pages.dataProcessing.closure.executionCancelled',
      defaultMessage: 'Data completeness check was cancelled. Run a new check to continue.',
    }),
    executionFailed: intl.formatMessage({
      id: 'pages.dataProcessing.closure.executionFailed',
      defaultMessage: 'Data completeness check failed to run',
    }),
    executionFailedFallback: intl.formatMessage({
      id: 'pages.dataProcessing.closure.executionFailedFallback',
      defaultMessage:
        'The check did not complete. Retry it; if it fails again, contact an administrator with the identifiers below.',
    }),
    executionPending: intl.formatMessage({
      id: 'pages.dataProcessing.closure.executionPending',
      defaultMessage:
        'The check is still running. Closure issues will be available after it completes.',
    }),
    issues: intl.formatMessage({
      id: 'pages.dataProcessing.closure.issues',
      defaultMessage: 'Issues',
    }),
    phase: intl.formatMessage({
      id: 'pages.process.lca.taskCenter.phasePrefix',
      defaultMessage: 'Phase:',
    }),
    refresh: intl.formatMessage({
      id: 'pages.process.lca.taskCenter.refresh',
      defaultMessage: 'Refresh',
    }),
    rerun: intl.formatMessage({
      id: 'pages.dataProcessing.action.rerunClosureCheck',
      defaultMessage: 'Run check again',
    }),
    status: intl.formatMessage({
      id: 'pages.dataProcessing.closure.status',
      defaultMessage: 'Check status',
    }),
    workerJobId: intl.formatMessage({
      id: 'pages.dataProcessing.closure.workerJobId',
      defaultMessage: 'Worker job ID',
    }),
  };
}

export function closureCheckNeedsPolling(closureCheck: ClosureCheckSummaryV1 | null): boolean {
  return Boolean(
    closureCheck &&
    (['queued', 'running'].includes(closureCheck.runStatus) ||
      closureCheck.artifacts?.some((artifact) => artifact.artifactState === 'pending')),
  );
}

export function closureArtifactLifecycleState(
  artifact: ClosureArtifactV1 | undefined,
  now: number,
  forcedExpired = false,
): ClosureArtifactLifecycleState {
  if (forcedExpired) return 'expired';
  if (!artifact) return 'unavailable';
  if (artifact.artifactState === 'pending') return 'preparing';
  if (artifact.artifactState === 'ready') {
    return Date.parse(artifact.artifactExpiresAt) > now ? 'available' : 'expired';
  }
  if (artifact.artifactState === 'expired') return 'expired';
  if (artifact.artifactState === 'failed') return 'failed';
  return 'unavailable';
}

export function formatClosureArtifactByteSize(value: unknown): string {
  const bytes = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatClosureTimestamp(value: unknown): string {
  if (typeof value !== 'string' || !value) return '-';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
}

type ClosureArtifactListProps = {
  closureCheck: ClosureCheckSummaryV1;
  canDownloadReport: boolean;
  className?: string;
  artifactClassName?: string;
  onDownloadError?: (messageText: string) => void;
  onRerun?: () => void;
  rerunDisabled?: boolean;
  rerunLoading?: boolean;
};

export const ClosureArtifactList: React.FC<ClosureArtifactListProps> = ({
  closureCheck,
  canDownloadReport,
  className,
  artifactClassName,
  onDownloadError,
  onRerun,
  rerunDisabled,
  rerunLoading,
}) => {
  const { message } = useAntdAppApi();
  const intl = useIntl();
  const { token } = theme.useToken();
  const [artifactClockNow, setArtifactClockNow] = useState(() => Date.now());
  const [downloadingRole, setDownloadingRole] = useState<ClosureArtifactRole | null>(null);
  const [expiredRoles, setExpiredRoles] = useState<ClosureArtifactRole[]>([]);
  const artifactExpiryKey = useMemo(
    () =>
      closureCheck.artifacts
        ?.map((artifact) => `${artifact.artifactRole}:${artifact.artifactExpiresAt ?? ''}`)
        .join('|') ?? '',
    [closureCheck.artifacts],
  );

  const messages = closureMessages(intl);

  useEffect(() => {
    setExpiredRoles([]);
    setArtifactClockNow(Date.now());
  }, [closureCheck.closureCheckId]);

  useEffect(() => {
    setArtifactClockNow(Date.now());
  }, [artifactExpiryKey]);

  useEffect(() => {
    const now = Date.now();
    const nextExpiry = closureCheck.artifacts
      ?.flatMap((artifact) => {
        if (artifact.artifactState !== 'ready') return [];
        const expiresAt = Date.parse(artifact.artifactExpiresAt);
        return expiresAt > now ? [expiresAt] : [];
      })
      .sort((left, right) => left - right)[0];
    if (nextExpiry === undefined) return undefined;
    const timer = window.setTimeout(
      () => setArtifactClockNow(Date.now()),
      Math.max(0, nextExpiry - now),
    );
    return () => window.clearTimeout(timer);
  }, [artifactClockNow, artifactExpiryKey, closureCheck.artifacts]);

  const notifyDownloadError = (messageText: string) => {
    if (onDownloadError) {
      onDownloadError(messageText);
      return;
    }
    message.error(messageText);
  };

  const handleDownload = async (artifact: ClosureArtifactV1) => {
    setDownloadingRole(artifact.artifactRole);
    try {
      const result = await createClosureReportDownload(
        closureCheck.closureCheckId,
        artifact.artifactRole,
      );
      if (result.error || !result.data?.signedDownloadUrl) {
        if (result.status === 410 || result.error?.code === 'closure_report_expired') {
          setExpiredRoles((current) =>
            current.includes(artifact.artifactRole) ? current : [...current, artifact.artifactRole],
          );
          notifyDownloadError(messages.artifactExpired);
          return;
        }
        notifyDownloadError(messages.artifactDownloadFailed);
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = result.data.signedDownloadUrl;
      anchor.target = '_self';
      anchor.rel = 'noopener noreferrer';
      if (result.data.filename) anchor.download = result.data.filename;
      anchor.click();
    } catch (_error) {
      notifyDownloadError(messages.artifactDownloadFailed);
    } finally {
      setDownloadingRole(null);
    }
  };

  return (
    <div
      className={className}
      data-testid='closure-artifacts'
      style={
        className
          ? undefined
          : {
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              width: '100%',
            }
      }
    >
      <strong style={className ? undefined : { gridColumn: '1 / -1' }}>
        {messages.artifactsTitle}
      </strong>
      {closureArtifactRoles.map((artifactRole) => {
        const artifact = closureCheck.artifacts?.find(
          (candidate) => candidate.artifactRole === artifactRole,
        );
        const lifecycleState = closureArtifactLifecycleState(
          artifact,
          artifactClockNow,
          expiredRoles.includes(artifactRole),
        );
        const roleLabel =
          artifactRole === 'closure_report_xlsx'
            ? messages.artifactXlsxReport
            : messages.artifactMachineResult;
        const stateMessage =
          lifecycleState === 'preparing'
            ? messages.artifactPreparing
            : lifecycleState === 'available'
              ? messages.artifactAvailableUntil
              : lifecycleState === 'expired'
                ? messages.artifactExpired
                : lifecycleState === 'failed'
                  ? messages.artifactFailed
                  : messages.artifactUnavailable;
        return (
          <section
            key={artifactRole}
            className={artifactClassName}
            data-testid={`closure-artifact-${artifactRole}`}
            style={
              artifactClassName
                ? undefined
                : {
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 6,
                    display: 'grid',
                    gap: 6,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    padding: 12,
                  }
            }
          >
            <strong>{roleLabel}</strong>
            <span data-testid={`closure-artifact-state-${artifactRole}`}>
              {lifecycleState === 'available'
                ? `${stateMessage}: ${formatClosureTimestamp(artifact?.artifactExpiresAt)}`
                : stateMessage}
            </span>
            {artifact?.filename ? <span>{artifact.filename}</span> : null}
            {artifact?.format || artifact?.mediaType || artifact?.size !== undefined ? (
              <span>
                {[artifact.format, artifact.mediaType, formatClosureArtifactByteSize(artifact.size)]
                  .filter((value) => value && value !== '-')
                  .join(' · ')}
              </span>
            ) : null}
            {artifact?.checksumSha256 ? <code>{artifact.checksumSha256}</code> : null}
            {lifecycleState === 'available' && artifact && canDownloadReport ? (
              <Button
                icon={<DownloadOutlined />}
                loading={downloadingRole === artifactRole}
                onClick={() => void handleDownload(artifact)}
              >
                {artifactRole === 'closure_report_xlsx'
                  ? messages.downloadXlsxReport
                  : messages.downloadMachineResult}
              </Button>
            ) : (lifecycleState === 'expired' || lifecycleState === 'failed') && onRerun ? (
              <Button disabled={rerunDisabled} loading={rerunLoading} onClick={onRerun}>
                {messages.rerun}
              </Button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
};

type ClosureTaskDetailProps = {
  closureCheckId: string;
  canDownloadReport: boolean;
  errorSummary?: string;
  refreshSignal?: string;
};

export const ClosureTaskDetail: React.FC<ClosureTaskDetailProps> = ({
  closureCheckId,
  canDownloadReport,
  errorSummary,
  refreshSignal,
}) => {
  const intl = useIntl();
  const [closureCheck, setClosureCheck] = useState<ClosureCheckSummaryV1 | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryGeneration, setRetryGeneration] = useState(0);

  const messages = closureMessages(intl);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const refresh = async (initial: boolean) => {
      if (initial) setLoading(true);
      let result: Awaited<ReturnType<typeof getClosureCheck>>;
      try {
        result = await getClosureCheck(closureCheckId);
      } catch (requestError) {
        if (cancelled) return;
        setLoading(false);
        setError(requestError instanceof Error ? requestError.message : messages.detailUnavailable);
        return;
      }
      if (cancelled) return;
      setLoading(false);
      if (result.error || !result.data) {
        setError(result.error?.message ?? messages.detailUnavailable);
        return;
      }
      setClosureCheck(result.data);
      setError('');
      attempts += 1;
      if (closureCheckNeedsPolling(result.data) && attempts < closureCheckPollMaxAttempts) {
        timer = setTimeout(() => void refresh(false), closureCheckPollIntervalMs);
      }
    };

    void refresh(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [closureCheckId, refreshSignal, retryGeneration]);

  if (loading && !closureCheck) {
    return (
      <Space data-testid='closure-task-detail-loading'>
        <Spin size='small' />
        <span>{messages.detailLoading}</span>
      </Space>
    );
  }

  if (!closureCheck) {
    return (
      <Alert
        type='error'
        title={error}
        action={
          <Button
            icon={<ReloadOutlined />}
            size='small'
            onClick={() => setRetryGeneration((current) => current + 1)}
          >
            {messages.refresh}
          </Button>
        }
      />
    );
  }

  const progressFraction = closureCheck.workerJob?.progressFraction;
  const progressPercent =
    typeof progressFraction === 'number'
      ? Math.max(0, Math.min(100, Math.round(progressFraction * 100)))
      : undefined;

  return (
    <Space
      data-testid={`closure-task-detail-${closureCheck.closureCheckId}`}
      orientation='vertical'
      size={12}
      style={{ width: '100%' }}
    >
      {error ? <Alert type='warning' title={error} /> : null}
      <Descriptions
        bordered
        column={1}
        size='small'
        items={[
          { key: 'status', label: messages.status, children: closureCheck.runStatus },
          {
            key: 'certificate',
            label: messages.certificate,
            children: closureCheck.certificateValidity,
          },
          {
            key: 'completeness',
            label: messages.completeness,
            children: closureCheck.scanCompleteness,
          },
          {
            key: 'issues',
            label: messages.issues,
            children: (
              <Space size={4} wrap>
                {(closureCheck.blockerCodes ?? []).length === 0
                  ? '0 blockers'
                  : closureCheck.blockerCodes?.map((code) => <Tag key={code}>{code}</Tag>)}
              </Space>
            ),
          },
          ...(closureCheck.workerJob?.phase
            ? [
                {
                  key: 'phase',
                  label: messages.phase,
                  children: (
                    <>
                      {closureCheck.workerJob.phase}
                      {progressPercent === undefined ? '' : ` · ${progressPercent}%`}
                    </>
                  ),
                },
              ]
            : []),
          {
            key: 'closure-check-id',
            label: messages.closureCheckId,
            children: <Typography.Text>{closureCheck.closureCheckId}</Typography.Text>,
          },
          ...(closureCheck.workerJob?.jobId
            ? [
                {
                  key: 'worker-job-id',
                  label: messages.workerJobId,
                  children: <Typography.Text>{closureCheck.workerJob.jobId}</Typography.Text>,
                },
              ]
            : []),
        ]}
      />
      {closureCheck.runStatus === 'failed' ? (
        <Alert
          type='error'
          title={messages.executionFailed}
          description={
            errorSummary ?? closureCheck.workerJob?.errorCode ?? messages.executionFailedFallback
          }
        />
      ) : closureCheck.runStatus === 'cancelled' ? (
        <Alert type='warning' title={messages.executionCancelled} />
      ) : ['queued', 'running'].includes(closureCheck.runStatus) ? (
        <Alert type='info' title={messages.executionPending} />
      ) : null}
      <ClosureArtifactList canDownloadReport={canDownloadReport} closureCheck={closureCheck} />
    </Space>
  );
};

export default ClosureTaskDetail;
