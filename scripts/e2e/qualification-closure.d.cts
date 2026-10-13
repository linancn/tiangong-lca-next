export type QualificationClosureContract = {
  assertionIds: string[];
  browsers: string[];
  canonicalBrowsers: Record<string, { executed: number; skipped: number }>;
  criticalAssertionIds: string[];
  harnessBrowsers: Record<string, { executed: number; skipped: number }>;
  coverage: Record<string, number>;
};
export function loadQualificationClosureContract(root: string): QualificationClosureContract;
export function qualificationClosureContract(coverage: unknown): QualificationClosureContract;
export function qualificationAssertionFailures(
  value: unknown,
  contract: QualificationClosureContract,
): string[];
export function qualificationReportFailures(
  value: unknown,
  contract: QualificationClosureContract,
): string[];
export function qualificationCoverageFailures(
  value: unknown,
  contract: QualificationClosureContract,
): string[];
export function qualificationCleanupFailures(value: unknown): string[];
export function readQualificationReportReceipt(reportPath: string): {
  qualification: unknown;
  qualificationReportSha256: string;
};
