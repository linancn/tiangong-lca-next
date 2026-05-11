import path from 'node:path';

export const DATA_WORKFLOWS_ROOT = 'tests/data-workflows/workflows';
export const DATA_WORKFLOW_FIXTURES_ROOT = 'tests/data-workflows/fixtures';
export const DATA_WORKFLOW_DATA_FIXTURES_ROOT = `${DATA_WORKFLOW_FIXTURES_ROOT}/data`;
export const DATA_WORKFLOW_RESULT_FIXTURES_ROOT = `${DATA_WORKFLOW_FIXTURES_ROOT}/result`;
export const DATA_WORKFLOW_RUNTIME_ROOT = 'tests/data-workflows/runtime';
export const DATA_WORKFLOW_USERS_FIXTURE_PATH = `${DATA_WORKFLOW_DATA_FIXTURES_ROOT}/users.json`;

export type DataWorkflowFixtureKind = 'data' | 'result';

export function buildDataWorkflowPath(scope: string, filename: string) {
  return `${DATA_WORKFLOWS_ROOT}/${scope}/${filename}`;
}

export function buildDataWorkflowDataFixturePath(scope: string, filename: string) {
  return `${DATA_WORKFLOW_DATA_FIXTURES_ROOT}/${scope}/${filename}`;
}

export function buildDataWorkflowExpectedFixturePath(scope: string, filename: string) {
  return `${DATA_WORKFLOW_RESULT_FIXTURES_ROOT}/${scope}/${filename}`;
}

export function buildDataWorkflowRuntimePath(scope: string, filename: string) {
  return `${DATA_WORKFLOW_RUNTIME_ROOT}/${scope}/${filename}`;
}

function matchesDataWorkflowFixtureRootAt(
  segments: string[],
  index: number,
  fixtureKinds: DataWorkflowFixtureKind[],
) {
  return (
    segments[index] === 'tests' &&
    segments[index + 1] === 'data-workflows' &&
    segments[index + 2] === 'fixtures' &&
    fixtureKinds.includes((segments[index + 3] as DataWorkflowFixtureKind) ?? 'data')
  );
}

export function resolveDataWorkflowRuntimeRecordFilePath(
  filePath: string,
  options: {
    cwd?: string;
    fixtureKinds?: DataWorkflowFixtureKind[];
  } = {},
) {
  const cwd = options.cwd ?? process.cwd();
  const fixtureKinds = options.fixtureKinds ?? ['data'];
  const absoluteFilePath = path.resolve(cwd, filePath);
  const relativeFilePath = path.relative(cwd, absoluteFilePath);
  const relativeSegments = relativeFilePath.split(path.sep);
  const parsed = path.parse(absoluteFilePath);
  const recordFilename = `${parsed.name}.last-run.json`;
  const dataWorkflowFixtureIndex = relativeSegments.findIndex((_, index) =>
    matchesDataWorkflowFixtureRootAt(relativeSegments, index, fixtureKinds),
  );

  if (dataWorkflowFixtureIndex !== -1) {
    return path.resolve(
      cwd,
      ...relativeSegments.slice(0, dataWorkflowFixtureIndex),
      'tests',
      'data-workflows',
      'runtime',
      ...relativeSegments.slice(dataWorkflowFixtureIndex + 4, -1),
      recordFilename,
    );
  }

  return path.join(parsed.dir, recordFilename);
}
