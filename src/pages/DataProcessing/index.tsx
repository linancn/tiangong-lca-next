import AccessDenied from '@/components/AccessDenied';
import LcaReleaseReadPanel from '@/components/LcaReleaseReadPanel';
import {
  createLciaResultBuildRequest,
  listLciaResultPublications,
  previewLciaResultPackage,
  publishLciaResultPackage,
  unpublishLciaResultPublication,
  type LciaResultPublication,
} from '@/services/dataProducts';
import { getSystemUserRoleApi } from '@/services/roles/api';
import { requestWorkerJobsApi, type WorkerJobResult } from '@/services/workerJobs/api';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  StopOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Progress,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import CalculationBundlePanel from './CalculationBundlePanel';
import styles from './index.less';

type CommandStatus = {
  kind: 'success' | 'error';
  message: ReactNode;
};

type CommandAction = 'createBuild' | 'previewPackage' | 'publishPackage' | 'unpublishPublication';

type CommandSummaryRow = {
  label: string;
  value: string;
};

type LciaMethodListPayload = {
  files?: Array<{
    id?: string;
    version?: string;
    description?: unknown;
    referenceQuantity?: {
      'common:shortDescription'?: unknown;
    };
  }>;
};

type ImpactCategoryOption = {
  label: string;
  value: string;
};

type LciaResultPackageOption = {
  value: string;
  label: string;
  packageId: string;
  packageName?: string;
  packageVersion?: string;
  buildId?: string;
  status?: string;
  includedInputCount?: string;
  eligibleInputCount?: string;
};

type StatusTone = 'success' | 'error' | 'processing' | 'warning' | 'default';

const submittedBuildPendingPhase = 'waiting_for_worker_processing';
const previewPageSize = 25;
const previewExportPageSize = 100;

export function parseDataProcessingDeepLink(search: string): {
  activeTabKey: 'builds' | 'preview' | 'publication';
  packageId?: string;
  processId?: string;
  processVersion?: string;
} {
  const params = new URLSearchParams(search);
  const requestedTab = params.get('tab');
  const activeTabKey =
    requestedTab === 'preview' || requestedTab === 'publication' ? requestedTab : 'builds';
  const value = (name: string) => params.get(name)?.trim() || undefined;
  return {
    activeTabKey,
    packageId: value('packageId'),
    processId: value('processId'),
    processVersion: value('processVersion'),
  };
}

export function stringifyCommandData(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.trim() !== '');
}

function normalizeStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function statusToneFromValue(value: unknown): StatusTone {
  switch (normalizeStatus(value)) {
    case 'completed':
    case 'current':
    case 'published':
    case 'ready':
    case 'preview_ready':
      return 'success';
    case 'failed':
    case 'error':
      return 'error';
    case 'running':
    case 'processing':
    case 'in_progress':
      return 'processing';
    case 'queued':
    case 'pending':
    case 'waiting':
    case 'blocked':
      return 'warning';
    default:
      return 'default';
  }
}

function statusToneClassName(tone: StatusTone): string {
  switch (tone) {
    case 'success':
      return styles.statusIconSuccess;
    case 'error':
      return styles.statusIconError;
    case 'processing':
      return styles.statusIconProcessing;
    case 'warning':
      return styles.statusIconWarning;
    default:
      return styles.statusIconDefault;
  }
}

export function statusIconFromValue(value: unknown): ReactNode {
  switch (normalizeStatus(value)) {
    case 'completed':
    case 'current':
    case 'published':
    case 'ready':
    case 'preview_ready':
      return <CheckCircleOutlined />;
    case 'failed':
    case 'error':
      return <CloseCircleOutlined />;
    case 'running':
    case 'processing':
    case 'in_progress':
      return <SyncOutlined />;
    case 'queued':
    case 'pending':
    case 'waiting':
      return <ClockCircleOutlined />;
    case 'blocked':
      return <WarningOutlined />;
    case 'unpublished':
    case 'cancelled':
    case 'canceled':
      return <StopOutlined />;
    default:
      return <ClockCircleOutlined />;
  }
}

function renderStatusIcon(value: unknown, tooltipTitle?: string): ReactNode {
  const label = firstString(value) ?? '-';
  const tone = statusToneFromValue(value);

  return (
    <Tooltip title={tooltipTitle ?? label}>
      <span
        aria-label={label}
        className={`${styles.statusIcon} ${statusToneClassName(tone)}`}
        role='img'
      >
        {statusIconFromValue(value)}
      </span>
    </Tooltip>
  );
}

export function firstNumberText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function firstDisplayString(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string =>
      typeof value === 'string' &&
      value.trim() !== '' &&
      value.trim() !== '-' &&
      value.trim().toLowerCase() !== 'unknown',
  );
}

function unknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return unknownArray(value).filter(isRecord);
}

export function packageCountLabel(option: LciaResultPackageOption): string | undefined {
  if (option.includedInputCount && !option.eligibleInputCount) {
    return option.includedInputCount;
  }
  if (!option.includedInputCount && option.eligibleInputCount) {
    return option.eligibleInputCount;
  }
  if (!option.includedInputCount || !option.eligibleInputCount) {
    return undefined;
  }
  return `${option.includedInputCount}/${option.eligibleInputCount}`;
}

export function stateCodeFromProcess(value: unknown): string {
  const record = isRecord(value) ? value : {};
  return firstNumberText(record.stateCode, record.state_code) ?? '-';
}

export function stateCodeCountsFromProcesses(
  processes: unknown[],
): Array<{ stateCode: string; count: number }> {
  const counts = new Map<string, number>();
  processes.forEach((process) => {
    const stateCode = stateCodeFromProcess(process);
    counts.set(stateCode, (counts.get(stateCode) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([stateCode, count]) => ({ stateCode, count }))
    .sort((left, right) => left.stateCode.localeCompare(right.stateCode));
}

export function stateCodeCountsFromScope(
  value: unknown,
): Array<{ stateCode: string; count: number }> {
  return recordArray(value)
    .map((item) => {
      const count = typeof item.count === 'number' ? item.count : Number(item.count);
      return {
        stateCode: firstNumberText(item.stateCode, item.state_code) ?? '-',
        count: Number.isFinite(count) ? count : 0,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => left.stateCode.localeCompare(right.stateCode));
}

export function formatArtifactByteSize(value: unknown): string {
  const size = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(size) || size < 0) {
    return '-';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function formatNumericValue(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }
  return String(numeric);
}

export function formatTimestamp(value: unknown): string {
  const raw = firstString(value);
  if (!raw) {
    return '-';
  }
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : raw;
}

function numberField(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function processDetailHref(processId: string, processVersion: string): string {
  const params = new URLSearchParams({
    id: processId,
    version: processVersion,
    mode: 'view',
  });
  return `/mydata/processes?${params.toString()}`;
}

function escapeHtml(value: unknown): string {
  return stringifyCommandData(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function downloadHtmlTableAsExcel(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>,
): void {
  const tableHeader = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const tableRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const html = `\uFEFF<html><head><meta charset="utf-8" /></head><body><table><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function lineFromSnapshotOutput(stdoutTail: unknown, prefix: string): string | undefined {
  if (typeof stdoutTail !== 'string') {
    return undefined;
  }
  return stdoutTail
    .split('\n')
    .find((line) => line.startsWith(`[${prefix}]`))
    ?.replace(new RegExp(`^\\[${prefix}\\]\\s*`), '')
    .trim();
}

function summarizeSnapshotMatrix(stdoutTail: unknown): string | undefined {
  const line = lineFromSnapshotOutput(stdoutTail, 'matrix');
  return line?.match(/process_count=\S+\s+flow_count=\S+\s+impact_count=\S+/)?.[0] ?? line;
}

function summarizeSnapshotCoverage(stdoutTail: unknown): string | undefined {
  const line = lineFromSnapshotOutput(stdoutTail, 'coverage');
  return line?.match(/unique_match=\S+\s+any_match=\S+\s+singular_risk=\S+/)?.[0] ?? line;
}

function compactWorkerLogText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncateWorkerLogText(value: string, maxLength = 220): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

type Translate = (id: string, defaultMessage: string) => string;

function summarizeWorkerJobFailure(job: WorkerJobResult, t: Translate): string | null {
  const raw = firstString(job.errorMessage, job.errorCode);
  if (!raw) {
    return null;
  }

  const stderrMatch = raw.match(/stderr_tail=(.*?)(?:\s+Stack backtrace:|$)/s);
  const fromStderr = stderrMatch?.[1];
  const withoutTechnicalTail = (fromStderr ?? raw)
    .replace(/\s+Stack backtrace:.*$/s, '')
    .replace(/\s+stdout_tail=.*$/s, '')
    .replace(/\s+cmd=.*$/s, '');
  const compacted = compactWorkerLogText(withoutTechnicalTail);

  if (/unsupported solver worker job kind:\s*lcia_result\.package_build/i.test(compacted)) {
    return t(
      'pages.dataProcessing.jobs.error.unsupportedWorkerVersion',
      'Worker has not picked up result generation support yet.',
    );
  }

  const missingScopeMatch = compacted.match(/request root not found in candidate scope:\s*(\S+)/i);
  if (missingScopeMatch) {
    return `${t(
      'pages.dataProcessing.jobs.error.processOutOfScope',
      'Target process is outside the calculable input scope',
    )}: ${missingScopeMatch[1]}`;
  }

  return truncateWorkerLogText(compacted);
}

export function packageOptionFromBuildJob(job: WorkerJobResult): LciaResultPackageOption | null {
  const result = isRecord(job.result) ? job.result : null;
  const resultRef = isRecord(job.resultRef) ? job.resultRef : null;
  const payload = isRecord(job.payload) ? job.payload : null;
  const resultPackage = isRecord(result?.package) ? result.package : null;
  const resultRefPackage = isRecord(resultRef?.package) ? resultRef.package : null;

  const packageId = firstString(
    resultPackage?.packageId,
    resultPackage?.package_id,
    resultPackage?.id,
    resultRefPackage?.packageId,
    resultRefPackage?.package_id,
    resultRefPackage?.id,
  );
  if (!packageId) {
    return null;
  }

  const packageVersion = firstString(
    resultPackage?.packageVersion,
    resultPackage?.package_version,
    result?.packageVersion,
    result?.package_version,
  );
  const packageName = firstString(
    job.resultSetName,
    job.result_set_name,
    job.packageName,
    job.package_name,
    payload?.packageName,
    payload?.package_name,
    payload?.name,
    resultPackage?.packageName,
    resultPackage?.package_name,
    resultPackage?.name,
    result?.packageName,
    result?.package_name,
    result?.name,
  );
  const status = firstString(resultPackage?.status, result?.packageStatus, job.status);
  const buildId = firstString(
    resultPackage?.buildId,
    resultPackage?.build_id,
    result?.buildId,
    result?.build_id,
    resultRef?.buildId,
    resultRef?.build_id,
    job.subjectId,
  );
  const includedInputCount = firstNumberText(
    resultPackage?.includedInputCount,
    resultPackage?.included_input_count,
    result?.includedInputCount,
    result?.included_input_count,
  );
  const eligibleInputCount = firstNumberText(
    resultPackage?.eligibleInputCount,
    resultPackage?.eligible_input_count,
    result?.eligibleInputCount,
    result?.eligible_input_count,
  );
  const option: LciaResultPackageOption = {
    value: packageId,
    label: '',
    packageId,
    packageName,
    packageVersion,
    buildId,
    status,
    includedInputCount,
    eligibleInputCount,
  };
  option.label = [
    packageName ?? packageVersion ?? packageId,
    packageName && packageVersion ? packageVersion : undefined,
    packageCountLabel(option),
    status,
  ]
    .filter(Boolean)
    .join(' · ');
  return option;
}

export function packageOptionsFromBuildJobs(jobs: WorkerJobResult[]): LciaResultPackageOption[] {
  const options = new Map<string, LciaResultPackageOption>();
  jobs.forEach((job) => {
    const option = packageOptionFromBuildJob(job);
    if (option) {
      options.set(option.packageId, option);
    }
  });
  return Array.from(options.values());
}

export function createSubmittedBuildJob(data: unknown): WorkerJobResult | null {
  const record = isRecord(data) ? data : null;
  const workerJob = isRecord(record?.workerJob) ? record.workerJob : null;
  const buildId = firstString(
    record?.buildId,
    record?.build_id,
    record?.id,
    workerJob?.subjectId,
    workerJob?.subject_id,
  );
  const workerJobId = firstString(
    record?.workerJobId,
    record?.worker_job_id,
    workerJob?.id,
    workerJob?.workerJobId,
    workerJob?.worker_job_id,
  );
  const jobId = workerJobId ?? buildId;
  const payload = isRecord(workerJob?.payload) ? workerJob.payload : null;

  if (!jobId) {
    return null;
  }

  return {
    id: jobId,
    jobKind: firstString(workerJob?.jobKind, workerJob?.job_kind) ?? 'lcia_result.package_build',
    subjectType:
      firstString(workerJob?.subjectType, workerJob?.subject_type) ?? 'lcia_result_build',
    subjectId: buildId,
    status: (firstString(workerJob?.status) as WorkerJobResult['status'] | undefined) ?? 'queued',
    phase: firstString(workerJob?.phase) ?? submittedBuildPendingPhase,
    packageName: firstString(record?.packageName, record?.package_name, payload?.name),
    resultSetName: firstString(record?.resultSetName, record?.result_set_name, payload?.name),
    createdAt: firstString(workerJob?.createdAt, workerJob?.created_at),
    updatedAt: firstString(workerJob?.updatedAt, workerJob?.updated_at),
  };
}

export function mergeSubmittedBuildJobs(
  submittedJobs: WorkerJobResult[],
  serverJobs: WorkerJobResult[],
): WorkerJobResult[] {
  const rows = new Map<string, WorkerJobResult>();
  [...submittedJobs, ...serverJobs].forEach((job, index) => {
    rows.set(firstString(job.id, job.subjectId) ?? `job-${index}`, job);
  });
  return Array.from(rows.values());
}

export function resolveLocalizedText(value: unknown, locale: string): string {
  const targetLang = locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const exact = value.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        String((item as Record<string, unknown>)['@xml:lang'] ?? '').toLowerCase() === targetLang,
    );
    const english = value.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        String((item as Record<string, unknown>)['@xml:lang'] ?? '').toLowerCase() === 'en',
    );
    const fallback = exact ?? english ?? value[0];
    return fallback && typeof fallback === 'object'
      ? String((fallback as Record<string, unknown>)['#text'] ?? '')
      : '';
  }

  if (value && typeof value === 'object') {
    return String((value as Record<string, unknown>)['#text'] ?? '');
  }

  return '';
}

export function buildImpactCategoryOptions(
  payload: LciaMethodListPayload,
  locale: string,
): ImpactCategoryOption[] {
  return (payload.files ?? [])
    .filter((file) => file.id)
    .map((file) => {
      const name = resolveLocalizedText(file.description, locale) || (file.id as string);
      const unit = resolveLocalizedText(
        file.referenceQuantity?.['common:shortDescription'],
        locale,
      );
      const suffix = [file.version, unit].filter(Boolean).join(' / ');
      return {
        value: file.id as string,
        label: suffix ? `${name} (${suffix})` : name,
      };
    });
}

const DataProcessing = () => {
  const intl = useIntl();
  const deepLink = useMemo(() => parseDataProcessingDeepLink(window.location.search), []);
  const locale = intl.locale ?? 'en-US';
  const t = useCallback(
    (id: string, defaultMessage: string) => intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const [authResolved, setAuthResolved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | undefined>();
  const [activeTabKey, setActiveTabKey] = useState<string>(deepLink.activeTabKey);
  const [commandStatus, setCommandStatus] = useState<CommandStatus | null>(null);
  const [submittingAction, setSubmittingAction] = useState<CommandAction | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [impactCategoryOptions, setImpactCategoryOptions] = useState<ImpactCategoryOption[]>([]);
  const [buildJobs, setBuildJobs] = useState<WorkerJobResult[]>([]);
  const [submittedBuildJobs, setSubmittedBuildJobs] = useState<WorkerJobResult[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | undefined>(
    deepLink.packageId,
  );
  const [previewImpactCategoryId, setPreviewImpactCategoryId] = useState<string | undefined>();
  const [exportingPreview, setExportingPreview] = useState(false);
  const [buildJobsLoading, setBuildJobsLoading] = useState(false);
  const [buildJobsError, setBuildJobsError] = useState<string | null>(null);
  const [publications, setPublications] = useState<LciaResultPublication[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [publicationsError, setPublicationsError] = useState<string | null>(null);
  const [buildForm] = Form.useForm();
  const [previewForm] = Form.useForm();
  const [publishForm] = Form.useForm();

  useEffect(() => {
    let cancelled = false;

    const loadRole = async () => {
      setLoading(true);
      try {
        const userRole = await getSystemUserRoleApi();
        if (!cancelled) {
          setRole(userRole?.role);
        }
      } catch (error) {
        if (!cancelled) {
          setRole(undefined);
        }
      } finally {
        if (!cancelled) {
          setAuthResolved(true);
          setLoading(false);
        }
      }
    };

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadImpactCategories = async () => {
      try {
        const response = await fetch('/lciamethods/list.json');
        if (!response.ok) {
          throw new Error('LCIA method list request failed');
        }
        const payload = (await response.json()) as LciaMethodListPayload;
        if (!cancelled) {
          setImpactCategoryOptions(buildImpactCategoryOptions(payload, locale));
        }
      } catch (_error) {
        if (!cancelled) {
          setImpactCategoryOptions([]);
        }
      }
    };

    void loadImpactCategories();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const isAuthorized = role === 'data_product_manager';

  const loadBuildJobs = useCallback(async () => {
    setBuildJobsLoading(true);
    setBuildJobsError(null);
    const result = await requestWorkerJobsApi({
      action: 'list',
      subjectType: 'lcia_result_build',
      visibility: 'operator',
      limit: 50,
    });
    setBuildJobs(result.data ?? []);
    setBuildJobsError(result.error?.message ?? null);
    setBuildJobsLoading(false);
  }, []);

  const loadPublications = useCallback(async () => {
    setPublicationsLoading(true);
    setPublicationsError(null);
    const result = await listLciaResultPublications({ limit: 50 });
    const rows = [...(result.data ?? [])].sort((left, right) => {
      const currentRank = Number(Boolean(right.isCurrent)) - Number(Boolean(left.isCurrent));
      if (currentRank !== 0) {
        return currentRank;
      }
      return String(right.publishedAt ?? right.unpublishedAt ?? '').localeCompare(
        String(left.publishedAt ?? left.unpublishedAt ?? ''),
      );
    });
    setPublications(rows);
    setPublicationsError(result.error?.message ?? null);
    setPublicationsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      void loadBuildJobs();
    }
  }, [isAuthorized, loadBuildJobs]);

  useEffect(() => {
    if (isAuthorized && activeTabKey === 'publication') {
      void loadPublications();
    }
  }, [activeTabKey, isAuthorized, loadPublications]);

  const visibleBuildJobs = useMemo(
    () => mergeSubmittedBuildJobs(submittedBuildJobs, buildJobs),
    [buildJobs, submittedBuildJobs],
  );
  const packageOptions = useMemo(
    () => packageOptionsFromBuildJobs(visibleBuildJobs),
    [visibleBuildJobs],
  );

  useEffect(() => {
    if (activeTabKey === 'preview' && selectedPackageId) {
      previewForm.setFieldsValue?.({ packageId: selectedPackageId });
    }
  }, [activeTabKey, previewForm, selectedPackageId]);

  useEffect(() => {
    if (activeTabKey === 'publication' && selectedPackageId) {
      publishForm.setFieldsValue?.({ packageId: selectedPackageId });
    }
  }, [activeTabKey, publishForm, selectedPackageId]);

  const coverageModeOptions = useMemo(
    () => [
      {
        label: t('pages.dataProcessing.coverage.globalEligible', 'Global eligible'),
        value: 'global_eligible',
      },
      { label: t('pages.dataProcessing.coverage.subset', 'Subset'), value: 'subset' },
    ],
    [t],
  );

  const commandSuccessTitle = (action: CommandAction) => {
    const messages: Record<CommandAction, { defaultMessage: string; id: string }> = {
      createBuild: {
        id: 'pages.dataProcessing.command.createBuildSuccess',
        defaultMessage: 'Result generation request submitted',
      },
      previewPackage: {
        id: 'pages.dataProcessing.command.previewPackageSuccess',
        defaultMessage: 'Result preview loaded',
      },
      publishPackage: {
        id: 'pages.dataProcessing.command.publishPackageSuccess',
        defaultMessage: 'Result set published',
      },
      unpublishPublication: {
        id: 'pages.dataProcessing.command.unpublishPublicationSuccess',
        defaultMessage: 'Publication unpublished',
      },
    };
    return t(messages[action].id, messages[action].defaultMessage);
  };

  const commandSummaryRows = (action: CommandAction, data: unknown): CommandSummaryRow[] => {
    const record = isRecord(data) ? data : null;
    const workerJob = isRecord(record?.workerJob) ? record.workerJob : null;

    const rows: CommandSummaryRow[] = [];
    const addRow = (label: string, value?: string) => {
      if (value) {
        rows.push({ label, value });
      }
    };

    if (action === 'createBuild') {
      addRow(
        t('pages.dataProcessing.command.buildId', 'Generation ID'),
        firstString(record?.buildId, record?.build_id, record?.id),
      );
      addRow(
        t('pages.dataProcessing.command.workerJobId', 'Worker job ID'),
        firstString(
          record?.workerJobId,
          record?.worker_job_id,
          workerJob?.id,
          workerJob?.workerJobId,
          workerJob?.worker_job_id,
        ),
      );
      return rows;
    }

    if (action === 'previewPackage') {
      return rows;
    }

    if (action === 'publishPackage') {
      addRow(
        t('pages.dataProcessing.command.publicationId', 'Publication ID'),
        firstString(record?.publicationId, record?.publication_id, record?.id),
      );
      addRow(
        t('pages.dataProcessing.command.packageId', 'Result set ID'),
        firstString(record?.packageId, record?.package_id),
      );
      addRow(t('pages.dataProcessing.command.status', 'Status'), firstString(record?.status));
      return rows;
    }

    addRow(
      t('pages.dataProcessing.command.publicationId', 'Publication ID'),
      firstString(record?.publicationId, record?.publication_id, record?.id),
    );
    addRow(
      t('pages.dataProcessing.command.status', 'Status'),
      firstString(record?.status, typeof data === 'string' ? data : undefined),
    );
    return rows;
  };

  const commandSuccessMessage = (action: CommandAction, data: unknown) => {
    const rows = commandSummaryRows(action, data);

    return (
      <div className={styles.commandMessage}>
        <strong>{commandSuccessTitle(action)}</strong>
        {rows.length > 0 ? (
          <div className={styles.commandMeta}>
            {rows.map((row) => (
              <span key={`${row.label}:${row.value}`} className={styles.commandMetaItem}>
                {row.label}: <code className={styles.commandMetaValue}>{row.value}</code>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  const showResult = (
    action: CommandAction,
    result: { data: unknown; error: { message?: string } | null },
  ) => {
    if (result.error) {
      setCommandStatus({
        kind: 'error',
        message: result.error.message ?? t('pages.dataProcessing.command.failed', 'Command failed'),
      });
      return;
    }

    setCommandStatus({
      kind: 'success',
      message: commandSuccessMessage(action, result.data),
    });
  };

  const runCommand = async (
    action: CommandAction,
    command: () => Promise<{ data: unknown; error: { message?: string } | null }>,
  ) => {
    setSubmittingAction(action);
    try {
      const result = await command();
      showResult(action, result);
      return result;
    } catch (error) {
      setCommandStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleCreateBuild = async () => {
    const values = await buildForm.validateFields();
    const result = await runCommand('createBuild', () =>
      createLciaResultBuildRequest({
        name: values.name,
        coverageMode: values.coverageMode || 'global_eligible',
        ...(values.defaultImpactCategory
          ? { defaultImpactCategory: values.defaultImpactCategory }
          : {}),
        lciaMethodSet: [],
      }),
    );

    if (result && !result.error) {
      const submittedJob = createSubmittedBuildJob(result.data);
      if (submittedJob) {
        setSubmittedBuildJobs((currentJobs) =>
          mergeSubmittedBuildJobs([submittedJob], currentJobs),
        );
      }
      void loadBuildJobs();
    }
  };

  const previewPackageById = async (
    packageId: string,
    options: {
      impactCategoryId?: string;
      rowOffset: number;
    },
  ) => {
    setSelectedPackageId(packageId);
    const rowOffset = options.rowOffset;
    const impactCategoryId = options.impactCategoryId ?? previewImpactCategoryId;
    const result = await runCommand('previewPackage', () =>
      previewLciaResultPackage({
        packageId,
        rowOffset,
        rowLimit: previewPageSize,
        ...(impactCategoryId ? { impactCategoryId } : {}),
      }),
    );
    const nextPreviewData = result?.error
      ? null
      : ((result?.data ?? null) as Record<string, any> | null);
    setPreviewData(nextPreviewData);
    if (nextPreviewData) {
      const detailPage = isRecord(nextPreviewData.detailPage) ? nextPreviewData.detailPage : {};
      const resolvedImpactCategoryId = firstString(
        detailPage.impactCategoryId,
        nextPreviewData.summary?.defaultImpactCategory,
        impactCategoryId,
      );
      setPreviewImpactCategoryId(resolvedImpactCategoryId);
    }
    return result;
  };

  const handlePreviewPackage = async () => {
    const values = await previewForm.validateFields();
    setPreviewImpactCategoryId(undefined);
    await previewPackageById(values.packageId, { rowOffset: 0 });
  };

  const handlePreviewPackageFromJob = async (option: LciaResultPackageOption) => {
    setActiveTabKey('preview');
    setCommandStatus(null);
    setPreviewImpactCategoryId(undefined);
    await previewPackageById(option.packageId, { rowOffset: 0 });
  };

  const handlePublishPackage = async () => {
    const values = await publishForm.validateFields();
    const result = await runCommand('publishPackage', () =>
      publishLciaResultPackage({
        packageId: values.packageId,
        displayDefaultImpactCategory: values.displayDefaultImpactCategory,
        ...(values.reason ? { reason: values.reason } : {}),
      }),
    );
    if (result && !result.error) {
      void loadPublications();
    }
  };

  const handleUnpublishPublication = async (publicationId: string) => {
    const result = await runCommand('unpublishPublication', () =>
      unpublishLciaResultPublication({
        publicationId,
      }),
    );
    if (result && !result.error) {
      void loadPublications();
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    setCommandStatus(null);
  };

  const renderCommandStatus = () =>
    commandStatus ? (
      <Alert
        message={commandStatus.message}
        type={commandStatus.kind === 'success' ? 'success' : 'error'}
      />
    ) : null;

  const renderJobProgress = (job: WorkerJobResult) => {
    const numericProgress = typeof job.progress === 'number' ? job.progress : Number(job.progress);
    if (!Number.isFinite(numericProgress)) {
      return null;
    }

    return (
      <Progress
        percent={Math.max(0, Math.min(100, Math.round(numericProgress)))}
        showInfo={false}
      />
    );
  };

  const renderJobPhase = (phase: WorkerJobResult['phase']) =>
    phase === submittedBuildPendingPhase
      ? t('pages.dataProcessing.jobs.waitingForWorker', 'Waiting for worker processing')
      : null;

  const renderBuildJobs = () => (
    <Card
      title={t('pages.dataProcessing.jobs.title', 'Result generation tasks')}
      extra={
        <Button onClick={loadBuildJobs} loading={buildJobsLoading}>
          {t('pages.dataProcessing.jobs.refresh', 'Refresh jobs')}
        </Button>
      }
    >
      <Spin spinning={buildJobsLoading}>
        <Space direction='vertical' size='small' className={styles.jobList}>
          <div className={styles.jobHint}>
            {t(
              'pages.dataProcessing.jobs.hint',
              'Result set generation runs asynchronously. Refresh tasks to update progress, then preview or publish the result set after completion.',
            )}
          </div>
          {buildJobsError ? <Alert message={buildJobsError} type='error' /> : null}
          {visibleBuildJobs.length === 0 ? (
            <div className={styles.emptyJobs} data-testid='data-product-jobs-empty'>
              {t('pages.dataProcessing.jobs.empty', 'No result generation tasks')}
            </div>
          ) : (
            <div className={styles.jobTable} role='table'>
              <div className={styles.jobTableHeader} role='row'>
                <span role='columnheader'>
                  {t('pages.dataProcessing.jobs.resultSet', 'Result set')}
                </span>
                <span role='columnheader'>
                  {t('pages.dataProcessing.command.status', 'Status')}
                </span>
                <span role='columnheader'>
                  {t('pages.dataProcessing.jobs.packageInputs', 'Inputs')}
                </span>
                <span role='columnheader'>
                  {t('pages.dataProcessing.jobs.updatedAt', 'Updated at')}
                </span>
                <span role='columnheader'>{t('pages.dataProcessing.jobs.action', 'Action')}</span>
              </div>
              {visibleBuildJobs.map((job, index) => {
                const jobId = job.id ?? `${job.subjectId ?? 'job'}-${index}`;
                const packageOption = packageOptionFromBuildJob(job);
                const packageInputs = packageOption ? packageCountLabel(packageOption) : undefined;
                const failureSummary = summarizeWorkerJobFailure(job, t);
                const payload = isRecord(job.payload) ? job.payload : {};
                const resultSetLabel =
                  firstString(
                    job.resultSetName,
                    job.result_set_name,
                    job.packageName,
                    job.package_name,
                  ) ??
                  packageOption?.packageName ??
                  firstString(payload.name) ??
                  packageOption?.packageVersion ??
                  t('pages.dataProcessing.jobs.pendingResultSet', 'Result set generation');
                const resultSetVersion = packageOption?.packageVersion;
                const jobPhaseLabel = renderJobPhase(job.phase);
                const previewPackageLabel = t(
                  'pages.dataProcessing.action.previewPackage',
                  'Preview result set',
                );

                return (
                  <section
                    key={jobId}
                    className={styles.jobTableRow}
                    data-testid={`data-product-job-${jobId}`}
                    role='row'
                  >
                    <div className={styles.jobTableCell} role='cell'>
                      <strong>{resultSetLabel}</strong>
                      {resultSetVersion && resultSetVersion !== resultSetLabel ? (
                        <span className={styles.jobSecondary}>{resultSetVersion}</span>
                      ) : null}
                      {jobPhaseLabel ? (
                        <span className={styles.jobSecondary}>{jobPhaseLabel}</span>
                      ) : null}
                      {renderJobProgress(job)}
                    </div>
                    <div className={styles.jobTableCell} role='cell'>
                      {renderStatusIcon(job.status, failureSummary ?? undefined)}
                    </div>
                    <div className={styles.jobTableCell} role='cell'>
                      {packageInputs ?? '-'}
                    </div>
                    <div className={styles.jobTableCell} role='cell'>
                      {formatTimestamp(job.updatedAt)}
                    </div>
                    <div className={styles.jobTableCell} role='cell'>
                      {packageOption ? (
                        <Tooltip title={previewPackageLabel}>
                          <Button
                            type='text'
                            size='small'
                            className={styles.iconActionButton}
                            icon={<EyeOutlined />}
                            aria-label={previewPackageLabel}
                            onClick={() => handlePreviewPackageFromJob(packageOption)}
                          />
                        </Tooltip>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </Space>
      </Spin>
    </Card>
  );

  const renderImpactCategorySelect = (ariaLabel: string) => (
    <Select
      aria-label={ariaLabel}
      allowClear
      showSearch
      optionFilterProp='label'
      options={impactCategoryOptions}
      placeholder={t(
        'pages.dataProcessing.form.defaultImpactCategory.placeholder',
        'Select an impact category',
      )}
    />
  );

  const renderPackageSelect = (ariaLabel: string) => (
    <Select
      aria-label={ariaLabel}
      disabled={packageOptions.length === 0}
      showSearch
      optionFilterProp='label'
      options={packageOptions}
      placeholder={t(
        'pages.dataProcessing.form.packageSelect.placeholder',
        'Select a preview-ready result set',
      )}
    />
  );

  const renderBuildRequests = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <Card>
        <Form
          form={buildForm}
          initialValues={{
            coverageMode: 'global_eligible',
          }}
        >
          <Form.Item
            label={t('pages.dataProcessing.form.packageName', 'Result set name')}
            name='name'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageNameRequired',
                  'Result set name is required',
                ),
              },
            ]}
          >
            <Input aria-label={t('pages.dataProcessing.form.packageName', 'Result set name')} />
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.coverageMode', 'Coverage mode')}
            name='coverageMode'
          >
            <Select
              aria-label={t('pages.dataProcessing.form.coverageMode', 'Coverage mode')}
              options={coverageModeOptions}
            />
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.defaultImpactCategory', 'Default impact category')}
            name='defaultImpactCategory'
          >
            {renderImpactCategorySelect(
              t('pages.dataProcessing.form.defaultImpactCategory', 'Default impact category'),
            )}
          </Form.Item>
          <Button
            type='primary'
            loading={submittingAction === 'createBuild'}
            onClick={handleCreateBuild}
          >
            {t('pages.dataProcessing.action.createBuild', 'Generate result set')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
      {renderBuildJobs()}
    </Space>
  );

  const previewSummary = isRecord(previewData?.summary) ? previewData.summary : {};
  const previewInputManifest = isRecord(previewData?.inputManifest)
    ? previewData.inputManifest
    : {};
  const previewInputScope = isRecord(previewData?.inputScope) ? previewData.inputScope : {};
  const previewProcesses = unknownArray(previewInputManifest.processes);
  const previewProcessCount =
    numberField(previewInputScope.processCount) || previewProcesses.length;
  const previewSelectionMode = firstString(
    previewInputScope.selectionMode,
    previewInputManifest.selectionMode,
  );
  const previewPredicateVersion = firstString(
    previewInputScope.predicateVersion,
    previewInputManifest.predicateVersion,
  );
  const previewScopeStateCodeCounts = stateCodeCountsFromScope(previewInputScope.stateCodeCounts);
  const previewStateCodeCounts =
    previewScopeStateCodeCounts.length > 0
      ? previewScopeStateCodeCounts
      : stateCodeCountsFromProcesses(previewProcesses);
  const previewQueryArtifact = isRecord(previewData?.queryArtifact)
    ? previewData.queryArtifact
    : {};
  const previewResultArtifact = isRecord(previewData?.resultArtifact)
    ? previewData.resultArtifact
    : {};
  const previewArtifactManifest = isRecord(previewData?.artifactManifest)
    ? previewData.artifactManifest
    : {};
  const previewResultDiagnostics = isRecord(previewArtifactManifest.resultDiagnostics)
    ? previewArtifactManifest.resultDiagnostics
    : {};
  const previewSnapshotBuilder = isRecord(previewArtifactManifest.snapshotBuilder)
    ? previewArtifactManifest.snapshotBuilder
    : {};
  const previewArtifactStorage = [
    previewResultDiagnostics.storage,
    previewResultDiagnostics.persist_mode,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' / ');
  const previewMatrixSummary = summarizeSnapshotMatrix(previewSnapshotBuilder.stdout_tail);
  const previewCoverageSummary = summarizeSnapshotCoverage(previewSnapshotBuilder.stdout_tail);
  const previewDetailPage = isRecord(previewData?.detailPage) ? previewData.detailPage : {};
  const previewDetailRows = recordArray(previewDetailPage.rows);
  const impactCategoryLabelById = new Map(
    impactCategoryOptions.map((option) => [option.value, option.label]),
  );
  const parseLocalImpactLabel = (impactCategoryId?: string) => {
    const label = impactCategoryId ? impactCategoryLabelById.get(impactCategoryId) : undefined;
    if (!label) {
      return {};
    }
    const match = label.match(/^(.*?)\s*\((.*?)\)\s*$/);
    if (!match) {
      return { name: label };
    }
    const parts = match[2].split('/').map((part) => part.trim());
    return {
      name: match[1].trim(),
      version: parts[0],
      unit: parts.slice(1).join(' / '),
    };
  };
  const previewImpactOptionRecords = recordArray(previewData?.impactOptions);
  const fallbackPreviewImpactCategoryId = firstString(
    previewDetailPage.impactCategoryId,
    previewDetailPage.impactKey,
  );
  const previewImpactOptions = (
    previewImpactOptionRecords.length > 0
      ? previewImpactOptionRecords
      : fallbackPreviewImpactCategoryId
        ? [
            {
              impactCategoryId: fallbackPreviewImpactCategoryId,
              impactKey: firstString(previewDetailPage.impactKey),
              impactName: firstString(previewDetailPage.impactName),
              impactVersion: firstString(previewDetailPage.impactVersion),
              unit: firstDisplayString(previewDetailPage.unit),
            },
          ]
        : []
  )
    .map((impact) => {
      const value = firstString(impact.impactCategoryId, impact.impactKey) ?? '';
      const localLabel = impactCategoryLabelById.get(value);
      const suffix = [firstString(impact.impactVersion), firstString(impact.unit)]
        .filter(Boolean)
        .join(' / ');
      const label =
        localLabel ??
        [
          firstString(impact.impactName, impact.impactKey, impact.impactCategoryId),
          suffix ? `(${suffix})` : '',
        ]
          .filter(Boolean)
          .join(' ');
      return { value, label };
    })
    .filter((option) => option.value);
  const previewWarnings = recordArray(previewData?.previewWarnings).filter(
    (warning) => firstString(warning.code) !== 'preview_impact_metadata_lookup_failed',
  );
  const previewResultReady = previewDetailPage.status === 'ready';
  const previewResultUnavailableReason = firstString(previewDetailPage.reason);
  const previewDetailTotal = numberField(previewDetailPage.totalCount);
  const previewDetailReturned = numberField(previewDetailPage.returnedCount);
  const selectedPreviewPackageId = firstString(previewSummary.packageId, selectedPackageId);
  const selectedPreviewImpactCategoryId = firstString(
    previewDetailPage.impactCategoryId,
    previewDetailPage.impactKey,
    previewImpactCategoryId,
  );
  const selectedPreviewImpactLocal = parseLocalImpactLabel(selectedPreviewImpactCategoryId);
  const previewValueUnit =
    firstDisplayString(previewDetailPage.unit) ?? selectedPreviewImpactLocal.unit;
  const previewValueTitle = previewValueUnit
    ? `${t('pages.dataProcessing.preview.value', 'Value')} (${previewValueUnit})`
    : t('pages.dataProcessing.preview.value', 'Value');

  const handleExportPreview = async () => {
    const packageId = selectedPreviewPackageId as string;

    setExportingPreview(true);
    try {
      const allRows: Record<string, unknown>[] = [];
      let rowOffset = 0;
      let totalRows = previewDetailTotal || Number.MAX_SAFE_INTEGER;

      while (rowOffset < totalRows) {
        const result = await previewLciaResultPackage({
          packageId,
          ...(selectedPreviewImpactCategoryId
            ? { impactCategoryId: selectedPreviewImpactCategoryId }
            : {}),
          rowOffset,
          rowLimit: previewExportPageSize,
        });

        if (result.error) {
          setCommandStatus({
            kind: 'error',
            message:
              result.error.message ??
              t('pages.dataProcessing.preview.exportFailed', 'Failed to export result details'),
          });
          return;
        }

        const detailPage = isRecord(result.data?.detailPage) ? result.data.detailPage : {};
        const rows = recordArray(detailPage.rows);
        const returned = numberField(detailPage.returnedCount) || rows.length;
        const nextTotal = numberField(detailPage.totalCount);
        allRows.push(...rows);

        if (nextTotal > 0) {
          totalRows = nextTotal;
        }
        if (returned <= 0 || (nextTotal <= 0 && returned < previewExportPageSize)) {
          break;
        }
        rowOffset += returned;
      }

      const filenameBase = [packageId, selectedPreviewImpactCategoryId]
        .filter(Boolean)
        .join('-')
        .replace(/[^a-zA-Z0-9._-]+/g, '-');
      downloadHtmlTableAsExcel(
        `${filenameBase}.xls`,
        [
          '#',
          t('pages.dataProcessing.preview.processName', 'Process'),
          t('pages.dataProcessing.preview.processUuid', 'Process UUID'),
          t('pages.dataProcessing.preview.processVersion', 'Version'),
          t('pages.dataProcessing.preview.stateCode', 'State code'),
          previewValueTitle,
        ],
        allRows.map((row) => [
          row.rowNumber,
          firstString(row.processName, row.processId) ?? '-',
          firstString(row.processId, row.process_id, row.id) ?? '-',
          firstString(row.processVersion) ?? '-',
          stringifyCommandData(row.stateCode),
          formatNumericValue(row.value),
        ]),
      );
    } finally {
      setExportingPreview(false);
    }
  };

  const previewDetailColumns = [
    {
      title: '#',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 64,
    },
    {
      title: t('pages.dataProcessing.preview.processName', 'Process'),
      dataIndex: 'processName',
      key: 'processName',
      render: (_value: unknown, row: Record<string, unknown>) => {
        const processId = firstString(row.processId);
        const processVersion = firstString(row.processVersion);
        const processName = firstString(row.processName) ?? processId ?? '-';
        if (!processId || !processVersion) {
          return processName;
        }
        return <a href={processDetailHref(processId, processVersion)}>{processName}</a>;
      },
    },
    {
      title: t('pages.dataProcessing.preview.processVersion', 'Version'),
      dataIndex: 'processVersion',
      key: 'processVersion',
      width: 120,
    },
    {
      title: t('pages.dataProcessing.preview.stateCode', 'State code'),
      dataIndex: 'stateCode',
      key: 'stateCode',
      width: 120,
      render: stringifyCommandData,
    },
    {
      title: previewValueTitle,
      dataIndex: 'value',
      key: 'value',
      width: 140,
      render: formatNumericValue,
    },
  ];

  const renderPreviewPager = (
    page: Record<string, unknown>,
    total: number,
    returned: number,
    onOffsetChange: (offset: number) => void,
  ) => {
    const offset = numberField(page.offset);
    const limit = numberField(page.limit) || previewPageSize;
    const start = total === 0 ? 0 : offset + 1;
    const end = total === 0 ? 0 : offset + returned;
    const canPrevious = offset > 0;
    const canNext = offset + returned < total;

    return (
      <Space size='small' className={styles.previewPager}>
        <Button
          size='small'
          disabled={!canPrevious}
          onClick={() => onOffsetChange(Math.max(0, offset - limit))}
        >
          {t('pages.dataProcessing.preview.previousPage', 'Previous')}
        </Button>
        <span>{`${start}-${end} / ${total}`}</span>
        <Button size='small' disabled={!canNext} onClick={() => onOffsetChange(offset + limit)}>
          {t('pages.dataProcessing.preview.nextPage', 'Next')}
        </Button>
      </Space>
    );
  };

  const reloadPreviewDetailPage = (rowOffset: number) => {
    if (selectedPreviewPackageId) {
      void previewPackageById(selectedPreviewPackageId, {
        impactCategoryId: previewImpactCategoryId,
        rowOffset,
      });
    }
  };

  const handlePreviewImpactChange = (impactCategoryId: string) => {
    setPreviewImpactCategoryId(impactCategoryId);
    if (selectedPreviewPackageId) {
      void previewPackageById(selectedPreviewPackageId, {
        impactCategoryId,
        rowOffset: 0,
      });
    }
  };

  const renderArtifactSummary = (title: string, artifact: Record<string, unknown>) => (
    <div className={styles.previewArtifact}>
      <strong>{title}</strong>
      <div className={styles.previewArtifactMeta}>
        <span>{stringifyCommandData(artifact.artifactFormat)}</span>
        <span>{formatArtifactByteSize(artifact.artifactByteSize)}</span>
        <code>{stringifyCommandData(artifact.artifactSha256)}</code>
      </div>
    </div>
  );

  const renderPackagePreview = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <Card>
        <Form form={previewForm}>
          <Form.Item
            label={t('pages.dataProcessing.form.previewPackageId', 'Select result set')}
            name='packageId'
            help={
              packageOptions.length === 0
                ? t(
                    'pages.dataProcessing.form.packageSelect.empty',
                    'No preview-ready result set yet. Refresh tasks or wait for the worker to complete.',
                  )
                : undefined
            }
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageIdRequired',
                  'Result set is required',
                ),
              },
            ]}
          >
            {renderPackageSelect(
              t('pages.dataProcessing.form.previewPackageId', 'Select result set'),
            )}
          </Form.Item>
          <Button
            type='primary'
            disabled={packageOptions.length === 0}
            loading={submittingAction === 'previewPackage'}
            onClick={handlePreviewPackage}
          >
            {t('pages.dataProcessing.action.previewPackage', 'Preview result set')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
      {previewData ? (
        <Space direction='vertical' size='middle' className={styles.previewDetails}>
          <Card title={t('pages.dataProcessing.preview.summaryTitle', 'Result set overview')}>
            <Descriptions bordered size='small' column={1}>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.packageId', 'Result set ID')}
              >
                {stringifyCommandData(previewSummary.packageId)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.packageVersion', 'Result set version')}
              >
                {stringifyCommandData(previewSummary.packageVersion)}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.dataProcessing.preview.status', 'Status')}>
                {stringifyCommandData(previewSummary.status)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.coverageMode', 'Coverage mode')}
              >
                {stringifyCommandData(previewSummary.coverageMode)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t(
                  'pages.dataProcessing.preview.defaultImpactCategory',
                  'Default impact category',
                )}
              >
                {stringifyCommandData(previewSummary.defaultImpactCategory)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.inputManifestHash', 'Input manifest hash')}
              >
                {stringifyCommandData(previewSummary.inputManifestHash)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.includedInputs', 'Included inputs')}
              >
                {stringifyCommandData(previewSummary.includedInputCount)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.eligibleInputs', 'Eligible inputs')}
              >
                {stringifyCommandData(previewSummary.eligibleInputCount)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.impactCategories', 'Impact category count')}
              >
                {Array.isArray(previewSummary.availableImpactCategories)
                  ? previewSummary.availableImpactCategories.length
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <CalculationBundlePanel
            packageId={selectedPreviewPackageId as string}
            initialProcessId={deepLink.processId}
            initialProcessVersion={deepLink.processVersion}
          />
          <Card title={t('pages.dataProcessing.preview.inputScopeTitle', 'Input scope')}>
            <Descriptions bordered size='small' column={1}>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.processCount', 'Process count')}
              >
                {previewProcessCount}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.selectionMode', 'Selection mode')}
              >
                {stringifyCommandData(previewSelectionMode)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.predicateVersion', 'Predicate version')}
              >
                {stringifyCommandData(previewPredicateVersion)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.stateCodes', 'State codes')}
              >
                <div className={styles.previewTags}>
                  {previewStateCodeCounts.map((item) => (
                    <span key={item.stateCode}>{`${item.stateCode}: ${item.count}`}</span>
                  ))}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card
            title={t('pages.dataProcessing.preview.resultDetailsTitle', 'Result details')}
            extra={
              <Space size='small' className={styles.previewResultActions}>
                {renderPreviewPager(
                  previewDetailPage,
                  previewDetailTotal,
                  previewDetailReturned,
                  reloadPreviewDetailPage,
                )}
                <Button
                  size='small'
                  icon={<DownloadOutlined />}
                  loading={exportingPreview}
                  disabled={!previewResultReady || !selectedPreviewPackageId}
                  onClick={handleExportPreview}
                >
                  {t('pages.dataProcessing.preview.exportExcel', 'Export Excel')}
                </Button>
              </Space>
            }
          >
            <Space direction='vertical' size='middle' className={styles.previewTableStack}>
              <Space className={styles.previewResultToolbar} size='small'>
                <span>{t('pages.dataProcessing.preview.lciaMethod', 'LCIA method')}</span>
                <Select
                  aria-label={t('pages.dataProcessing.preview.lciaMethod', 'LCIA method')}
                  value={previewImpactCategoryId}
                  disabled={previewImpactOptions.length === 0}
                  showSearch
                  optionFilterProp='label'
                  options={previewImpactOptions}
                  onChange={handlePreviewImpactChange}
                />
              </Space>
              {previewWarnings.length > 0 ? (
                <Alert
                  type='warning'
                  message={t(
                    'pages.dataProcessing.preview.warningTitle',
                    'Some preview data could not be loaded',
                  )}
                />
              ) : null}
              {!previewResultReady ? (
                <Alert
                  type='warning'
                  message={
                    previewResultUnavailableReason ??
                    t(
                      'pages.dataProcessing.preview.resultUnavailable',
                      'Calculation results are not available for this preview.',
                    )
                  }
                />
              ) : null}
              <div className={styles.previewTableWrap}>
                <Table
                  size='small'
                  pagination={false}
                  rowKey={(row: Record<string, unknown>) =>
                    `${stringifyCommandData(row.processId)}:${stringifyCommandData(
                      row.processVersion,
                    )}:${stringifyCommandData(row.impactCategoryId)}:${stringifyCommandData(
                      row.rowNumber,
                    )}`
                  }
                  columns={previewDetailColumns}
                  dataSource={previewDetailRows}
                />
              </div>
            </Space>
          </Card>
          <Card
            title={t(
              'pages.dataProcessing.preview.artifactVerificationTitle',
              'Artifact verification',
            )}
          >
            <Descriptions bordered size='small' column={1}>
              <Descriptions.Item
                label={t(
                  'pages.dataProcessing.preview.artifactManifestVersion',
                  'Manifest version',
                )}
              >
                {stringifyCommandData(previewArtifactManifest.artifactManifestVersion)}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.dataProcessing.preview.storage', 'Storage')}>
                {previewArtifactStorage || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.snapshotId', 'Snapshot ID')}
              >
                {stringifyCommandData(previewSnapshotBuilder.resolved_snapshot_id)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.snapshotMatrix', 'Snapshot matrix')}
              >
                {stringifyCommandData(previewMatrixSummary)}
              </Descriptions.Item>
              <Descriptions.Item
                label={t('pages.dataProcessing.preview.snapshotCoverage', 'Snapshot coverage')}
              >
                {stringifyCommandData(previewCoverageSummary)}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.dataProcessing.preview.artifacts', 'Artifacts')}>
                <Space direction='vertical' size='small' className={styles.previewArtifactList}>
                  {renderArtifactSummary(
                    t('pages.dataProcessing.preview.queryArtifact', 'Query artifact'),
                    previewQueryArtifact,
                  )}
                  {renderArtifactSummary(
                    t('pages.dataProcessing.preview.resultArtifact', 'Result artifact'),
                    previewResultArtifact,
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Space>
      ) : null}
    </Space>
  );

  const renderPublication = () => (
    <Space direction='vertical' size='middle' className={styles.workbenchPanel}>
      <LcaReleaseReadPanel
        processId={deepLink.processId}
        processVersion={deepLink.processVersion}
      />
      <Card title={t('pages.dataProcessing.publications.legacyTitle', 'Legacy LCIA publication')}>
        <Form form={publishForm}>
          <Form.Item
            label={t('pages.dataProcessing.form.publishPackageId', 'Publish result set')}
            name='packageId'
            help={
              packageOptions.length === 0
                ? t(
                    'pages.dataProcessing.form.packageSelect.empty',
                    'No preview-ready result set yet. Refresh tasks or wait for the worker to complete.',
                  )
                : undefined
            }
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.packageIdRequired',
                  'Result set is required',
                ),
              },
            ]}
          >
            {renderPackageSelect(
              t('pages.dataProcessing.form.publishPackageId', 'Publish result set'),
            )}
          </Form.Item>
          <Form.Item
            label={t(
              'pages.dataProcessing.form.publishDefaultImpactCategory',
              'Publish default impact category',
            )}
            name='displayDefaultImpactCategory'
            rules={[
              {
                required: true,
                message: t(
                  'pages.dataProcessing.validation.defaultImpactCategoryRequired',
                  'Default impact category is required',
                ),
              },
            ]}
          >
            {renderImpactCategorySelect(
              t(
                'pages.dataProcessing.form.publishDefaultImpactCategory',
                'Publish default impact category',
              ),
            )}
          </Form.Item>
          <Form.Item
            label={t('pages.dataProcessing.form.publishReason', 'Publish reason')}
            name='reason'
          >
            <Input aria-label={t('pages.dataProcessing.form.publishReason', 'Publish reason')} />
          </Form.Item>
          <Button
            type='primary'
            loading={submittingAction === 'publishPackage'}
            onClick={handlePublishPackage}
          >
            {t('pages.dataProcessing.action.publishPackage', 'Publish result set')}
          </Button>
        </Form>
      </Card>
      {renderCommandStatus()}
      <Card
        title={t('pages.dataProcessing.publications.title', 'Publication management')}
        extra={
          <Button onClick={loadPublications} loading={publicationsLoading}>
            {t('pages.dataProcessing.publications.refresh', 'Refresh publications')}
          </Button>
        }
      >
        <Spin spinning={publicationsLoading}>
          <Space direction='vertical' size='small' className={styles.publicationList}>
            {publicationsError ? <Alert message={publicationsError} type='error' /> : null}
            {publications.length === 0 ? (
              <div className={styles.emptyJobs} data-testid='data-product-publications-empty'>
                {t('pages.dataProcessing.publications.empty', 'No publications yet')}
              </div>
            ) : (
              <div className={styles.publicationTable} role='table'>
                <div className={styles.publicationTableHeader} role='row'>
                  <span role='columnheader'>
                    {t('pages.dataProcessing.jobs.resultSet', 'Result set')}
                  </span>
                  <span role='columnheader'>
                    {t('pages.dataProcessing.command.status', 'Status')}
                  </span>
                  <span role='columnheader'>
                    {t(
                      'pages.dataProcessing.form.publishDefaultImpactCategory',
                      'Publish default impact category',
                    )}
                  </span>
                  <span role='columnheader'>
                    {t('pages.dataProcessing.publications.publishedAt', 'Published at')}
                  </span>
                  <span role='columnheader'>
                    {t('pages.dataProcessing.jobs.packageInputs', 'Inputs')}
                  </span>
                  <span role='columnheader'>{t('pages.dataProcessing.jobs.action', 'Action')}</span>
                </div>
                {publications.map((publication, index) => {
                  const publicationId = firstString(
                    publication.publicationId,
                    (publication as { id?: unknown }).id,
                  );
                  const resultSetLabel =
                    firstString(
                      publication.packageName,
                      publication.packageVersion,
                      publication.packageId,
                    ) ?? '-';
                  const inputCount =
                    publication.includedInputCount !== undefined ||
                    publication.eligibleInputCount !== undefined
                      ? `${stringifyCommandData(publication.includedInputCount)}/${stringifyCommandData(
                          publication.eligibleInputCount,
                        )}`
                      : '-';
                  const impactLabel =
                    impactCategoryLabelById.get(publication.displayDefaultImpactCategory ?? '') ??
                    publication.displayDefaultImpactCategory ??
                    '-';
                  const canUnpublish = publication.status !== 'unpublished' && publicationId;
                  const unpublishPublicationLabel = t(
                    'pages.dataProcessing.action.unpublishPublication',
                    'Unpublish publication',
                  );

                  return (
                    <section
                      key={publicationId ?? `${publication.packageId ?? 'publication'}-${index}`}
                      className={styles.publicationTableRow}
                      data-testid={
                        publicationId
                          ? `data-product-publication-${publicationId}`
                          : `data-product-publication-${index}`
                      }
                      role='row'
                    >
                      <div className={styles.publicationTableCell} role='cell'>
                        <strong>{resultSetLabel}</strong>
                        {publication.packageVersion &&
                        publication.packageVersion !== resultSetLabel ? (
                          <span className={styles.jobSecondary}>{publication.packageVersion}</span>
                        ) : null}
                      </div>
                      <div className={styles.publicationTableCell} role='cell'>
                        {renderStatusIcon(publication.status)}
                        {publication.isCurrent ? (
                          <span className={styles.currentPublication}>
                            {t('pages.dataProcessing.publications.current', 'Current')}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.publicationTableCell} role='cell'>
                        {impactLabel}
                      </div>
                      <div className={styles.publicationTableCell} role='cell'>
                        {formatTimestamp(publication.publishedAt)}
                      </div>
                      <div className={styles.publicationTableCell} role='cell'>
                        {inputCount}
                      </div>
                      <div className={styles.publicationTableCell} role='cell'>
                        {canUnpublish ? (
                          <Tooltip title={unpublishPublicationLabel}>
                            <Button
                              type='text'
                              size='small'
                              danger
                              className={styles.iconActionButton}
                              icon={<StopOutlined />}
                              aria-label={unpublishPublicationLabel}
                              loading={submittingAction === 'unpublishPublication'}
                              onClick={() => handleUnpublishPublication(publicationId)}
                            />
                          </Tooltip>
                        ) : null}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </Space>
        </Spin>
      </Card>
    </Space>
  );

  return (
    <PageContainer title={t('pages.dataProcessing.title', 'Data Processing')}>
      <Spin spinning={loading}>
        {!authResolved ? null : !isAuthorized ? (
          <AccessDenied />
        ) : (
          <Tabs
            activeKey={activeTabKey}
            onChange={handleTabChange}
            items={[
              {
                key: 'builds',
                label: t('pages.dataProcessing.tabs.builds', 'Result Generation'),
                children: renderBuildRequests(),
              },
              {
                key: 'preview',
                label: t('pages.dataProcessing.tabs.preview', 'Result Preview'),
                children: renderPackagePreview(),
              },
              {
                key: 'publication',
                label: t('pages.dataProcessing.tabs.publication', 'Publication'),
                children: renderPublication(),
              },
            ]}
          />
        )}
      </Spin>
    </PageContainer>
  );
};

export default DataProcessing;
