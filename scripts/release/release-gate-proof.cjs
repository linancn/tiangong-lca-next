#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROOF_SCHEMA_VERSION = 'tiangong.next.release-gate-proof.v3';
const RESOLUTION_SCHEMA_VERSION = 'tiangong.next.release-gate-proof-resolution.v2';
const READINESS_WORKFLOW_FILE = 'release-readiness.yml';
const READINESS_WORKFLOW_PATH = `.github/workflows/${READINESS_WORKFLOW_FILE}`;
const RELEASE_GATE_JOB_NAME = 'Release Candidate / Aggregate Exact Release Proof';
const RELEASE_MARKER_PREFIX = 'tiangong-next-release-automation:v2';
const PROOF_SCOPE = Object.freeze([
  'static-release-gate',
  'content-addressed-semantic-qualification',
  'public-browser-semantics',
]);
const PROOF_FILE_NAME = 'release-gate-proof.json';
const GIT_OBJECT_ID_PATTERN = /^[0-9a-f]{40}$/u;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;

class ReleaseGateProofError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ReleaseGateProofError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new ReleaseGateProofError(code, message, details);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function requireText(value, name) {
  const text = String(value ?? '').trim();
  if (!text) fail('invalid_argument', `${name} is required.`, { argument: name });
  return text;
}

function requireSha(value, name) {
  const sha = requireText(value, name);
  if (!GIT_OBJECT_ID_PATTERN.test(sha)) {
    fail('invalid_sha', `${name} must be a full lowercase 40-character commit SHA.`, {
      argument: name,
      value: sha,
    });
  }
  return sha;
}

function requirePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    fail('invalid_integer', `${name} must be a positive integer.`, {
      argument: name,
      value,
    });
  }
  return parsed;
}

function requireRepository(value) {
  const repository = requireText(value, '--repository');
  if (!REPOSITORY_PATTERN.test(repository)) {
    fail('invalid_repository', '--repository must use the owner/repo form.', { repository });
  }
  return repository;
}

function requireStableVersion(value, name) {
  const version = requireText(value, name);
  if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(version)) {
    fail('invalid_version', `${name} must be a stable x.y.z version.`, {
      argument: name,
      value: version,
    });
  }
  return version;
}

function parseReleaseMarker(body) {
  const escapedPrefix = RELEASE_MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(
    `<!-- ${escapedPrefix} issue=(\\d+) version=(\\d+\\.\\d+\\.\\d+) dev-base=([0-9a-f]{40}) main-base=([0-9a-f]{40}) candidate=([0-9a-f]{40}) -->`,
    'u',
  );
  const match = pattern.exec(String(body || ''));
  if (!match) {
    fail('release_candidate_marker_invalid', 'The dev Release PR marker is missing or invalid.');
  }
  return {
    issue: requirePositiveInteger(match[1], 'release Issue'),
    version: requireStableVersion(match[2], 'release version'),
    candidateBase: requireSha(match[3], 'candidate base'),
    releaseBase: requireSha(match[4], 'release base'),
    candidateHead: requireSha(match[5], 'candidate head'),
  };
}

function artifactName({ releaseBase, candidateBase, releaseHead, runId, runAttempt }) {
  return [
    'release-gate-proof',
    requireSha(releaseBase, 'release base'),
    requireSha(candidateBase, 'candidate base'),
    requireSha(releaseHead, 'release head'),
    requirePositiveInteger(runId, 'workflow run ID'),
    requirePositiveInteger(runAttempt, 'workflow run attempt'),
  ].join('-');
}

function run(command, args, { cwd, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: MAX_CAPTURE_BYTES,
  });
  if (result.error) {
    fail('command_unavailable', `${command} could not be executed.`, {
      command,
      reason: result.error.message,
    });
  }
  if (result.status !== 0 && !allowFailure) {
    fail('command_failed', `${command} ${args.join(' ')} failed.`, {
      command: [command, ...args],
      exit_code: result.status,
      stderr: String(result.stderr || result.stdout || '')
        .trim()
        .slice(0, 2000),
    });
  }
  return result;
}

function gitText(root, args) {
  return run('git', args, { cwd: root }).stdout.trim();
}

function repositoryRoot(cwd = process.cwd()) {
  return gitText(cwd, ['rev-parse', '--show-toplevel']);
}

function buildProof({
  repository,
  pullRequestNumber,
  releaseBase,
  candidateBase,
  releaseHead,
  releaseHeadTree,
  releaseVersion,
  runId,
  runAttempt,
}) {
  const normalized = {
    repository: requireRepository(repository),
    pull_request_number: requirePositiveInteger(pullRequestNumber, 'pull request number'),
    release_base: requireSha(releaseBase, 'release base'),
    candidate_base: requireSha(candidateBase, 'candidate base'),
    release_head: requireSha(releaseHead, 'release head'),
    release_head_tree: requireSha(releaseHeadTree, 'release head tree'),
    release_version: requireStableVersion(releaseVersion, 'release version'),
    workflow_path: READINESS_WORKFLOW_PATH,
    workflow_run_id: requirePositiveInteger(runId, 'workflow run ID'),
    workflow_run_attempt: requirePositiveInteger(runAttempt, 'workflow run attempt'),
  };
  return {
    schema_version: PROOF_SCHEMA_VERSION,
    ...normalized,
    proof_scope: [...PROOF_SCOPE],
    artifact_name: artifactName({
      releaseBase: normalized.release_base,
      candidateBase: normalized.candidate_base,
      releaseHead: normalized.release_head,
      runId: normalized.workflow_run_id,
      runAttempt: normalized.workflow_run_attempt,
    }),
  };
}

function writeProof({
  root,
  repository,
  pullRequestNumber,
  releaseBase,
  candidateBase,
  releaseHead,
  releaseVersion,
  runId,
  runAttempt,
  outputPath,
}) {
  const normalizedHead = requireSha(releaseHead, 'release head');
  const checkedOutHead = requireSha(gitText(root, ['rev-parse', 'HEAD']), 'checked-out HEAD');
  if (checkedOutHead !== normalizedHead) {
    fail('checked_out_head_mismatch', 'The checked-out commit is not the requested release head.', {
      checked_out_head: checkedOutHead,
      release_head: normalizedHead,
    });
  }
  const releaseHeadTree = requireSha(
    gitText(root, ['rev-parse', `${normalizedHead}^{tree}`]),
    'release head tree',
  );
  const proof = buildProof({
    repository,
    pullRequestNumber,
    releaseBase,
    candidateBase,
    releaseHead: normalizedHead,
    releaseHeadTree,
    releaseVersion,
    runId,
    runAttempt,
  });
  const destination = path.resolve(requireText(outputPath, '--output'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, `${JSON.stringify(proof, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(destination, 0o600);
  return { proof, output_path: destination };
}

function githubHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    Authorization: `Bearer ${requireText(token, 'GITHUB_TOKEN')}`,
    'User-Agent': 'tiangong-lca-next-release-gate-proof',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function apiJson(apiPath, { token, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    fail('fetch_unavailable', 'Node.js fetch is unavailable.');
  }
  const response = await fetchImpl(`https://api.github.com${apiPath}`, {
    headers: githubHeaders(token),
  });
  if (!response.ok) {
    fail('github_api_request_failed', 'A GitHub API request failed.', {
      path: apiPath,
      status: response.status,
    });
  }
  try {
    return await response.json();
  } catch (error) {
    fail('github_api_invalid_json', 'A GitHub API response was not valid JSON.', {
      path: apiPath,
      reason: errorMessage(error),
    });
  }
}

async function downloadProofArtifact(
  { repository, artifactId, token },
  { fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== 'function') {
    fail('fetch_unavailable', 'Node.js fetch is unavailable.');
  }
  const response = await fetchImpl(
    `https://api.github.com/repos/${repository}/actions/artifacts/${artifactId}/zip`,
    { headers: githubHeaders(token, 'application/vnd.github+json') },
  );
  if (!response.ok) {
    fail(
      'proof_artifact_download_failed',
      'The release-gate proof artifact could not be downloaded.',
      {
        artifact_id: artifactId,
        status: response.status,
      },
    );
  }

  const temporaryRoot = process.env.RUNNER_TEMP || os.tmpdir();
  const temporaryDirectory = fs.mkdtempSync(path.join(temporaryRoot, 'release-gate-proof-'));
  const archivePath = path.join(temporaryDirectory, 'proof.zip');
  try {
    fs.writeFileSync(archivePath, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
    const listing = run('unzip', ['-Z1', archivePath])
      .stdout.split(/\r?\n/u)
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (listing.length !== 1 || listing[0] !== PROOF_FILE_NAME) {
      fail(
        'proof_artifact_shape_invalid',
        'The proof artifact must contain exactly one proof file.',
        {
          entries: listing.slice(0, 20),
        },
      );
    }
    const proofText = run('unzip', ['-p', archivePath, PROOF_FILE_NAME]).stdout;
    try {
      return JSON.parse(proofText);
    } catch (error) {
      fail('proof_artifact_invalid_json', 'The proof artifact did not contain valid JSON.', {
        reason: errorMessage(error),
      });
    }
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function assertProofMatches(proof, expected) {
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    fail('proof_payload_invalid', 'The release-gate proof payload must be an object.');
  }
  const required = {
    schema_version: PROOF_SCHEMA_VERSION,
    repository: expected.repository,
    pull_request_number: expected.pullRequestNumber,
    release_base: expected.releaseBase,
    candidate_base: expected.candidateBase,
    release_head: expected.releaseHead,
    release_head_tree: expected.releaseHeadTree,
    release_version: expected.releaseVersion,
    workflow_path: READINESS_WORKFLOW_PATH,
    workflow_run_id: expected.runId,
    workflow_run_attempt: expected.runAttempt,
    artifact_name: expected.artifactName,
  };
  const mismatches = Object.entries(required)
    .filter(([key, value]) => proof[key] !== value)
    .map(([key, value]) => ({ field: key, expected: value, actual: proof[key] ?? null }));
  if (JSON.stringify(proof.proof_scope) !== JSON.stringify(PROOF_SCOPE)) {
    mismatches.push({
      field: 'proof_scope',
      expected: PROOF_SCOPE,
      actual: proof.proof_scope ?? null,
    });
  }
  if (mismatches.length > 0) {
    fail('proof_payload_mismatch', 'The release-gate proof does not match the merged release.', {
      mismatches,
    });
  }
}

function selectMergedPullRequest(pullRequests, { mergeCommit, baseRef, baseSha, candidateHead }) {
  const matches = (Array.isArray(pullRequests) ? pullRequests : []).filter(
    (pullRequest) =>
      pullRequest?.merged_at &&
      pullRequest?.merge_commit_sha === mergeCommit &&
      pullRequest?.base?.ref === baseRef &&
      pullRequest?.base?.sha === baseSha &&
      pullRequest?.head?.sha === candidateHead,
  );
  if (matches.length !== 1) {
    fail(
      'merged_pull_request_not_exact',
      `The merge commit did not resolve to one exact merged ${baseRef} PR.`,
      {
        matching_pull_requests: matches.map((pullRequest) => pullRequest.number),
      },
    );
  }
  return matches[0];
}

function candidateContextFromPullRequest(pullRequest) {
  if (pullRequest?.base?.ref !== 'dev') {
    fail('release_candidate_wrong_base', 'The Release PR must target dev.', {
      base_ref: pullRequest?.base?.ref ?? null,
    });
  }
  const marker = parseReleaseMarker(pullRequest?.body);
  const pullRequestNumber = requirePositiveInteger(pullRequest?.number, 'pull request number');
  const candidateBase = requireSha(pullRequest?.base?.sha, 'candidate base');
  const candidateHead = requireSha(pullRequest?.head?.sha, 'candidate head');
  const mismatches = [];
  if (marker.candidateBase !== candidateBase) {
    mismatches.push({
      field: 'candidate_base',
      expected: candidateBase,
      actual: marker.candidateBase,
    });
  }
  if (marker.candidateHead !== candidateHead) {
    mismatches.push({
      field: 'candidate_head',
      expected: candidateHead,
      actual: marker.candidateHead,
    });
  }
  if (mismatches.length > 0) {
    fail('release_candidate_marker_mismatch', 'The Release PR marker does not match the PR.', {
      mismatches,
    });
  }
  return {
    pullRequestNumber,
    issue: marker.issue,
    releaseVersion: marker.version,
    releaseBase: marker.releaseBase,
    candidateBase,
    candidateHead,
  };
}

function readCandidateContext({ root, eventPath }) {
  const event = JSON.parse(
    fs.readFileSync(path.resolve(requireText(eventPath, '--event-path')), 'utf8'),
  );
  const context = candidateContextFromPullRequest(event.pull_request);
  const checkedOutHead = requireSha(gitText(root, ['rev-parse', 'HEAD']), 'checked-out HEAD');
  if (checkedOutHead !== context.candidateHead) {
    fail('checked_out_head_mismatch', 'The checked-out commit is not the Release PR head.', {
      checked_out_head: checkedOutHead,
      candidate_head: context.candidateHead,
    });
  }
  const packageVersion = requireStableVersion(
    JSON.parse(gitText(root, ['show', `${context.candidateHead}:package.json`])).version,
    'candidate package version',
  );
  if (packageVersion !== context.releaseVersion) {
    fail(
      'release_candidate_version_mismatch',
      'The candidate package version does not match the Release PR marker.',
      {
        marker_version: context.releaseVersion,
        package_version: packageVersion,
      },
    );
  }
  return context;
}

async function resolvePromotionProof(
  { root, repository, releaseBase, promotionHead, token },
  dependencies = {},
) {
  const normalizedRepository = requireRepository(repository);
  const normalizedBase = requireSha(releaseBase, 'release base');
  const normalizedPromotionHead = requireSha(promotionHead, 'promotion head');
  const git = dependencies.gitText || gitText;
  const api =
    dependencies.apiJson ||
    ((apiPath) => apiJson(apiPath, { token, fetchImpl: dependencies.fetchImpl }));
  const download =
    dependencies.downloadProofArtifact ||
    ((artifact) =>
      downloadProofArtifact(
        { repository: normalizedRepository, artifactId: artifact.id, token },
        { fetchImpl: dependencies.fetchImpl },
      ));

  const parentLine = git(root, ['rev-list', '--parents', '-n', '1', normalizedPromotionHead]);
  const parentParts = parentLine.split(/\s+/u).filter(Boolean);
  if (parentParts.length !== 3 || parentParts[0] !== normalizedPromotionHead) {
    fail(
      'promotion_head_not_dev_merge',
      'The promotion head is not a two-parent dev merge commit.',
      {
        promotion_head: normalizedPromotionHead,
        parent_count: Math.max(parentParts.length - 1, 0),
      },
    );
  }
  const [, candidateBase, candidateHead] = parentParts;
  requireSha(candidateBase, 'candidate base');
  requireSha(candidateHead, 'candidate head');
  const promotionTree = requireSha(
    git(root, ['rev-parse', `${normalizedPromotionHead}^{tree}`]),
    'promotion tree',
  );
  const candidateTree = requireSha(
    git(root, ['rev-parse', `${candidateHead}^{tree}`]),
    'candidate tree',
  );
  if (promotionTree !== candidateTree) {
    fail(
      'dev_merge_tree_changed_after_candidate_gate',
      'The merged dev tree differs from the qualified Release PR tree.',
      {
        promotion_tree: promotionTree,
        candidate_tree: candidateTree,
      },
    );
  }

  const pullRequests = await api(
    `/repos/${normalizedRepository}/commits/${normalizedPromotionHead}/pulls?per_page=100`,
  );
  const pullRequest = selectMergedPullRequest(pullRequests, {
    mergeCommit: normalizedPromotionHead,
    baseRef: 'dev',
    baseSha: candidateBase,
    candidateHead,
  });
  const candidateContext = candidateContextFromPullRequest(pullRequest);
  if (candidateContext.releaseBase !== normalizedBase) {
    fail(
      'release_base_changed_after_candidate_gate',
      'main changed after the Release PR was qualified.',
      {
        qualified_main_base: candidateContext.releaseBase,
        current_main_base: normalizedBase,
      },
    );
  }
  if (
    candidateContext.candidateBase !== candidateBase ||
    candidateContext.candidateHead !== candidateHead
  ) {
    fail(
      'release_candidate_merge_identity_mismatch',
      'The dev merge does not match the qualified Release PR identity.',
    );
  }
  const pullRequestNumber = candidateContext.pullRequestNumber;
  const runsResponse = await api(
    `/repos/${normalizedRepository}/actions/workflows/${READINESS_WORKFLOW_FILE}/runs` +
      `?event=pull_request&status=completed&head_sha=${candidateHead}&per_page=100`,
  );
  const candidateRuns = (
    Array.isArray(runsResponse?.workflow_runs) ? runsResponse.workflow_runs : []
  )
    .filter(
      (workflowRun) =>
        workflowRun?.event === 'pull_request' &&
        workflowRun?.conclusion === 'success' &&
        workflowRun?.head_sha === candidateHead &&
        workflowRun?.path === READINESS_WORKFLOW_PATH,
    )
    .sort((left, right) => Number(right.id) - Number(left.id));

  const rejectedRuns = [];
  for (const workflowRun of candidateRuns) {
    const runId = requirePositiveInteger(workflowRun.id, 'workflow run ID');
    const runAttempt = requirePositiveInteger(workflowRun.run_attempt, 'workflow run attempt');
    const jobsResponse = await api(
      `/repos/${normalizedRepository}/actions/runs/${runId}/jobs?per_page=100`,
    );
    const gateJobs = (Array.isArray(jobsResponse?.jobs) ? jobsResponse.jobs : []).filter(
      (job) => job?.name === RELEASE_GATE_JOB_NAME && job?.conclusion === 'success',
    );
    if (gateJobs.length !== 1) {
      rejectedRuns.push({ run_id: runId, reason: 'release_gate_job_not_exact' });
      continue;
    }

    const expectedArtifactName = artifactName({
      releaseBase: normalizedBase,
      candidateBase,
      releaseHead: candidateHead,
      runId,
      runAttempt,
    });
    const artifactsResponse = await api(
      `/repos/${normalizedRepository}/actions/runs/${runId}/artifacts?per_page=100`,
    );
    const proofArtifacts = (
      Array.isArray(artifactsResponse?.artifacts) ? artifactsResponse.artifacts : []
    ).filter((artifact) => artifact?.name === expectedArtifactName && artifact?.expired === false);
    if (proofArtifacts.length !== 1) {
      rejectedRuns.push({ run_id: runId, reason: 'proof_artifact_not_exact' });
      continue;
    }

    try {
      const proofArtifact = {
        ...proofArtifacts[0],
        id: requirePositiveInteger(proofArtifacts[0].id, 'artifact ID'),
      };
      const proof = await download(proofArtifact);
      assertProofMatches(proof, {
        repository: normalizedRepository,
        pullRequestNumber,
        releaseBase: normalizedBase,
        candidateBase,
        releaseHead: candidateHead,
        releaseHeadTree: candidateTree,
        releaseVersion: candidateContext.releaseVersion,
        runId,
        runAttempt,
        artifactName: expectedArtifactName,
      });
      return {
        schema_version: RESOLUTION_SCHEMA_VERSION,
        command: 'resolve',
        complete: true,
        gate_mode: 'reuse',
        reason: 'exact_dev_release_candidate_proof',
        repository: normalizedRepository,
        release_pull_request_number: pullRequestNumber,
        release_base: normalizedBase,
        promotion_head: normalizedPromotionHead,
        candidate_base: candidateBase,
        candidate_head: candidateHead,
        candidate_tree: candidateTree,
        release_version: candidateContext.releaseVersion,
        workflow_run_id: runId,
        workflow_run_attempt: runAttempt,
        artifact_id: proofArtifact.id,
        artifact_name: expectedArtifactName,
      };
    } catch (error) {
      rejectedRuns.push({
        run_id: runId,
        reason: error instanceof ReleaseGateProofError ? error.code : 'proof_validation_failed',
      });
    }
  }

  fail(
    'no_exact_successful_pr_gate_proof',
    'No exact successful dev Release PR proof was reusable.',
    {
      candidate_run_count: candidateRuns.length,
      rejected_runs: rejectedRuns,
    },
  );
}

async function resolveExactProof(
  { root, repository, releaseBase, releaseHead, token },
  dependencies = {},
) {
  const normalizedRepository = requireRepository(repository);
  const normalizedBase = requireSha(releaseBase, 'release base');
  const normalizedHead = requireSha(releaseHead, 'release head');
  const git = dependencies.gitText || gitText;
  const api =
    dependencies.apiJson ||
    ((apiPath) => apiJson(apiPath, { token, fetchImpl: dependencies.fetchImpl }));
  const parentParts = git(root, ['rev-list', '--parents', '-n', '1', normalizedHead])
    .split(/\s+/u)
    .filter(Boolean);
  if (parentParts.length !== 3 || parentParts[0] !== normalizedHead) {
    fail('release_head_not_main_merge', 'The release head is not a two-parent main merge commit.', {
      release_head: normalizedHead,
      parent_count: Math.max(parentParts.length - 1, 0),
    });
  }
  const [, firstParent, promotionHead] = parentParts;
  if (firstParent !== normalizedBase) {
    fail('release_base_parent_mismatch', 'The release base is not the main merge first parent.', {
      release_base: normalizedBase,
      first_parent: firstParent,
    });
  }
  const releaseTree = requireSha(
    git(root, ['rev-parse', `${normalizedHead}^{tree}`]),
    'release tree',
  );
  const promotionTree = requireSha(
    git(root, ['rev-parse', `${promotionHead}^{tree}`]),
    'promotion tree',
  );
  if (releaseTree !== promotionTree) {
    fail(
      'main_merge_tree_changed_after_candidate_gate',
      'The main merge changed the qualified promotion tree.',
      {
        release_tree: releaseTree,
        promotion_tree: promotionTree,
      },
    );
  }
  const mainPullRequests = await api(
    `/repos/${normalizedRepository}/commits/${normalizedHead}/pulls?per_page=100`,
  );
  const mainPullRequest = selectMergedPullRequest(mainPullRequests, {
    mergeCommit: normalizedHead,
    baseRef: 'main',
    baseSha: normalizedBase,
    candidateHead: promotionHead,
  });
  const promotion = await resolvePromotionProof(
    {
      root,
      repository: normalizedRepository,
      releaseBase: normalizedBase,
      promotionHead,
      token,
    },
    dependencies,
  );
  return {
    ...promotion,
    release_head: normalizedHead,
    promotion_pull_request_number: requirePositiveInteger(
      mainPullRequest.number,
      'promotion pull request number',
    ),
  };
}

async function resolveWithFallback(options, dependencies = {}) {
  try {
    return await resolveExactProof(options, dependencies);
  } catch (error) {
    const normalizedError =
      error instanceof ReleaseGateProofError
        ? error
        : new ReleaseGateProofError('unexpected_resolution_error', errorMessage(error));
    return {
      schema_version: RESOLUTION_SCHEMA_VERSION,
      command: 'resolve',
      complete: true,
      gate_mode: 'invalid',
      reason: normalizedError.code,
      details: normalizedError.details,
    };
  }
}

function appendGithubOutput(outputPath, values) {
  if (!outputPath) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value ?? '')}`);
  fs.appendFileSync(outputPath, `${lines.join('\n')}\n`);
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  if (!command || command === '--help' || command === '-h') return { command: 'help', options: {} };
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!argument.startsWith('--')) {
      fail('invalid_argument', `Unexpected argument: ${argument}`);
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith('--')) {
      fail('invalid_argument', `${argument} requires a value.`);
    }
    options[argument.slice(2)] = value;
    index += 1;
  }
  return { command, options };
}

function helpText() {
  return `Create or verify an exact dev Release PR proof.\n\nUsage:\n  node scripts/release/release-gate-proof.cjs candidate-context --event-path <event.json> [--github-output <path>]\n  node scripts/release/release-gate-proof.cjs create --repository owner/repo --pr-number 123 --release-base <main-sha> --candidate-base <dev-sha> --release-head <candidate-sha> --release-version <x.y.z> --run-id <id> --run-attempt <n> --output <path> [--github-output <path>]\n  node scripts/release/release-gate-proof.cjs verify-promotion --repository owner/repo --release-base <main-sha> --promotion-head <dev-merge-sha> [--github-output <path>]\n  node scripts/release/release-gate-proof.cjs resolve --repository owner/repo --release-base <main-sha> --release-head <main-merge-sha> [--github-output <path>]\n\nResolve behavior:\n  A normal promotion or main release reuses only the exact successful dev Release PR proof. Missing, expired, ambiguous, or mismatched proof fails closed without rerunning the aggregate gate. Explicit tag/workflow-dispatch recovery remains the only full-gate fallback.`;
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArguments(argv);
  if (command === 'help') {
    process.stdout.write(`${helpText()}\n`);
    return;
  }
  if (command === 'candidate-context') {
    const root = repositoryRoot();
    const result = readCandidateContext({ root, eventPath: options['event-path'] });
    appendGithubOutput(options['github-output'], {
      release_base: result.releaseBase,
      candidate_base: result.candidateBase,
      release_head: result.candidateHead,
      release_version: result.releaseVersion,
      proof_pr_number: result.pullRequestNumber,
    });
    process.stdout.write(
      `${JSON.stringify({
        schema_version: RESOLUTION_SCHEMA_VERSION,
        command: 'candidate-context',
        complete: true,
        release_base: result.releaseBase,
        candidate_base: result.candidateBase,
        release_head: result.candidateHead,
        release_version: result.releaseVersion,
        pull_request_number: result.pullRequestNumber,
      })}\n`,
    );
    return;
  }
  if (command === 'create') {
    const root = repositoryRoot();
    const result = writeProof({
      root,
      repository: options.repository,
      pullRequestNumber: options['pr-number'],
      releaseBase: options['release-base'],
      candidateBase: options['candidate-base'],
      releaseHead: options['release-head'],
      releaseVersion: options['release-version'],
      runId: options['run-id'],
      runAttempt: options['run-attempt'],
      outputPath: options.output,
    });
    appendGithubOutput(options['github-output'], {
      artifact_name: result.proof.artifact_name,
      proof_path: result.output_path,
    });
    process.stdout.write(
      `${JSON.stringify({
        schema_version: RESOLUTION_SCHEMA_VERSION,
        command: 'create',
        complete: true,
        artifact_name: result.proof.artifact_name,
        proof_path: result.output_path,
      })}\n`,
    );
    return;
  }
  if (command === 'verify-promotion') {
    const root = repositoryRoot();
    const result = await resolvePromotionProof({
      root,
      repository: options.repository,
      releaseBase: options['release-base'],
      promotionHead: options['promotion-head'],
      token: process.env.GITHUB_TOKEN,
    });
    appendGithubOutput(options['github-output'], {
      gate_mode: result.gate_mode,
      gate_reason: result.reason,
      proof_run_id: result.workflow_run_id,
      proof_pr_number: result.release_pull_request_number,
      proof_artifact_id: result.artifact_id,
      proof_artifact_name: result.artifact_name,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (command === 'resolve') {
    const root = repositoryRoot();
    const result = await resolveWithFallback({
      root,
      repository: options.repository,
      releaseBase: options['release-base'],
      releaseHead: options['release-head'],
      token: process.env.GITHUB_TOKEN,
    });
    appendGithubOutput(options['github-output'], {
      gate_mode: result.gate_mode,
      gate_reason: result.reason,
      proof_run_id: result.workflow_run_id || '',
      proof_pr_number: result.release_pull_request_number || '',
      proof_artifact_id: result.artifact_id || '',
      proof_artifact_name: result.artifact_name || '',
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  fail('invalid_command', `Unknown command: ${command}`);
}

if (require.main === module) {
  main().catch((error) => {
    const normalized =
      error instanceof ReleaseGateProofError
        ? error
        : new ReleaseGateProofError('unexpected_error', errorMessage(error));
    process.stderr.write(
      `${JSON.stringify({
        schema_version: RESOLUTION_SCHEMA_VERSION,
        complete: false,
        error: { code: normalized.code, message: normalized.message, details: normalized.details },
      })}\n`,
    );
    process.exitCode = 1;
  });
}

module.exports = {
  PROOF_SCOPE,
  PROOF_FILE_NAME,
  PROOF_SCHEMA_VERSION,
  READINESS_WORKFLOW_PATH,
  RELEASE_GATE_JOB_NAME,
  RELEASE_MARKER_PREFIX,
  ReleaseGateProofError,
  artifactName,
  assertProofMatches,
  buildProof,
  candidateContextFromPullRequest,
  parseReleaseMarker,
  resolveExactProof,
  resolvePromotionProof,
  resolveWithFallback,
  selectMergedPullRequest,
  writeProof,
};
