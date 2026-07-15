import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';

const REPOSITORY_ROOT = process.cwd();
const IDENTITY_HELPER_URL = pathToFileURL(
  path.join(REPOSITORY_ROOT, 'scripts/i18n/github-review-attestation.mjs'),
).href;
const ONBOARDING_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/german-review-onboarding.mjs');
const PILOT_AUDIT_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/audit-german-pilot.mjs');
const CANDIDATE_AUDIT_URL = pathToFileURL(
  path.join(REPOSITORY_ROOT, 'scripts/i18n/audit-german-candidate.mjs'),
).href;
const PILOT_AUDIT_URL = pathToFileURL(PILOT_AUDIT_SCRIPT).href;

const resolveIdentityWithFixture = (fixture: {
  login: string;
  permission?: string;
  permissionUser?: { id: number | string; login: string; type: string };
  requireMaintainer?: boolean;
  user: { id: number | string; login: string; type: string };
}) => {
  const source = `
    import { resolveGithubHumanIdentity } from ${JSON.stringify(IDENTITY_HELPER_URL)};
    const fixture = ${JSON.stringify(fixture)};
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      const value = url.endsWith('/permission')
        ? { permission: fixture.permission, user: fixture.permissionUser ?? fixture.user }
        : fixture.user;
      return { ok: true, status: 200, json: async () => value };
    };
    try {
      const identity = await resolveGithubHumanIdentity(fixture.login, {
        fetchImpl,
        requireMaintainer: fixture.requireMaintainer,
      });
      process.stdout.write(JSON.stringify({ identity, calls }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: error.message, calls }));
    }
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
      encoding: 'utf8',
    }),
  );
};

describe('German human-review workflow', () => {
  it('resolves an immutable GitHub human identity and maintainer permission', () => {
    const result = resolveIdentityWithFixture({
      login: 'Assigning-Maintainer',
      permission: 'maintain',
      requireMaintainer: true,
      user: { id: 12345, login: 'Assigning-Maintainer', type: 'User' },
    });

    expect(result.identity).toEqual({
      accountType: 'User',
      githubLogin: 'assigning-maintainer',
      githubUserId: '12345',
      permission: 'maintain',
    });
    expect(result.calls).toHaveLength(2);
  });

  it.each([
    [
      'bot account',
      {
        login: 'review-bot',
        user: { id: 23456, login: 'review-bot', type: 'Bot' },
      },
      'must resolve to one immutable numeric User identity',
    ],
    [
      'non-maintainer assigner',
      {
        login: 'read-only-user',
        permission: 'read',
        requireMaintainer: true,
        user: { id: 34567, login: 'read-only-user', type: 'User' },
      },
      'has read repository permission',
    ],
    [
      'login-to-id mismatch',
      {
        login: 'expected-user',
        user: { id: 45678, login: 'different-user', type: 'User' },
      },
      'must resolve to one immutable numeric User identity',
    ],
    [
      'permission-response identity mismatch',
      {
        login: 'maintainer',
        permission: 'maintain',
        permissionUser: { id: 99999, login: 'maintainer', type: 'User' },
        requireMaintainer: true,
        user: { id: 56789, login: 'maintainer', type: 'User' },
      },
      'does not match immutable user id 56789',
    ],
  ])('rejects a %s', (_label, fixture, expectedError) => {
    const result = resolveIdentityWithFixture(fixture);

    expect(result.error).toContain(expectedError);
  });

  it('documents a report-only onboarding CLI and rejects incomplete input before network use', () => {
    const help = execFileSync(process.execPath, [ONBOARDING_SCRIPT, '--help'], {
      encoding: 'utf8',
    });
    const incomplete = spawnSync(process.execPath, [ONBOARDING_SCRIPT, '--assigner', 'owner'], {
      encoding: 'utf8',
    });
    const mixedStages = spawnSync(
      process.execPath,
      [
        ONBOARDING_SCRIPT,
        '--assigner',
        'owner',
        '--product',
        'product-reviewer',
        '--product-evidence',
        'product evidence',
        '--native',
        'native-reviewer',
        '--native-evidence',
        'native evidence',
        '--domain',
        'domain-reviewer',
        '--domain-evidence',
        'domain evidence',
        '--product-assignment-url',
        'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-501',
        '--native-assignment-url',
        'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-502',
        '--domain-assignment-url',
        'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-503',
      ],
      { encoding: 'utf8' },
    );

    expect(help).toContain('It never posts comments or records review decisions.');
    expect(help).toContain('--write');
    expect(incomplete.status).toBe(2);
    expect(incomplete.stderr).toContain('--product is required');
    expect(mixedStages.status).toBe(2);
    expect(mixedStages.stderr).toContain('belong to separate stages');
  });

  it('writes JSON-safe pending assignments, finalizes verified comments, and rejects bad evidence atomically', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-review-'));
    const relativeReviewLog = 'docs/plans/i18n-de-DE/review-log.yaml';
    const reviewLogPath = path.join(root, relativeReviewLog);
    fs.mkdirSync(path.dirname(reviewLogPath), { recursive: true });
    fs.copyFileSync(path.join(REPOSITORY_ROOT, relativeReviewLog), reviewLogPath);
    const source = `
      import fs from 'node:fs';
      import { prepareOnboarding } from ${JSON.stringify(pathToFileURL(ONBOARDING_SCRIPT).href)};
      const root = ${JSON.stringify(root)};
      const reviewLog = ${JSON.stringify(relativeReviewLog)};
      const users = {
        'assigning-maintainer': { id: 1001, login: 'assigning-maintainer', type: 'User' },
        'product-reviewer': { id: 2001, login: 'product-reviewer', type: 'User' },
        'native-reviewer': { id: 2002, login: 'native-reviewer', type: 'User' },
        'domain-reviewer': { id: 2003, login: 'domain-reviewer', type: 'User' },
      };
      const commentRoles = { 501: 'product-context', 502: 'native-german', 503: 'domain' };
      const calls = [];
      let prepared;
      let commentFailure = null;
      const fetchImpl = async (url, options = {}) => {
        calls.push({ method: options.method ?? 'GET', url });
        let value;
        if (url.includes('/issues/comments/')) {
          const id = Number(url.split('/').at(-1));
          const requirement = prepared.assignmentRequirements.find(
            ({ role }) => role === commentRoles[id],
          );
          value = {
            issue_url:
              commentFailure === 'issue' && id === 502
                ? 'https://api.github.com/repos/linancn/tiangong-lca-next/issues/602'
                : 'https://api.github.com/repos/linancn/tiangong-lca-next/issues/601',
            user:
              commentFailure === 'author-id' && id === 502
                ? { ...users['assigning-maintainer'], id: 9999 }
                : users['assigning-maintainer'],
            body:
              commentFailure === 'marker' && id === 502
                ? requirement.marker + '-corrupt'
                : requirement.marker,
          };
        } else if (url.endsWith('/permission')) {
          value = { permission: 'maintain', user: users['assigning-maintainer'] };
        } else {
          const login = decodeURIComponent(url.split('/').at(-1));
          value = users[login];
        }
        return { ok: true, status: 200, json: async () => value };
      };
      const roleInputs = {
        'product-context': {
          login: 'product-reviewer',
          qualificationEvidence: 'Owns the relevant TianGong product workflows.',
          assignmentAttestationUrl: null,
        },
        'native-german': {
          login: 'native-reviewer',
          qualificationEvidence: 'Native German localization reviewer.',
          assignmentAttestationUrl: null,
        },
        domain: {
          login: 'domain-reviewer',
          qualificationEvidence: 'German-capable LCA and TIDAS domain reviewer.',
          assignmentAttestationUrl: null,
        },
      };
      const originalSource = fs.readFileSync(root + '/' + reviewLog, 'utf8');
      const mixedCoreRoles = structuredClone(roleInputs);
      Object.entries(mixedCoreRoles).forEach(([role, input], index) => {
        input.assignmentAttestationUrl =
          'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-' +
          String(401 + index);
      });
      let mixedCoreError = null;
      try {
        await prepareOnboarding(
          {
            assigner: 'assigning-maintainer',
            operation: 'assign',
            reviewLog,
            roles: mixedCoreRoles,
            root,
            write: true,
          },
          { fetchImpl },
        );
      } catch (error) {
        mixedCoreError = error.message;
      }
      const unchangedAfterMixedCoreInput =
        fs.readFileSync(root + '/' + reviewLog, 'utf8') === originalSource;
      const selfAssignedRoles = structuredClone(roleInputs);
      selfAssignedRoles['product-context'].login = 'assigning-maintainer';
      let selfAssignmentError = null;
      try {
        await prepareOnboarding(
          {
            assigner: 'assigning-maintainer',
            operation: 'assign',
            reviewLog,
            roles: selfAssignedRoles,
            root,
            write: true,
          },
          { fetchImpl },
        );
      } catch (error) {
        selfAssignmentError = error.message;
      }
      const unchangedAfterSelfAssignment =
        fs.readFileSync(root + '/' + reviewLog, 'utf8') === originalSource;
      prepared = await prepareOnboarding(
        {
          assigner: 'assigning-maintainer',
          operation: 'assign',
          reviewLog,
          roles: structuredClone(roleInputs),
          root,
          write: true,
        },
        { fetchImpl },
      );
      const pendingLog = JSON.parse(fs.readFileSync(root + '/' + reviewLog, 'utf8'));
      const pendingSource = fs.readFileSync(root + '/' + reviewLog, 'utf8');
      const urls = {
        'product-context': 'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-501',
        'native-german': 'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-502',
        domain: 'https://github.com/linancn/tiangong-lca-next/issues/601#issuecomment-503',
      };
      const finalizeRoles = Object.fromEntries(
        Object.entries(urls).map(([role, assignmentAttestationUrl]) => [
          role,
          { login: null, qualificationEvidence: null, assignmentAttestationUrl },
        ]),
      );
      const tamperedLog = structuredClone(pendingLog);
      tamperedLog.roles.productContextReviewer.assignedByGithubUserId = '9999';
      fs.writeFileSync(root + '/' + reviewLog, JSON.stringify(tamperedLog, null, 2) + '\\n');
      const tamperedSource = fs.readFileSync(root + '/' + reviewLog, 'utf8');
      let immutableBindingError = null;
      try {
        await prepareOnboarding(
          {
            assigner: 'assigning-maintainer',
            operation: 'finalize',
            reviewLog,
            roles: structuredClone(finalizeRoles),
            root,
            write: true,
          },
          { fetchImpl },
        );
      } catch (error) {
        immutableBindingError = error.message;
      }
      const unchangedAfterIdentityMismatch =
        fs.readFileSync(root + '/' + reviewLog, 'utf8') === tamperedSource;
      fs.writeFileSync(root + '/' + reviewLog, pendingSource);
      const finalized = await prepareOnboarding(
        {
          assigner: 'assigning-maintainer',
          operation: 'finalize',
          reviewLog,
          roles: structuredClone(finalizeRoles),
          root,
          write: true,
        },
        { fetchImpl },
      );
      const finalSource = fs.readFileSync(root + '/' + reviewLog, 'utf8');
      const finalLog = JSON.parse(finalSource);
      const verifyCommentFailure = async (failure) => {
        commentFailure = failure;
        try {
          await prepareOnboarding(
            {
              assigner: 'assigning-maintainer',
              operation: 'finalize',
              reviewLog,
              roles: structuredClone(finalizeRoles),
              root,
              write: true,
            },
            { fetchImpl },
          );
          return null;
        } catch (error) {
          return error.message;
        }
      };
      const badEvidenceError = await verifyCommentFailure('marker');
      const wrongIssueError = await verifyCommentFailure('issue');
      const wrongAuthorIdError = await verifyCommentFailure('author-id');
      commentFailure = null;
      const lockPath = root + '/' + reviewLog + '.onboarding.lock';
      fs.writeFileSync(lockPath, 'simulated competing writer');
      let concurrentWriterError = null;
      try {
        await prepareOnboarding(
          {
            assigner: 'assigning-maintainer',
            operation: 'finalize',
            reviewLog,
            roles: structuredClone(finalizeRoles),
            root,
            write: true,
          },
          { fetchImpl },
        );
      } catch (error) {
        concurrentWriterError = error.message;
      }
      const unchangedWhileLocked =
        fs.readFileSync(root + '/' + reviewLog, 'utf8') === finalSource;
      fs.unlinkSync(lockPath);
      const symlinkReviewLog = 'docs/plans/i18n-de-DE/review-log-link.yaml';
      fs.symlinkSync(root + '/' + reviewLog, root + '/' + symlinkReviewLog);
      let symlinkError = null;
      try {
        await prepareOnboarding(
          {
            assigner: 'assigning-maintainer',
            operation: 'assign',
            reviewLog: symlinkReviewLog,
            roles: structuredClone(roleInputs),
            root,
            write: false,
          },
          { fetchImpl },
        );
      } catch (error) {
        symlinkError = error.message;
      }
      process.stdout.write(JSON.stringify({
        assignmentRequirementCount: prepared.assignmentRequirements.length,
        badEvidenceError,
        concurrentWriterError,
        finalStatuses: Object.values(finalLog.roles).map(({ status }) => status),
        finalizedOperation: finalized.operation,
        immutableBindingError,
        methods: [...new Set(calls.map(({ method }) => method))],
        mixedCoreError,
        pendingStatuses: Object.values(pendingLog.roles).map(({ status }) => status),
        symlinkError,
        selfAssignmentError,
        unchangedAfterIdentityMismatch,
        unchangedAfterBadEvidence:
          fs.readFileSync(root + '/' + reviewLog, 'utf8') === finalSource,
        unchangedAfterMixedCoreInput,
        unchangedAfterSelfAssignment,
        unchangedWhileLocked,
        wrongAuthorIdError,
        wrongIssueError,
      }));
    `;

    try {
      const result = JSON.parse(
        execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
          encoding: 'utf8',
        }),
      );

      expect(result.assignmentRequirementCount).toBe(3);
      expect(result.pendingStatuses).toEqual([
        'pending-attestation',
        'pending-attestation',
        'pending-attestation',
      ]);
      expect(result.finalStatuses).toEqual(['assigned', 'assigned', 'assigned']);
      expect(result.finalizedOperation).toBe('finalize');
      expect(result.immutableBindingError).toContain('Stored immutable identity binding');
      expect(result.methods).toEqual(['GET']);
      expect(result.mixedCoreError).toContain('forbidden while preparing a pending roster');
      expect(result.selfAssignmentError).toContain('cannot be self-assigned');
      expect(result.badEvidenceError).toContain('failed verification');
      expect(result.concurrentWriterError).toContain('Another onboarding write holds');
      expect(result.symlinkError).toContain('must not be a symbolic link');
      expect(result.unchangedAfterBadEvidence).toBe(true);
      expect(result.unchangedAfterIdentityMismatch).toBe(true);
      expect(result.unchangedAfterMixedCoreInput).toBe(true);
      expect(result.unchangedAfterSelfAssignment).toBe(true);
      expect(result.unchangedWhileLocked).toBe(true);
      expect(result.wrongAuthorIdError).toContain('failed verification');
      expect(result.wrongIssueError).toContain('failed verification');
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects typoed glossary enums and schema in both German gates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-glossary-'));
    const glossaryPath = path.join(root, 'docs/plans/i18n-de-DE/glossary.yaml');
    fs.mkdirSync(path.dirname(glossaryPath), { recursive: true });
    const cases = [
      {
        label: 'schema',
        schemaVersion: 'tiangong.i18n-de-glossary.v0',
        risk: 'critical',
        decisionStatus: 'blocked-term',
      },
      {
        label: 'risk',
        schemaVersion: 'tiangong.i18n-de-glossary.v1',
        risk: 'critcal',
        decisionStatus: 'blocked-term',
      },
      {
        label: 'decision',
        schemaVersion: 'tiangong.i18n-de-glossary.v1',
        risk: 'critical',
        decisionStatus: 'blocked-trm',
      },
    ];
    const source = `
      import fs from 'node:fs';
      import { parseGlossaryPolicy } from ${JSON.stringify(CANDIDATE_AUDIT_URL)};
      import { parseReviewerGlossary } from ${JSON.stringify(PILOT_AUDIT_URL)};
      const root = ${JSON.stringify(root)};
      const glossaryPath = ${JSON.stringify(glossaryPath)};
      const cases = ${JSON.stringify(cases)};
      const results = [];
      for (const fixture of cases) {
        fs.writeFileSync(
          glossaryPath,
          [
            "schemaVersion: '" + fixture.schemaVersion + "'",
            'terms:',
            "  - termId: 'tidas.blocked-term'",
            "    sourceEnglish: 'Result set'",
            "    sourceChinese: ['结果集']",
            "    germanPreferred: 'Ergebnissatz'",
            "    evidenceRefs: ['tidas-spec']",
            "    risk: '" + fixture.risk + "'",
            "    decisionStatus: '" + fixture.decisionStatus + "'",
            '',
          ].join('\\n'),
        );
        const errors = {};
        for (const [name, parser] of [
          ['candidate', parseGlossaryPolicy],
          ['pilot', parseReviewerGlossary],
        ]) {
          try {
            parser(root);
          } catch (error) {
            errors[name] = error.message;
          }
        }
        results.push({ label: fixture.label, errors });
      }
      process.stdout.write(JSON.stringify(results));
    `;

    try {
      const results = JSON.parse(
        execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
          encoding: 'utf8',
        }),
      );

      results.forEach(({ errors }: any) => {
        expect(errors.candidate).toContain('Glossary policy must use');
        expect(errors.pilot).toContain('German reviewer glossary must use');
      });
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects a stale review-log schema in both German gates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-review-schema-'));
    const reviewLogPath = path.join(root, 'review-log.yaml');
    const reviewLog = JSON.parse(
      fs.readFileSync(path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/review-log.yaml'), 'utf8'),
    );
    reviewLog.schemaVersion = 'tiangong.i18n-de-review-log.v3';
    fs.writeFileSync(reviewLogPath, `${JSON.stringify(reviewLog, null, 2)}\n`);

    try {
      const candidate = spawnSync(
        process.execPath,
        [
          path.join(REPOSITORY_ROOT, 'scripts/i18n/audit-german-candidate.mjs'),
          '--mode',
          'report',
          '--review-log',
          reviewLogPath,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      const pilot = spawnSync(
        process.execPath,
        [PILOT_AUDIT_SCRIPT, '--mode', 'report', '--review-log', reviewLogPath],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );

      expect(candidate.status).toBe(2);
      expect(candidate.stderr).toContain('review log must use tiangong.i18n-de-review-log.v4');
      expect(pilot.status).toBe(2);
      expect(pilot.stderr).toContain('review log must use tiangong.i18n-de-review-log.v4');
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('builds a reviewer-ready pilot dossier and three blank hash-pinned queues', () => {
    const report = JSON.parse(
      execFileSync(process.execPath, [PILOT_AUDIT_SCRIPT, '--mode', 'report', '--check'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      }),
    );

    expect(report.schemaVersion).toBe('tiangong.i18n-german-pilot-audit.v5');
    expect(report.staleReviewPack).toBe(false);
    expect(report.reviewPackSummary).toEqual(
      expect.objectContaining({
        argumentMessageCount: 12,
        blockedContextCount: 9,
        domainReviewRequiredCount: 90,
        messageCount: 90,
        reviewQueueCounts: {
          domain: 90,
          'native-german': 90,
          'product-context': 90,
        },
        selectorMessageCount: 6,
      }),
    );
    expect(report.findingCounts.invalidReviewerDossiers).toBe(0);
    expect(report.findingCounts.reviewQueueMismatches).toBe(0);
    expect(report.externalHumanReviewFindings).toHaveLength(
      report.findingCounts.externalHumanReviewEvidence,
    );

    const pack = JSON.parse(
      fs.readFileSync(
        path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/pilot-review-pack.json'),
        'utf8',
      ),
    );
    expect(pack.schemaVersion).toBe('tiangong.i18n-de-pilot-review-pack.v5');
    expect(pack.messages).toHaveLength(90);
    expect(Object.values(pack.selectionCoverage.categories)).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(
      Object.values(pack.selectionCoverage.categories).reduce(
        (total: number, count) => total + Number(count),
        0,
      ),
    ).toBe(90);
    expect(
      Object.values(pack.selectionCoverage.modules).reduce(
        (total: number, count) => total + Number(count),
        0,
      ),
    ).toBe(90);
    expect(pack).not.toHaveProperty('externalHumanReviewFindings');
    const dynamicCallsites = pack.messages.flatMap((message: any) =>
      message.reviewerDossier.surfaceEvidence.dynamicProducers.flatMap(
        (producer: any) => producer.callsites,
      ),
    );
    expect(dynamicCallsites).toHaveLength(217);
    dynamicCallsites.forEach((callsite: any) => {
      expect(callsite.locatedSource?.resolution).toBe('expression-and-api-window');
      const excerptText = callsite.locatedSource.excerpt.lines
        .map(({ text }: any) => text)
        .join('\n');
      const normalizedExpression = callsite.expression.trim().replace(/\s+/gu, ' ');
      const escapedExpression = normalizedExpression.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const characters = [...normalizedExpression];
      const identifierPart = /[\p{ID_Continue}$\u200C\u200D]/u;
      const bareIdentifier = /^[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*$/u.test(
        normalizedExpression,
      );
      const expressionPattern = new RegExp(
        `${identifierPart.test(characters[0]) ? (bareIdentifier ? '(?<![\\p{ID_Continue}$\\u200C\\u200D.])' : '(?<![\\p{ID_Continue}$\\u200C\\u200D])') : ''}${escapedExpression}${identifierPart.test(characters[characters.length - 1]) ? `(?![\\p{ID_Continue}$\\u200C\\u200D])${bareIdentifier ? '(?!\\s*:)' : ''}` : ''}`,
        'u',
      );
      expect(excerptText.replace(/\s+/gu, ' ')).toMatch(expressionPattern);
      expect(excerptText).toMatch(
        callsite.api === 'FormattedMessage' ? /<\s*FormattedMessage\b/u : /\bformatMessage\s*\(/u,
      );
    });
    const bareIdCallsites = dynamicCallsites.filter(({ expression }: any) => expression === 'id');
    expect(
      bareIdCallsites.every(
        (callsite: any) =>
          !callsite.locatedSource.excerpt.lines
            .map(({ text }: any) => text)
            .join('\n')
            .includes('formatMessage(DEFAULT_REQUIRED_MESSAGE)'),
      ),
    ).toBe(true);
    expect(
      [
        ...new Map(
          bareIdCallsites.map((callsite: any) => [
            callsite.file,
            { file: callsite.file, focusLine: callsite.locatedSource.excerpt.focusLine },
          ]),
        ).values(),
      ].sort((left: any, right: any) => left.file.localeCompare(right.file)),
    ).toEqual([
      { file: 'src/pages/Processes/sdkValidationUi.ts', focusLine: 230 },
      { file: 'src/pages/Utils/validation/messages.ts', focusLine: 183 },
    ]);
    pack.messages.forEach((message: any, index: number) => {
      expect(message.reviewerDossier.schemaVersion).toBe(
        'tiangong.i18n-de-pilot-reviewer-dossier.v1',
      );
      expect(message.hashes.dossierHash).toMatch(/^[a-f0-9]{64}$/);
      ['product-context', 'native-german', 'domain'].forEach((role) => {
        expect(pack.reviewQueues[role][index]).toEqual(
          expect.objectContaining({
            contextHash: message.hashes.contextHash,
            decision: null,
            dossierHash: message.hashes.dossierHash,
            findings: [],
            messageId: message.id,
            reviewedAt: null,
            reviewer: null,
            reviewScopeHash: message.hashes.reviewScopeHash,
            role,
            translationHash: message.hashes.translationHash,
          }),
        );
      });
    });
  });

  it('treats a missing dossier hash on a pilot review as stale evidence', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-stale-review-'));
    const reviewLogPath = path.join(root, 'review-log.yaml');
    const reviewLog = JSON.parse(
      fs.readFileSync(path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/review-log.yaml'), 'utf8'),
    );
    const pack = JSON.parse(
      fs.readFileSync(
        path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/pilot-review-pack.json'),
        'utf8',
      ),
    );
    const message = pack.messages[0];
    reviewLog.roles.productContextReviewer = {
      ...reviewLog.roles.productContextReviewer,
      assignedBy: 'assigning-maintainer',
      assignedByGithubUserId: '1001',
      assignmentAttestationUrl: 'invalid-evidence-url',
      githubLogin: 'product-reviewer',
      githubUserId: '2001',
      identity: 'product-reviewer',
      identityType: 'github-human',
      qualificationEvidence: 'Owns the relevant TianGong product workflows.',
      status: 'assigned',
    };
    reviewLog.pilot.reviews = [
      {
        contextHash: message.hashes.contextHash,
        decision: 'APPROVED',
        findings: [],
        messageId: message.id,
        reviewer: 'product-reviewer',
        reviewedAt: '2026-07-16',
        reviewScopeHash: message.hashes.reviewScopeHash,
        role: 'product-context',
        translationHash: message.hashes.translationHash,
      },
    ];
    fs.writeFileSync(reviewLogPath, `${JSON.stringify(reviewLog, null, 2)}\n`);

    try {
      const report = JSON.parse(
        execFileSync(
          process.execPath,
          [PILOT_AUDIT_SCRIPT, '--mode', 'report', '--review-log', reviewLogPath],
          {
            cwd: REPOSITORY_ROOT,
            encoding: 'utf8',
            maxBuffer: 20 * 1024 * 1024,
          },
        ),
      );

      expect(report.findingCounts.staleReviews).toBe(1);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });
});
