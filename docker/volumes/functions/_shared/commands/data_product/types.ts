export type DataProductCoverageMode = 'global_eligible' | 'subset';

export type DataProductProcessSelection = {
  id: string;
  version: string;
};

export type DataProductClosureRequestedScope = {
  coverageMode: DataProductCoverageMode;
  processes?: DataProductProcessSelection[];
  lciaMethods: DataProductProcessSelection[];
  certificateFreshnessPolicy?: 'frozen-artifact-reusable-v1' | 'current-membership-required-v1';
  linkPolicy?: {
    linkSemanticsVersion?: 'signed-flow-balance-v1';
    flowIdentityPolicy?: 'exact-flow-version-reference-unit-v2';
    allocationSemanticsVersion?: 'tidas-reference-allocation-v3';
    technosphereBoundaryPolicy?: 'closed' | 'open' | 'cutoff';
    providerUniversePolicy?: 'scope_only' | 'eligible_transitive_expansion-v1';
  };
};

export type DataProductBuildCreateRequest = {
  action: 'create_build';
  name: string;
  processes?: DataProductProcessSelection[];
  coverageMode: DataProductCoverageMode;
  defaultImpactCategory?: string;
  lciaMethodSet: unknown[];
  idempotencyKey?: string;
  closureCheckId?: string;
  requestedScopeHash?: string;
  policyFingerprint?: string;
};

export type DataProductClosureCheckCreateRequest = {
  action: 'create_closure_check';
  requestedScope: DataProductClosureRequestedScope;
  requestIdempotencyToken: string;
};

export type DataProductClosureCheckReadRequest = {
  action: 'get_closure_check';
  closureCheckId: string;
};

export type DataProductClosureIssuesRequest = {
  action: 'list_closure_issues';
  closureCheckId: string;
  afterIssueId?: string;
  limit?: number;
};

export type DataProductClosureArtifactRole = 'closure_report_xlsx' | 'closure_issue_manifest';

export type DataProductClosureReportDownloadRequest = {
  action: 'create_closure_report_download';
  closureCheckId: string;
  artifactRole: DataProductClosureArtifactRole;
};

export type DataProductTaskFeedRequest = {
  action: 'list_task_feed';
  category?: string;
  jobKinds?: string[];
  statuses?: string[];
  updatedSince?: string;
  cursor?: { updatedAt: string; jobId: string };
  limit?: number;
  rootOnly?: boolean;
};

export type DataProductPackagePreviewRequest = {
  action: 'preview_package';
  packageId: string;
  impactCategoryId?: string;
  rowOffset?: number;
  rowLimit?: number;
  inputOffset?: number;
  inputLimit?: number;
  resultOffset?: number;
  resultLimit?: number;
};

export type DataProductPackagePublishRequest = {
  action: 'publish_package';
  packageId: string;
  displayDefaultImpactCategory?: string;
  reason?: string;
};

export type DataProductPackageUnpublishRequest = {
  action: 'unpublish_publication';
  publicationId: string;
  reason?: string;
};

export type DataProductPublicationListRequest = {
  action: 'list_publications';
  limit?: number;
};

export type DataProductCommandRequest =
  | DataProductBuildCreateRequest
  | DataProductClosureCheckCreateRequest
  | DataProductClosureCheckReadRequest
  | DataProductClosureIssuesRequest
  | DataProductClosureReportDownloadRequest
  | DataProductTaskFeedRequest
  | DataProductPackagePreviewRequest
  | DataProductPackagePublishRequest
  | DataProductPackageUnpublishRequest
  | DataProductPublicationListRequest;

export type DataProductCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type DataProductCommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | DataProductCommandFailure;

export type DataProductPackageBuildRequest = {
  buildId: string;
  workerJob: DataProductWorkerJobRequest;
  idempotencyKey: string;
};

export type DataProductWorkerJobRequest = {
  jobKind: string;
  payload: Record<string, unknown>;
  payloadSchemaVersion: string;
  subjectType: string;
  subjectId: string;
  subjectVersion?: string | null;
  requestedBy: string;
  requesterType: 'user' | 'system' | 'service' | 'operator';
  requestHash?: string | null;
  queueKey?: string | null;
  visibility?: 'user' | 'operator' | 'system' | null;
};
