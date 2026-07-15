import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'linancn/tiangong-lca-next';
const ISSUE_NUMBER = 601;
const ISSUE_API_URL = `https://api.github.com/repos/${REPOSITORY}/issues/${ISSUE_NUMBER}`;
const ROLE_CONFIG_NAMES = new Map([
  ['product-context', 'productContextReviewer'],
  ['native-german', 'nativeGermanReviewer'],
  ['domain', 'lcaTidasDomainReviewer'],
]);
const MAINTAINER_PERMISSIONS = new Set(['admin', 'maintain']);
const VERIFIER_SOURCE_DIGEST = createHash('sha256')
  .update(fs.readFileSync(fileURLToPath(import.meta.url)))
  .digest('hex');

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, nested]) => [key, sortJsonValue(nested)]),
    );
  }
  return value;
}

export function hashAttestationScope(value) {
  return createHash('sha256')
    .update(JSON.stringify(sortJsonValue(value)))
    .digest('hex');
}

export function normalizeGithubLogin(value) {
  return typeof value === 'string' ? value.normalize('NFC').trim().toLowerCase() : '';
}

export function normalizeGithubUserId(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.normalize('NFC').trim();
  return /^[1-9]\d*$/u.test(normalized) ? normalized : '';
}

function isGithubLogin(value) {
  return /^(?!.*--)[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/u.test(value) && value.length <= 39;
}

export function normalizeProducerActor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const type = value.type;
  const displayName =
    typeof value.displayName === 'string' ? value.displayName.normalize('NFC').trim() : '';
  if (displayName === '' || !['github-human', 'ai-system'].includes(type)) return null;
  if (type === 'github-human') {
    const id = normalizeGithubUserId(value.id);
    const githubLogin = normalizeGithubLogin(value.githubLogin);
    return id === '' || !isGithubLogin(githubLogin) ? null : { type, id, githubLogin, displayName };
  }
  const id = typeof value.id === 'string' ? value.id.normalize('NFC').trim().toLowerCase() : '';
  if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/u.test(id)) return null;
  return { type, id, displayName };
}

export function producerActorKey(value) {
  const actor = normalizeProducerActor(value);
  return actor ? `${actor.type}:${actor.id}` : '';
}

function attestationPolicyDigest(reviewLog) {
  return hashAttestationScope({
    schemaVersion: 'tiangong.i18n-de-attestation-policy.v3',
    verifierSourceDigest: VERIFIER_SOURCE_DIGEST,
    repository: REPOSITORY,
    issue: ISSUE_NUMBER,
    assignmentPermissions: [...MAINTAINER_PERMISSIONS].sort(),
    selfAssignmentAllowed: false,
    accountType: 'User',
    commentBodyRule: 'exact-whole-body-structured-approval',
    declaredPolicy: reviewLog.externalAttestationPolicy ?? null,
  });
}

function issueCommentApiUrl(evidenceUrl) {
  if (typeof evidenceUrl !== 'string') return null;
  const match = evidenceUrl.match(
    /^https:\/\/github\.com\/linancn\/tiangong-lca-next\/issues\/601#issuecomment-(\d+)$/u,
  );
  return match ? `https://api.github.com/repos/${REPOSITORY}/issues/comments/${match[1]}` : null;
}

function githubHeaders() {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tiangong-lca-next-i18n-review-audit',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubJson(url, cache) {
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        const response = await fetch(url, { headers: githubHeaders() });
        if (!response.ok) {
          throw new Error(`GitHub API ${response.status} for ${url}`);
        }
        return response.json();
      })(),
    );
  }
  return cache.get(url);
}

async function verifyIssueComment({ evidenceUrl, expectedAuthor, expectedUserId, marker, cache }) {
  const apiUrl = issueCommentApiUrl(evidenceUrl);
  if (!apiUrl) {
    throw new Error(`Evidence URL must be an Issue #${ISSUE_NUMBER} comment in ${REPOSITORY}.`);
  }
  const comment = await githubJson(apiUrl, cache);
  if (comment.issue_url !== ISSUE_API_URL) {
    throw new Error(`Attestation comment must belong to ${ISSUE_API_URL}.`);
  }
  if (comment.user?.type !== 'User') {
    throw new Error('Attestation author must be a GitHub User account, not a bot or app.');
  }
  if (normalizeGithubLogin(comment.user?.login) !== normalizeGithubLogin(expectedAuthor)) {
    throw new Error(
      `Attestation author ${comment.user?.login ?? '<missing>'} does not match ${expectedAuthor}.`,
    );
  }
  if (normalizeGithubUserId(String(comment.user?.id ?? '')) !== expectedUserId) {
    throw new Error(
      `Attestation author id ${comment.user?.id ?? '<missing>'} does not match ${expectedUserId}.`,
    );
  }
  if (
    typeof comment.body !== 'string' ||
    comment.body.normalize('NFC').trim() !== marker.normalize('NFC')
  ) {
    throw new Error(`Attestation comment must contain only the exact marker: ${marker}`);
  }
}

async function verifyMaintainerPermission(login, cache) {
  const url = `https://api.github.com/repos/${REPOSITORY}/collaborators/${encodeURIComponent(
    login,
  )}/permission`;
  const permission = await githubJson(url, cache);
  if (!MAINTAINER_PERMISSIONS.has(permission.permission)) {
    throw new Error(
      `Role assigner ${login} has ${permission.permission ?? '<missing>'} repository permission.`,
    );
  }
}

export async function verifyGithubHumanReviewEvidence({
  reviewLog,
  scope,
  requiredRoles,
  recordsByRole,
  contextDigest,
  producerActors = [],
}) {
  const findings = [];
  const requirements = [];
  const cache = new Map();
  const assignmentDigests = new Map();
  const reviewers = new Map();
  const policyDigest = attestationPolicyDigest(reviewLog);

  if (!Array.isArray(producerActors)) {
    findings.push({
      kind: 'invalid-producer-actor-register',
      reason: 'producerActors must be an array.',
    });
  } else {
    const seenProducerActors = new Set();
    for (const rawActor of producerActors) {
      const actor = normalizeProducerActor(rawActor);
      const actorKey = producerActorKey(actor);
      if (!actor) {
        findings.push({ kind: 'invalid-producer-actor', actor: rawActor ?? null });
        continue;
      }
      if (seenProducerActors.has(actorKey)) continue;
      seenProducerActors.add(actorKey);
      if (actor.type !== 'github-human') continue;
      try {
        const user = await githubJson(
          `https://api.github.com/users/${encodeURIComponent(actor.githubLogin)}`,
          cache,
        );
        if (
          user.type !== 'User' ||
          normalizeGithubLogin(user.login) !== actor.githubLogin ||
          normalizeGithubUserId(String(user.id ?? '')) !== actor.id
        ) {
          throw new Error(
            `GitHub producer ${actor.githubLogin} does not resolve to immutable user id ${actor.id}.`,
          );
        }
      } catch (error) {
        findings.push({
          kind: 'unverified-producer-actor',
          actor,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  for (const role of requiredRoles) {
    const configName = ROLE_CONFIG_NAMES.get(role);
    const config = reviewLog.roles?.[configName];
    const reviewer = normalizeGithubLogin(config?.githubLogin);
    const reviewerUserId = normalizeGithubUserId(config?.githubUserId);
    const identity = normalizeGithubLogin(config?.identity);
    const assignedBy = normalizeGithubLogin(config?.assignedBy);
    const assignedByUserId = normalizeGithubUserId(config?.assignedByGithubUserId);
    if (
      config?.status !== 'assigned' ||
      config?.identityType !== 'github-human' ||
      reviewer === '' ||
      reviewerUserId === '' ||
      identity !== reviewer ||
      assignedBy === '' ||
      assignedByUserId === '' ||
      assignedBy === reviewer ||
      assignedByUserId === reviewerUserId ||
      typeof config?.qualificationEvidence !== 'string' ||
      config.qualificationEvidence.trim() === ''
    ) {
      findings.push({
        kind: 'invalid-role-assignment',
        role,
        configName,
        reason:
          'A role requires one GitHub human login, qualification evidence, a maintainer assigner, and an external assignment attestation.',
      });
      continue;
    }

    const assignmentDigest = hashAttestationScope({
      schemaVersion: 'tiangong.i18n-de-role-assignment.v3',
      attestationPolicyDigest: policyDigest,
      repository: REPOSITORY,
      issue: ISSUE_NUMBER,
      role,
      reviewer,
      reviewerGithubUserId: reviewerUserId,
      qualificationEvidence: config.qualificationEvidence,
      assignedBy,
      assignedByGithubUserId: assignedByUserId,
    });
    const marker = `TIANGONG-I18N-DE-ASSIGNMENT v3 decision=APPROVED role=${role} digest=${assignmentDigest}`;
    requirements.push({
      kind: 'role-assignment',
      role,
      reviewer,
      reviewerGithubUserId: reviewerUserId,
      assignedBy,
      assignedByGithubUserId: assignedByUserId,
      attestationPolicyDigest: policyDigest,
      assignmentDigest,
      marker,
    });
    assignmentDigests.set(role, assignmentDigest);
    reviewers.set(role, { login: reviewer, userId: reviewerUserId });
    try {
      if (
        typeof config.assignmentAttestationUrl !== 'string' ||
        config.assignmentAttestationUrl.trim() === ''
      ) {
        throw new Error('assignmentAttestationUrl is required after publishing the marker.');
      }
      await verifyIssueComment({
        evidenceUrl: config.assignmentAttestationUrl,
        expectedAuthor: assignedBy,
        expectedUserId: assignedByUserId,
        marker,
        cache,
      });
      await verifyMaintainerPermission(assignedBy, cache);
    } catch (error) {
      findings.push({
        kind: 'unverified-role-assignment',
        role,
        reviewer,
        reason: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
  }

  const attestations = reviewLog.externalAttestations ?? [];
  if (!Array.isArray(attestations)) {
    findings.push({
      kind: 'invalid-attestation-register',
      reason: 'externalAttestations must be an array.',
    });
    return { findings, requirements };
  }

  for (const role of requiredRoles) {
    const reviewer = reviewers.get(role);
    const assignmentDigest = assignmentDigests.get(role);
    if (!reviewer || !assignmentDigest) continue;
    const records = recordsByRole.get(role) ?? [];
    const scopeDigest = hashAttestationScope({
      schemaVersion: 'tiangong.i18n-de-review-attestation.v3',
      attestationPolicyDigest: policyDigest,
      repository: REPOSITORY,
      issue: ISSUE_NUMBER,
      scope,
      role,
      reviewer,
      assignmentDigest,
      contextDigest,
      records,
    });
    const marker = `TIANGONG-I18N-DE-REVIEW v3 decision=APPROVED scope=${scope} role=${role} digest=${scopeDigest}`;
    requirements.push({
      kind: 'review-scope',
      role,
      reviewer: reviewer.login,
      reviewerGithubUserId: reviewer.userId,
      scope,
      scopeDigest,
      attestationPolicyDigest: policyDigest,
      marker,
    });
    const matches = attestations.filter(
      (attestation) =>
        attestation?.scope === scope &&
        attestation?.role === role &&
        normalizeGithubLogin(attestation?.reviewer) === reviewer.login,
    );
    if (matches.length !== 1) {
      findings.push({
        kind: 'missing-or-duplicate-review-attestation',
        scope,
        role,
        reviewer: reviewer.login,
        count: matches.length,
      });
      continue;
    }
    const [attestation] = matches;
    if (attestation.scopeDigest !== scopeDigest) {
      findings.push({
        kind: 'stale-review-attestation',
        scope,
        role,
        reviewer: reviewer.login,
        expectedScopeDigest: scopeDigest,
        receivedScopeDigest: attestation.scopeDigest ?? null,
      });
      continue;
    }
    try {
      await verifyIssueComment({
        evidenceUrl: attestation.evidenceUrl,
        expectedAuthor: reviewer.login,
        expectedUserId: reviewer.userId,
        marker,
        cache,
      });
    } catch (error) {
      findings.push({
        kind: 'unverified-review-attestation',
        scope,
        role,
        reviewer: reviewer.login,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { findings, requirements };
}
