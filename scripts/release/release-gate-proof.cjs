#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const PROOF_SCHEMA_VERSION = 'tiangong.next.release-gate-proof.v2';
const RESOLUTION_SCHEMA_VERSION = 'tiangong.next.release-gate-proof-resolution.v1';
const READINESS_WORKFLOW_FILE = 'release-readiness.yml';
const READINESS_WORKFLOW_PATH = `.github/workflows/${READINESS_WORKFLOW_FILE}`;
const RELEASE_GATE_JOB_NAME = 'Main Candidate / Aggregate Exact Release Proof';
const PROOF_SCOPE = Object.freeze([
  'static-release-gate',
  'content-addressed-semantic-qualification',
  'public-browser-semantics',
]);
const PROOF_FILE_NAME = 'release-gate-proof.json';
const SHA_PATTERN = /^[0-9a-f]{40}$/u;
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
  if (!SHA_PATTERN.test(sha)) {
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

function artifactName({ releaseBase, releaseHead, runId, runAttempt }) {
  return [
    'release-gate-proof',
    requireSha(releaseBase, 'release base'),
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
  releaseHead,
  releaseHeadTree,
  runId,
  runAttempt,
}) {
  const normalized = {
    repository: requireRepository(repository),
    pull_request_number: requirePositiveInteger(pullRequestNumber, 'pull request number'),
    release_base: requireSha(releaseBase, 'release base'),
    release_head: requireSha(releaseHead, 'release head'),
    release_head_tree: requireSha(releaseHeadTree, 'release head tree'),
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
  releaseHead,
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
    releaseHead: normalizedHead,
    releaseHeadTree,
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
    release_head: expected.releaseHead,
    release_head_tree: expected.releaseHeadTree,
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

function selectMergedPullRequest(pullRequests, { releaseBase, releaseHead, candidateHead }) {
  const matches = (Array.isArray(pullRequests) ? pullRequests : []).filter(
    (pullRequest) =>
      pullRequest?.merged_at &&
      pullRequest?.merge_commit_sha === releaseHead &&
      pullRequest?.base?.ref === 'main' &&
      pullRequest?.base?.sha === releaseBase &&
      pullRequest?.head?.sha === candidateHead,
  );
  if (matches.length !== 1) {
    fail(
      'merged_pull_request_not_exact',
      'The release commit did not resolve to one exact merged main PR.',
      {
        matching_pull_requests: matches.map((pullRequest) => pullRequest.number),
      },
    );
  }
  return matches[0];
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
  const download =
    dependencies.downloadProofArtifact ||
    ((artifact) =>
      downloadProofArtifact(
        { repository: normalizedRepository, artifactId: artifact.id, token },
        { fetchImpl: dependencies.fetchImpl },
      ));

  const parentLine = git(root, ['rev-list', '--parents', '-n', '1', normalizedHead]);
  const parentParts = parentLine.split(/\s+/u).filter(Boolean);
  if (parentParts.length !== 3 || parentParts[0] !== normalizedHead) {
    fail('release_head_not_merge_commit', 'The release head is not a two-parent merge commit.', {
      release_head: normalizedHead,
      parent_count: Math.max(parentParts.length - 1, 0),
    });
  }
  const [, firstParent, candidateHead] = parentParts;
  if (firstParent !== normalizedBase) {
    fail('release_base_parent_mismatch', 'The release base is not the merge commit first parent.', {
      release_base: normalizedBase,
      first_parent: firstParent,
    });
  }
  requireSha(candidateHead, 'candidate head');
  const releaseHeadTree = requireSha(
    git(root, ['rev-parse', `${normalizedHead}^{tree}`]),
    'release head tree',
  );
  const candidateTree = requireSha(
    git(root, ['rev-parse', `${candidateHead}^{tree}`]),
    'candidate tree',
  );
  if (releaseHeadTree !== candidateTree) {
    fail(
      'release_tree_changed_after_pr_gate',
      'The merged release tree differs from the PR candidate tree.',
      {
        release_tree: releaseHeadTree,
        candidate_tree: candidateTree,
      },
    );
  }

  const pullRequests = await api(
    `/repos/${normalizedRepository}/commits/${normalizedHead}/pulls?per_page=100`,
  );
  const pullRequest = selectMergedPullRequest(pullRequests, {
    releaseBase: normalizedBase,
    releaseHead: normalizedHead,
    candidateHead,
  });
  const pullRequestNumber = requirePositiveInteger(pullRequest.number, 'pull request number');
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
        releaseHead: candidateHead,
        releaseHeadTree: candidateTree,
        runId,
        runAttempt,
        artifactName: expectedArtifactName,
      });
      return {
        schema_version: RESOLUTION_SCHEMA_VERSION,
        command: 'resolve',
        complete: true,
        gate_mode: 'reuse',
        reason: 'exact_main_pr_release_gate_proof',
        repository: normalizedRepository,
        pull_request_number: pullRequestNumber,
        release_base: normalizedBase,
        release_head: normalizedHead,
        candidate_head: candidateHead,
        candidate_tree: candidateTree,
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
    'No exact successful PR Release Gate proof was reusable.',
    {
      candidate_run_count: candidateRuns.length,
      rejected_runs: rejectedRuns,
    },
  );
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
      gate_mode: 'full',
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
  return `Create or resolve an exact GitHub Release Gate proof.\n\nUsage:\n  node scripts/release/release-gate-proof.cjs create --repository owner/repo --pr-number 123 --release-base <sha> --release-head <sha> --run-id <id> --run-attempt <n> --output <path> [--github-output <path>]\n  node scripts/release/release-gate-proof.cjs resolve --repository owner/repo --release-base <sha> --release-head <sha> [--github-output <path>]\n\nResolve behavior:\n  Exact proof emits gate_mode=reuse. Missing, expired, ambiguous, or mismatched proof emits gate_mode=full so the canonical reusable full gate remains the fail-closed fallback.`;
}

async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArguments(argv);
  if (command === 'help') {
    process.stdout.write(`${helpText()}\n`);
    return;
  }
  if (command === 'create') {
    const root = repositoryRoot();
    const result = writeProof({
      root,
      repository: options.repository,
      pullRequestNumber: options['pr-number'],
      releaseBase: options['release-base'],
      releaseHead: options['release-head'],
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
      proof_pr_number: result.pull_request_number || '',
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
  ReleaseGateProofError,
  artifactName,
  assertProofMatches,
  buildProof,
  resolveExactProof,
  resolveWithFallback,
  selectMergedPullRequest,
  writeProof,
};
