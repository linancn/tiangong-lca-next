import type { LciaResultPublication } from '@/services/dataProducts';
import type { TaskSummaryV2 } from '@/services/taskCenter/types';
export type ResultSetNextAction =
  'start_closure' | 'view_closure' | 'start_build' | 'view_build' | 'preview' | 'view_publication';

export type ResultSetWorkflowSummary = {
  closureStatus: 'unknown' | 'not_checked' | 'checking' | 'needs_attention' | 'ready' | 'failed';
  buildStatus: 'unknown' | 'not_started' | 'running' | 'ready' | 'failed';
  publicationStatus: 'unknown' | 'not_published' | 'published';
  nextAction: ResultSetNextAction;
  closureCheckId?: string;
  packageId?: string;
};

export function deriveResultSetWorkflowSummary(
  resultSetId: string,
  tasks: TaskSummaryV2[],
  publications: LciaResultPublication[],
): ResultSetWorkflowSummary {
  const related = tasks
    .filter((task) => task.resultSetId === resultSetId)
    .sort((left, right) => right.projectionUpdatedAt.localeCompare(left.projectionUpdatedAt));
  const closures = related.filter((task) => task.jobKind === 'lcia.scope_closure_check');
  const builds = related.filter((task) => task.jobKind === 'lcia_result.package_build');
  const latestClosure = closures[0];
  const latestBuild = builds[0];
  const packageIds = new Set(
    builds.map((task) => task.resultPackageId).filter((value): value is string => Boolean(value)),
  );
  const currentPublication = publications.find(
    (publication) =>
      (publication.status === 'published' ||
        publication.status === 'current' ||
        publication.isCurrent === true) &&
      Boolean(publication.packageId && packageIds.has(publication.packageId)),
  );

  const closureStatus: ResultSetWorkflowSummary['closureStatus'] = !latestClosure
    ? 'unknown'
    : latestClosure.workerStatus === 'failed' || latestClosure.workerStatus === 'cancelled'
      ? 'failed'
      : latestClosure.runState === 'active' ||
          latestClosure.workerStatus === 'queued' ||
          latestClosure.workerStatus === 'running' ||
          latestClosure.workerStatus === 'waiting'
        ? 'checking'
        : latestClosure.domainStatus === 'passed' && latestClosure.domainValidity === 'valid'
          ? 'ready'
          : 'needs_attention';
  const buildStatus: ResultSetWorkflowSummary['buildStatus'] = !latestBuild
    ? 'unknown'
    : latestBuild.workerStatus === 'failed' || latestBuild.workerStatus === 'cancelled'
      ? 'failed'
      : latestBuild.resultPackageId
        ? 'ready'
        : latestBuild.runState === 'active' ||
            latestBuild.workerStatus === 'queued' ||
            latestBuild.workerStatus === 'running' ||
            latestBuild.workerStatus === 'waiting'
          ? 'running'
          : 'failed';

  if (currentPublication?.packageId) {
    return {
      closureStatus,
      buildStatus,
      publicationStatus: 'published',
      nextAction: 'view_publication',
      closureCheckId: latestClosure?.closureCheckId,
      packageId: currentPublication.packageId,
    };
  }
  if (latestBuild?.resultPackageId) {
    return {
      closureStatus,
      buildStatus,
      publicationStatus: 'unknown',
      nextAction: 'preview',
      closureCheckId: latestClosure?.closureCheckId,
      packageId: latestBuild.resultPackageId,
    };
  }
  if (
    latestBuild?.runState === 'active' ||
    latestBuild?.workerStatus === 'queued' ||
    latestBuild?.workerStatus === 'running' ||
    latestBuild?.workerStatus === 'waiting'
  ) {
    return {
      closureStatus,
      buildStatus,
      publicationStatus: 'unknown',
      nextAction: 'view_build',
      closureCheckId: latestClosure?.closureCheckId,
    };
  }
  if (closureStatus === 'ready') {
    return {
      closureStatus,
      buildStatus,
      publicationStatus: 'unknown',
      nextAction: 'start_build',
      closureCheckId: latestClosure?.closureCheckId,
    };
  }
  if (latestClosure) {
    return {
      closureStatus,
      buildStatus,
      publicationStatus: 'unknown',
      nextAction: 'view_closure',
      closureCheckId: latestClosure.closureCheckId,
    };
  }
  return {
    closureStatus,
    buildStatus,
    publicationStatus: 'unknown',
    nextAction: 'start_closure',
  };
}

export function resultSetStatusMessage(
  translate: (id: string, defaultMessage: string) => string,
  kind: 'closure' | 'build' | 'publication',
  value: string,
): string {
  if (value === 'unknown')
    return translate('pages.dataProcessing.workspace.unknown', 'Status unavailable');
  switch (`${kind}:${value}`) {
    case 'closure:not_checked':
      return translate('pages.dataProcessing.resultSets.closure.notChecked', 'Not checked');
    case 'closure:checking':
      return translate('pages.dataProcessing.resultSets.closure.checking', 'Checking');
    case 'closure:needs_attention':
      return translate('pages.dataProcessing.resultSets.closure.needsAttention', 'Needs attention');
    case 'closure:ready':
      return translate('pages.dataProcessing.resultSets.closure.ready', 'Ready to calculate');
    case 'closure:failed':
      return translate('pages.dataProcessing.resultSets.closure.failed', 'Check failed');
    case 'build:not_started':
      return translate('pages.dataProcessing.resultSets.build.notStarted', 'Not calculated');
    case 'build:running':
      return translate('pages.dataProcessing.resultSets.build.running', 'Calculating');
    case 'build:ready':
      return translate('pages.dataProcessing.resultSets.build.ready', 'Ready to preview');
    case 'build:failed':
      return translate('pages.dataProcessing.resultSets.build.failed', 'Calculation failed');
    case 'publication:not_published':
      return translate('pages.dataProcessing.resultSets.publication.notPublished', 'Not published');
    case 'publication:published':
      return translate('pages.dataProcessing.resultSets.publication.published', 'Published');
    default:
      return value;
  }
}

export function resultSetActionMessage(
  translate: (id: string, defaultMessage: string) => string,
  action: ResultSetNextAction,
): string {
  switch (action) {
    case 'start_closure':
      return translate('pages.dataProcessing.resultSets.action.startClosure', 'Start check');
    case 'view_closure':
      return translate('pages.dataProcessing.resultSets.action.viewClosure', 'View check');
    case 'start_build':
      return translate('pages.dataProcessing.resultSets.action.startBuild', 'Start calculation');
    case 'view_build':
      return translate('pages.dataProcessing.resultSets.action.viewBuild', 'View progress');
    case 'preview':
      return translate('pages.dataProcessing.resultSets.action.preview', 'Preview result');
    case 'view_publication':
      return translate(
        'pages.dataProcessing.resultSets.action.viewPublication',
        'View publication',
      );
  }
}
