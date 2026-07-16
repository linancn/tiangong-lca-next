import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const OFFLINE_REVIEW_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/german-offline-review.mjs');
const PILOT_AUDIT_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/audit-german-pilot.mjs');
const CANDIDATE_AUDIT_SCRIPT = path.join(
  REPOSITORY_ROOT,
  'scripts/i18n/audit-german-candidate.mjs',
);
const REVIEW_PACK_PATH = path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/pilot-review-pack.json');
const CONTEXT_LEDGER_PATH = path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/context-ledger.json');
const REVIEW_PROVENANCE_PATH = path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/review-log.yaml');
const CONFIRMATION_BEGIN = '<!-- TIANGONG_I18N_DE_CONFIRMATION_BEGIN -->';
const CONFIRMATION_END = '<!-- TIANGONG_I18N_DE_CONFIRMATION_END -->';

function sha256File(file: string) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function confirmationMatch(markdown: string) {
  const normalized = markdown.replace(/\r\n?/gu, '\n');
  const pattern = new RegExp(
    `${CONFIRMATION_BEGIN.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\n\`\`\`json\\n([\\s\\S]*?)\\n\`\`\`\\n${CONFIRMATION_END.replace(
      /[.*+?^${}()|[\]\\]/gu,
      '\\$&',
    )}`,
    'u',
  );
  const match = normalized.match(pattern);
  if (!match) throw new Error('confirmation block not found');
  return { full: match[0], json: JSON.parse(match[1]) };
}

function replaceConfirmation(markdown: string, mutate: (value: any) => void) {
  const match = confirmationMatch(markdown);
  mutate(match.json);
  return markdown.replace(
    match.full,
    `${CONFIRMATION_BEGIN}\n\`\`\`json\n${JSON.stringify(match.json, null, 2)}\n\`\`\`\n${CONFIRMATION_END}`,
  );
}

function approve(markdown: string, reviewer = 'private-local-reviewer') {
  return replaceConfirmation(markdown, (confirmation) => {
    confirmation.reviewer = reviewer;
    confirmation.reviewedAt = '2026-07-16';
    Object.keys(confirmation.decisions).forEach((key) => {
      confirmation.decisions[key] = 'APPROVED';
    });
    Object.keys(confirmation.approvals).forEach((key) => {
      confirmation.approvals[key] = true;
    });
  });
}

function generateReviewFile(root: string, name = 'review.md') {
  const output = path.join(root, name);
  execFileSync(process.execPath, [OFFLINE_REVIEW_SCRIPT, '--generate', '--output', output], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
  });
  return output;
}

function computeBodyDigest(file: string) {
  const source = [
    `import fs from 'node:fs';`,
    `import { computeReviewBodyDigest } from ${JSON.stringify(`file://${OFFLINE_REVIEW_SCRIPT}`)};`,
    `process.stdout.write(computeReviewBodyDigest(fs.readFileSync(${JSON.stringify(file)}, 'utf8')));`,
  ].join('\n');
  return execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    encoding: 'utf8',
  });
}

describe('German local human-review workflow', () => {
  it('builds a complete 90-message offline pilot scope without GitHub evidence fields', () => {
    const report = JSON.parse(
      execFileSync(process.execPath, [PILOT_AUDIT_SCRIPT, '--mode', 'report', '--check'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      }),
    );
    const pack = JSON.parse(fs.readFileSync(REVIEW_PACK_PATH, 'utf8'));

    expect(report.schemaVersion).toBe('tiangong.i18n-german-pilot-audit.v6');
    expect(report.staleReviewPack).toBe(false);
    expect(report.reviewPackSummary).toEqual(
      expect.objectContaining({
        argumentMessageCount: 12,
        blockedContextCount: 9,
        blockedGlossaryTermCount: 2,
        domainReviewRequiredCount: 90,
        invalidContextProposalCount: 0,
        messageCount: 90,
        pendingContextApprovalCount: 9,
        selectorMessageCount: 6,
      }),
    );
    expect(pack.schemaVersion).toBe('tiangong.i18n-de-pilot-review-pack.v6');
    expect(pack.messages).toHaveLength(90);
    expect(pack).not.toHaveProperty('reviewQueues');
    expect(pack).not.toHaveProperty('reviewAttestationRequirements');
    expect(pack.policy).toEqual(
      expect.objectContaining({
        confirmationMustNotBeCommitted: true,
        githubEvidenceRequired: false,
        humanConfirmationStorage: 'local-untracked-markdown',
        sameReviewerMayConfirmAllDimensions: true,
      }),
    );
    expect(pack.offlineReview).toEqual(
      expect.objectContaining({
        blockedContextProposalCount: 9,
        blockedGlossaryTermCount: 2,
        messageCount: 90,
        schemaVersion: 'tiangong.i18n-de-offline-pilot-review-scope.v1',
        scopeDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );
    expect(pack.blockedGlossaryTerms.map(({ termId }: any) => termId).sort()).toEqual([
      'tidas.result-set',
      'tidas.root-record',
    ]);
    expect(
      Object.values(pack.selectionCoverage.categories).reduce(
        (total: number, count: any) => total + Number(count),
        0,
      ),
    ).toBe(90);
    expect(
      Object.values(pack.selectionCoverage.modules).reduce(
        (total: number, count: any) => total + Number(count),
        0,
      ),
    ).toBe(90);

    const dynamicCallsites = pack.messages.flatMap((message: any) =>
      message.reviewerDossier.surfaceEvidence.dynamicProducers.flatMap(
        (producer: any) => producer.callsites,
      ),
    );
    expect(dynamicCallsites).toHaveLength(217);
    dynamicCallsites.forEach((callsite: any) => {
      expect(callsite.locatedSource?.resolution).toBe('expression-and-api-window');
    });
    pack.messages.forEach((message: any) => {
      expect(message.reviewerDossier.schemaVersion).toBe(
        'tiangong.i18n-de-pilot-reviewer-dossier.v1',
      );
      expect(message.hashes.contextHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(message.hashes.translationHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(message.hashes.dossierHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(message.hashes.reviewScopeHash).toMatch(/^[a-f0-9]{64}$/u);
    });
  });

  it('generates an ignored, private, reviewer-readable Markdown form and refuses overwrite', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-offline-review-'));
    try {
      const output = generateReviewFile(root);
      const source = fs.readFileSync(output, 'utf8');
      const pack = JSON.parse(fs.readFileSync(REVIEW_PACK_PATH, 'utf8'));
      const mode = fs.statSync(output).mode & 0o777;

      expect(mode).toBe(0o600);
      expect(source).toContain('# TianGong 德语 Pilot 人工确认单');
      expect(source).toContain('## 9 个保留消息上下文提案');
      expect(source).toContain('## 2 个待定术语');
      expect(source).toContain('`tidas.result-set`');
      expect(source).toContain('`tidas.root-record`');
      expect(source.match(/^## \d{2} \/ 90 — /gmu)).toHaveLength(90);
      pack.messages.forEach(({ id }: any) => {
        expect(source).toContain(`— \`${id}\``);
        expect(source).toContain(`TIANGONG_I18N_DE_NOTE_BEGIN:${id}`);
        expect(source).toContain(`TIANGONG_I18N_DE_NOTE_END:${id}`);
      });
      expect(source).not.toMatch(/githubLogin|githubUserId|assignmentAttestationUrl/u);

      const originalHash = sha256File(output);
      const second = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--generate', '--output', output],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(second.status).toBe(2);
      expect(second.stderr).toContain('Refusing to overwrite');
      expect(sha256File(output)).toBe(originalHash);

      const ignored = execFileSync(
        'git',
        ['check-ignore', '-v', '.local/i18n-de-DE/pilot-review-confirmation.md'],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(ignored).toContain('/.local/i18n-de-DE/');

      const forbidden = path.join(
        REPOSITORY_ROOT,
        'docs/plans/i18n-de-DE/private-review-confirmation.md',
      );
      const nonPrivateOutput = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--generate', '--output', forbidden],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(nonPrivateOutput.status).toBe(2);
      expect(nonPrivateOutput.stderr).toContain('must stay under .local/i18n-de-DE');
      expect(fs.existsSync(forbidden)).toBe(false);

      const rejectedDirectory = path.join(
        REPOSITORY_ROOT,
        'docs',
        `.rejected-offline-review-${process.pid}-${Date.now()}`,
      );
      const rejectedNestedOutput = spawnSync(
        process.execPath,
        [
          OFFLINE_REVIEW_SCRIPT,
          '--generate',
          '--output',
          path.join(rejectedDirectory, 'nested', 'review.md'),
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(rejectedNestedOutput.status).toBe(2);
      expect(rejectedNestedOutput.stderr).toContain('must stay under .local/i18n-de-DE');
      expect(fs.existsSync(rejectedDirectory)).toBe(false);

      const symlinkTargetName = `.rejected-symlink-review-${process.pid}-${Date.now()}`;
      const symlinkTarget = path.join(REPOSITORY_ROOT, 'docs', symlinkTargetName);
      const repositoryBridge = path.join(root, 'repository-bridge');
      fs.symlinkSync(path.join(REPOSITORY_ROOT, 'docs'), repositoryBridge, 'dir');
      const symlinkNestedOutput = spawnSync(
        process.execPath,
        [
          OFFLINE_REVIEW_SCRIPT,
          '--generate',
          '--output',
          path.join(repositoryBridge, symlinkTargetName, 'review.md'),
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(symlinkNestedOutput.status).toBe(2);
      expect(symlinkNestedOutput.stderr).toContain('must stay under .local/i18n-de-DE');
      expect(fs.existsSync(symlinkTarget)).toBe(false);

      const trackedInput = spawnSync(
        process.execPath,
        [
          OFFLINE_REVIEW_SCRIPT,
          '--check',
          '--input',
          path.join(REPOSITORY_ROOT, 'docs/plans/i18n-de-DE/README.md'),
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(trackedInput.status).toBe(2);
      expect(trackedInput.stderr).toContain('must stay under .local/i18n-de-DE');
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('accepts one local reviewer for all three dimensions without revealing that reviewer', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-approved-review-'));
    try {
      const output = generateReviewFile(root);
      const privateReviewer = 'DO-NOT-ECHO-PRIVATE-REVIEWER';
      fs.writeFileSync(output, approve(fs.readFileSync(output, 'utf8'), privateReviewer));

      const checked = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--check', '--input', output],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(checked.status).toBe(0);
      expect(JSON.parse(checked.stdout)).toEqual(
        expect.objectContaining({
          approved: true,
          counts: {
            blockedContextProposals: 9,
            blockedGlossaryTerms: 2,
            pilotMessages: 90,
          },
        }),
      );
      expect(checked.stdout).not.toContain(privateReviewer);
      expect(checked.stderr).not.toContain(privateReviewer);

      const crlf = path.join(root, 'review-crlf.md');
      fs.writeFileSync(crlf, fs.readFileSync(output, 'utf8').replace(/\n/gu, '\r\n'));
      const crlfCheck = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--check', '--input', crlf],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(crlfCheck.status).toBe(0);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('fails closed for pending, stale, malformed, or visibly changed local confirmation', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-review-failures-'));
    try {
      const template = generateReviewFile(root);
      const pending = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--check', '--input', template],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(pending.status).toBe(1);
      expect(JSON.parse(pending.stdout).reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('reviewer'),
          expect.stringContaining('not APPROVED'),
          expect.stringContaining('boolean true'),
        ]),
      );

      const approved = approve(fs.readFileSync(template, 'utf8'));
      const cases = [
        {
          name: 'stale-scope.md',
          source: replaceConfirmation(approved, (value) => {
            value.scopeDigest = '0'.repeat(64);
          }),
          reason: 'scopeDigest is stale',
        },
        {
          name: 'string-boolean.md',
          source: replaceConfirmation(approved, (value) => {
            value.approvals.allPilotMessages = 'true';
          }),
          reason: 'boolean true',
        },
        {
          name: 'visible-tamper.md',
          source: approved.replace(
            'Informationen zum Lebenszyklusmodell',
            'ABSICHTLICH VERÄNDERTER SICHTBARER TEXT',
          ),
          reason: 'Visible review body has changed',
        },
        {
          name: 'missing-note-boundary.md',
          source: approved.replace('<!-- TIANGONG_I18N_DE_NOTE_END:', '<!-- REMOVED_NOTE_END:'),
          reason: 'Visible review body has changed',
        },
        {
          name: 'duplicate-confirmation.md',
          source: `${approved}\n${confirmationMatch(approved).full}\n`,
          reason: 'exactly one complete confirmation block',
        },
      ];
      cases.forEach(({ name, source, reason }) => {
        const file = path.join(root, name);
        fs.writeFileSync(file, source);
        const result = spawnSync(
          process.execPath,
          [OFFLINE_REVIEW_SCRIPT, '--check', '--input', file],
          { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
        );
        expect(result.status).toBe(1);
        expect(JSON.parse(result.stdout).reasons.join('\n')).toContain(reason);
      });

      const changedPack = JSON.parse(fs.readFileSync(REVIEW_PACK_PATH, 'utf8'));
      changedPack.messages[0].candidate += ' geändert';
      changedPack.messages[0].hashes.translationHash = '1'.repeat(64);
      const changedPackPath = path.join(root, 'changed-pack.json');
      fs.writeFileSync(changedPackPath, `${JSON.stringify(changedPack)}\n`);
      const oldApproval = path.join(root, 'old-approval.md');
      fs.writeFileSync(oldApproval, approved);
      const stalePack = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--check', '--input', oldApproval, '--pack', changedPackPath],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(stalePack.status).toBe(1);
      expect(JSON.parse(stalePack.stdout).reasons).toContain('Confirmation scopeDigest is stale.');

      const pack = JSON.parse(fs.readFileSync(REVIEW_PACK_PATH, 'utf8'));
      const sparsePath = path.join(root, 'sparse-self-hashed.md');
      let sparse = [
        confirmationMatch(approved).full,
        ...pack.messages.flatMap(({ id }: any) => [
          `<!-- TIANGONG_I18N_DE_NOTE_BEGIN:${id} -->`,
          `<!-- TIANGONG_I18N_DE_NOTE_END:${id} -->`,
        ]),
        '',
      ].join('\n');
      fs.writeFileSync(sparsePath, sparse);
      const forgedDigest = computeBodyDigest(sparsePath);
      sparse = replaceConfirmation(sparse, (value) => {
        value.reviewBodyDigest = forgedDigest;
      });
      fs.writeFileSync(sparsePath, sparse);
      const sparseCheck = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--check', '--input', sparsePath],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(sparseCheck.status).toBe(1);
      expect(JSON.parse(sparseCheck.stdout).reasons).toContain(
        'Visible review body has changed since generation.',
      );
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('generates and verifies a separately bound full-catalog form', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-catalog-review-'));
    try {
      const output = path.join(root, 'catalog-review.md');
      execFileSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--scope', 'catalog', '--generate', '--output', output],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      const generated = fs.readFileSync(output, 'utf8');
      expect(generated).toContain('# TianGong 德语全量 Catalog 人工确认单');
      expect(generated.match(/^## \d{4} \/ 2713 — /gmu)).toHaveLength(2713);
      expect(generated).toContain('English');
      expect(generated).toContain('中文');
      expect(generated).toContain('German candidate');

      fs.writeFileSync(output, approve(generated));
      const checked = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--scope', 'catalog', '--check', '--input', output],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      expect(checked.status).toBe(0);
      expect(JSON.parse(checked.stdout)).toEqual(
        expect.objectContaining({
          approved: true,
          counts: {
            blockedContextProposals: 628,
            blockedGlossaryTerms: 2,
            catalogMessages: 2713,
          },
          scope: 'catalog',
        }),
      );

      let sparse = [
        confirmationMatch(fs.readFileSync(output, 'utf8')).full,
        ...JSON.parse(fs.readFileSync(CONTEXT_LEDGER_PATH, 'utf8')).messages.flatMap(
          ({ id }: any) => [
            `<!-- TIANGONG_I18N_DE_NOTE_BEGIN:${id} -->`,
            `<!-- TIANGONG_I18N_DE_NOTE_END:${id} -->`,
          ],
        ),
        '',
      ].join('\n');
      const sparsePath = path.join(root, 'catalog-sparse.md');
      fs.writeFileSync(sparsePath, sparse);
      sparse = replaceConfirmation(sparse, (value) => {
        value.reviewBodyDigest = computeBodyDigest(sparsePath);
      });
      fs.writeFileSync(sparsePath, sparse);
      const sparseCheck = spawnSync(
        process.execPath,
        [OFFLINE_REVIEW_SCRIPT, '--scope', 'catalog', '--check', '--input', sparsePath],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      expect(sparseCheck.status).toBe(1);
      expect(JSON.parse(sparseCheck.stdout).reasons).toContain(
        'Visible review body has changed since generation.',
      );
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('keeps missing, malformed, and stale context proposals structurally invalid', () => {
    const helper = path.join(REPOSITORY_ROOT, 'scripts/i18n/german-context-proposal.mjs');
    const source = `
      import fs from 'node:fs';
      import { validateContextAnnotation } from ${JSON.stringify(`file://${helper}`)};
      const ledger = JSON.parse(fs.readFileSync(${JSON.stringify(CONTEXT_LEDGER_PATH)}, 'utf8'));
      const message = ledger.messages.find((entry) => entry.context.reviewedAnnotation);
      const valid = structuredClone(message.context.reviewedAnnotation);
      const cases = [
        null,
        { ...structuredClone(valid), concept: '' },
        { ...structuredClone(valid), evidence: [] },
        { ...structuredClone(valid), sourceContextHash: '0'.repeat(64) },
      ];
      process.stdout.write(JSON.stringify({
        valid: validateContextAnnotation(message, valid, message.hashes.sourceContext),
        invalid: cases.map((proposal) =>
          validateContextAnnotation(message, proposal, message.hashes.sourceContext)
        ),
      }));
    `;
    const result = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
        encoding: 'utf8',
      }),
    );
    expect(result.valid).toEqual([]);
    expect(result.invalid).toHaveLength(4);
    result.invalid.forEach((errors: string[]) => expect(errors.length).toBeGreaterThan(0));
    expect(result.invalid[0]).toContain('No context proposal exists.');
    expect(result.invalid[1]).toContain('concept is required');
    expect(result.invalid[2]).toContain('at least one evidence record is required');
    expect(result.invalid[3]).toContain(
      'sourceContextHash must match the current canonical source evidence',
    );
  });

  it('lets the local pilot approval pass without network or tracked-artifact writes', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-pilot-gate-'));
    try {
      const confirmation = generateReviewFile(root);
      fs.writeFileSync(confirmation, approve(fs.readFileSync(confirmation, 'utf8')));
      const trackedBefore = Object.fromEntries(
        [REVIEW_PACK_PATH, CONTEXT_LEDGER_PATH, REVIEW_PROVENANCE_PATH].map((file) => [
          file,
          sha256File(file),
        ]),
      );

      const pilot = spawnSync(
        process.execPath,
        [
          '--eval',
          "globalThis.fetch = () => { throw new Error('network forbidden'); }; process.argv = [process.execPath, " +
            JSON.stringify(PILOT_AUDIT_SCRIPT) +
            ", '--mode', 'enforce', '--check', '--confirmation', " +
            JSON.stringify(confirmation) +
            ']; await import(' +
            JSON.stringify(`file://${PILOT_AUDIT_SCRIPT}`) +
            ');',
          '--input-type=module',
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      expect(pilot.status).toBe(0);
      const report = JSON.parse(pilot.stdout);
      expect(report.offlineReview.approved).toBe(true);
      expect(report.findingCount).toBe(0);
      expect(report.findingCounts.blockedPilotContexts).toBe(0);
      expect(report.findingCounts.invalidPilotContextProposals).toBe(0);
      expect(report.findingCounts.blockedGlossaryTerms).toBe(0);
      expect(report.findingCounts.offlineReviewConfirmation).toBe(0);

      Object.entries(trackedBefore).forEach(([file, digest]) => {
        expect(sha256File(file)).toBe(digest);
      });

      const missingCatalogConfirmation = path.join(root, 'missing-catalog-review.md');
      const candidate = spawnSync(
        process.execPath,
        [
          CANDIDATE_AUDIT_SCRIPT,
          '--mode',
          'enforce',
          '--check',
          '--pilot-confirmation',
          confirmation,
          '--catalog-confirmation',
          missingCatalogConfirmation,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      expect(candidate.status).toBe(1);
      const candidateReport = JSON.parse(candidate.stdout);
      expect(candidateReport.findingCounts.pilotGateFailures).toBe(0);
      expect(candidateReport.findingCounts.blockedContexts).toBe(628);
      expect(candidateReport.findingCounts.invalidContextProposals).toBe(0);
      expect(candidateReport.findingCounts.catalogOfflineReviewConfirmation).toBe(1);
      expect(candidateReport.staleLedger).toBe(false);
      expect(candidateReport.summary.locallyReviewCompleteCandidateCount).toBe(2713);
      expect(candidateReport.summary.offlineHumanReviewApprovedCandidateCount).toBe(0);
      expect(candidateReport.catalogReview.counts).toEqual({
        blockedContextProposals: 628,
        blockedGlossaryTerms: 2,
        catalogMessages: 2713,
      });

      const catalogConfirmation = path.join(root, 'catalog-review.md');
      execFileSync(
        process.execPath,
        [
          OFFLINE_REVIEW_SCRIPT,
          '--scope',
          'catalog',
          '--generate',
          '--output',
          catalogConfirmation,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      fs.writeFileSync(catalogConfirmation, approve(fs.readFileSync(catalogConfirmation, 'utf8')));
      const candidateWithCatalogApproval = spawnSync(
        process.execPath,
        [
          CANDIDATE_AUDIT_SCRIPT,
          '--mode',
          'enforce',
          '--check',
          '--pilot-confirmation',
          confirmation,
          '--catalog-confirmation',
          catalogConfirmation,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      );
      expect(candidateWithCatalogApproval.status).toBe(0);
      const approvedCatalogReport = JSON.parse(candidateWithCatalogApproval.stdout);
      expect(approvedCatalogReport.catalogReview.approved).toBe(true);
      expect(approvedCatalogReport.staleLedger).toBe(false);
      expect(approvedCatalogReport.findingCounts.blockedContexts).toBe(0);
      expect(approvedCatalogReport.findingCounts.invalidContextProposals).toBe(0);
      expect(approvedCatalogReport.findingCounts.catalogOfflineReviewConfirmation).toBe(0);
      expect(approvedCatalogReport.summary.locallyReviewCompleteCandidateCount).toBe(2713);
      expect(approvedCatalogReport.summary.offlineHumanReviewApprovedCandidateCount).toBe(2713);
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('rejects typoed glossary enums and stale provenance schema in both German gates', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-policy-schema-'));
    const glossaryPath = path.join(root, 'docs/plans/i18n-de-DE/glossary.yaml');
    fs.mkdirSync(path.dirname(glossaryPath), { recursive: true });
    const cases = [
      ['tiangong.i18n-de-glossary.v0', 'critical', 'blocked-term'],
      ['tiangong.i18n-de-glossary.v1', 'critcal', 'blocked-term'],
      ['tiangong.i18n-de-glossary.v1', 'critical', 'blocked-trm'],
    ];
    const source = `
      import fs from 'node:fs';
      import { parseGlossaryPolicy } from ${JSON.stringify(`file://${CANDIDATE_AUDIT_SCRIPT}`)};
      import { parseReviewerGlossary } from ${JSON.stringify(`file://${PILOT_AUDIT_SCRIPT}`)};
      const root = ${JSON.stringify(root)};
      const glossaryPath = ${JSON.stringify(glossaryPath)};
      const cases = ${JSON.stringify(cases)};
      const results = [];
      for (const [schemaVersion, risk, decisionStatus] of cases) {
        fs.writeFileSync(glossaryPath, [
          "schemaVersion: '" + schemaVersion + "'",
          'terms:',
          "  - termId: 'tidas.blocked-term'",
          "    sourceEnglish: 'Result set'",
          "    sourceChinese: ['结果集']",
          "    germanPreferred: 'Ergebnissatz'",
          "    evidenceRefs: ['tidas-spec']",
          "    risk: '" + risk + "'",
          "    decisionStatus: '" + decisionStatus + "'",
          '',
        ].join('\\n'));
        const errors = [];
        for (const parser of [parseGlossaryPolicy, parseReviewerGlossary]) {
          try { parser(root); } catch (error) { errors.push(error.message); }
        }
        results.push(errors);
      }
      process.stdout.write(JSON.stringify(results));
    `;
    try {
      const results = JSON.parse(
        execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
          encoding: 'utf8',
        }),
      );
      results.forEach((errors: string[]) => {
        expect(errors).toHaveLength(2);
        expect(errors[0]).toContain('Glossary policy must use');
        expect(errors[1]).toContain('German reviewer glossary must use');
      });

      const staleProvenance = path.join(root, 'review-log.yaml');
      const provenance = JSON.parse(fs.readFileSync(REVIEW_PROVENANCE_PATH, 'utf8'));
      provenance.schemaVersion = 'tiangong.i18n-de-review-log.v4';
      fs.writeFileSync(staleProvenance, `${JSON.stringify(provenance, null, 2)}\n`);
      [CANDIDATE_AUDIT_SCRIPT, PILOT_AUDIT_SCRIPT].forEach((script) => {
        const result = spawnSync(
          process.execPath,
          [script, '--mode', 'report', '--review-log', staleProvenance],
          { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
        );
        expect(result.status).toBe(2);
        expect(result.stderr).toContain('tiangong.i18n-de-review-provenance.v5');
      });
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });
});
