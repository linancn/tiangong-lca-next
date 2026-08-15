const proofModule = require('../../../scripts/release/release-gate-proof.cjs') as {
  PROOF_SCOPE: string[];
  PROOF_SCHEMA_VERSION: string;
  READINESS_WORKFLOW_PATH: string;
  RELEASE_GATE_JOB_NAME: string;
  artifactName: (input: {
    releaseBase: string;
    releaseHead: string;
    runId: number;
    runAttempt: number;
  }) => string;
  buildProof: (input: {
    repository: string;
    pullRequestNumber: number;
    releaseBase: string;
    releaseHead: string;
    releaseHeadTree: string;
    runId: number;
    runAttempt: number;
  }) => Record<string, unknown>;
  resolveExactProof: (
    input: {
      root: string;
      repository: string;
      releaseBase: string;
      releaseHead: string;
      token: string;
    },
    dependencies: {
      gitText: (root: string, args: string[]) => string;
      apiJson: (path: string) => Promise<unknown>;
      downloadProofArtifact: (artifact: Record<string, unknown>) => Promise<unknown>;
    },
  ) => Promise<Record<string, unknown>>;
  resolveWithFallback: (
    input: {
      root: string;
      repository: string;
      releaseBase: string;
      releaseHead: string;
      token: string;
    },
    dependencies: {
      gitText: (root: string, args: string[]) => string;
      apiJson: (path: string) => Promise<unknown>;
      downloadProofArtifact: (artifact: Record<string, unknown>) => Promise<unknown>;
    },
  ) => Promise<Record<string, unknown>>;
};

const repository = 'linancn/tiangong-lca-next';
const releaseBase = 'a'.repeat(40);
const candidateHead = 'b'.repeat(40);
const releaseHead = 'c'.repeat(40);
const candidateTree = 'd'.repeat(40);
const changedTree = 'e'.repeat(40);
const runId = 123456;
const runAttempt = 2;
const pullRequestNumber = 819;
const artifactId = 987654;

const expectedArtifactName = proofModule.artifactName({
  releaseBase,
  releaseHead: candidateHead,
  runId,
  runAttempt,
});

const exactProof = () =>
  proofModule.buildProof({
    repository,
    pullRequestNumber,
    releaseBase,
    releaseHead: candidateHead,
    releaseHeadTree: candidateTree,
    runId,
    runAttempt,
  });

const exactPullRequest = () => ({
  number: pullRequestNumber,
  merged_at: '2026-08-13T00:00:00Z',
  merge_commit_sha: releaseHead,
  base: { ref: 'main', sha: releaseBase },
  head: { ref: 'codex/promote-v1', sha: candidateHead },
});

const exactRun = () => ({
  id: runId,
  run_attempt: runAttempt,
  event: 'pull_request',
  conclusion: 'success',
  head_sha: candidateHead,
  path: proofModule.READINESS_WORKFLOW_PATH,
});

const exactArtifact = () => ({
  id: artifactId,
  name: expectedArtifactName,
  expired: false,
});

const createDependencies = ({
  parentLine = `${releaseHead} ${releaseBase} ${candidateHead}`,
  releaseTree = candidateTree,
  pullRequests = [exactPullRequest()],
  workflowRuns = [exactRun()],
  jobs = [{ name: proofModule.RELEASE_GATE_JOB_NAME, conclusion: 'success' }],
  artifacts = [exactArtifact()],
  proof = exactProof(),
}: {
  parentLine?: string;
  releaseTree?: string;
  pullRequests?: unknown[];
  workflowRuns?: unknown[];
  jobs?: unknown[];
  artifacts?: unknown[];
  proof?: unknown;
} = {}) => {
  const gitText = jest.fn((_root: string, args: string[]) => {
    if (args[0] === 'rev-list') return parentLine;
    if (args[0] === 'rev-parse' && args[1] === `${releaseHead}^{tree}`) return releaseTree;
    if (args[0] === 'rev-parse' && args[1] === `${candidateHead}^{tree}`) return candidateTree;
    throw new Error(`Unexpected git arguments: ${args.join(' ')}`);
  });
  const apiJson = jest.fn(async (apiPath: string) => {
    if (apiPath.includes(`/commits/${releaseHead}/pulls`)) return pullRequests;
    if (apiPath.includes('/actions/workflows/release-readiness.yml/runs')) {
      return { workflow_runs: workflowRuns };
    }
    if (apiPath.includes(`/actions/runs/${runId}/jobs`)) return { jobs };
    if (apiPath.includes(`/actions/runs/${runId}/artifacts`)) return { artifacts };
    throw new Error(`Unexpected API path: ${apiPath}`);
  });
  const downloadProofArtifact = jest.fn(async () => proof);
  return { gitText, apiJson, downloadProofArtifact };
};

const resolutionInput = () => ({
  root: '/fixture',
  repository,
  releaseBase,
  releaseHead,
  token: 'test-token',
});

describe('release gate proof', () => {
  it('binds proof identity to the exact PR base, candidate tree, run, and attempt', () => {
    expect(exactProof()).toEqual({
      schema_version: proofModule.PROOF_SCHEMA_VERSION,
      proof_scope: proofModule.PROOF_SCOPE,
      repository,
      pull_request_number: pullRequestNumber,
      release_base: releaseBase,
      release_head: candidateHead,
      release_head_tree: candidateTree,
      workflow_path: proofModule.READINESS_WORKFLOW_PATH,
      workflow_run_id: runId,
      workflow_run_attempt: runAttempt,
      artifact_name: expectedArtifactName,
    });
  });

  it('reuses one exact successful main PR release gate proof', async () => {
    const dependencies = createDependencies();

    await expect(
      proofModule.resolveExactProof(resolutionInput(), dependencies),
    ).resolves.toMatchObject({
      complete: true,
      gate_mode: 'reuse',
      reason: 'exact_main_pr_release_gate_proof',
      pull_request_number: pullRequestNumber,
      release_base: releaseBase,
      release_head: releaseHead,
      candidate_head: candidateHead,
      candidate_tree: candidateTree,
      workflow_run_id: runId,
      workflow_run_attempt: runAttempt,
      artifact_id: artifactId,
      artifact_name: expectedArtifactName,
    });
    expect(dependencies.downloadProofArtifact).toHaveBeenCalledWith(exactArtifact());
  });

  it.each([
    {
      name: 'direct or squash push',
      dependencies: createDependencies({ parentLine: `${releaseHead} ${releaseBase}` }),
      reason: 'release_head_not_merge_commit',
    },
    {
      name: 'different first parent',
      dependencies: createDependencies({
        parentLine: `${releaseHead} ${'f'.repeat(40)} ${candidateHead}`,
      }),
      reason: 'release_base_parent_mismatch',
    },
    {
      name: 'merge conflict changed tree',
      dependencies: createDependencies({ releaseTree: changedTree }),
      reason: 'release_tree_changed_after_pr_gate',
    },
    {
      name: 'missing merged PR identity',
      dependencies: createDependencies({ pullRequests: [] }),
      reason: 'merged_pull_request_not_exact',
    },
  ])('falls back to the full gate for $name', async ({ dependencies, reason }) => {
    await expect(
      proofModule.resolveWithFallback(resolutionInput(), dependencies),
    ).resolves.toMatchObject({ complete: true, gate_mode: 'full', reason });
  });

  it.each([
    {
      name: 'failed Release Gate job',
      dependencies: createDependencies({
        jobs: [{ name: proofModule.RELEASE_GATE_JOB_NAME, conclusion: 'failure' }],
      }),
    },
    {
      name: 'expired artifact',
      dependencies: createDependencies({ artifacts: [{ ...exactArtifact(), expired: true }] }),
    },
    {
      name: 'invalid artifact identity',
      dependencies: createDependencies({ artifacts: [{ ...exactArtifact(), id: 0 }] }),
    },
    {
      name: 'mismatched proof payload',
      dependencies: createDependencies({
        proof: { ...exactProof(), release_head_tree: changedTree },
      }),
    },
  ])('falls back when the successful run has a $name', async ({ dependencies }) => {
    await expect(
      proofModule.resolveWithFallback(resolutionInput(), dependencies),
    ).resolves.toMatchObject({
      complete: true,
      gate_mode: 'full',
      reason: 'no_exact_successful_pr_gate_proof',
    });
  });

  it('falls back when GitHub proof resolution is unavailable', async () => {
    const dependencies = createDependencies();
    dependencies.apiJson.mockRejectedValueOnce(new Error('temporary outage'));

    await expect(
      proofModule.resolveWithFallback(resolutionInput(), dependencies),
    ).resolves.toMatchObject({
      complete: true,
      gate_mode: 'full',
      reason: 'unexpected_resolution_error',
    });
  });
});
