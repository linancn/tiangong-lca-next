#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  GITHUB_REVIEW_ISSUE_NUMBER,
  GITHUB_REVIEW_REPOSITORY,
  resolveGithubHumanIdentity,
  verifyGithubHumanReviewEvidence,
} from './github-review-attestation.mjs';

const SCHEMA_VERSION = 'tiangong.i18n-de-review-onboarding.v1';
const REVIEW_LOG_SCHEMA_VERSION = 'tiangong.i18n-de-review-log.v4';
const DEFAULT_REVIEW_LOG = 'docs/plans/i18n-de-DE/review-log.yaml';
const ROLE_OPTIONS = {
  'product-context': {
    configName: 'productContextReviewer',
    loginOption: '--product',
    evidenceOption: '--product-evidence',
    assignmentUrlOption: '--product-assignment-url',
  },
  'native-german': {
    configName: 'nativeGermanReviewer',
    loginOption: '--native',
    evidenceOption: '--native-evidence',
    assignmentUrlOption: '--native-assignment-url',
  },
  domain: {
    configName: 'lcaTidasDomainReviewer',
    loginOption: '--domain',
    evidenceOption: '--domain-evidence',
    assignmentUrlOption: '--domain-assignment-url',
  },
};

function usage() {
  return `Usage: node scripts/i18n/german-review-onboarding.mjs [options]

Required for assignment preparation:
  --assigner <login>                    different repository maintain/admin user
  --product <login>                     product-context reviewer
  --product-evidence <text>             concrete product qualification evidence
  --native <login>                      native-German reviewer
  --native-evidence <text>              concrete native-language qualification evidence
  --domain <login>                      German-capable LCA/TIDAS reviewer
  --domain-evidence <text>              concrete domain qualification evidence

Required for stored-roster finalization:
  --assigner <login>                    the same assigning maintainer
  --product-assignment-url <url>        exact Issue #601 assignment comment URL
  --native-assignment-url <url>         exact Issue #601 assignment comment URL
  --domain-assignment-url <url>         exact Issue #601 assignment comment URL

Optional:
  --review-log <path>                   review log relative to root
  --root <path>                         repository root (default: current directory)
  --write                               update the review log; default is report-only
  --help                                show this help

The command resolves immutable GitHub user IDs and verifies the assigner's current
maintain/admin permission. It never posts comments or records review decisions.
Set GH_TOKEN or GITHUB_TOKEN when the GitHub permission endpoint requires authentication.
`;
}

function parseArgs(argv) {
  const options = {
    root: process.cwd(),
    reviewLog: DEFAULT_REVIEW_LOG,
    write: false,
    assigner: null,
    roles: Object.fromEntries(
      Object.keys(ROLE_OPTIONS).map((role) => [
        role,
        { login: null, qualificationEvidence: null, assignmentAttestationUrl: null },
      ]),
    ),
  };
  const valueOptions = new Map([
    ['--root', (value) => (options.root = value)],
    ['--review-log', (value) => (options.reviewLog = value)],
    ['--assigner', (value) => (options.assigner = value)],
  ]);
  Object.entries(ROLE_OPTIONS).forEach(([role, config]) => {
    valueOptions.set(config.loginOption, (value) => (options.roles[role].login = value));
    valueOptions.set(
      config.evidenceOption,
      (value) => (options.roles[role].qualificationEvidence = value),
    );
    valueOptions.set(
      config.assignmentUrlOption,
      (value) => (options.roles[role].assignmentAttestationUrl = value),
    );
  });

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
    if (argument === '--write') {
      options.write = true;
      continue;
    }
    const setValue = valueOptions.get(argument);
    if (!setValue) throw new Error(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value) throw new Error(`Missing value for ${argument}`);
    setValue(value);
    index += 1;
  }

  if (!options.assigner) throw new Error('--assigner is required.');
  const assignmentUrlCount = Object.values(options.roles).filter(({ assignmentAttestationUrl }) =>
    assignmentAttestationUrl?.trim(),
  ).length;
  if (assignmentUrlCount > 0 && assignmentUrlCount < Object.keys(ROLE_OPTIONS).length) {
    throw new Error(
      'Supply all three assignment comment URLs together so the reviewer roster cannot be partially attested.',
    );
  }
  const hasNewAssignmentInput = Object.values(options.roles).some(
    ({ login, qualificationEvidence }) => login || qualificationEvidence,
  );
  if (hasNewAssignmentInput && assignmentUrlCount > 0) {
    throw new Error(
      'Reviewer identities/evidence and assignment URLs belong to separate stages; prepare the roster first, then finalize the stored roster with URLs only.',
    );
  }
  options.operation = !hasNewAssignmentInput && assignmentUrlCount > 0 ? 'finalize' : 'assign';
  if (options.operation === 'assign') {
    Object.entries(ROLE_OPTIONS).forEach(([role, config]) => {
      if (!options.roles[role].login) throw new Error(`${config.loginOption} is required.`);
      if (!options.roles[role].qualificationEvidence?.trim()) {
        throw new Error(`${config.evidenceOption} is required and must be non-empty.`);
      }
    });
  }
  options.root = path.resolve(options.root);
  return options;
}

function readReviewLog(root, relativeFile) {
  const resolvedRoot = path.resolve(root);
  const absolutePath = path.resolve(resolvedRoot, relativeFile);
  const rootPrefix = `${resolvedRoot}${path.sep}`;
  if (!absolutePath.startsWith(rootPrefix)) {
    throw new Error(`Review log must remain inside the repository root: ${relativeFile}`);
  }
  if (!fs.existsSync(absolutePath)) throw new Error(`Missing review log: ${relativeFile}`);
  if (fs.lstatSync(absolutePath).isSymbolicLink()) {
    throw new Error(`Review log must not be a symbolic link: ${relativeFile}`);
  }
  const realRoot = fs.realpathSync(resolvedRoot);
  const realAbsolutePath = fs.realpathSync(absolutePath);
  const realRootPrefix = `${realRoot}${path.sep}`;
  if (!realAbsolutePath.startsWith(realRootPrefix)) {
    throw new Error(`Review log real path must remain inside the repository root: ${relativeFile}`);
  }
  const source = fs.readFileSync(realAbsolutePath, 'utf8');
  const value = JSON.parse(source);
  if (
    value?.schemaVersion !== REVIEW_LOG_SCHEMA_VERSION ||
    value?.locale !== 'de-DE' ||
    value?.issue !==
      `https://github.com/${GITHUB_REVIEW_REPOSITORY}/issues/${GITHUB_REVIEW_ISSUE_NUMBER}` ||
    !value.roles ||
    typeof value.roles !== 'object' ||
    Array.isArray(value.roles) ||
    !Array.isArray(value.externalAttestations) ||
    !Array.isArray(value.pilot?.reviews) ||
    !Array.isArray(value.translations?.reviews)
  ) {
    throw new Error(
      `Review log must match ${REVIEW_LOG_SCHEMA_VERSION}, de-DE, Issue #${GITHUB_REVIEW_ISSUE_NUMBER}, and the required object/array shape.`,
    );
  }
  return { absolutePath: realAbsolutePath, source, value };
}

function existingEvidenceCount(reviewLog) {
  return (
    (reviewLog.externalAttestations?.length ?? 0) +
    (reviewLog.pilot?.reviews?.length ?? 0) +
    (reviewLog.translations?.reviews?.length ?? 0) +
    Object.values(reviewLog.roles ?? {}).filter(
      (role) => typeof role?.assignmentAttestationUrl === 'string' && role.assignmentAttestationUrl,
    ).length
  );
}

function validateOnboardingOperation(options) {
  if (!['assign', 'finalize'].includes(options?.operation)) {
    throw new Error('Onboarding operation must be assign or finalize.');
  }
  if (
    typeof options.assigner !== 'string' ||
    options.assigner.trim() === '' ||
    typeof options.root !== 'string' ||
    typeof options.reviewLog !== 'string' ||
    !options.roles ||
    typeof options.roles !== 'object' ||
    Array.isArray(options.roles)
  ) {
    throw new Error('Onboarding options require an assigner, root, review log, and role inputs.');
  }
  Object.entries(ROLE_OPTIONS).forEach(([role, config]) => {
    const input = options.roles[role];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error(`Missing onboarding input for ${role}.`);
    }
    const hasLogin = typeof input.login === 'string' && input.login.trim() !== '';
    const hasEvidence =
      typeof input.qualificationEvidence === 'string' && input.qualificationEvidence.trim() !== '';
    const hasUrl =
      typeof input.assignmentAttestationUrl === 'string' &&
      input.assignmentAttestationUrl.trim() !== '';
    if (options.operation === 'assign' && (!hasLogin || !hasEvidence || hasUrl)) {
      throw new Error(
        `${config.loginOption}/${config.evidenceOption} are required and ${config.assignmentUrlOption} is forbidden while preparing a pending roster.`,
      );
    }
    if (options.operation === 'finalize' && (hasLogin || hasEvidence || !hasUrl)) {
      throw new Error(
        `${config.assignmentUrlOption} is required and reviewer identity/evidence must be read only from the stored roster during finalization.`,
      );
    }
  });
}

export async function prepareOnboarding(options, { fetchImpl = globalThis.fetch } = {}) {
  validateOnboardingOperation(options);
  const {
    absolutePath,
    source: originalReviewLogSource,
    value: reviewLog,
  } = readReviewLog(options.root, options.reviewLog);
  if (options.operation === 'finalize') {
    Object.entries(ROLE_OPTIONS).forEach(([role, config]) => {
      const stored = reviewLog.roles?.[config.configName];
      if (
        !['pending-attestation', 'assigned'].includes(stored?.status) ||
        stored?.identityType !== 'github-human' ||
        typeof stored.githubLogin !== 'string' ||
        typeof stored.qualificationEvidence !== 'string' ||
        stored.qualificationEvidence.trim() === ''
      ) {
        throw new Error(
          `Cannot finalize ${role}; write and inspect the reviewer assignment before adding comment URLs.`,
        );
      }
      options.roles[role].login = stored.githubLogin;
      options.roles[role].qualificationEvidence = stored.qualificationEvidence;
    });
  }
  const cache = new Map();
  const assigner = await resolveGithubHumanIdentity(options.assigner, {
    cache,
    fetchImpl,
    requireMaintainer: true,
  });
  const roleIdentities = new Map(
    await Promise.all(
      Object.entries(options.roles).map(async ([role, roleInput]) => [
        role,
        await resolveGithubHumanIdentity(roleInput.login, { cache, fetchImpl }),
      ]),
    ),
  );
  roleIdentities.forEach((identity, role) => {
    if (
      identity.githubLogin === assigner.githubLogin ||
      identity.githubUserId === assigner.githubUserId
    ) {
      throw new Error(`Role ${role} cannot be self-assigned by ${assigner.githubLogin}.`);
    }
    const configName = ROLE_OPTIONS[role].configName;
    if (options.operation === 'finalize') {
      const stored = reviewLog.roles?.[configName];
      const storedLogin = stored?.githubLogin?.normalize('NFC').trim().toLowerCase();
      const storedIdentity = stored?.identity?.normalize('NFC').trim().toLowerCase();
      const storedAssigner = stored?.assignedBy?.normalize('NFC').trim().toLowerCase();
      if (
        storedLogin !== identity.githubLogin ||
        storedIdentity !== identity.githubLogin ||
        stored?.githubUserId !== identity.githubUserId ||
        storedAssigner !== assigner.githubLogin ||
        stored?.assignedByGithubUserId !== assigner.githubUserId
      ) {
        throw new Error(
          `Stored immutable identity binding for ${role} no longer matches GitHub; prepare and attest a new roster instead of rewriting it during finalization.`,
        );
      }
    }
  });

  const nextReviewLog = structuredClone(reviewLog);
  nextReviewLog.roles ??= {};
  let assignmentChanged = false;
  Object.entries(ROLE_OPTIONS).forEach(([role, config]) => {
    const identity = roleIdentities.get(role);
    const input = options.roles[role];
    const previous = nextReviewLog.roles?.[config.configName] ?? {};
    const sameAssignment =
      previous.githubLogin === identity.githubLogin &&
      previous.githubUserId === identity.githubUserId &&
      previous.assignedBy === assigner.githubLogin &&
      previous.assignedByGithubUserId === assigner.githubUserId &&
      previous.qualificationEvidence === input.qualificationEvidence.trim();
    const assignmentAttestationUrl =
      input.assignmentAttestationUrl?.trim() ||
      (sameAssignment ? previous.assignmentAttestationUrl : null) ||
      null;
    if (!sameAssignment) assignmentChanged = true;
    nextReviewLog.roles[config.configName] = {
      ...previous,
      status: assignmentAttestationUrl ? 'assigned' : 'pending-attestation',
      identity: identity.githubLogin,
      identityType: 'github-human',
      githubLogin: identity.githubLogin,
      githubUserId: identity.githubUserId,
      qualificationEvidence: input.qualificationEvidence.trim(),
      assignedBy: assigner.githubLogin,
      assignedByGithubUserId: assigner.githubUserId,
      assignmentAttestationUrl,
    };
  });
  if (assignmentChanged && existingEvidenceCount(reviewLog) > 0) {
    throw new Error(
      'Reviewer assignments changed after review evidence was recorded. Remove or revalidate stale evidence explicitly before onboarding different identities.',
    );
  }

  const verificationReviewLog = structuredClone(nextReviewLog);
  Object.values(ROLE_OPTIONS).forEach(({ configName }) => {
    verificationReviewLog.roles[configName].status = 'assigned';
  });
  const externalEvidence = await verifyGithubHumanReviewEvidence({
    reviewLog: verificationReviewLog,
    scope: 'pilot',
    requiredRoles: Object.keys(ROLE_OPTIONS),
    recordsByRole: new Map(Object.keys(ROLE_OPTIONS).map((role) => [role, []])),
    contextDigest: { kind: 'assignment-marker-preparation-only' },
    producerActors: [],
    fetchImpl,
  });
  const assignmentRequirements = externalEvidence.requirements.filter(
    ({ kind }) => kind === 'role-assignment',
  );
  const assignmentFindings = externalEvidence.findings.filter(
    ({ kind }) => kind === 'invalid-role-assignment' || kind === 'unverified-role-assignment',
  );
  if (assignmentRequirements.length !== Object.keys(ROLE_OPTIONS).length) {
    throw new Error('Could not generate one role-assignment marker for every required role.');
  }
  const effectiveAssignmentUrlCount = Object.values(ROLE_OPTIONS).filter(
    ({ configName }) => nextReviewLog.roles[configName].assignmentAttestationUrl,
  ).length;
  if (
    effectiveAssignmentUrlCount > 0 &&
    effectiveAssignmentUrlCount < Object.keys(ROLE_OPTIONS).length
  ) {
    throw new Error('Stored reviewer assignments cannot contain only some attestation URLs.');
  }
  if (effectiveAssignmentUrlCount > 0 && assignmentFindings.length > 0) {
    throw new Error(
      `One or more assignment comments failed verification: ${JSON.stringify(assignmentFindings)}`,
    );
  }
  if (effectiveAssignmentUrlCount === Object.keys(ROLE_OPTIONS).length) {
    Object.values(ROLE_OPTIONS).forEach(({ configName }) => {
      nextReviewLog.roles[configName].status = 'assigned';
    });
  }

  if (options.write) {
    const reviewLogText = `${JSON.stringify(nextReviewLog, null, 2)}\n`;
    if (JSON.stringify(JSON.parse(reviewLogText)) !== JSON.stringify(nextReviewLog)) {
      throw new Error('Refusing to write a review log that does not round-trip as JSON.');
    }
    const lockPath = `${absolutePath}.onboarding.lock`;
    const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
    let lockDescriptor = null;
    try {
      try {
        lockDescriptor = fs.openSync(lockPath, 'wx', 0o600);
      } catch (error) {
        if (error?.code === 'EEXIST') {
          throw new Error(
            `Another onboarding write holds ${path.basename(lockPath)}; retry after it finishes or remove a confirmed stale lock.`,
          );
        }
        throw error;
      }
      fs.writeFileSync(
        lockDescriptor,
        `${JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() })}\n`,
      );
      fs.fsyncSync(lockDescriptor);
      if (fs.readFileSync(absolutePath, 'utf8') !== originalReviewLogSource) {
        throw new Error('Review log changed while GitHub identities were being verified; retry.');
      }
      const temporaryDescriptor = fs.openSync(temporaryPath, 'wx', 0o600);
      try {
        fs.writeFileSync(temporaryDescriptor, reviewLogText);
        fs.fsyncSync(temporaryDescriptor);
      } finally {
        fs.closeSync(temporaryDescriptor);
      }
      if (fs.readFileSync(absolutePath, 'utf8') !== originalReviewLogSource) {
        throw new Error('Review log changed before the atomic replacement; retry.');
      }
      fs.renameSync(temporaryPath, absolutePath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      if (lockDescriptor !== null) {
        fs.closeSync(lockDescriptor);
        if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
      }
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    repository: GITHUB_REVIEW_REPOSITORY,
    issue: GITHUB_REVIEW_ISSUE_NUMBER,
    operation: options.operation,
    wroteReviewLog: options.write,
    reviewLog: path.relative(options.root, absolutePath).split(path.sep).join('/'),
    assigner,
    roles: Object.fromEntries(
      Object.keys(ROLE_OPTIONS).map((role) => [
        role,
        {
          ...roleIdentities.get(role),
          qualificationEvidence: options.roles[role].qualificationEvidence.trim(),
        },
      ]),
    ),
    assignmentRequirements: assignmentRequirements.map((requirement) => ({
      ...requirement,
      expectedCommentAuthor: assigner.githubLogin,
      command: [
        'gh',
        'issue',
        'comment',
        String(GITHUB_REVIEW_ISSUE_NUMBER),
        '--repo',
        GITHUB_REVIEW_REPOSITORY,
        '--body',
        requirement.marker,
      ],
    })),
    assignmentFindings,
    nextSteps: [
      'Run with --write to store the resolved immutable identities if this was report-only.',
      'The different maintain/admin assigner must personally post each exact assignment marker on Issue #601.',
      'Finalize the stored roster with --assigner, all three --*-assignment-url options, and --write; reviewer logins and qualification text are read from the stored assignment.',
      'Regenerate the candidate ledger and pilot review pack before recording any review decisions.',
    ],
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = await prepareOnboarding(options);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(
      `German review onboarding failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
