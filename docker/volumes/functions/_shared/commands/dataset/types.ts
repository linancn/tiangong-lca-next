export const DATASET_TABLES = [
  'contacts',
  'sources',
  'unitgroups',
  'flowproperties',
  'flows',
  'processes',
  'lifecyclemodels',
] as const;

export type DatasetTable = (typeof DATASET_TABLES)[number];

export type SaveDraftRequest = {
  table: DatasetTable;
  id: string;
  version: string;
  jsonOrdered: unknown;
  modelId?: string;
  ruleVerification?: boolean | null;
};

export type CreateRequest = {
  table: DatasetTable;
  id: string;
  jsonOrdered: unknown;
  modelId?: string | null;
  ruleVerification?: boolean | null;
};

export type CreateVersionRequest = {
  table: DatasetTable;
  id: string;
  sourceVersion: string;
  jsonOrdered: unknown;
  modelId?: string | null;
  ruleVerification?: boolean | null;
};

export type DeleteRequest = {
  table: DatasetTable;
  id: string;
  version: string;
};

export type AssignTeamRequest = {
  table: DatasetTable;
  id: string;
  version: string;
  teamId: string;
};

export type PublishRequest = {
  table: DatasetTable;
  id: string;
  version: string;
};

export type SubmitReviewRequest = {
  table: DatasetTable;
  id: string;
  version: string;
  reviewSubmitGateRunId?: string;
  revisionChecksum?: string;
  reviewSubmitPolicyProfile?: string;
  reviewSubmitReportSchemaVersion?: string;
};

export const REVIEW_SUBMIT_GATE_POLICY_PROFILE = 'review_submit_fast.v1';
export const REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION = 'review_submit_gate_report.v1';

export type ReviewSubmitGateAction = 'ensure' | 'read' | 'rerun';

export type ReviewSubmitGateRequest = {
  table: DatasetTable;
  id: string;
  version: string;
  revisionChecksum?: string;
  action: ReviewSubmitGateAction;
  gateRunId?: string;
  policyProfile: typeof REVIEW_SUBMIT_GATE_POLICY_PROFILE;
  reportSchemaVersion: typeof REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION;
};

export type ReviewSubmitGateStatus =
  | 'queued'
  | 'running'
  | 'passed'
  | 'blocked'
  | 'error'
  | 'stale';

export type ReviewSubmitGateResult = {
  status: ReviewSubmitGateStatus;
  gateRunId?: string;
  datasetRevision?: {
    table: DatasetTable;
    id: string;
    version: string;
    revisionChecksum: string;
  };
  policy?: {
    profile: string;
  };
  calculatorReport?: {
    schemaVersion?: string;
    reportId?: string;
    generatedAt?: string;
  } | null;
  blockingReasons?: unknown[];
  [key: string]: unknown;
};

export type ReviewSubmitJobAction = 'enqueue' | 'read' | 'read_latest';

export type ReviewSubmitJobStatus =
  | 'queued'
  | 'waiting_gate'
  | 'submitting'
  | 'submitted'
  | 'blocked'
  | 'stale'
  | 'error'
  | 'cancelled';

export type WorkerJobStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'blocked'
  | 'stale'
  | 'failed'
  | 'cancelled';

export type WorkerJobResult = {
  id?: string;
  jobKind?: string;
  workerRuntime?: string;
  workerQueue?: string;
  subjectType?: string;
  subjectId?: string;
  subjectVersion?: string;
  requestedBy?: string;
  status: WorkerJobStatus;
  phase?: string | null;
  progress?: number | string | null;
  result?: unknown;
  errorCode?: string | null;
  errorMessage?: string | null;
  blockerCodes?: string[];
  resolutionScope?: 'user' | 'operator' | 'system' | null;
  retryable?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  [key: string]: unknown;
};

export type ReviewSubmitJobEnqueueRequest = {
  action: 'enqueue';
  table: 'processes';
  id: string;
  version: string;
  revisionChecksum?: string;
  policyProfile: typeof REVIEW_SUBMIT_GATE_POLICY_PROFILE;
  reportSchemaVersion: typeof REVIEW_SUBMIT_GATE_REPORT_SCHEMA_VERSION;
};

export type ReviewSubmitJobReadRequest = {
  action: 'read';
  reviewSubmitJobId: string;
};

export type ReviewSubmitJobReadLatestRequest = {
  action: 'read_latest';
  table: 'processes';
  id: string;
  version: string;
  revisionChecksum?: string;
};

export type ReviewSubmitJobRequest =
  | ReviewSubmitJobEnqueueRequest
  | ReviewSubmitJobReadRequest
  | ReviewSubmitJobReadLatestRequest;

export type ReviewSubmitJobResult = {
  status: ReviewSubmitJobStatus;
  reviewSubmitJobId?: string;
  gateRunId?: string | null;
  gateWorkerJobId?: string | null;
  datasetRevision?: {
    table: DatasetTable;
    id: string;
    version: string;
    revisionChecksum: string;
  };
  policy?: {
    profile?: string;
    reportSchemaVersion?: string;
  };
  gate?: ReviewSubmitGateResult | null;
  gateWorkerJob?: WorkerJobResult | null;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
  result?: unknown;
  [key: string]: unknown;
};

export type DatasetCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type DatasetCommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | DatasetCommandFailure;
