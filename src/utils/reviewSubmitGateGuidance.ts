export type ReviewSubmitGateReasonGuidance = {
  titleId: string;
  defaultTitle: string;
  descriptionId: string;
  defaultDescription: string;
  actionId: string;
  defaultAction: string;
};

export const REVIEW_SUBMIT_GATE_REASON_GUIDANCE = {
  revision_report_stale: {
    titleId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.title',
    defaultTitle: 'Gate result is stale',
    descriptionId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.description',
    defaultDescription: 'The gate result no longer matches the latest saved process revision.',
    actionId: 'pages.process.reviewSubmitGate.reason.revisionReportStale.action',
    defaultAction: 'Save the current data and submit for review again.',
  },
  invalid_scope_state: {
    titleId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.title',
    defaultTitle: 'Dataset lifecycle state is not eligible',
    descriptionId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.description',
    defaultDescription:
      'The current process data or its dependency data is in a lifecycle state that cannot enter submit review.',
    actionId: 'pages.process.reviewSubmitGate.reason.invalidScopeState.action',
    defaultAction:
      'Confirm the data is eligible for submit review; do not submit data that is already under review or outside the allowed scope.',
  },
  duplicate_process_version: {
    titleId: 'pages.process.reviewSubmitGate.reason.duplicateProcessVersion.title',
    defaultTitle: 'Multiple versions of the same process were found',
    descriptionId: 'pages.process.reviewSubmitGate.reason.duplicateProcessVersion.description',
    defaultDescription:
      'The gate scope contains more than one version for the same process ID, so the review scope is ambiguous.',
    actionId: 'pages.process.reviewSubmitGate.reason.duplicateProcessVersion.action',
    defaultAction:
      'Keep only the target process version in scope, remove duplicated versions, or correct the referenced version range before retrying.',
  },
  missing_or_zero_reference: {
    titleId: 'pages.process.reviewSubmitGate.reason.missingOrZeroReference.title',
    defaultTitle: 'Quantitative reference is missing or zero',
    descriptionId: 'pages.process.reviewSubmitGate.reason.missingOrZeroReference.description',
    defaultDescription:
      'The process is missing a valid quantitative reference, references a missing exchange, or has a zero reference amount.',
    actionId: 'pages.process.reviewSubmitGate.reason.missingOrZeroReference.action',
    defaultAction:
      'Check the quantitative reference and make sure it points to a valid exchange with an amount greater than zero.',
  },
  invalid_exchange_amount: {
    titleId: 'pages.process.reviewSubmitGate.reason.invalidExchangeAmount.title',
    defaultTitle: 'Exchange amount is invalid',
    descriptionId: 'pages.process.reviewSubmitGate.reason.invalidExchangeAmount.description',
    defaultDescription:
      'One or more exchange amounts are missing, cannot be parsed, contain invalid text, or evaluate to NaN or Infinity.',
    actionId: 'pages.process.reviewSubmitGate.reason.invalidExchangeAmount.action',
    defaultAction:
      'Correct the exchange amounts and unit conversion data so every amount used by the gate is a valid number.',
  },
  invalid_allocation_fraction: {
    titleId: 'pages.process.reviewSubmitGate.reason.invalidAllocationFraction.title',
    defaultTitle: 'Allocation fraction is invalid',
    descriptionId: 'pages.process.reviewSubmitGate.reason.invalidAllocationFraction.description',
    defaultDescription:
      'One or more allocation fractions cannot be parsed or are outside the allowed numeric range.',
    actionId: 'pages.process.reviewSubmitGate.reason.invalidAllocationFraction.action',
    defaultAction:
      'Set allocation fractions to valid numeric values and keep them within the 0 to 100 range.',
  },
  duplicate_exchange_fingerprint: {
    titleId: 'pages.process.reviewSubmitGate.reason.duplicateExchangeFingerprint.title',
    defaultTitle: 'Duplicate exchange structure was detected',
    descriptionId: 'pages.process.reviewSubmitGate.reason.duplicateExchangeFingerprint.description',
    defaultDescription:
      'Different processes have the same flow, direction, and amount structure, which may indicate duplicated data or missing distinguishing exchanges.',
    actionId: 'pages.process.reviewSubmitGate.reason.duplicateExchangeFingerprint.action',
    defaultAction:
      'Review the duplicated processes, merge duplicate data, or add exchange information that distinguishes the processes.',
  },
  service_loop_detected: {
    titleId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.title',
    defaultTitle: 'Service loop detected',
    descriptionId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.description',
    defaultDescription:
      'The same flow appears as both input and output in one process with the same or nearly the same amount.',
    actionId: 'pages.process.reviewSubmitGate.reason.serviceLoopDetected.action',
    defaultAction:
      'Check the input and output relationship, remove unintended self loops, or split the process if needed.',
  },
  flow_lcia_semantic_mismatch: {
    titleId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.title',
    defaultTitle: 'Flow and LCIA semantics are inconsistent',
    descriptionId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.description',
    defaultDescription:
      'Product flows, elementary flows, biosphere exchanges, or LCIA factors are mapped with inconsistent semantics.',
    actionId: 'pages.process.reviewSubmitGate.reason.flowLciaSemanticMismatch.action',
    defaultAction:
      'Check flow types, biosphere exchanges, and LCIA factor mappings, then correct the mismatched data before retrying.',
  },
  lcia_factor_missing_for_impact_submit: {
    titleId: 'pages.process.reviewSubmitGate.reason.lciaFactorMissingForImpactSubmit.title',
    defaultTitle: 'LCIA factors are missing',
    descriptionId:
      'pages.process.reviewSubmitGate.reason.lciaFactorMissingForImpactSubmit.description',
    defaultDescription:
      'This submit-review policy requires impact-ready data, but no LCIA characterization factors are available.',
    actionId: 'pages.process.reviewSubmitGate.reason.lciaFactorMissingForImpactSubmit.action',
    defaultAction:
      'Add the required LCIA factors, or confirm whether the impact-ready requirement should be disabled for this submission.',
  },
  sparse_matrix_zero_or_near_zero_diagonal: {
    titleId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.title',
    defaultTitle: 'Matrix diagonal is zero or near zero',
    descriptionId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.description',
    defaultDescription:
      'The generated M = I - A matrix has a zero or near-zero diagonal, so the solve may be unstable or fail.',
    actionId: 'pages.process.reviewSubmitGate.reason.sparseMatrixZeroDiagonal.action',
    defaultAction:
      'Check self loops, quantitative references, reference exchanges, and process structure before submitting again.',
  },
  duplicate_sparse_columns: {
    titleId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.title',
    defaultTitle: 'Duplicate matrix columns were detected',
    descriptionId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.description',
    defaultDescription:
      'The M = I - A matrix contains duplicate sparse columns, which may make the matrix underdetermined or linearly dependent.',
    actionId: 'pages.process.reviewSubmitGate.reason.duplicateSparseColumns.action',
    defaultAction:
      'Review duplicated processes, repeated exchange structures, and linearly dependent processes before retrying.',
  },
  target_process_not_covered_by_probe: {
    titleId: 'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.title',
    defaultTitle: 'Target process is outside the probe scope',
    descriptionId:
      'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.description',
    defaultDescription:
      'The gate could not include the submitted target process in the numerical stability probe.',
    actionId: 'pages.process.reviewSubmitGate.reason.targetProcessNotCoveredByProbe.action',
    defaultAction:
      'Confirm the target process is valid and in range. If too many targets are submitted at once, split the submission and retry.',
  },
  factorization_probe_failed: {
    titleId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.title',
    defaultTitle: 'Numerical probe failed',
    descriptionId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.description',
    defaultDescription:
      'The fast matrix factorization probe could not complete reliably, which indicates a risky calculation structure.',
    actionId: 'pages.process.reviewSubmitGate.reason.factorizationProbeFailed.action',
    defaultAction:
      'Check the exchange graph, quantitative references, and loop structure around the target process, then submit again.',
  },
  target_probe_non_finite_result: {
    titleId: 'pages.process.reviewSubmitGate.reason.targetProbeNonFiniteResult.title',
    defaultTitle: 'Target process solve result is non-finite',
    descriptionId: 'pages.process.reviewSubmitGate.reason.targetProbeNonFiniteResult.description',
    defaultDescription:
      'The target process probe failed during solve or produced NaN or Infinity values.',
    actionId: 'pages.process.reviewSubmitGate.reason.targetProbeNonFiniteResult.action',
    defaultAction:
      'Check related flows, exchange amounts, LCIA data, and matrix structure, then correct the data that produces non-finite results.',
  },
} as const satisfies Record<string, ReviewSubmitGateReasonGuidance>;

export type ReviewSubmitGateBlockerCode = keyof typeof REVIEW_SUBMIT_GATE_REASON_GUIDANCE;

export const REVIEW_SUBMIT_GATE_BLOCKER_CODES = Object.keys(
  REVIEW_SUBMIT_GATE_REASON_GUIDANCE,
) as ReviewSubmitGateBlockerCode[];
