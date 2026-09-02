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
  modelVersion?: string | null;
  ruleVerification?: boolean | null;
};

export type CreateRequest = {
  table: DatasetTable;
  id: string;
  jsonOrdered: unknown;
  modelId?: string | null;
  modelVersion?: string | null;
  ruleVerification?: boolean | null;
};

export type CreateVersionRequest = {
  table: DatasetTable;
  id: string;
  sourceVersion: string;
  jsonOrdered: unknown;
  modelId?: string | null;
  modelVersion?: string | null;
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
};

export type WorkerJobStatus =
  'queued' | 'running' | 'waiting' | 'completed' | 'blocked' | 'stale' | 'failed' | 'cancelled';

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

export type DatasetCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type DatasetCommandExecutionResult =
  { ok: true; body: unknown; status?: number } | DatasetCommandFailure;
