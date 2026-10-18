type Translate = (id: string, fallback: string) => string;
export function closureDisplayStatus(value: string | undefined, t: Translate): string {
  switch (value) {
    case 'passed':
      return t('pages.dataProcessing.resultView.status.passed', 'Passed');
    case 'valid':
      return t('pages.dataProcessing.resultView.status.valid', 'Valid');
    case 'complete':
      return t('pages.dataProcessing.resultView.status.complete', 'Complete');
    case 'blocked':
      return t('pages.dataProcessing.resultView.status.blocked', 'Blocked');
    case 'stale':
      return t('pages.dataProcessing.resultView.status.stale', 'Out of date');
    case 'revoked':
      return t('pages.dataProcessing.resultView.status.revoked', 'Revoked');
    case 'invalid':
      return t('pages.dataProcessing.resultView.status.invalid', 'Invalid');
    case 'expired':
      return t('pages.dataProcessing.resultView.status.expired', 'Expired');
    case 'queued':
      return t('pages.dataProcessing.resultView.status.queued', 'Queued');
    case 'running':
      return t('pages.dataProcessing.resultView.status.running', 'Running');
    case 'failed':
      return t('pages.dataProcessing.resultView.status.failed', 'Failed');
    case 'cancelled':
      return t('pages.dataProcessing.resultView.status.cancelled', 'Cancelled');
    case 'incomplete':
      return t('pages.dataProcessing.resultView.status.incomplete', 'Incomplete');
    case 'warning':
      return t('pages.dataProcessing.resultView.status.warning', 'Review suggested');
    case 'blocker':
      return t('pages.dataProcessing.resultView.status.blocker', 'Action required');
    case 'info':
      return t('pages.dataProcessing.resultView.status.info', 'Information');
    default:
      return t('pages.dataProcessing.workspace.unknown', 'Status unavailable');
  }
}
