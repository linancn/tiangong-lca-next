import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPOSITORY_ROOT = path.resolve(__dirname, '../../..');
const ACTIVATION_SCRIPT = path.join(REPOSITORY_ROOT, 'scripts/i18n/german-runtime-activation.mjs');
const DELTA_REVIEW_SCRIPT = path.join(
  REPOSITORY_ROOT,
  'scripts/i18n/german-runtime-delta-review.mjs',
);
const RUNTIME_MANIFEST = path.join(
  REPOSITORY_ROOT,
  'docs/plans/i18n-de-DE/runtime-activation-manifest.json',
);
const CONFIRMATION_BEGIN = '<!-- ISSUE-602-DELTA-CONFIRMATION-BEGIN -->';
const CONFIRMATION_END = '<!-- ISSUE-602-DELTA-CONFIRMATION-END -->';

function approve(markdown: string, reviewer: string) {
  const normalized = markdown.replace(/\r\n?/gu, '\n');
  const pattern = new RegExp(
    `${CONFIRMATION_BEGIN.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\n\`\`\`json\n([\\s\\S]*?)\n\`\`\`\n${CONFIRMATION_END.replace(
      /[.*+?^${}()|[\]\\]/gu,
      '\\$&',
    )}`,
    'u',
  );
  const match = normalized.match(pattern);
  if (!match) throw new Error('Delta confirmation block not found.');
  const confirmation = JSON.parse(match[1]);
  confirmation.reviewer = reviewer;
  confirmation.reviewedAt = '2026-07-16';
  Object.keys(confirmation.decisions).forEach((key) => {
    confirmation.decisions[key] = 'APPROVED';
  });
  Object.keys(confirmation.approvals).forEach((key) => {
    confirmation.approvals[key] = true;
  });
  return normalized.replace(
    match[0],
    `${CONFIRMATION_BEGIN}\n\`\`\`json\n${JSON.stringify(confirmation, null, 2)}\n\`\`\`\n${CONFIRMATION_END}`,
  );
}

describe('German active-runtime evidence', () => {
  it('binds the immutable baseline, exact delta, and one active German locale without human data', () => {
    const report = JSON.parse(
      execFileSync(process.execPath, [ACTIVATION_SCRIPT, '--mode', 'report', '--check'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
      }),
    );
    const manifest = JSON.parse(fs.readFileSync(RUNTIME_MANIFEST, 'utf8'));

    expect(report.summary).toEqual(
      expect.objectContaining({
        baselineMessageCount: 2665,
        newMessageCount: 24,
        modifiedBaselineMessageCount: 2,
        finalMessageCount: 2689,
        baselineCatalogReviewApproved: true,
      }),
    );
    const nonDeltaFindingCounts = Object.entries(report.summary.findingCounts)
      .filter(([category]) => category !== 'deltaReviewConfirmation')
      .map(([, count]) => count);
    expect(nonDeltaFindingCounts.every((count) => count === 0)).toBe(true);
    expect(report.summary.findingCount).toBe(report.summary.findingCounts.deltaReviewConfirmation);
    expect(manifest.baseline).toEqual(
      expect.objectContaining({
        sourceCommit: '826f87a53032bfa9ab58baff2e4b8b7212671cdf',
        messageCount: 2665,
      }),
    );
    expect(manifest.delta.newMessageIds).toHaveLength(24);
    expect(manifest.delta.modifiedBaselineMessageIds).toHaveLength(2);
    expect(manifest.delta.externalTrackedCopyInputs).toHaveLength(2);
    expect(manifest.delta.localReviewItemCount).toBe(28);
    expect(manifest.delta.reviewGateDescriptorEvidence.messageIds).toHaveLength(12);
    expect(manifest.delta.reviewGateDescriptorEvidence.maps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'REVIEW_SUBMIT_EVIDENCE_MESSAGES' }),
        expect.objectContaining({ symbol: 'REVIEW_SUBMIT_DIAGNOSTIC_MESSAGES' }),
      ]),
    );
    expect(manifest.activeRuntime).toEqual(
      expect.objectContaining({
        activeLocales: ['en-US', 'zh-CN', 'de-DE'],
        canonicalGermanLocale: 'de-DE',
        finalMessageCount: 2689,
        regionalBundlesAllowed: false,
        aliasesNormalizeTo: 'de-DE',
        antDesignAdapter: 'de_DE',
        dayjsAdapter: 'de',
        datasetTextLanguageFallback: 'en',
        docsAndLegalFallback: 'en',
      }),
    );
    expect(manifest.source.inputs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'file',
          path: 'docs/plans/i18n-de-DE/dynamic-families.json',
        }),
        expect.objectContaining({
          kind: 'extracted-descriptor-map',
          family: 'reviewGateEvidenceLabels',
          path: 'src/pages/Processes/Components/edit.tsx',
        }),
      ]),
    );
    expect(JSON.stringify(manifest)).not.toMatch(
      /"reviewer"|"reviewedAt"|"decisions"|"approvals"|"reviewBodyDigest"|"confirmationDigest"/u,
    );
  });

  it('renders and hash-binds all 28 delta items with real dynamic-family context', () => {
    const relativeFile = `.local/i18n-de-DE/runtime-delta-test-${process.pid}-${Date.now()}.md`;
    const absoluteFile = path.join(REPOSITORY_ROOT, relativeFile);
    const privateReviewer = 'DO-NOT-ECHO-LOCAL-DELTA-REVIEWER';
    try {
      const generated = spawnSync(
        process.execPath,
        [DELTA_REVIEW_SCRIPT, '--generate', '--file', relativeFile],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(generated.status).toBe(0);
      expect(fs.statSync(absoluteFile).mode & 0o777).toBe(0o600);

      const source = fs.readFileSync(absoluteFile, 'utf8');
      expect(source.match(/^## \d+ \/ /gmu)).toHaveLength(26);
      expect(source).toContain('## 26 / 26 — component.tidasPackage.import.apiGuide.summary');
      expect(source.match(/^## External \d+ \/ 2 — /gmu)).toHaveLength(2);
      expect(source.match(/^````text\n[\s\S]*?\n````$/gmu)).toHaveLength(84);
      expect(source.match(/^````tsx\n[\s\S]*?\n````$/gmu)).toHaveLength(6);
      expect(source.match(/family：reviewGateEvidenceLabels/gu)).toHaveLength(11);
      expect(source.match(/边界类型：closedWorld/gu)).toHaveLength(11);
      expect(source.match(/闭集成员（12）/gu)).toHaveLength(11);
      expect(
        source.match(
          /src\/pages\/Processes\/Components\/edit\.tsx · formatMessage\(message\) · expression="message" · count=1/gu,
        ),
      ).toHaveLength(11);
      expect(source.match(/运行时 descriptor maps：/gu)).toHaveLength(11);
      expect(source.match(/### Frozen #601 English \(before this delta\)/gu)).toHaveLength(2);
      expect(source.match(/### Frozen #601 Chinese \(before this delta\)/gu)).toHaveLength(2);
      expect(source.match(/### Frozen #601 German \(before this delta\)/gu)).toHaveLength(2);

      const overwrite = spawnSync(
        process.execPath,
        [DELTA_REVIEW_SCRIPT, '--generate', '--file', relativeFile],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(overwrite.status).toBe(2);
      expect(overwrite.stderr).toContain('Refusing to overwrite');

      const approvedWithNote = approve(source, privateReviewer).replace(
        /<!-- ISSUE-602-DELTA-NOTE-BEGIN:([^ ]+) -->\n\n<!-- ISSUE-602-DELTA-NOTE-END:\1 -->/u,
        '<!-- ISSUE-602-DELTA-NOTE-BEGIN:$1 -->\n人工复核备注不参与正文摘要。\n<!-- ISSUE-602-DELTA-NOTE-END:$1 -->',
      );
      fs.writeFileSync(absoluteFile, approvedWithNote, { mode: 0o600 });
      const checked = spawnSync(
        process.execPath,
        [DELTA_REVIEW_SCRIPT, '--check', '--file', relativeFile],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(checked.status).toBe(0);
      expect(JSON.parse(checked.stdout)).toEqual(
        expect.objectContaining({
          approved: true,
          counts: {
            newMessages: 24,
            modifiedBaselineMessages: 2,
            externalTrackedCopy: 2,
            totalItems: 28,
          },
        }),
      );
      expect(checked.stdout).not.toContain(privateReviewer);
      expect(checked.stderr).not.toContain(privateReviewer);

      fs.writeFileSync(
        absoluteFile,
        fs.readFileSync(absoluteFile, 'utf8').replace('Canonical English', 'Tampered English'),
      );
      const tampered = spawnSync(
        process.execPath,
        [DELTA_REVIEW_SCRIPT, '--check', '--file', relativeFile],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8' },
      );
      expect(tampered.status).toBe(1);
      expect(JSON.parse(tampered.stdout).reasons).toContain(
        'Visible review body has changed since generation.',
      );
    } finally {
      fs.rmSync(absoluteFile, { force: true });
    }
  });

  it('keeps the human scope limited to exact review material and reports missing inputs fail-closed', () => {
    const moduleUrl = pathToFileURL(DELTA_REVIEW_SCRIPT).href;
    const probe = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '--eval',
          `import { buildDeltaReviewScope } from ${JSON.stringify(moduleUrl)};
           const scope = buildDeltaReviewScope(${JSON.stringify(REPOSITORY_ROOT)});
           process.stdout.write(JSON.stringify({ source: scope.source, families: [...new Set(scope.messages.flatMap((message) => message.dynamicFamilies.map((family) => family.family)))] }));`,
        ],
        { cwd: REPOSITORY_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
      ),
    );
    expect(probe.source).toEqual({
      frozenBaselineCommit: '826f87a53032bfa9ab58baff2e4b8b7212671cdf',
      reviewContract: 'issue-602-exact-28-items-with-related-context-v1',
      reviewRendererDigest: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(probe.families).toEqual(['reviewGateEvidenceLabels']);

    const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tiangong-i18n-missing-delta-'));
    try {
      const result = JSON.parse(
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '--eval',
            `import { readDeltaConfirmation } from ${JSON.stringify(moduleUrl)};
             process.stdout.write(JSON.stringify(readDeltaConfirmation(${JSON.stringify(emptyRoot)})));`,
          ],
          { encoding: 'utf8' },
        ),
      );
      expect(result.approved).toBe(false);
      expect(result.counts).toEqual({
        newMessages: 24,
        modifiedBaselineMessages: 2,
        externalTrackedCopy: 2,
        totalItems: 28,
      });
      expect(result.reasons).toHaveLength(1);
    } finally {
      fs.rmSync(emptyRoot, { force: true, recursive: true });
    }
  });
});
