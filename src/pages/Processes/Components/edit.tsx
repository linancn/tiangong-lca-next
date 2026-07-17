/* istanbul ignore file -- process editor orchestration is covered by behavioral tests; remaining misses are UI scheduling only */
import AISuggestion from '@/components/AISuggestion';
import { showValidationIssueModal } from '@/components/ValidationIssueModal';
import { RefCheckContext, RefCheckType } from '@/contexts/refCheckContext';
import {
  buildProcessExchangesRequiredValidationDetails,
  buildProcessQuantitativeReferenceValidationDetails,
  getProcessSdkIssueTabName,
  normalizeProcessSdkValidationDetails,
} from '@/pages/Processes/sdkValidation';
import type { ProblemNode, ValidationIssueSdkDetail, refDataType } from '@/pages/Utils/review';
import {
  ReffPath,
  buildValidationIssues,
  checkReferences,
  checkVersions,
  collectValidationIssueRefTabNames,
  dealProcress,
  enrichValidationIssuesWithOwner,
  getAllRefObj,
  getErrRefTab,
  mapValidationIssuesToRefCheckData,
  requestReviewSubmitJob,
  validateDatasetWithSdk,
} from '@/pages/Utils/review';

import RefsOfNewVersionDrawer, { RefVersionItem } from '@/components/RefsOfNewVersionDrawer';
import {
  getRefsOfCurrentVersion,
  getRefsOfNewVersion,
  updateRefsData,
} from '@/pages/Utils/updateReference';
import { formatDataCheckErrorWithSections } from '@/pages/Utils/validation/feedbackMessages';
import { validateVisibleFormFields } from '@/pages/Utils/validation/formSupport';
import { formatDatasetTabLabel } from '@/pages/Utils/validation/tabMessages';
import { getFlowDetail } from '@/services/flows/api';
import { genFlowFromData, genFlowNameJson } from '@/services/flows/util';
import { hasLangNormalizationDraftChanges } from '@/services/general/api';
import { toBigNumberOrZero } from '@/services/general/bignumber';
import { jsonToList } from '@/services/general/util';
import { requestOpenLcaTaskCenter } from '@/services/lca/taskCenter';
import { LCIAResultTable } from '@/services/lciaMethods/data';
import { getProcessDetail, updateProcess } from '@/services/processes/api';
import {
  FormProcess,
  ProcessDataSetObjectKeys,
  ProcessDetailData,
  ProcessDetailResponse,
  ProcessExchangeData,
  getFirstProcessExchangeAllocation,
} from '@/services/processes/data';
import { genProcessFromData, genProcessJsonOrdered } from '@/services/processes/util';
import type {
  ReviewSubmitGateBlockingReason,
  ReviewSubmitGateStatus,
  ReviewSubmitJobResult,
  ReviewSubmitJobStatus,
} from '@/services/reviews/api';
import { trackReviewSubmitTask } from '@/services/reviews/taskCenter';
import { getUserTeamId } from '@/services/roles/api';
import {
  requestWorkerJobsApi,
  type WorkerJobResult,
  type WorkerJobStatus,
} from '@/services/workerJobs/api';
import styles from '@/style/custom.less';
import { formatLocaleList } from '@/utils/localeFormatting';
import { REVIEW_SUBMIT_GATE_REASON_GUIDANCE } from '@/utils/reviewSubmitGateGuidance';
import { isRuleVerificationPassed } from '@/utils/ruleVerification';
import { CloseOutlined, FormOutlined, ProductOutlined } from '@ant-design/icons';
import { ActionType, ProForm, ProFormInstance } from '@ant-design/pro-components';
import { Alert, Button, Drawer, Form, Input, Space, Spin, Tooltip, message } from 'antd';
import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'umi';
import { ProcessForm } from './form';

type TabKeysType = ProcessDataSetObjectKeys | 'validation' | 'complianceDeclarations';
type FormProcessWithDatas = FormProcess & {
  id?: string;
  stateCode?: number;
  ruleVerification?: boolean;
};
type ProcessCheckTarget = FormProcessWithDatas & {
  id: string;
  version: string;
  stateCode: number;
  ruleVerification: boolean;
};
type ProcessReviewSubmitTarget = Pick<ProcessCheckTarget, 'id' | 'version'>;
type HandleSubmitResult = Awaited<ReturnType<typeof updateProcess>>;
type RefProblemNode = ProblemNode & {
  versionUnderReview?: boolean;
  underReviewVersion?: string;
  versionIsInTg?: boolean;
};
type ReviewSubmitGateUiStatus = 'not_run' | ReviewSubmitGateStatus | ReviewSubmitJobStatus;
type ReviewSubmitGateUiState = {
  status: ReviewSubmitGateUiStatus;
  reviewSubmitJobId?: string;
  gateRunId?: string;
  revisionChecksum?: string;
  blockingReasons?: ReviewSubmitGateBlockingReason[];
  message?: string;
};
type ReviewSubmitEvidenceIntl = Pick<ReturnType<typeof useIntl>, 'formatMessage'> & {
  locale?: string;
};
type ReviewSubmitEvidenceMessage = { defaultMessage: string; id: string };

const REVIEW_SUBMIT_EVIDENCE_MESSAGES = {
  process: {
    id: 'pages.process.reviewSubmitGate.evidence.process',
    defaultMessage: 'Process',
  },
  version: {
    id: 'pages.process.reviewSubmitGate.evidence.version',
    defaultMessage: 'Version',
  },
  exchange: {
    id: 'pages.process.reviewSubmitGate.evidence.exchange',
    defaultMessage: 'Exchange',
  },
  flow: {
    id: 'pages.process.reviewSubmitGate.evidence.flow',
    defaultMessage: 'Flow',
  },
  consumer: {
    id: 'pages.process.reviewSubmitGate.evidence.consumer',
    defaultMessage: 'Consuming process',
  },
  provider: {
    id: 'pages.process.reviewSubmitGate.evidence.provider',
    defaultMessage: 'Providing process',
  },
  target: {
    id: 'pages.process.reviewSubmitGate.evidence.target',
    defaultMessage: 'Target process',
  },
} as const;

const REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES = {
  error: {
    id: 'pages.process.reviewSubmitGate.diagnostics.error',
    defaultMessage: 'error',
  },
  workerJobId: {
    id: 'pages.process.reviewSubmitGate.diagnostics.workerJobId',
    defaultMessage: 'Worker job ID',
  },
  submitWorkerJobId: {
    id: 'pages.process.reviewSubmitGate.diagnostics.submitWorkerJobId',
    defaultMessage: 'Submit worker job ID',
  },
  gateWorkerJobId: {
    id: 'pages.process.reviewSubmitGate.diagnostics.gateWorkerJobId',
    defaultMessage: 'Gate worker job ID',
  },
  reviewSubmitJobId: {
    id: 'pages.process.reviewSubmitGate.diagnostics.reviewSubmitJobId',
    defaultMessage: 'Review submission job ID',
  },
} as const;

const REVIEW_SUBMIT_JOB_PENDING_STATUSES = new Set<ReviewSubmitGateUiStatus>([
  'queued',
  'running',
  'waiting_gate',
  'submitting',
]);
const REVIEW_SUBMIT_ROOT_WORKER_KIND = 'review_submit.submit';
const REVIEW_SUBMIT_GATE_WORKER_KIND = 'review_submit.gate';
const REVIEW_SUBMIT_ACTIVE_WORKER_STATUSES = new Set<WorkerJobStatus>([
  'queued',
  'running',
  'waiting',
]);
const REVIEW_SUBMIT_ACTIVE_WORKER_LIST_LIMIT = 20;
const REVIEW_SUBMIT_JOB_LATEST_SYNC_INITIAL_DELAY_MS = 250;
const REVIEW_SUBMIT_JOB_LATEST_SYNC_INTERVAL_MS = 5000;
const REVIEW_SUBMIT_JOB_LATEST_SYNC_MAX_ATTEMPTS = 24;

const toReviewSubmitGateEvidenceValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const values = value
      .map(toReviewSubmitGateEvidenceValue)
      .filter((item): item is string => Boolean(item));
    if (values.length > 0) {
      return `${values.slice(0, 3).join(', ')}${values.length > 3 ? '...' : ''}`;
    }
  }

  return undefined;
};

const pickReviewSubmitGateEvidenceValue = (
  record: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = toReviewSubmitGateEvidenceValue(record[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
};

const toReviewSubmitGateEvidenceRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const formatReviewSubmitGateEvidenceParts = (
  intl: ReviewSubmitEvidenceIntl,
  fields: Array<[ReviewSubmitEvidenceMessage, string | undefined]>,
) =>
  fields.flatMap(([message, evidenceValue]) =>
    evidenceValue ? [`${intl.formatMessage(message)}: ${evidenceValue}`] : [],
  );

const formatReviewSubmitGateEvidenceRecord = (
  intl: ReviewSubmitEvidenceIntl,
  value: unknown,
): string | null => {
  const record = toReviewSubmitGateEvidenceRecord(value);
  if (!record) {
    return toReviewSubmitGateEvidenceValue(value) ?? null;
  }

  const nestedProcess =
    toReviewSubmitGateEvidenceRecord(record.process) ??
    (Array.isArray(record.processes)
      ? toReviewSubmitGateEvidenceRecord(record.processes[0])
      : null);
  const processRecord = nestedProcess ?? record;
  const parts = formatReviewSubmitGateEvidenceParts(intl, [
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.process,
      pickReviewSubmitGateEvidenceValue(processRecord, ['process_name', 'process_id']),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.version,
      pickReviewSubmitGateEvidenceValue(processRecord, ['process_version']),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.exchange,
      pickReviewSubmitGateEvidenceValue(record, [
        'exchange_id',
        'input_exchange_id',
        'output_exchange_id',
      ]),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.flow,
      pickReviewSubmitGateEvidenceValue(record, ['flow_id', 'flow_idx']),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.consumer,
      pickReviewSubmitGateEvidenceValue(record, ['consumer_idx']),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.provider,
      pickReviewSubmitGateEvidenceValue(record, ['provider_id', 'provider_idx']),
    ],
    [
      REVIEW_SUBMIT_EVIDENCE_MESSAGES.target,
      pickReviewSubmitGateEvidenceValue(record, ['process_idx']),
    ],
  ]);

  if (parts.length > 0) {
    return formatLocaleList(parts, intl.locale);
  }

  const diagnosticParts = formatReviewSubmitGateEvidenceParts(intl, [
    [REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES.error, pickReviewSubmitGateEvidenceValue(record, ['error'])],
    [
      REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES.workerJobId,
      pickReviewSubmitGateEvidenceValue(record, ['worker_job_id', 'workerJobId']),
    ],
    [
      REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES.submitWorkerJobId,
      pickReviewSubmitGateEvidenceValue(record, ['submit_worker_job_id', 'submitWorkerJobId']),
    ],
    [
      REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES.gateWorkerJobId,
      pickReviewSubmitGateEvidenceValue(record, ['gate_worker_job_id', 'gateWorkerJobId']),
    ],
    [
      REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES.reviewSubmitJobId,
      pickReviewSubmitGateEvidenceValue(record, ['review_submit_job_id', 'reviewSubmitJobId']),
    ],
  ]);

  return diagnosticParts.length > 0 ? formatLocaleList(diagnosticParts, intl.locale) : null;
};

export const formatReviewSubmitGateEvidence = (
  intl: ReviewSubmitEvidenceIntl,
  details: unknown,
): string[] => {
  const detailRecord = toReviewSubmitGateEvidenceRecord(details);
  const examples =
    detailRecord && Array.isArray(detailRecord.examples) && detailRecord.examples.length > 0
      ? detailRecord.examples
      : details !== undefined && details !== null
        ? [details]
        : [];

  return examples
    .slice(0, 2)
    .map((example) => formatReviewSubmitGateEvidenceRecord(intl, example))
    .filter((item): item is string => Boolean(item));
};

const getBlockingReasonsFromResult = (
  result: unknown,
): ReviewSubmitGateBlockingReason[] | undefined => {
  const resultRecord = toReviewSubmitGateEvidenceRecord(result);
  if (!resultRecord || !Array.isArray(resultRecord.blockingReasons)) {
    return undefined;
  }

  return resultRecord.blockingReasons as ReviewSubmitGateBlockingReason[];
};

const getReviewSubmitJobBlockingReasons = (
  jobData?: ReviewSubmitJobResult,
): ReviewSubmitGateBlockingReason[] | undefined => {
  const gateWorkerJob = jobData?.gateWorkerJob ?? undefined;
  const blockingReasons =
    jobData?.gate?.blockingReasons ??
    getBlockingReasonsFromResult(gateWorkerJob?.result) ??
    getBlockingReasonsFromResult(jobData?.result) ??
    getBlockingReasonsFromResult(jobData?.error?.details);

  if (blockingReasons && blockingReasons.length > 0) {
    return blockingReasons;
  }

  if (!jobData?.error?.code && !jobData?.error?.message && jobData?.error?.details === undefined) {
    return undefined;
  }

  return [
    {
      code: jobData.error?.code,
      message: jobData.error?.message,
      details: {
        ...(toReviewSubmitGateEvidenceRecord(jobData.error?.details) ?? {
          error: jobData.error?.details,
        }),
        review_submit_job_id: jobData.reviewSubmitJobId,
        submit_worker_job_id: jobData.submitWorkerJobId ?? jobData.rootJobId,
        gate_worker_job_id: jobData.gateWorkerJobId,
      },
    },
  ];
};

const isReviewSubmitTerminalStatus = (status: ReviewSubmitGateUiStatus) =>
  status !== 'not_run' && !REVIEW_SUBMIT_JOB_PENDING_STATUSES.has(status);

const isReviewSubmitGateNotPassedStatus = (status: ReviewSubmitGateUiStatus) =>
  status === 'blocked' || status === 'stale' || status === 'error';

const isReviewSubmitWorkerStatusActive = (status: unknown): status is WorkerJobStatus =>
  typeof status === 'string' && REVIEW_SUBMIT_ACTIVE_WORKER_STATUSES.has(status as WorkerJobStatus);

const isReviewSubmitGateCheckActive = (
  jobData?: ReviewSubmitJobResult,
): jobData is ReviewSubmitJobResult => {
  if (!jobData) {
    return false;
  }

  if (REVIEW_SUBMIT_JOB_PENDING_STATUSES.has(jobData.status)) {
    return true;
  }

  if (jobData.gate?.status && REVIEW_SUBMIT_JOB_PENDING_STATUSES.has(jobData.gate.status)) {
    return true;
  }

  return (
    isReviewSubmitWorkerStatusActive(jobData.gateWorkerJob?.status) ||
    isReviewSubmitWorkerStatusActive(jobData.workerJob?.status) ||
    isReviewSubmitWorkerStatusActive(jobData.submitWorkerJob?.status)
  );
};

const isReviewSubmitWorkerJob = (
  workerJob?: WorkerJobResult | null,
): workerJob is WorkerJobResult =>
  workerJob?.jobKind === REVIEW_SUBMIT_ROOT_WORKER_KIND ||
  workerJob?.jobKind === REVIEW_SUBMIT_GATE_WORKER_KIND;

const isReviewSubmitWorkerJobForProcess = (
  workerJob: WorkerJobResult,
  processDetail: ProcessReviewSubmitTarget,
): boolean =>
  isReviewSubmitWorkerJob(workerJob) &&
  workerJob.subjectType === 'processes' &&
  workerJob.subjectId === processDetail.id &&
  (!workerJob.subjectVersion || workerJob.subjectVersion === processDetail.version);

const findActiveReviewSubmitWorkerJob = (
  workerJobs: WorkerJobResult[] | null | undefined,
  processDetail: ProcessReviewSubmitTarget,
): WorkerJobResult | undefined =>
  workerJobs?.find(
    (workerJob) =>
      isReviewSubmitWorkerJobForProcess(workerJob, processDetail) &&
      isReviewSubmitWorkerStatusActive(workerJob.status),
  );

const reviewSubmitJobStatusFromWorkerJob = (workerJob: WorkerJobResult): ReviewSubmitJobStatus => {
  if (workerJob.phase === 'submitting') {
    return 'submitting';
  }
  if (workerJob.status === 'queued') {
    return 'queued';
  }
  return 'waiting_gate';
};

const reviewSubmitJobFromActiveWorkerJob = (
  workerJob: WorkerJobResult,
  processDetail: ProcessReviewSubmitTarget,
): ReviewSubmitJobResult => {
  const isGateWorker = workerJob.jobKind === REVIEW_SUBMIT_GATE_WORKER_KIND;
  const rootJobId = workerJob.rootJobId ?? (isGateWorker ? undefined : workerJob.id);

  return {
    status: reviewSubmitJobStatusFromWorkerJob(workerJob),
    submitWorkerJobId: isGateWorker ? rootJobId : workerJob.id,
    rootJobId,
    gateWorkerJobId: isGateWorker ? workerJob.id : undefined,
    datasetRevision: {
      table: 'processes',
      id: processDetail.id,
      version: processDetail.version,
    },
    workerJob,
    submitWorkerJob: isGateWorker ? null : workerJob,
    gateWorkerJob: isGateWorker ? workerJob : null,
  };
};

const isReviewSubmitJobNotFoundResult = (result: {
  error?: {
    code?: string;
    message?: string;
  } | null;
  status?: number;
  statusText?: string;
}): boolean => {
  if (!result.error) {
    return false;
  }

  const code = `${result.error.code ?? result.statusText ?? ''}`.toLowerCase();
  const messageText = `${result.error.message ?? ''}`.toLowerCase();
  return result.status === 404 || code.includes('not_found') || messageText.includes('not found');
};

const collectChangedFieldPaths = (
  value: unknown,
  prefix: Array<string | number> = [],
): Array<Array<string | number>> => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return prefix.length > 0 ? [prefix] : [];
    }

    return value.flatMap((item, index) => collectChangedFieldPaths(item, [...prefix, index]));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) {
      return prefix.length > 0 ? [prefix] : [];
    }

    return entries.flatMap(([key, childValue]) =>
      collectChangedFieldPaths(childValue, [...prefix, key]),
    );
  }

  return prefix.length > 0 ? [prefix] : [];
};

const stringifyProcessFieldPath = (path: Array<string | number>) => path.map(String).join('.');

const toReferenceValue = (reference?: ProcessExchangeData['referenceToFlowDataSet']) => {
  return Array.isArray(reference) ? reference[0] : reference;
};

const cloneProcessData = (data?: FormProcessWithDatas) => {
  if (!data) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(data)) as FormProcessWithDatas;
};

export const normalizeQuantitativeReferenceSelection = (
  exchangeData: ProcessExchangeData[],
  selectedExchangeInternalId?: string,
) => {
  if (!selectedExchangeInternalId) {
    return exchangeData;
  }

  const selectedExchange = exchangeData.find(
    (item) => item['@dataSetInternalID'] === selectedExchangeInternalId,
  );

  if (selectedExchange?.quantitativeReference !== true) {
    return exchangeData;
  }

  return exchangeData.map((item) => ({
    ...item,
    quantitativeReference: item['@dataSetInternalID'] === selectedExchangeInternalId,
  }));
};

const toProcessExchanges = (exchangeData: ProcessExchangeData[]) =>
  ({
    exchange: exchangeData as FormProcessWithDatas['exchanges']['exchange'],
  }) as FormProcessWithDatas['exchanges'];

type Props = {
  id: string;
  version: string;
  lang: string;
  buttonType: 'icon' | 'text' | 'tool' | 'toolIcon' | 'toolResultIcon';
  actionRef: React.MutableRefObject<ActionType | undefined> | undefined;
  setViewDrawerVisible: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
  hideReviewButton?: boolean;
  updateNodeCb?: (ref: refDataType) => Promise<void>;
  autoOpen?: boolean;
  autoCheckRequired?: boolean;
  actionFrom?: 'modelResult';
};
const ProcessEdit: FC<Props> = ({
  id,
  version,
  lang,
  buttonType,
  actionRef,
  setViewDrawerVisible,
  disabled = false,
  hideReviewButton = false,
  updateNodeCb = () => {},
  autoOpen = false,
  autoCheckRequired = false,
  actionFrom,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerVisibleRef = useRef(false);
  const reviewSubmitLatestSyncTimeoutRef = useRef<number | null>(null);
  const reviewSubmitLatestSyncTokenRef = useRef(0);
  const formRefEdit = useRef<ProFormInstance>();
  const [activeTabKey, setActiveTabKey] = useState<TabKeysType>('processInformation');
  const [fromData, setFromData] = useState<FormProcessWithDatas>();
  const [initData, setInitData] = useState<FormProcessWithDatas>();
  const [originJson, setOriginJson] = useState<ProcessDetailData['json']>({});
  const aiSuggestionDataRef = useRef<ProcessDetailData['json']>();
  const [exchangeDataSource, setExchangeDataSource] = useState<ProcessExchangeData[]>([]);
  const [sdkValidationDetails, setSdkValidationDetails] = useState<ValidationIssueSdkDetail[]>([]);
  const [sdkValidationFocus, setSdkValidationFocus] = useState<ValidationIssueSdkDetail | null>(
    null,
  );
  const [sdkValidationDismissedFieldKeys, setSdkValidationDismissedFieldKeys] = useState<
    ReadonlySet<string>
  >(new Set());
  const [pendingTabValidationKey, setPendingTabValidationKey] = useState<TabKeysType | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [autoCheckTriggered, setAutoCheckTriggered] = useState(false);
  const [reviewSubmitGateState, setReviewSubmitGateState] = useState<ReviewSubmitGateUiState>({
    status: 'not_run',
  });
  const intl = useIntl();
  const [refCheckData, setRefCheckData] = useState<RefCheckType[]>([]);
  const [validationIssueTabNames, setValidationIssueTabNames] = useState<string[]>([]);
  const [refCheckContextValue, setRefCheckContextValue] = useState<{
    refCheckData: RefCheckType[];
  }>({
    refCheckData: [],
  });
  useEffect(() => {
    setRefCheckContextValue({
      refCheckData: [...refCheckData],
    });
  }, [refCheckData]);

  const [refsDrawerVisible, setRefsDrawerVisible] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsNewList, setRefsNewList] = useState<RefVersionItem[]>([]);
  const [refsOldList, setRefsOldList] = useState<RefVersionItem[]>([]);

  useEffect(() => {
    drawerVisibleRef.current = drawerVisible;
  }, [drawerVisible]);

  const cancelReviewSubmitLatestSync = useCallback(() => {
    reviewSubmitLatestSyncTokenRef.current += 1;
    if (reviewSubmitLatestSyncTimeoutRef.current !== null) {
      window.clearTimeout(reviewSubmitLatestSyncTimeoutRef.current);
      reviewSubmitLatestSyncTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => cancelReviewSubmitLatestSync(), [cancelReviewSubmitLatestSync]);

  const resetReviewSubmitGateState = useCallback(() => {
    cancelReviewSubmitLatestSync();
    setReviewSubmitGateState({ status: 'not_run' });
  }, [cancelReviewSubmitLatestSync]);

  const getReviewSubmitGateStatusMessage = useCallback(
    (status: ReviewSubmitGateUiStatus) => {
      switch (status) {
        case 'queued':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.queued',
            defaultMessage:
              'Review submission is queued. The system will run the numerical stability gate first.',
          });
        case 'running':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.running',
            defaultMessage:
              'Numerical stability gate is running. Submission is disabled until it passes.',
          });
        case 'waiting_gate':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.waitingGate',
            defaultMessage:
              'Review submission is waiting for the numerical stability gate to finish.',
          });
        case 'submitting':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.submitting',
            defaultMessage: 'Numerical stability gate passed. Submitting for review now.',
          });
        case 'submitted':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.submitted',
            defaultMessage: 'Review submission completed.',
          });
        case 'passed':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.passed',
            defaultMessage: 'Numerical stability gate passed for the current revision.',
          });
        case 'blocked':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.blocked',
            defaultMessage: 'Numerical stability gate blocked this revision.',
          });
        case 'stale':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.stale',
            defaultMessage:
              'Numerical stability gate result is stale. Save the latest data and rerun the gate.',
          });
        case 'error':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitGate.error',
            defaultMessage: 'Numerical stability gate could not complete.',
          });
        case 'cancelled':
          return intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.cancelled',
            defaultMessage: 'Review submission job was cancelled.',
          });
        case 'not_run':
        default:
          return '';
      }
    },
    [intl],
  );

  const getReviewSubmitGateFailedToastMessage = useCallback(
    () =>
      intl.formatMessage({
        id: 'pages.process.reviewSubmitGate.failedToast',
        defaultMessage: 'Gate check did not pass. Open the task center for details.',
      }),
    [intl],
  );

  const formatReviewSubmitGateReason = useCallback(
    (reason: ReviewSubmitGateBlockingReason, index: number) => {
      const rawCode = typeof reason?.code === 'string' ? reason.code.trim() : '';
      const code = rawCode
        ? rawCode
        : intl.formatMessage(
            {
              id: 'pages.process.reviewSubmitGate.reasonFallbackCode',
              defaultMessage: 'Reason {index}',
            },
            { index: index + 1 },
          );
      const reasonMessage =
        typeof reason?.message === 'string' && reason.message.trim()
          ? reason.message.trim()
          : intl.formatMessage({
              id: 'pages.process.reviewSubmitGate.reasonFallbackMessage',
              defaultMessage: 'No detailed message returned.',
            });
      const guidance = rawCode
        ? REVIEW_SUBMIT_GATE_REASON_GUIDANCE[
            rawCode as keyof typeof REVIEW_SUBMIT_GATE_REASON_GUIDANCE
          ]
        : undefined;

      if (!guidance) {
        return {
          title: intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.fallback.title',
            defaultMessage: 'Review submission did not complete',
          }),
          description: intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.fallback.description',
            defaultMessage: 'The current data could not complete the pre-review check.',
          }),
          action: intl.formatMessage({
            id: 'pages.process.reviewSubmitTaskCenter.fallback.action',
            defaultMessage: 'Save the data and retry. If it still fails, contact an administrator.',
          }),
          diagnostic: `${code}: ${reasonMessage}`,
        };
      }

      return {
        title: intl.formatMessage({
          id: guidance.titleId,
          defaultMessage: guidance.defaultTitle,
        }),
        description: intl.formatMessage({
          id: guidance.descriptionId,
          defaultMessage: guidance.defaultDescription,
        }),
        action: intl.formatMessage({
          id: guidance.actionId,
          defaultMessage: guidance.defaultAction,
        }),
        diagnostic: `${code}: ${reasonMessage}`,
      };
    },
    [intl],
  );

  const renderReviewSubmitGateDescription = useCallback(() => {
    const reasons = reviewSubmitGateState.blockingReasons ?? [];
    const statusMessage =
      reviewSubmitGateState.message ||
      getReviewSubmitGateStatusMessage(reviewSubmitGateState.status);

    return (
      <Space direction='vertical' size={4}>
        <span>{statusMessage}</span>
        {reasons.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {reasons.map((reason, index) => {
              const evidence = formatReviewSubmitGateEvidence(intl, reason.details);
              const formattedReason = formatReviewSubmitGateReason(reason, index);

              return (
                <li key={`${reason.code ?? 'reason'}-${index}`}>
                  <div>{formattedReason.title}</div>
                  <div>{formattedReason.description}</div>
                  {formattedReason.action && (
                    <div style={{ color: 'rgba(0, 0, 0, 0.78)' }}>{formattedReason.action}</div>
                  )}
                  <div style={{ color: 'rgba(0, 0, 0, 0.65)' }}>{formattedReason.diagnostic}</div>
                  {evidence.length > 0 && (
                    <div style={{ color: 'rgba(0, 0, 0, 0.65)' }}>
                      {formatLocaleList(evidence, intl.locale)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Space>
    );
  }, [
    formatReviewSubmitGateReason,
    getReviewSubmitGateStatusMessage,
    reviewSubmitGateState.blockingReasons,
    reviewSubmitGateState.message,
    reviewSubmitGateState.status,
  ]);

  useEffect(() => {
    if (autoOpen && id && version) {
      setDrawerVisible(true);
    }
  }, [autoOpen, id, version]);

  const applyProcessData = useCallback(
    (nextData: FormProcessWithDatas, options?: { resetFields?: boolean }) => {
      const normalizedData = { ...nextData, id } as FormProcessWithDatas;
      resetReviewSubmitGateState();
      setFromData(normalizedData);
      setExchangeDataSource(
        ((normalizedData?.exchanges?.exchange ?? []) as ProcessExchangeData[]).map((item) => ({
          ...item,
        })),
      );
      if (options?.resetFields) {
        formRefEdit.current?.resetFields();
      }
      formRefEdit.current?.setFieldsValue(normalizedData);
    },
    [id, resetReviewSubmitGateState],
  );

  const getCurrentProcessData = useCallback(() => {
    const baseData = {
      ...(initData ?? {}),
      ...(fromData ?? {}),
    } as FormProcessWithDatas;

    if (Object.keys(baseData).length === 0) {
      return undefined;
    }

    const fieldsValue = formRefEdit.current?.getFieldsValue() ?? {};
    const currentData = {
      ...baseData,
      ...fieldsValue,
      exchanges: {
        exchange: [...exchangeDataSource],
      },
      id,
    } as FormProcessWithDatas;

    if (activeTabKey === 'validation') {
      currentData.modellingAndValidation = {
        ...baseData?.modellingAndValidation,
        validation: {
          ...fieldsValue?.modellingAndValidation?.validation,
        },
      };
    } else if (activeTabKey === 'complianceDeclarations') {
      currentData.modellingAndValidation = {
        ...baseData?.modellingAndValidation,
        complianceDeclarations: {
          ...fieldsValue?.modellingAndValidation?.complianceDeclarations,
        },
      };
    } else {
      currentData[activeTabKey] = fieldsValue?.[activeTabKey] ?? baseData?.[activeTabKey];
    }

    return currentData;
  }, [activeTabKey, exchangeDataSource, fromData, id, initData]);

  const handleLatestJsonChange = (latestJson: ProcessDetailData['json']) => {
    aiSuggestionDataRef.current = latestJson;
  };

  const dismissChangedSdkValidationFields = useCallback(
    (changedValues: unknown) => {
      if (!showRules || sdkValidationDetails.length === 0) {
        return;
      }

      const changedFieldKeys = collectChangedFieldPaths(changedValues)
        .map(stringifyProcessFieldPath)
        .filter(Boolean);

      if (changedFieldKeys.length === 0) {
        return;
      }

      setSdkValidationDismissedFieldKeys((currentKeys) => {
        let hasNewKey = false;
        const nextKeys = new Set(currentKeys);

        changedFieldKeys.forEach((fieldKey) => {
          if (!nextKeys.has(fieldKey)) {
            nextKeys.add(fieldKey);
            hasNewKey = true;
          }
        });

        return hasNewKey ? nextKeys : currentKeys;
      });
    },
    [sdkValidationDetails.length, showRules],
  );

  const handleAISuggestionClose = () => {
    const dataSet = genProcessFromData(aiSuggestionDataRef.current?.processDataSet ?? {});
    applyProcessData({ ...dataSet, id }, { resetFields: true });
  };
  const handletFromData = async () => {
    if (fromData?.id) {
      const fieldsValue = formRefEdit.current?.getFieldsValue();
      if (activeTabKey === 'validation') {
        await setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            validation: { ...fieldsValue?.modellingAndValidation?.validation },
          },
        });
      } else if (activeTabKey === 'complianceDeclarations') {
        await setFromData({
          ...fromData,
          modellingAndValidation: {
            ...fromData?.modellingAndValidation,
            complianceDeclarations: {
              ...fieldsValue?.modellingAndValidation?.complianceDeclarations,
            },
          },
        });
      } else {
        await setFromData({
          ...fromData,
          [activeTabKey]: fieldsValue?.[activeTabKey] ?? {},
        });
      }
    }
  };

  const handletExchangeDataCreate = (data: ProcessExchangeData) => {
    if (fromData?.id) {
      const createdExchange = {
        ...data,
        '@dataSetInternalID': exchangeDataSource.length.toString(),
      };
      const nextExchangeDataSource = [...exchangeDataSource, createdExchange];
      const normalizedExchangeDataSource = normalizeQuantitativeReferenceSelection(
        nextExchangeDataSource,
        createdExchange['@dataSetInternalID'],
      );
      setExchangeDataSource(normalizedExchangeDataSource);
      setFromData({
        ...fromData,
        exchanges: {
          exchange: normalizedExchangeDataSource,
        },
      } as FormProcessWithDatas);
    }
  };

  const handletExchangeData = (data: ProcessExchangeData[]) => {
    if (fromData?.id) {
      const nextExchangeDataSource = [...data];
      setExchangeDataSource(nextExchangeDataSource);
      setFromData({
        ...fromData,
        exchanges: {
          exchange: nextExchangeDataSource,
        },
      } as FormProcessWithDatas);
    }
  };

  const updateExchangeDataSource = async (exchangeData: ProcessExchangeData[]) => {
    const newExchangeDataSource = await Promise.all(
      exchangeData.map(async (item) => {
        const reference = toReferenceValue(item?.referenceToFlowDataSet);
        const refObjectId = reference?.['@refObjectId'] ?? '';
        const version = reference?.['@version'] ?? '';

        const result = await getFlowDetail(refObjectId, version);

        if (!result?.data) {
          return item;
        }

        const refData = genFlowFromData(result.data?.json?.flowDataSet ?? {});
        const shortDescription = (
          genFlowNameJson(refData?.flowInformation?.dataSetInformation?.name) ?? []
        ).filter(
          (
            item,
          ): item is {
            '@xml:lang': string;
            '#text': string;
          } => typeof item?.['@xml:lang'] === 'string' && typeof item?.['#text'] === 'string',
        );
        const latestReference = {
          ...(reference ?? {}),
          '@version': result.data?.version ?? '',
          'common:shortDescription': shortDescription,
        };

        return {
          ...item,
          referenceToFlowDataSet: latestReference,
        };
      }),
    );
    return newExchangeDataSource;
  };

  const handleUpdateRefsVersion = async (newRefs: RefVersionItem[]) => {
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      return;
    }
    const res = updateRefsData(currentData, newRefs, true) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    applyProcessData({
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    });
    setRefsDrawerVisible(false);
  };

  const handleKeepVersion = async () => {
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      return;
    }
    const res = updateRefsData(currentData, refsOldList, false) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    applyProcessData({
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    });
    setRefsDrawerVisible(false);
  };

  const handleUpdateReference = async () => {
    setRefsLoading(true);
    const currentData = cloneProcessData(getCurrentProcessData());
    if (!currentData) {
      setRefsLoading(false);
      return;
    }
    const { newRefs, oldRefs } = await getRefsOfNewVersion(currentData);
    setRefsNewList(newRefs);
    setRefsOldList(oldRefs);
    setRefsLoading(false);
    if (newRefs && newRefs.length) {
      setRefsDrawerVisible(true);
    } else {
      const res = updateRefsData(currentData, oldRefs, false) as FormProcessWithDatas;
      const nextExchangeDataSource = await updateExchangeDataSource(
        (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
      );
      applyProcessData({
        ...res,
        exchanges: toProcessExchanges(nextExchangeDataSource),
      });
    }
  };

  const updateReferenceDescription = async (processData: FormProcessWithDatas) => {
    const currentData = cloneProcessData(processData) as FormProcessWithDatas;
    const { oldRefs } = await getRefsOfCurrentVersion(currentData);
    const res = updateRefsData(currentData, oldRefs, false) as FormProcessWithDatas;
    const nextExchangeDataSource = await updateExchangeDataSource(
      (res?.exchanges?.exchange ?? []) as ProcessExchangeData[],
    );
    const nextData = {
      ...res,
      exchanges: toProcessExchanges(nextExchangeDataSource),
    } as FormProcessWithDatas;
    applyProcessData(nextData);
    return nextData;
  };

  const handleSubmit = async (
    closeDrawer: boolean,
    options?: { silent?: boolean; langIntent?: 'save' | 'validation' },
  ): Promise<HandleSubmitResult> => {
    const silent = options?.silent ?? false;
    if (closeDrawer) setSpinning(true);
    const currentData = getCurrentProcessData();
    if (!currentData) {
      if (closeDrawer) {
        setSpinning(false);
      }
      return;
    }
    const processData = await updateReferenceDescription(currentData);
    const output = (processData.exchanges.exchange as ProcessExchangeData[]).filter(
      (e) => e.exchangeDirection?.toUpperCase() === 'OUTPUT',
    );
    let allocatedFractionTotal = toBigNumberOrZero(0);
    output.forEach((e) => {
      const allocation = getFirstProcessExchangeAllocation(e?.allocations?.allocation);
      if (allocation?.['@allocatedFraction']) {
        const fractionText = allocation['@allocatedFraction']?.toString?.();
        const fraction = typeof fractionText === 'string' ? fractionText.replace('%', '') : '';
        allocatedFractionTotal = allocatedFractionTotal.plus(toBigNumberOrZero(fraction));
      }
    });
    if (allocatedFractionTotal.isEqualTo(0)) {
      const referenceIndex = output.findIndex(
        (e) => e.quantitativeReference === true && e.exchangeDirection?.toUpperCase() === 'OUTPUT',
      );
      if (referenceIndex > -1) {
        output[referenceIndex].allocations = {
          allocation: {
            '@allocatedFraction': '100%',
          },
        };
      }
    }
    if (allocatedFractionTotal.isGreaterThan(100)) {
      if (!silent) {
        message.error(
          intl.formatMessage(
            {
              id: 'pages.process.validator.allocatedFraction',
              defaultMessage:
                'The total allocated fraction for outputs cannot exceed 100%. Current total: {total}%.',
            },
            { total: allocatedFractionTotal.toString() },
          ),
        );
      }
      setSpinning(false);
      return;
    }

    const nextProcessData = {
      ...processData,
    };
    const langOptions = options?.langIntent ? { intent: options.langIntent } : undefined;
    const updateResult = langOptions
      ? await updateProcess(id, version, nextProcessData, undefined, langOptions)
      : await updateProcess(id, version, nextProcessData);
    if (updateResult?.data) {
      if (!closeDrawer) {
        const dataSet = genProcessFromData(updateResult.data[0]?.json?.processDataSet ?? {});
        const nextData = {
          ...dataSet,
          id,
          stateCode: updateResult.data[0]?.state_code,
          ruleVerification: updateResult.data[0]?.rule_verification,
        } as FormProcessWithDatas;
        setInitData(nextData);
        applyProcessData(nextData);
      }
      updateNodeCb({
        '@refObjectId': id,
        '@version': version,
        '@type': 'process data set',
      });
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.save.success',
            defaultMessage: 'Saved successfully!',
          }),
        );
      }
      if (closeDrawer) {
        setSpinning(false);
        setDrawerVisible(false);
        setViewDrawerVisible(false);
      }
      actionRef?.current?.reload();
    } else {
      if (!silent) {
        if (updateResult?.error?.state_code === 100) {
          message.error(
            intl.formatMessage({
              id: 'pages.review.openData',
              defaultMessage: 'This data is open data, save failed',
            }),
          );
        } else if (updateResult?.error?.state_code === 20) {
          message.error(
            intl.formatMessage({
              id: 'pages.review.underReview',
              defaultMessage: 'Data is under review, save failed',
            }),
          );
        } else {
          message.error(updateResult?.error?.message);
        }
      }
      if (closeDrawer) setSpinning(false);
    }
    if (!closeDrawer) {
      return updateResult;
    }
    return undefined;
  };

  const toSavedProcessCheckTarget = useCallback((updateResult?: HandleSubmitResult) => {
    const updatedProcess = updateResult?.data?.[0];

    if (
      !updatedProcess?.id ||
      !updatedProcess?.version ||
      typeof updatedProcess.state_code !== 'number'
    ) {
      return undefined;
    }

    return {
      id: updatedProcess.id,
      version: updatedProcess.version,
      ...genProcessFromData(updatedProcess.json?.processDataSet),
      ruleVerification: isRuleVerificationPassed(updatedProcess.rule_verification),
      stateCode: updatedProcess.state_code,
    } satisfies ProcessCheckTarget;
  }, []);

  /* istanbul ignore next -- validation-only draft hydration mirrors the already-validated save payload */
  const toNormalizedProcessCheckTarget = useCallback(
    (updateResult?: HandleSubmitResult) => {
      if (!hasLangNormalizationDraftChanges(updateResult)) {
        return undefined;
      }

      const processDataSet = updateResult?.normalizedJsonOrdered?.processDataSet;
      if (!processDataSet) {
        return undefined;
      }

      const stateCode =
        typeof fromData?.stateCode === 'number'
          ? fromData.stateCode
          : typeof initData?.stateCode === 'number'
            ? initData.stateCode
            : 0;
      const nextData = {
        ...genProcessFromData(processDataSet),
        id,
        version,
        ruleVerification: true,
        stateCode,
      } satisfies ProcessCheckTarget;

      applyProcessData(nextData);
      return nextData;
    },
    [applyProcessData, fromData, id, initData, version],
  );

  /* istanbul ignore next -- this fallback only exists for defensive validation recovery when the form snapshot disappears */
  const buildFallbackProcessCheckTarget = useCallback(async () => {
    const currentData = getCurrentProcessData();

    if (!currentData) {
      return undefined;
    }

    const preparedProcessData = await updateReferenceDescription(currentData);
    const stateCode =
      typeof preparedProcessData?.stateCode === 'number'
        ? preparedProcessData.stateCode
        : typeof fromData?.stateCode === 'number'
          ? fromData.stateCode
          : typeof initData?.stateCode === 'number'
            ? initData.stateCode
            : 0;

    return {
      ...preparedProcessData,
      id,
      version,
      ruleVerification: true,
      stateCode,
    } satisfies ProcessCheckTarget;
  }, [fromData, getCurrentProcessData, id, initData, updateReferenceDescription, version]);

  const resolveProcessCheckTarget = useCallback(
    async (updateResult?: HandleSubmitResult) => {
      return (
        toSavedProcessCheckTarget(updateResult) ??
        toNormalizedProcessCheckTarget(updateResult) ??
        (await buildFallbackProcessCheckTarget())
      );
    },
    [buildFallbackProcessCheckTarget, toNormalizedProcessCheckTarget, toSavedProcessCheckTarget],
  );

  const handleValidationIssueNavigate = useCallback(
    (target: { detail?: ValidationIssueSdkDetail; tabName?: string }) => {
      if (target.detail?.tabName) {
        setPendingTabValidationKey(target.detail.tabName as TabKeysType);
        setActiveTabKey(target.detail.tabName as TabKeysType);
        setSdkValidationFocus(
          target.detail.presentation && target.detail.presentation !== 'field'
            ? null
            : target.detail,
        );
        return;
      }

      if (target.tabName) {
        setPendingTabValidationKey(target.tabName as TabKeysType);
        setActiveTabKey(target.tabName as TabKeysType);
      }

      setSdkValidationFocus(null);
    },
    [],
  );

  const handleCheckData = async (
    from: 'review' | 'checkData',
    processDetail: ProcessCheckTarget,
    options?: { silent?: boolean },
  ) => {
    const silent = options?.silent ?? false;
    setSpinning(true);
    setShowRules(true);
    setSdkValidationDismissedFieldKeys(new Set());
    if (processDetail.stateCode >= 20 && processDetail.stateCode < 100 && from === 'checkData') {
      if (!silent) {
        message.error(
          intl.formatMessage({
            id: 'pages.process.checkData.inReview',
            defaultMessage: 'This data set is under review and cannot be validated',
          }),
        );
      }
      setSpinning(false);
      return { checkResult: false, unReview: [] };
    }
    const rootRef = {
      '@refObjectId': processDetail.id,
      '@version': processDetail.version,
      '@type': 'process data set',
    } satisfies refDataType;
    const orderedJson = genProcessJsonOrdered(processDetail.id, processDetail);
    const sdkValidation = validateDatasetWithSdk('process data set', orderedJson);
    const sdkIssues = sdkValidation.issues;
    const sdkIssueDetails = normalizeProcessSdkValidationDetails(sdkIssues, orderedJson);
    const exchangesRequiredValidationDetails =
      buildProcessExchangesRequiredValidationDetails(processDetail);
    const quantitativeReferenceValidationDetails =
      buildProcessQuantitativeReferenceValidationDetails(processDetail);
    const mergedSdkIssueDetails = [
      ...exchangesRequiredValidationDetails,
      ...quantitativeReferenceValidationDetails,
      ...sdkIssueDetails,
    ].filter(
      (detail, index, allDetails) =>
        allDetails.findIndex((item) => item.key === detail.key) === index,
    );
    let currentDatasetValid = sdkValidation.success;
    const errTabNames: string[] = [];
    const currentDatasetTabNames: string[] = [];
    let datasetValidationMessage: string | null = null;

    if (!sdkValidation.success) {
      await validateVisibleFormFields(formRefEdit);
    }
    setSdkValidationDetails(mergedSdkIssueDetails);
    if (mergedSdkIssueDetails.length === 0) {
      setSdkValidationFocus(null);
    }

    sdkIssues.forEach((item) => {
      const tabName = getProcessSdkIssueTabName(item);
      if (tabName && !errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
      if (tabName && !currentDatasetTabNames.includes(tabName)) {
        currentDatasetTabNames.push(tabName);
      }
    });
    if (exchangesRequiredValidationDetails.length > 0) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.process.validator.exchanges.required',
        defaultMessage: 'Add at least one exchange',
      });
      if (!errTabNames.includes('exchanges')) {
        errTabNames.push('exchanges');
      }
      if (!currentDatasetTabNames.includes('exchanges')) {
        currentDatasetTabNames.push('exchanges');
      }
    } else if (quantitativeReferenceValidationDetails.length > 0) {
      currentDatasetValid = false;
      datasetValidationMessage = intl.formatMessage({
        id: 'pages.process.validator.exchanges.quantitativeReference.required',
        defaultMessage: 'Select exactly one item as the quantitative reference.',
      });
      if (!errTabNames.includes('exchanges')) {
        errTabNames.push('exchanges');
      }
      if (!currentDatasetTabNames.includes('exchanges')) {
        currentDatasetTabNames.push('exchanges');
      }
    }

    const unReview: refDataType[] = []; // stateCode < 20
    const underReview: refDataType[] = []; // stateCode >= 20 && stateCode < 100
    const unRuleVerification: refDataType[] = [];
    const nonExistentRef: refDataType[] = [];
    const allRefs = new Set<string>();

    dealProcress(processDetail, unReview, underReview, unRuleVerification, nonExistentRef);

    const userTeamId = await getUserTeamId();
    const refObjs = getAllRefObj(processDetail);

    const path = await checkReferences(
      refObjs,
      new Map<string, unknown>(),
      userTeamId,
      unReview,
      underReview,
      unRuleVerification,
      nonExistentRef,
      new ReffPath(rootRef, processDetail?.ruleVerification, false),
      allRefs,
      {
        rootRef,
      },
    );
    allRefs.add(`${processDetail.id}:${processDetail.version}:process data set`);
    await checkVersions(allRefs, path);
    const problemNodes = (path?.findProblemNodes(from) ?? []) as RefProblemNode[];
    const { getRefTabNames, tabNames: referenceValidationTabNames } =
      collectValidationIssueRefTabNames({
        refs: [...nonExistentRef, ...unRuleVerification, ...problemNodes],
        resolveTabName: (item) => getErrRefTab(item, processDetail),
      });
    referenceValidationTabNames.forEach((tabName) => {
      if (!errTabNames.includes(tabName)) {
        errTabNames.push(tabName);
      }
    });
    const validationIssues = buildValidationIssues({
      actionFrom: from,
      datasetSdkValid: currentDatasetValid,
      getRefTabNames,
      nonExistentRef,
      problemNodes,
      rootRef,
      sdkInvalidDetails: mergedSdkIssueDetails,
      sdkInvalidTabNames: currentDatasetTabNames,
      unRuleVerification,
    });

    setValidationIssueTabNames(referenceValidationTabNames);

    if (validationIssues.length > 0) {
      setRefCheckData(mapValidationIssuesToRefCheckData(validationIssues));
    } else {
      setRefCheckData([]);
    }
    if (
      currentDatasetValid &&
      nonExistentRef?.length === 0 &&
      unRuleVerification.length === 0 &&
      problemNodes.length === 0
    ) {
      if (!silent) {
        message.success(
          intl.formatMessage({
            id: 'pages.button.check.success',
            defaultMessage: 'Data validation passed.',
          }),
        );
      }
      setSpinning(false);
      return { checkResult: true, unReview };
    }

    let validationHint = intl.formatMessage({
      id: 'pages.button.check.error',
      defaultMessage: 'Data check failed, please check the data!',
    });
    if (datasetValidationMessage && errTabNames.length === 1 && errTabNames[0] === 'exchanges') {
      validationHint = datasetValidationMessage;
    } else if (errTabNames.length > 0) {
      validationHint = formatDataCheckErrorWithSections(
        intl,
        errTabNames.map((tab: string) => formatDatasetTabLabel(intl, 'process data set', tab)),
      );
    }

    if (!silent && validationIssues.length > 0) {
      const validationIssuesWithOwner = await enrichValidationIssuesWithOwner(validationIssues);
      showValidationIssueModal({
        intl,
        issues: validationIssuesWithOwner,
        onNavigate: handleValidationIssueNavigate,
        title: intl.formatMessage({
          id:
            from === 'review'
              ? 'pages.validationIssues.modal.reviewTitle'
              : 'pages.validationIssues.modal.checkDataTitle',
          defaultMessage:
            from === 'review' ? 'Review submission blocked' : 'Data validation issues',
        }),
      });
    } else if (!silent) {
      message.error(validationHint);
    }

    setSpinning(false);
    return { checkResult: false, unReview };
  };

  const runCheckData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    setSpinning(true);
    const updateResult = await handleSubmit(false, { silent, langIntent: 'validation' });
    const validationTarget = await resolveProcessCheckTarget(updateResult);

    if (!validationTarget) {
      setSpinning(false);
      return { checkResult: false, unReview: [] as refDataType[] };
    }

    return handleCheckData('checkData', validationTarget, { silent });
  };

  const applyReviewSubmitJobState = useCallback(
    (
      jobData: ReviewSubmitJobResult | undefined,
      fallback?: { revisionChecksum?: string },
    ): { status: ReviewSubmitGateUiStatus; messageText: string } => {
      const status = jobData?.status ?? 'error';
      const gateData = jobData?.gate ?? undefined;
      const gateWorkerJob = jobData?.gateWorkerJob ?? undefined;
      const gateRunId = jobData?.gateRunId ?? gateData?.gateRunId ?? undefined;
      const revisionChecksum =
        jobData?.datasetRevision?.revisionChecksum ??
        gateData?.datasetRevision?.revisionChecksum ??
        (gateWorkerJob?.result &&
        typeof gateWorkerJob.result === 'object' &&
        'datasetRevision' in gateWorkerJob.result
          ? (
              gateWorkerJob.result as {
                datasetRevision?: { revisionChecksum?: string };
              }
            ).datasetRevision?.revisionChecksum
          : undefined) ??
        fallback?.revisionChecksum;
      const blockingReasons = getReviewSubmitJobBlockingReasons(jobData);
      const messageText = jobData?.error?.message || getReviewSubmitGateStatusMessage(status);

      setReviewSubmitGateState({
        status,
        reviewSubmitJobId: jobData?.reviewSubmitJobId,
        gateRunId,
        revisionChecksum,
        blockingReasons,
        message: jobData?.error?.message,
      });

      return { status, messageText };
    },
    [getReviewSubmitGateStatusMessage],
  );

  const startReviewSubmitLatestSync = useCallback(
    (processDetail: ProcessCheckTarget) => {
      cancelReviewSubmitLatestSync();
      const syncToken = reviewSubmitLatestSyncTokenRef.current;

      const syncLatest = async (remainingAttempts: number): Promise<void> => {
        if (!drawerVisibleRef.current || reviewSubmitLatestSyncTokenRef.current !== syncToken) {
          return;
        }

        const latestResult = await requestReviewSubmitJob(
          'processes',
          processDetail.id,
          processDetail.version,
          null,
          {
            action: 'read_latest',
          },
        );

        if (!drawerVisibleRef.current || reviewSubmitLatestSyncTokenRef.current !== syncToken) {
          return;
        }

        const latestJobData = latestResult.data?.[0] as ReviewSubmitJobResult | undefined;
        if (!latestJobData || latestResult.error) {
          if (remainingAttempts > 1) {
            reviewSubmitLatestSyncTimeoutRef.current = window.setTimeout(() => {
              reviewSubmitLatestSyncTimeoutRef.current = null;
              void syncLatest(remainingAttempts - 1);
            }, REVIEW_SUBMIT_JOB_LATEST_SYNC_INTERVAL_MS);
          }
          return;
        }

        const { status, messageText } = applyReviewSubmitJobState(latestJobData, {
          revisionChecksum: latestResult.revisionChecksum,
        });

        if (REVIEW_SUBMIT_JOB_PENDING_STATUSES.has(status)) {
          if (remainingAttempts > 1) {
            reviewSubmitLatestSyncTimeoutRef.current = window.setTimeout(() => {
              reviewSubmitLatestSyncTimeoutRef.current = null;
              void syncLatest(remainingAttempts - 1);
            }, REVIEW_SUBMIT_JOB_LATEST_SYNC_INTERVAL_MS);
          }
          return;
        }

        trackReviewSubmitTask(latestJobData);
        if (isReviewSubmitTerminalStatus(status) && status !== 'submitted') {
          message.error(
            isReviewSubmitGateNotPassedStatus(status)
              ? getReviewSubmitGateFailedToastMessage()
              : messageText,
          );
        }
      };

      reviewSubmitLatestSyncTimeoutRef.current = window.setTimeout(() => {
        reviewSubmitLatestSyncTimeoutRef.current = null;
        void syncLatest(REVIEW_SUBMIT_JOB_LATEST_SYNC_MAX_ATTEMPTS);
      }, REVIEW_SUBMIT_JOB_LATEST_SYNC_INITIAL_DELAY_MS);
    },
    [
      applyReviewSubmitJobState,
      cancelReviewSubmitLatestSync,
      getReviewSubmitGateFailedToastMessage,
    ],
  );

  const readActiveReviewSubmitWorkerJob = async (processDetail: ProcessReviewSubmitTarget) => {
    const result = await requestWorkerJobsApi<WorkerJobResult>({
      action: 'list',
      subjectType: 'processes',
      subjectId: processDetail.id,
      statuses: ['queued', 'running', 'waiting'],
      limit: REVIEW_SUBMIT_ACTIVE_WORKER_LIST_LIMIT,
    });

    if (result.error) {
      return { error: result.error, workerJob: undefined };
    }

    return {
      error: null,
      workerJob: findActiveReviewSubmitWorkerJob(result.data, processDetail),
    };
  };

  const failReviewSubmitRunningCheck = (messageText: string, revisionChecksum?: string) => {
    setReviewSubmitGateState({
      status: 'error',
      message: messageText,
      revisionChecksum,
    });
    message.error(messageText);
    return 'failed' as const;
  };

  const showActiveReviewSubmitJob = (
    jobData: ReviewSubmitJobResult,
    fallback?: { revisionChecksum?: string },
  ) => {
    applyReviewSubmitJobState(jobData, fallback);
    trackReviewSubmitTask(jobData);
    requestOpenLcaTaskCenter();
    message.warning(
      intl.formatMessage({
        id: 'pages.process.reviewSubmitJob.alreadyRunning',
        defaultMessage: 'A review submission gate check is already running.',
      }),
    );
    return 'queued' as const;
  };

  const runReviewSubmitJob = async (processDetail: ProcessCheckTarget) => {
    const activeWorkerCheck = await readActiveReviewSubmitWorkerJob(processDetail);

    if (activeWorkerCheck.error) {
      return failReviewSubmitRunningCheck(
        activeWorkerCheck.error.message ||
          intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.checkRunningFailed',
            defaultMessage: 'Failed to check whether a review submission gate is already running.',
          }),
      );
    }

    if (activeWorkerCheck.workerJob) {
      return showActiveReviewSubmitJob(
        reviewSubmitJobFromActiveWorkerJob(activeWorkerCheck.workerJob, processDetail),
      );
    }

    const handleActiveReviewSubmitJob = (
      jobData: ReviewSubmitJobResult,
      fallback?: { revisionChecksum?: string },
    ) => {
      startReviewSubmitLatestSync(processDetail);
      return showActiveReviewSubmitJob(jobData, fallback);
    };

    const latestResult = await requestReviewSubmitJob(
      'processes',
      processDetail.id,
      processDetail.version,
      null,
      {
        action: 'read_latest',
      },
    );

    if (latestResult.error && !isReviewSubmitJobNotFoundResult(latestResult)) {
      return failReviewSubmitRunningCheck(
        latestResult.error.message ||
          intl.formatMessage({
            id: 'pages.process.reviewSubmitJob.checkRunningFailed',
            defaultMessage: 'Failed to check whether a review submission gate is already running.',
          }),
        latestResult.revisionChecksum,
      );
    }

    const latestJobData = latestResult.data?.[0] as ReviewSubmitJobResult | undefined;
    if (isReviewSubmitGateCheckActive(latestJobData)) {
      return handleActiveReviewSubmitJob(latestJobData, {
        revisionChecksum: latestResult.revisionChecksum,
      });
    }

    const jobResult = await requestReviewSubmitJob(
      'processes',
      processDetail.id,
      processDetail.version,
      null,
      {
        action: 'enqueue',
        reviewSubmitJobId: undefined,
      },
    );

    if (jobResult.error) {
      const messageText =
        jobResult.error.message ||
        intl.formatMessage({
          id: 'pages.process.reviewSubmitGate.error',
          defaultMessage: 'Numerical stability gate could not complete.',
        });
      setReviewSubmitGateState({
        status: 'error',
        message: messageText,
        revisionChecksum: jobResult.revisionChecksum,
      });
      message.error(messageText);
      return 'failed' as const;
    }

    const jobData = jobResult.data?.[0] as ReviewSubmitJobResult | undefined;
    const { status, messageText } = applyReviewSubmitJobState(jobData, {
      revisionChecksum: jobResult.revisionChecksum,
    });

    if (jobData) {
      trackReviewSubmitTask(jobData);
      requestOpenLcaTaskCenter();
    }

    if (status === 'submitted') {
      return 'submitted' as const;
    }

    if (REVIEW_SUBMIT_JOB_PENDING_STATUSES.has(status)) {
      message.info(
        intl.formatMessage({
          id: 'pages.process.reviewSubmitJob.enqueued',
          defaultMessage:
            'Review submission task has been created. Track progress in the task center.',
        }),
      );
      startReviewSubmitLatestSync(processDetail);
      return 'queued' as const;
    }

    message.error(
      isReviewSubmitGateNotPassedStatus(status)
        ? getReviewSubmitGateFailedToastMessage()
        : messageText,
    );
    return 'failed' as const;
  };

  const submitReview = async () => {
    setSpinning(true);
    resetReviewSubmitGateState();

    if (id && version) {
      const activeWorkerCheck = await readActiveReviewSubmitWorkerJob({ id, version });

      if (activeWorkerCheck.error) {
        failReviewSubmitRunningCheck(
          activeWorkerCheck.error.message ||
            intl.formatMessage({
              id: 'pages.process.reviewSubmitJob.checkRunningFailed',
              defaultMessage:
                'Failed to check whether a review submission gate is already running.',
            }),
        );
        setSpinning(false);
        return;
      }

      if (activeWorkerCheck.workerJob) {
        showActiveReviewSubmitJob(
          reviewSubmitJobFromActiveWorkerJob(activeWorkerCheck.workerJob, { id, version }),
        );
        setSpinning(false);
        return;
      }
    }

    const updateResult = await handleSubmit(false, { langIntent: 'validation' });
    const validationTarget = await resolveProcessCheckTarget(updateResult);
    const updatedProcess = toSavedProcessCheckTarget(updateResult);

    if (!validationTarget) {
      setSpinning(false);
      return;
    }
    const { checkResult } = await handleCheckData('review', validationTarget);

    if (checkResult && updatedProcess) {
      setSpinning(true);
      const submitState = await runReviewSubmitJob(updatedProcess);
      if (submitState !== 'submitted') {
        setSpinning(false);
        return;
      }

      message.success(
        intl.formatMessage({
          id: 'pages.process.review.submitSuccess',
          defaultMessage: 'Review submitted successfully',
        }),
      );
      actionRef?.current?.reload();
      setDrawerVisible(false);
      setViewDrawerVisible(false);
      setSpinning(false);
    } else {
      setSpinning(false);
    }
  };

  const onTabChange = (key: TabKeysType) => {
    setPendingTabValidationKey(null);
    setActiveTabKey(key);

    if (!showRules) {
      return;
    }

    void validateVisibleFormFields(formRefEdit, {
      onSettled: () => {
        setSdkValidationDetails((currentDetails) =>
          currentDetails.length > 0 ? [...currentDetails] : currentDetails,
        );
      },
    });
  };

  const onEdit = useCallback(() => {
    setDrawerVisible(true);
    setActiveTabKey('processInformation');
    setValidationIssueTabNames([]);
    setSdkValidationFocus(null);
  }, [setViewDrawerVisible]);

  const onReset = () => {
    setSpinning(true);
    getProcessDetail(id, version).then(async (result: ProcessDetailResponse) => {
      setOriginJson(result.data?.json ?? {});
      const dataSet = genProcessFromData(result.data?.json?.processDataSet ?? {});
      const nextData = {
        ...dataSet,
        id,
        stateCode: result.data?.stateCode,
        ruleVerification: result.data?.ruleVerification,
      } as FormProcessWithDatas;
      setInitData(nextData);
      applyProcessData(nextData, { resetFields: true });
      setSpinning(false);
    });
  };

  useEffect(() => {
    if (!drawerVisible) {
      setShowRules(false);
      setRefCheckData([]);
      setValidationIssueTabNames([]);
      setSdkValidationDetails([]);
      setSdkValidationFocus(null);
      setSdkValidationDismissedFieldKeys(new Set());
      setPendingTabValidationKey(null);
      setAutoCheckTriggered(false);
      resetReviewSubmitGateState();
      // setUnRuleVerificationData([]);
      // setNonExistentRefData([]);
      return;
    }
    onReset();
  }, [drawerVisible, resetReviewSubmitGateState]);

  useEffect(() => {
    if (!showRules || !drawerVisible || pendingTabValidationKey !== activeTabKey) {
      return;
    }

    let cancelled = false;

    void validateVisibleFormFields(formRefEdit, {
      onSettled: () => {
        if (cancelled) {
          return;
        }

        setSdkValidationDetails((currentDetails) =>
          currentDetails.length > 0 ? [...currentDetails] : currentDetails,
        );
        setPendingTabValidationKey(null);
      },
    });

    return () => {
      cancelled = true;
    };
  }, [activeTabKey, drawerVisible, pendingTabValidationKey, showRules]);

  useEffect(() => {
    if (!autoCheckRequired || autoCheckTriggered || !drawerVisible || spinning || !fromData) {
      return;
    }
    setAutoCheckTriggered(true);
    void runCheckData({ silent: true });
  }, [autoCheckRequired, autoCheckTriggered, drawerVisible, fromData, runCheckData, spinning]);

  return (
    <>
      {!autoOpen &&
        (buttonType === 'toolIcon' ? (
          <Tooltip
            title={
              <FormattedMessage
                id='pages.button.model.process'
                defaultMessage='Process information'
              ></FormattedMessage>
            }
            placement='left'
          >
            <Button
              type='primary'
              size='small'
              style={{ boxShadow: 'none' }}
              icon={<FormOutlined />}
              onClick={onEdit}
              disabled={disabled}
            />
          </Tooltip>
        ) : buttonType === 'toolResultIcon' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.model.result' defaultMessage='Model Results' />
            }
            placement='left'
          >
            <Button
              disabled={id === ''}
              type='primary'
              icon={<ProductOutlined />}
              size='small'
              style={{ boxShadow: 'none' }}
              onClick={onEdit}
            />
          </Tooltip>
        ) : buttonType === 'tool' ? (
          <Tooltip
            title={
              <FormattedMessage id='pages.button.model.result' defaultMessage='Model Results' />
            }
            placement='left'
          >
            <Button
              disabled={id === ''}
              type='primary'
              icon={<ProductOutlined />}
              size='small'
              style={{ boxShadow: 'none' }}
              onClick={onEdit}
            />
          </Tooltip>
        ) : (
          <Tooltip title={<FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />}>
            {buttonType === 'icon' ? (
              <Button
                disabled={disabled}
                shape='circle'
                icon={<FormOutlined />}
                size='small'
                onClick={onEdit}
              />
            ) : (
              <Button disabled={disabled} onClick={onEdit}>
                <FormattedMessage id={'pages.button.edit'} defaultMessage={'Edit'} />
              </Button>
            )}
          </Tooltip>
        ))}
      <Drawer
        getContainer={() => document.body}
        destroyOnHidden
        title={
          <FormattedMessage
            id={'pages.process.drawer.title.edit'}
            defaultMessage={'Edit process'}
          />
        }
        width='90%'
        closable={false}
        extra={
          <Button
            icon={<CloseOutlined />}
            style={{ border: 0 }}
            onClick={() => setDrawerVisible(false)}
          />
        }
        maskClosable={false}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space size={'middle'} className={styles.footer_right}>
            <AISuggestion
              type='process'
              onLatestJsonChange={handleLatestJsonChange}
              onClose={handleAISuggestionClose}
              originJson={originJson}
            />
            <Button
              onClick={async () => {
                await runCheckData();
              }}
            >
              <FormattedMessage id='pages.button.check' defaultMessage='Data Check' />
            </Button>
            <>
              {!hideReviewButton && (
                <Button
                  disabled={spinning}
                  onClick={() => {
                    submitReview();
                  }}
                >
                  <FormattedMessage id='pages.button.review' defaultMessage='Submit for Review' />
                </Button>
              )}
              <Button
                onClick={() => {
                  handleUpdateReference();
                }}
              >
                <FormattedMessage
                  id='pages.button.updateReference'
                  defaultMessage='Update Reference'
                />
              </Button>
            </>
            <Button onClick={() => setDrawerVisible(false)}>
              <FormattedMessage id='pages.button.cancel' defaultMessage='Cancel' />
            </Button>
            {/* <Button onClick={onReset}>
              {' '}
              <FormattedMessage id="pages.button.reset" defaultMessage="Reset" />
            </Button> */}

            <Button
              onClick={() => {
                setShowRules(false);
                formRefEdit.current?.submit();
              }}
              type='primary'
            >
              <FormattedMessage id='pages.button.save' defaultMessage='Save' />
            </Button>
          </Space>
        }
      >
        <Spin spinning={spinning}>
          <RefCheckContext.Provider value={refCheckContextValue}>
            {reviewSubmitGateState.status !== 'not_run' && (
              <Alert
                showIcon
                style={{ marginBottom: 12 }}
                type={
                  reviewSubmitGateState.status === 'passed' ||
                  reviewSubmitGateState.status === 'submitted'
                    ? 'success'
                    : reviewSubmitGateState.status === 'queued' ||
                        reviewSubmitGateState.status === 'running' ||
                        reviewSubmitGateState.status === 'waiting_gate' ||
                        reviewSubmitGateState.status === 'submitting'
                      ? 'info'
                      : 'error'
                }
                message={
                  <FormattedMessage
                    id='pages.process.reviewSubmitGate.title'
                    defaultMessage='Numerical stability gate'
                  />
                }
                description={renderReviewSubmitGateDescription()}
              />
            )}
            <ProForm
              formRef={formRefEdit}
              initialValues={initData}
              onValuesChange={async (changedValues, allValues) => {
                resetReviewSubmitGateState();
                dismissChangedSdkValidationFields(changedValues);
                if (activeTabKey === 'validation') {
                  await setFromData({
                    ...fromData,
                    modellingAndValidation: {
                      ...fromData?.modellingAndValidation,
                      validation: { ...allValues?.modellingAndValidation?.validation },
                    },
                  } as FormProcessWithDatas);
                } else if (activeTabKey === 'complianceDeclarations') {
                  await setFromData({
                    ...fromData,
                    modellingAndValidation: {
                      ...fromData?.modellingAndValidation,
                      complianceDeclarations: {
                        ...allValues?.modellingAndValidation?.complianceDeclarations,
                      },
                    },
                  } as FormProcessWithDatas);
                } else {
                  await setFromData({
                    ...fromData,
                    [activeTabKey]: allValues[activeTabKey] ?? {},
                  } as FormProcessWithDatas);
                }
              }}
              submitter={{
                render: () => {
                  return [];
                },
              }}
              onFinish={async () => {
                await handleSubmit(true);
                return true;
              }}
            >
              <ProcessForm
                lang={lang}
                activeTabKey={activeTabKey}
                actionFrom={actionFrom}
                exchangeDataSource={exchangeDataSource}
                formRef={formRefEdit}
                lciaResults={jsonToList(fromData?.LCIAResults?.LCIAResult) as LCIAResultTable[]}
                lciaCalculationEvidence={fromData?.LCIAResults?.['common:other']}
                onData={handletFromData}
                onExchangeData={handletExchangeData}
                onExchangeDataCreate={handletExchangeDataCreate}
                onTabChange={(key) => onTabChange(key as TabKeysType)}
                processId={id}
                processVersion={version}
                sdkValidationDetails={sdkValidationDetails}
                sdkValidationDismissedFieldKeys={sdkValidationDismissedFieldKeys}
                sdkValidationFocus={sdkValidationFocus}
                showRules={showRules}
                validationIssueTabNames={validationIssueTabNames}
              />
              <Form.Item name='id' hidden>
                <Input />
              </Form.Item>
            </ProForm>
          </RefCheckContext.Provider>
        </Spin>
      </Drawer>
      <RefsOfNewVersionDrawer
        open={refsDrawerVisible}
        loading={refsLoading}
        dataSource={refsNewList}
        onCancel={() => setRefsDrawerVisible(false)}
        onKeep={handleKeepVersion}
        onUpdate={handleUpdateRefsVersion}
      />
    </>
  );
};

export default ProcessEdit;
