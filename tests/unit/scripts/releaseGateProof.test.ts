const proofModule = require('../../../scripts/release/release-gate-proof.cjs') as {
  PROOF_SCOPE: string[];
  PROOF_SCHEMA_VERSION: string;
  READINESS_WORKFLOW_PATH: string;
  RELEASE_GATE_JOB_NAME: string;
  RELEASE_MARKER_PREFIX: string;
  artifactName: (input: {
    releaseBase: string;
    candidateBase: string;
    releaseHead: string;
    runId: number;
    runAttempt: number;
  }) => string;
  buildProof: (input: {
    repository: string;
    pullRequestNumber: number;
    releaseBase: string;
    candidateBase: string;
    releaseHead: string;
    releaseHeadTree: string;
    releaseVersion: string;
    runId: number;
    runAttempt: number;
  }) => Record<string, unknown>;
  candidateContextFromPullRequest: (input: Record<string, unknown>) => Record<string, unknown>;
  parseReleaseMarker: (body: string) => Record<string, unknown>;
  resolvePromotionProof: (
    input: {
      root: string;
      repository: string;
      releaseBase: string;
      promotionHead: string;
      token: string;
    },
    dependencies: Dependencies,
  ) => Promise<Record<string, unknown>>;
  resolveExactProof: (
    input: {
      root: string;
      repository: string;
      releaseBase: string;
      releaseHead: string;
      token: string;
    },
    dependencies: Dependencies,
  ) => Promise<Record<string, unknown>>;
  resolveWithFallback: (
    input: {
      root: string;
      repository: string;
      releaseBase: string;
      releaseHead: string;
      token: string;
    },
    dependencies: Dependencies,
  ) => Promise<Record<string, unknown>>;
};

type Dependencies = {
  gitText: jest.Mock<string, [string, string[]]>;
  apiJson: jest.Mock<Promise<unknown>, [string]>;
  downloadProofArtifact: jest.Mock<Promise<unknown>, [Record<string, unknown>]>;
};

const repository = 'linancn/tiangong-lca-next';
const releaseBase = 'a'.repeat(40);
const candidateBase = 'b'.repeat(40);
const candidateHead = 'c'.repeat(40);
const promotionHead = 'd'.repeat(40);
const releaseHead = 'e'.repeat(40);
const candidateTree = 'f'.repeat(40);
const changedTree = '1'.repeat(40);
const releaseVersion = '1.2.3';
const runId = 123456;
const runAttempt = 2;
const releasePullRequestNumber = 819;
const promotionPullRequestNumber = 820;
const artifactId = 987654;

const releaseMarker =
  `<!-- ${proofModule.RELEASE_MARKER_PREFIX} issue=867 version=${releaseVersion} ` +
  `dev-base=${candidateBase} main-base=${releaseBase} candidate=${candidateHead} -->`;

const expectedArtifactName = proofModule.artifactName({
  releaseBase,
  candidateBase,
  releaseHead: candidateHead,
  runId,
  runAttempt,
});

const exactProof = () =>
  proofModule.buildProof({
    repository,
    pullRequestNumber: releasePullRequestNumber,
    releaseBase,
    candidateBase,
    releaseHead: candidateHead,
    releaseHeadTree: candidateTree,
    releaseVersion,
    runId,
    runAttempt,
  });

const exactReleasePullRequest = () => ({
  number: releasePullRequestNumber,
  merged_at: '2026-08-15T00:00:00Z',
  merge_commit_sha: promotionHead,
  body: releaseMarker,
  base: { ref: 'dev', sha: candidateBase },
  head: { ref: 'codex/issue-867-version-v1.2.3', sha: candidateHead },
});

const exactPromotionPullRequest = () => ({
  number: promotionPullRequestNumber,
  merged_at: '2026-08-15T01:00:00Z',
  merge_commit_sha: releaseHead,
  base: { ref: 'main', sha: releaseBase },
  head: { ref: 'codex/promote-v1.2.3-dev-to-main-issue-867', sha: promotionHead },
});

const exactRun = () => ({
  id: runId,
  run_attempt: runAttempt,
  event: 'pull_request',
  conclusion: 'success',
  head_sha: candidateHead,
  path: proofModule.READINESS_WORKFLOW_PATH,
});

const exactArtifact = () => ({ id: artifactId, name: expectedArtifactName, expired: false });

const createDependencies = ({
  mainParentLine = `${releaseHead} ${releaseBase} ${promotionHead}`,
  promotionParentLine = `${promotionHead} ${candidateBase} ${candidateHead}`,
  releaseTree = candidateTree,
  promotionTree = candidateTree,
  candidateTreeValue = candidateTree,
  mainPullRequests = [exactPromotionPullRequest()],
  releasePullRequests = [exactReleasePullRequest()],
  workflowRuns = [exactRun()],
  jobs = [{ name: proofModule.RELEASE_GATE_JOB_NAME, conclusion: 'success' }],
  artifacts = [exactArtifact()],
  proof = exactProof(),
}: {
  mainParentLine?: string;
  promotionParentLine?: string;
  releaseTree?: string;
  promotionTree?: string;
  candidateTreeValue?: string;
  mainPullRequests?: unknown[];
  releasePullRequests?: unknown[];
  workflowRuns?: unknown[];
  jobs?: unknown[];
  artifacts?: unknown[];
  proof?: unknown;
} = {}): Dependencies => {
  const gitText = jest.fn((_root: string, args: string[]) => {
    if (args[0] === 'rev-list' && args[4] === releaseHead) return mainParentLine;
    if (args[0] === 'rev-list' && args[4] === promotionHead) return promotionParentLine;
    if (args[0] === 'rev-parse' && args[1] === `${releaseHead}^{tree}`) return releaseTree;
    if (args[0] === 'rev-parse' && args[1] === `${promotionHead}^{tree}`) return promotionTree;
    if (args[0] === 'rev-parse' && args[1] === `${candidateHead}^{tree}`) {
      return candidateTreeValue;
    }
    throw new Error(`Unexpected git arguments: ${args.join(' ')}`);
  });
  const apiJson = jest.fn(async (apiPath: string) => {
    if (apiPath.includes(`/commits/${releaseHead}/pulls`)) return mainPullRequests;
    if (apiPath.includes(`/commits/${promotionHead}/pulls`)) return releasePullRequests;
    if (apiPath.includes('/actions/workflows/release-readiness.yml/runs')) {
      return { workflow_runs: workflowRuns };
    }
    if (apiPath.includes(`/actions/runs/${runId}/jobs`)) return { jobs };
    if (apiPath.includes(`/actions/runs/${runId}/artifacts`)) return { artifacts };
    throw new Error(`Unexpected API path: ${apiPath}`);
  });
  const downloadProofArtifact = jest.fn(async (artifact: Record<string, unknown>) => {
    void artifact;
    return proof;
  });
  return { gitText, apiJson, downloadProofArtifact };
};

const promotionInput = () => ({
  root: '/fixture',
  repository,
  releaseBase,
  promotionHead,
  token: 'test-token',
});

const releaseInput = () => ({
  root: '/fixture',
  repository,
  releaseBase,
  releaseHead,
  token: 'test-token',
});

describe('release gate proof', () => {
  it('binds proof identity to the main/dev bases, candidate tree, version, run, and attempt', () => {
    expect(exactProof()).toEqual({
      schema_version: proofModule.PROOF_SCHEMA_VERSION,
      proof_scope: proofModule.PROOF_SCOPE,
      repository,
      pull_request_number: releasePullRequestNumber,
      release_base: releaseBase,
      candidate_base: candidateBase,
      release_head: candidateHead,
      release_head_tree: candidateTree,
      release_version: releaseVersion,
      workflow_path: proofModule.READINESS_WORKFLOW_PATH,
      workflow_run_id: runId,
      workflow_run_attempt: runAttempt,
      artifact_name: expectedArtifactName,
    });
  });

  it('parses and verifies the deterministic dev Release PR marker', () => {
    expect(proofModule.parseReleaseMarker(releaseMarker)).toEqual({
      issue: 867,
      version: releaseVersion,
      candidateBase,
      releaseBase,
      candidateHead,
    });
    expect(proofModule.candidateContextFromPullRequest(exactReleasePullRequest())).toMatchObject({
      pullRequestNumber: releasePullRequestNumber,
      releaseVersion,
      releaseBase,
      candidateBase,
      candidateHead,
    });
  });

  it('verifies an immutable dev promotion from one exact candidate proof', async () => {
    const dependencies = createDependencies();
    await expect(
      proofModule.resolvePromotionProof(promotionInput(), dependencies),
    ).resolves.toMatchObject({
      complete: true,
      gate_mode: 'reuse',
      reason: 'exact_dev_release_candidate_proof',
      release_pull_request_number: releasePullRequestNumber,
      release_base: releaseBase,
      promotion_head: promotionHead,
      candidate_base: candidateBase,
      candidate_head: candidateHead,
      candidate_tree: candidateTree,
      release_version: releaseVersion,
      workflow_run_id: runId,
      artifact_id: artifactId,
    });
    expect(dependencies.downloadProofArtifact).toHaveBeenCalledWith(exactArtifact());
  });

  it('verifies the tree-identical main merge without rerunning candidate acceptance', async () => {
    await expect(
      proofModule.resolveExactProof(releaseInput(), createDependencies()),
    ).resolves.toMatchObject({
      gate_mode: 'reuse',
      release_head: releaseHead,
      promotion_head: promotionHead,
      promotion_pull_request_number: promotionPullRequestNumber,
      release_pull_request_number: releasePullRequestNumber,
    });
  });

  it.each([
    {
      name: 'non-merge main release',
      dependencies: createDependencies({ mainParentLine: `${releaseHead} ${releaseBase}` }),
      reason: 'release_head_not_main_merge',
    },
    {
      name: 'different main first parent',
      dependencies: createDependencies({
        mainParentLine: `${releaseHead} ${'2'.repeat(40)} ${promotionHead}`,
      }),
      reason: 'release_base_parent_mismatch',
    },
    {
      name: 'changed main merge tree',
      dependencies: createDependencies({ releaseTree: changedTree }),
      reason: 'main_merge_tree_changed_after_candidate_gate',
    },
    {
      name: 'non-merge dev candidate',
      dependencies: createDependencies({
        promotionParentLine: `${promotionHead} ${candidateBase}`,
      }),
      reason: 'promotion_head_not_dev_merge',
    },
    {
      name: 'changed dev merge tree',
      dependencies: createDependencies({
        releaseTree: changedTree,
        promotionTree: changedTree,
      }),
      reason: 'dev_merge_tree_changed_after_candidate_gate',
    },
  ])('fails closed without a full-gate fallback for $name', async ({ dependencies, reason }) => {
    await expect(
      proofModule.resolveWithFallback(releaseInput(), dependencies),
    ).resolves.toMatchObject({ complete: true, gate_mode: 'invalid', reason });
  });

  it.each([
    {
      name: 'failed aggregate job',
      dependencies: createDependencies({
        jobs: [{ name: proofModule.RELEASE_GATE_JOB_NAME, conclusion: 'failure' }],
      }),
    },
    {
      name: 'expired artifact',
      dependencies: createDependencies({ artifacts: [{ ...exactArtifact(), expired: true }] }),
    },
    {
      name: 'mismatched proof payload',
      dependencies: createDependencies({
        proof: { ...exactProof(), release_head_tree: changedTree },
      }),
    },
  ])('rejects a candidate proof with a $name', async ({ dependencies }) => {
    await expect(
      proofModule.resolveWithFallback(releaseInput(), dependencies),
    ).resolves.toMatchObject({
      gate_mode: 'invalid',
      reason: 'no_exact_successful_pr_gate_proof',
    });
  });

  it('fails closed when GitHub proof resolution is unavailable', async () => {
    const dependencies = createDependencies();
    dependencies.apiJson.mockRejectedValueOnce(new Error('temporary outage'));
    await expect(
      proofModule.resolveWithFallback(releaseInput(), dependencies),
    ).resolves.toMatchObject({
      gate_mode: 'invalid',
      reason: 'unexpected_resolution_error',
    });
  });
});
