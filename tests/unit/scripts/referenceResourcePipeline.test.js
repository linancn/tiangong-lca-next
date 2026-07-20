import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

const pipelinePath = 'scripts/reference-data/reference-resource-pipeline.mjs';
const pipelineUrl = pathToFileURL(`${process.cwd()}/${pipelinePath}`).href;

const runPipelineModule = (source) =>
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import * as pipeline from ${JSON.stringify(pipelineUrl)};\n${source}`,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );

const readGzipJson = (path) => JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
const getRuntimeAssetPath = (resourceId, locale) => {
  const manifest = JSON.parse(
    readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'),
  );
  const resource = manifest.resources.find((candidate) => candidate.resourceId === resourceId);
  return `${resource.runtime.directory}/${resource.runtime.assets[locale].fileName}`;
};

describe('reference resource generation pipeline', () => {
  it('reproduces the checked-in manifest, runtime registry, and gzip assets', () => {
    expect(() =>
      execFileSync(process.execPath, ['--import', 'tsx', pipelinePath, '--check'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      }),
    ).not.toThrow();

    const manifest = JSON.parse(
      readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'),
    );
    for (const resource of manifest.resources) {
      for (const [locale, asset] of Object.entries(resource.runtime.assets)) {
        const localeSuffix = locale === resource.baseLocale ? '' : `_${locale}`;
        expect(asset.fileName).toBe(
          `${resource.runtime.fileStem}.${asset.jsonDigest.value.slice(0, 16)}${localeSuffix}.min.json.gz`,
        );
        expect(existsSync(`${resource.runtime.directory}/${asset.fileName}`)).toBe(true);
      }
      expect(
        existsSync(`${resource.runtime.directory}/${resource.runtime.fileStem}.min.json.gz`),
      ).toBe(false);
    }
  });

  it('writes one canonical manifest projection and closes managed runtime directories exactly', () => {
    expect(() =>
      runPipelineModule(`
        const crypto = await import('node:crypto');
        const fs = await import('node:fs');
        const os = await import('node:os');
        const path = await import('node:path');
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reference-pipeline-'));
        const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
        const digest = (value, scope, identityCount) => ({
          algorithm: 'sha256',
          value: hash(pipeline.stableJson(value)),
          scope,
          identityCount,
        });
        try {
          const basePath = 'src/services/referenceResources/data/fixture/base.json';
          const auditPath = 'src/services/referenceResources/data/fixture/official-source-audit.json';
          const manifestPath = 'src/services/referenceResources/reference-resource-manifest.json';
          fs.mkdirSync(path.join(root, path.dirname(basePath)), { recursive: true });
          fs.mkdirSync(path.join(root, 'public/classifications'), { recursive: true });
          const base = {
            CategorySystem: {
              categories: { '@dataType': 'Flow', category: [{ '@id': '1', '@name': 'One' }] },
            },
          };
          fs.writeFileSync(path.join(root, basePath), pipeline.stableJson(base, true));
          const projection = [{
            key: 'category[0]', assertion: { id: '1' }, baseLabel: 'One',
            provenanceStatus: 'exact',
            sourceIdentity: { key: 'category[0]', assertion: { id: '1' } },
            sourceLabel: 'One',
          }];
          const rawBytes = Buffer.from('fixture official raw');
          const rawDigest = {
            algorithm: 'sha256', value: hash(rawBytes), byteLength: rawBytes.byteLength, scope: 'fixture.raw',
          };
          const audit = {
            schemaVersion: 1,
            auditId: 'fixture-v1',
            resourceId: 'fixture',
            identityStrategy: 'tree-index-path-with-id-assertion',
            edition: 'Fixture edition 1',
            retrievedAt: '2026-07-18',
            transformVersion: 'fixture-transform-v1',
            source: {
              role: 'official-base', edition: 'Fixture edition 1',
              sourceUrl: 'https://example.com/fixture.raw', rawDigest,
            },
            canonicalBaseDigest: digest(base, 'canonical-base-json', 1),
            projectionDigest: digest(projection, 'ordered-scoped-official-source-projection', 1),
            upstreamIdentityCount: 1,
            unmatchedUpstreamIdentityCount: 0,
            counts: { total: 1, exact: 1, projectModified: 0, projectExtension: 0 },
            records: projection,
          };
          const auditBytes = Buffer.from(pipeline.stableJson(audit, true));
          fs.writeFileSync(path.join(root, auditPath), auditBytes);
          const auditFileDigest = {
            algorithm: 'sha256', value: hash(auditBytes), byteLength: auditBytes.byteLength,
            scope: 'frozen-normalized-official-source-audit-json',
          };
          const sourceAuditBinding = {
            auditId: audit.auditId,
            auditFileDigest,
            projectionDigest: audit.projectionDigest,
            transformVersion: audit.transformVersion,
          };
          const manifest = {
            resources: [{
              resourceId: 'fixture',
              required: true,
              baseLocale: 'en',
              identityStrategy: 'tree-index-path-with-id-assertion',
              sourceFiles: { base: basePath },
              edition: { value: 'Fixture edition 1', verificationStatus: 'verified', note: 'Exact fixture.' },
              structureSource: {
                authority: 'Fixture authority', sourceUrl: 'https://example.com/fixture.raw',
                retrievedAt: '2026-07-18', verificationStatus: 'verified',
                sourceComponents: [{
                  role: 'official-base', edition: 'Fixture edition 1',
                  sourceUrl: 'https://example.com/fixture.raw', digest: rawDigest,
                }],
                officialSourceAudit: {
                  auditId: audit.auditId, sourceFile: auditPath,
                  transformVersion: audit.transformVersion, sourceComponentRole: 'official-base',
                  digest: auditFileDigest,
                },
                usageTerms: {
                  status: 'production-cleared', note: 'Fixture terms.', url: 'https://example.com/terms',
                  clearanceRequirements: {
                    profile: 'classification-redistribution-translation',
                    sourceComponentScopes: ['fixture.raw'], conditions: [],
                    uses: ['public-production-deployment', 'redistribution', 'translation-and-derivative-works'],
                  },
                  evidence: {
                    schemaVersion: 1, type: 'product-owner-attestation', date: '2026-07-19',
                    url: 'https://example.com/attestation', resourceId: 'fixture',
                    edition: 'Fixture edition 1', note: 'Fixture product-owner attestation.',
                    scope: {
                      profile: 'classification-redistribution-translation',
                      sourceComponentScopes: ['fixture.raw'], conditions: [],
                      uses: ['public-production-deployment', 'redistribution', 'translation-and-derivative-works'],
                    },
                  },
                },
              },
              overlays: {
                en: {
                  status: 'official', sourceFile: null,
                  evidence: {
                    generatorVersion: '1', sources: ['https://example.com/fixture.raw'],
                    sourceAuditBinding, reviewDigest: null,
                    tests: ['npm run reference-data:check'],
                  },
                },
              },
              runtime: { directory: 'public/classifications', fileStem: 'FixtureClassification', assets: {} },
            }],
            canonicalDataTypes: ['Flow'],
            managedRuntimeDirectories: ['public/classifications'],
            generator: { version: '1', script: 'scripts/reference-data/reference-resource-pipeline.mjs' },
            schemaVersion: 2,
          };
          fs.mkdirSync(path.join(root, path.dirname(manifestPath)), { recursive: true });
          fs.writeFileSync(path.join(root, manifestPath), JSON.stringify(manifest, null, 2) + '\\n');
          for (const stale of [
            'DeletedResource.0123456789abcdef_de.min.json.gz',
            'RenamedStem.min.json.gz',
          ]) fs.writeFileSync(path.join(root, 'public/classifications', stale), 'stale');

          await pipeline.buildReferenceResources({ repoRoot: root, mode: 'write', supportedLanguages: ['en'] });
          const firstManifest = fs.readFileSync(path.join(root, manifestPath));
          const firstGenerated = fs.readFileSync(path.join(root, 'src/services/referenceResources/generatedManifest.ts'));
          const firstFiles = fs.readdirSync(path.join(root, 'public/classifications')).sort();
          if (firstFiles.length !== 1 || !firstFiles[0].startsWith('FixtureClassification.')) process.exit(30);
          await pipeline.buildReferenceResources({ repoRoot: root, mode: 'check', supportedLanguages: ['en'] });
          await pipeline.buildReferenceResources({ repoRoot: root, mode: 'write', supportedLanguages: ['en'] });
          if (!firstManifest.equals(fs.readFileSync(path.join(root, manifestPath)))) process.exit(31);
          if (!firstGenerated.equals(fs.readFileSync(path.join(root, 'src/services/referenceResources/generatedManifest.ts')))) process.exit(32);
          if (pipeline.stableJson(firstFiles) !== pipeline.stableJson(fs.readdirSync(path.join(root, 'public/classifications')).sort())) process.exit(33);
        } finally {
          fs.rmSync(root, { recursive: true, force: true });
        }
      `),
    ).not.toThrow();
  });

  it('fails closed on blank, extra, duplicate, and assertion-drifting overlay records', () => {
    expect(() =>
      runPipelineModule(`
        const base = { CategorySystem: { categories: { '@dataType': 'Flow', category: [
          { '@id': '1', '@name': 'One' },
          { '@id': '2', '@name': 'Two' },
        ] } } };
        const valid = {
          resourceId: 'fixture', locale: 'de', labels: [
            { key: 'category[0]', assertion: { id: '1' }, label: 'Eins' },
            { key: 'category[1]', assertion: { id: '2' }, label: 'Zwei' },
          ],
        };
        const applied = pipeline.applyOverlay(base, 'tree-index-path-with-id-assertion', valid);
        if (applied.document.CategorySystem.categories.category[1]['@name'] !== 'Zwei') process.exit(2);
        const firstGzip = pipeline.deterministicGzip(Buffer.from('deterministic'));
        const secondGzip = pipeline.deterministicGzip(Buffer.from('deterministic'));
        if (!firstGzip.equals(secondGzip) || firstGzip.readUInt32LE(4) !== 0 || firstGzip[9] !== 255) process.exit(7);
        const invalid = [
          { ...valid, labels: [valid.labels[0], { ...valid.labels[1], label: '' }] },
          { ...valid, labels: [...valid.labels, { key: 'category[9]', assertion: { id: '9' }, label: 'Extra' }] },
          { ...valid, labels: [...valid.labels, valid.labels[1]] },
          { ...valid, labels: [valid.labels[0], { ...valid.labels[1], assertion: { id: 'wrong' } }] },
        ];
        for (const overlay of invalid) {
          let failed = false;
          try { pipeline.applyOverlay(base, 'tree-index-path-with-id-assertion', overlay); }
          catch { failed = true; }
          if (!failed) process.exit(3);
        }
      `),
    ).not.toThrow();
  });

  it('requires complete provenance, one-to-one data-type names, and an exact review closure', () => {
    expect(() =>
      runPipelineModule(`
        const canonical = ['Process', 'Flow'];
        const provenance = {
          resourceId: 'fixture',
          edition: { value: 'Version 1', note: 'Exact comparison.', verificationStatus: 'verified' },
          structureSource: {
            authority: 'Official publisher',
            sourceUrl: 'https://example.com/fixture.csv',
            retrievedAt: '2026-07-18',
            verificationStatus: 'verified',
            sourceComponents: [{
              sourceUrl: 'https://example.com/fixture.csv',
              digest: { algorithm: 'sha256', value: 'a'.repeat(64), byteLength: 42, scope: 'fixture.csv' },
            }],
            usageTerms: { status: 'rights-clearance-required', note: 'Clearance pending.', url: 'https://example.com/terms' },
          },
        };
        pipeline.validateProvenance(provenance);
        for (const invalid of [
          { ...provenance, edition: { ...provenance.edition, value: null } },
          { ...provenance, structureSource: { ...provenance.structureSource, sourceComponents: [] } },
          { ...provenance, structureSource: { ...provenance.structureSource, usageTerms: { ...provenance.structureSource.usageTerms, url: null } } },
        ]) {
          let failed = false;
          try { pipeline.validateProvenance(invalid); }
          catch { failed = true; }
          if (!failed) process.exit(9);
        }
        pipeline.validateDataTypeNames(canonical, { Process: 'Prozess', Flow: 'Fluss' }, 'fixture/de');
        pipeline.validateBaseDataTypes(canonical, {
          CategorySystem: { categories: [{ '@dataType': 'Process' }] },
        }, 'fixture');
        for (const invalid of [{ Process: 'Prozess' }, { Process: 'X', Flow: 'X' }, { Process: '', Flow: 'Fluss' }]) {
          let failed = false;
          try { pipeline.validateDataTypeNames(canonical, invalid, 'fixture/de'); }
          catch { failed = true; }
          if (!failed) process.exit(4);
        }
        let unknownDataTypeFailed = false;
        try {
          pipeline.validateBaseDataTypes(canonical, {
            CategorySystem: { categories: [{ '@dataType': 'LifeCycleModel' }] },
          }, 'fixture');
        } catch { unknownDataTypeFailed = true; }
        if (!unknownDataTypeFailed) process.exit(8);
        const crypto = await import('node:crypto');
        const digest = (value, scope, identityCount) => ({
          algorithm: 'sha256',
          value: crypto.createHash('sha256').update(pipeline.stableJson(value)).digest('hex'),
          scope,
          identityCount,
        });
        const resource = { resourceId: 'fixture' };
        const baseRecords = [
          { key: 'category[0]', assertion: { id: '1' } },
          { key: 'category[1]', assertion: { id: '2' } },
        ];
        const overlay = { labels: [
          { key: 'category[0]', assertion: { id: '1' }, label: 'Eins' },
          { key: 'category[1]', assertion: { id: '2' }, label: 'Zwei' },
        ] };
        const candidates = [
          { key: 'category[0]', assertion: { id: '1' }, label: 'Eins' },
          { key: 'category[1]', assertion: { id: '2' }, label: 'Zwo' },
        ];
        const findings = [
          { key: 'category[0]', assertion: { id: '1' }, decision: 'accepted' },
          { key: 'category[1]', assertion: { id: '2' }, decision: 'corrected' },
        ];
        const corrections = [
          { key: 'category[1]', assertion: { id: '2' }, candidateLabel: 'Zwo', finalLabel: 'Zwei' },
        ];
        const finals = [
          { key: 'category[0]', assertion: { id: '1' }, label: 'Eins' },
          { key: 'category[1]', assertion: { id: '2' }, label: 'Zwei' },
        ];
        const candidateDigest = digest(candidates, 'ordered-translation-candidate-labels', 2);
        const review = {
          schemaVersion: 2,
          reviewKind: 'project-translation',
          policyVersion: pipeline.PROJECT_REVIEW_POLICY_VERSION,
          resourceId: 'fixture',
          locale: 'de',
          translationRun: {
            runId: 'translation-run', model: 'same-model', outputCandidateDigest: candidateDigest,
          },
          reviewRun: {
            runId: 'independent-review-run',
            model: 'same-model',
            inputCandidateDigest: candidateDigest,
            findingsDigest: digest(findings, 'ordered-independent-review-findings', 2),
            correctionsDigest: digest(corrections, 'ordered-independent-review-corrections', 1),
            finalDigest: digest(finals, 'ordered-project-reviewed-final-labels', 2),
          },
          records: [
            { key: 'category[0]', assertion: { id: '1' }, finalLabel: 'Eins', decision: 'accepted' },
            { key: 'category[1]', assertion: { id: '2' }, candidateLabel: 'Zwo', finalLabel: 'Zwei', decision: 'corrected' },
          ],
        };
        const reviewFileDigest = pipeline.validateReview(resource, 'de', baseRecords, overlay, review);
        if (!/^[a-f0-9]{64}$/.test(reviewFileDigest.value)) process.exit(5);
        const invalidReviews = [
          { ...review, policyVersion: 'stale-policy' },
          { ...review, reviewRun: { ...review.reviewRun, runId: review.translationRun.runId } },
          { ...review, records: [review.records[0], { ...review.records[1], candidateLabel: undefined }] },
          { ...review, translationRun: {
            ...review.translationRun,
            outputCandidateDigest: { ...candidateDigest, value: '0'.repeat(64) },
          } },
          { ...review, records: [review.records[0], { ...review.records[1], finalLabel: 'Anders' }] },
        ];
        for (const invalidReview of invalidReviews) {
          let failed = false;
          try { pipeline.validateReview(resource, 'de', baseRecords, overlay, invalidReview); }
          catch { failed = true; }
          if (!failed) process.exit(6);
        }
      `),
    ).not.toThrow();
  });

  it('requires scope-bound product-owner evidence before production clearance', () => {
    expect(() =>
      runPipelineModule(`
        const fs = await import('node:fs');
        const manifest = JSON.parse(fs.readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'));
        const expected = {
          cpc: {
            profile: 'classification-redistribution-translation',
            sourceComponentScopes: ['CPC_Ver_3.0_Structure_30Jun2025.csv'],
            conditions: [],
            uses: ['public-production-deployment', 'redistribution', 'translation-and-derivative-works'],
          },
          isic: {
            profile: 'classification-redistribution-translation',
            sourceComponentScopes: ['ISIC_Rev_5_english_structure.csv'],
            conditions: [],
            uses: ['public-production-deployment', 'redistribution', 'translation-and-derivative-works'],
          },
          'ilcd-classification': {
            profile: 'ef-reference-file-reuse',
            sourceComponentScopes: ['stylesheets/ILCDClassification_Reference.xml'],
            conditions: ['attribution-required', 'modification-notice-required', 'project-extensions-separately-identified'],
            uses: ['file-level-reuse', 'public-production-deployment'],
          },
          'ilcd-flow-categorization': {
            profile: 'ef-reference-file-reuse',
            sourceComponentScopes: ['stylesheets/ILCDFlowCategorization_Reference.xml'],
            conditions: ['attribution-required', 'modification-notice-required', 'project-extensions-separately-identified'],
            uses: ['file-level-reuse', 'public-production-deployment'],
          },
          'ilcd-locations': {
            profile: 'ef-reference-file-reuse',
            sourceComponentScopes: [
              'cellar-sparql-application-sparql-results-json-response-body',
              'stylesheets/ILCDLocations_Reference.xml',
            ],
            conditions: ['attribution-required', 'modification-notice-required', 'project-extensions-separately-identified'],
            uses: ['file-level-reuse', 'public-production-deployment'],
          },
        };
        const cleared = manifest.resources.filter(({ structureSource }) =>
          structureSource.usageTerms.status === 'production-cleared');
        if (cleared.length !== 5) process.exit(21);
        for (const resource of cleared) {
          pipeline.validateProvenance(resource);
          const evidence = resource.structureSource.usageTerms.evidence;
          if (evidence.type !== 'product-owner-attestation' || evidence.date !== '2026-07-19') process.exit(22);
          if (evidence.url !== 'https://github.com/linancn/tiangong-lca-next/issues/634#issuecomment-5012071208') process.exit(23);
          if (pipeline.stableJson(evidence.scope) !== pipeline.stableJson(expected[resource.resourceId])) process.exit(24);
        }
        const original = cleared[0];
        const invalid = [
          { ...original, structureSource: { ...original.structureSource, usageTerms: {
            ...original.structureSource.usageTerms, evidence: undefined,
          } } },
          { ...original, structureSource: { ...original.structureSource, usageTerms: {
            ...original.structureSource.usageTerms,
            evidence: { ...original.structureSource.usageTerms.evidence, type: 'license-file' },
          } } },
          { ...original, structureSource: { ...original.structureSource, usageTerms: {
            ...original.structureSource.usageTerms,
            evidence: { ...original.structureSource.usageTerms.evidence, scope: {
              ...original.structureSource.usageTerms.evidence.scope,
              uses: ['public-production-deployment', 'redistribution'],
            } },
          } } },
          { ...original, structureSource: { ...original.structureSource, usageTerms: {
            ...original.structureSource.usageTerms,
            clearanceRequirements: {
              ...original.structureSource.usageTerms.clearanceRequirements,
              sourceComponentScopes: ['not-a-digested-source'],
            },
            evidence: { ...original.structureSource.usageTerms.evidence, scope: {
              ...original.structureSource.usageTerms.evidence.scope,
              sourceComponentScopes: ['not-a-digested-source'],
            } },
          } } },
        ];
        for (const resource of invalid) {
          let failed = false;
          try { pipeline.validateProvenance(resource); } catch { failed = true; }
          if (!failed) process.exit(25);
        }

        const locations = cleared.find(({ resourceId }) => resourceId === 'ilcd-locations');
        const omittedSecondarySource = structuredClone(locations);
        omittedSecondarySource.structureSource.usageTerms.clearanceRequirements.sourceComponentScopes = [
          'stylesheets/ILCDLocations_Reference.xml',
        ];
        omittedSecondarySource.structureSource.usageTerms.evidence.scope.sourceComponentScopes = [
          'stylesheets/ILCDLocations_Reference.xml',
        ];
        const unapprovedSecondaryMapping = structuredClone(locations);
        unapprovedSecondaryMapping.officialSecondaryMappings[0].usageTerms.productionStatus = 'blocked';
        for (const resource of [omittedSecondarySource, unapprovedSecondaryMapping]) {
          let failed = false;
          try { pipeline.validateProvenance(resource); } catch { failed = true; }
          if (!failed) process.exit(26);
        }
      `),
    ).not.toThrow();
  });

  it('requires release-bound official-unavailable decisions for every project-reviewed locale', () => {
    expect(() =>
      runPipelineModule(`
        const fs = await import('node:fs');
        const manifest = JSON.parse(fs.readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'));
        for (const resource of manifest.resources) {
          pipeline.validateProjectReviewedOfficialAvailability(resource);
          const reviewedLocales = Object.entries(resource.overlays)
            .filter(([, overlay]) => overlay.status === 'project-reviewed')
            .map(([locale]) => locale)
            .sort();
          const decisionLocales = Object.keys(resource.officialAvailability.localeDecisions).sort();
          if (pipeline.stableJson(reviewedLocales) !== pipeline.stableJson(decisionLocales)) process.exit(20);
          if (resource.officialAvailability.release !== resource.edition.value) process.exit(21);
          for (const locale of reviewedLocales) {
            const decision = resource.officialAvailability.localeDecisions[locale];
            if (decision.locale !== locale || decision.status !== 'official-unavailable') process.exit(22);
          }
        }

        const original = manifest.resources.find(({ resourceId }) => resourceId === 'ilcd-locations');
        const missingLocale = structuredClone(original);
        delete missingLocale.officialAvailability.localeDecisions.fr;
        const staleRelease = structuredClone(original);
        staleRelease.officialAvailability.release = 'older release';
        const missingSource = structuredClone(original);
        missingSource.officialAvailability.sourceComponentScopes = [
          'stylesheets/ILCDLocations_Reference.xml',
        ];
        const missingMapping = structuredClone(original);
        missingMapping.officialAvailability.officialSecondaryMappingIds = [];
        for (const resource of [missingLocale, staleRelease, missingSource, missingMapping]) {
          let failed = false;
          try { pipeline.validateProjectReviewedOfficialAvailability(resource); } catch { failed = true; }
          if (!failed) process.exit(23);
        }
      `),
    ).not.toThrow();
  });

  it('binds every canonical base and official delivery to a frozen normalized source audit', () => {
    expect(() =>
      runPipelineModule(`
        const fs = await import('node:fs');
        const crypto = await import('node:crypto');
        const manifest = JSON.parse(fs.readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'));
        const expectedCounts = {
          cpc: { total: 4586, exact: 4586, projectModified: 0, projectExtension: 0 },
          isic: { total: 830, exact: 830, projectModified: 0, projectExtension: 0 },
          'ilcd-classification': { total: 243, exact: 243, projectModified: 0, projectExtension: 0 },
          'ilcd-flow-categorization': { total: 56, exact: 55, projectModified: 0, projectExtension: 1 },
          'ilcd-locations': { total: 647, exact: 225, projectModified: 45, projectExtension: 377 },
        };
        for (const resource of manifest.resources) {
          const baseDocument = JSON.parse(fs.readFileSync(resource.sourceFiles.base, 'utf8'));
          const baseRecords = pipeline.enumerateLabels(baseDocument, resource.identityStrategy);
          const auditFileBytes = fs.readFileSync(resource.structureSource.officialSourceAudit.sourceFile);
          const auditData = JSON.parse(auditFileBytes.toString('utf8'));
          const validationResource = structuredClone(resource);
          if (validationResource.edition.value !== auditData.edition) {
            validationResource.edition = {
              value: auditData.edition, verificationStatus: 'verified', note: 'Frozen audit fixture.',
            };
            validationResource.structureSource.retrievedAt = auditData.retrievedAt;
            validationResource.structureSource.sourceComponents = [{
              role: auditData.source.role,
              edition: auditData.source.edition,
              sourceUrl: auditData.source.sourceUrl,
              digest: auditData.source.rawDigest,
            }];
          }
          const validated = pipeline.validateOfficialSourceAudit({
            resource: validationResource, baseDocument, baseRecords, auditData, auditFileBytes,
          });
          if (pipeline.stableJson(validated.counts) !== pipeline.stableJson(expectedCounts[resource.resourceId])) process.exit(20);

          if (validationResource.overlays.en.status === 'official') {
            pipeline.validateOfficialDeliveryBinding(validationResource, 'en', validationResource.overlays.en, validated);
            let unboundFailed = false;
            try {
              pipeline.validateOfficialDeliveryBinding(
                validationResource,
                'en',
                { ...validationResource.overlays.en, evidence: { ...validationResource.overlays.en.evidence, sourceAuditBinding: null } },
                validated,
              );
            } catch { unboundFailed = true; }
            if (!unboundFailed) process.exit(21);
          }

          const tamperedBase = structuredClone(baseDocument);
          pipeline.enumerateLabels(tamperedBase, resource.identityStrategy)[0].applyLabel('tampered base label');
          let baseTamperFailed = false;
          try {
            pipeline.validateOfficialSourceAudit({
              resource: validationResource,
              baseDocument: tamperedBase,
              baseRecords: pipeline.enumerateLabels(tamperedBase, resource.identityStrategy),
              auditData,
              auditFileBytes,
            });
          } catch { baseTamperFailed = true; }
          if (!baseTamperFailed) process.exit(22);

          const tamperedAudit = structuredClone(auditData);
          tamperedAudit.records[0].baseLabel = 'tampered audit label';
          const tamperedBytes = Buffer.from(pipeline.stableJson(tamperedAudit, true));
          const reboundResource = structuredClone(validationResource);
          reboundResource.structureSource.officialSourceAudit.digest = {
            ...reboundResource.structureSource.officialSourceAudit.digest,
            value: crypto.createHash('sha256').update(tamperedBytes).digest('hex'),
            byteLength: tamperedBytes.byteLength,
          };
          let projectionTamperFailed = false;
          try {
            pipeline.validateOfficialSourceAudit({
              resource: reboundResource,
              baseDocument,
              baseRecords,
              auditData: tamperedAudit,
              auditFileBytes: tamperedBytes,
            });
          } catch { projectionTamperFailed = true; }
          if (!projectionTamperFailed) process.exit(23);
        }
      `),
    ).not.toThrow();
  });

  it('validates the official location crosswalk from registry-driven locale and identity closure', () => {
    expect(() =>
      runPipelineModule(`
        const fs = await import('node:fs');
        const manifest = JSON.parse(fs.readFileSync('src/services/referenceResources/reference-resource-manifest.json', 'utf8'));
        const resource = manifest.resources.find(({ resourceId }) => resourceId === 'ilcd-locations');
        const mapping = resource.officialSecondaryMappings[0];
        const sourceFileBytes = fs.readFileSync(mapping.sourceFile);
        const sourceData = JSON.parse(sourceFileBytes.toString('utf8'));
        const baseDocument = JSON.parse(fs.readFileSync(resource.sourceFiles.base, 'utf8'));
        const baseRecords = pipeline.enumerateLabels(baseDocument, resource.identityStrategy);
        const supportedLanguages = Object.keys(resource.overlays);
        const mappedLocales = Object.entries(sourceData.localeDecisions)
          .filter(([, decision]) => decision.status === 'mapped')
          .map(([locale]) => locale);
        const overlayDataByLocale = new Map(
          mappedLocales.map((locale) => [
            locale,
            JSON.parse(fs.readFileSync(
              'src/services/referenceResources/data/ilcd-locations/overlays/' + locale + '.json',
              'utf8',
            )),
          ]),
        );
        const validate = (overrides = {}) => pipeline.validateOfficialSecondaryMapping({
          resource,
          mapping,
          sourceData,
          sourceFileBytes,
          supportedLanguages,
          baseRecords,
          overlayDataByLocale,
          ...overrides,
        });
        const coverage = validate();
        const expectedIdentities = baseRecords.filter(({ assertion }) =>
          /^[A-Z]{2}$/.test(assertion.code)
        ).length;
        const expectedLocales = mappedLocales.length;
        if (
          coverage.identities !== expectedIdentities ||
          coverage.locales !== expectedLocales ||
          coverage.officialUnavailableLocales !== 0 ||
          coverage.labels !== expectedIdentities * expectedLocales
        ) process.exit(10);
        if (sourceData.records.some(({ assertion }) => !/^[A-Z]{2}$/.test(assertion.code))) process.exit(11);
        if (sourceData.records.some(({ labels }) =>
          Object.values(labels).some(({ provenanceStatus }) => provenanceStatus !== 'official-secondary-mapping')
        )) process.exit(12);

        const futureLocale = 'future-locale';
        const unavailableSourceData = {
          ...sourceData,
          localeDecisions: {
            ...sourceData.localeDecisions,
            [futureLocale]: {
              status: 'official-unavailable',
              evidence: {
                release: sourceData.release,
                retrievedAt: sourceData.retrievedAt,
                sourceUrl: mapping.sourceUrl,
                note: 'The frozen official release has no label for this locale.',
              },
            },
          },
        };
        const unavailableResource = {
          ...resource,
          overlays: {
            ...resource.overlays,
            [futureLocale]: { status: 'project-reviewed' },
          },
        };
        const unavailableCoverage = validate({
          resource: unavailableResource,
          sourceData: unavailableSourceData,
          supportedLanguages: [...supportedLanguages, futureLocale],
        });
        if (
          unavailableCoverage.locales !== mappedLocales.length ||
          unavailableCoverage.officialUnavailableLocales !== 1 ||
          unavailableCoverage.labels !== expectedIdentities * mappedLocales.length ||
          unavailableSourceData.records.some(({ labels }) => futureLocale in labels)
        ) process.exit(14);

        const failures = [
          () => validate({ supportedLanguages: [...supportedLanguages, futureLocale] }),
          () => validate({
            resource: {
              ...unavailableResource,
              overlays: {
                ...unavailableResource.overlays,
                [futureLocale]: { status: 'project-translated' },
              },
            },
            sourceData: unavailableSourceData,
            supportedLanguages: [...supportedLanguages, futureLocale],
          }),
          () => validate({
            resource: unavailableResource,
            sourceData: {
              ...unavailableSourceData,
              localeDecisions: {
                ...unavailableSourceData.localeDecisions,
                [futureLocale]: {
                  ...unavailableSourceData.localeDecisions[futureLocale],
                  evidence: {
                    ...unavailableSourceData.localeDecisions[futureLocale].evidence,
                    release: 'unversioned',
                  },
                },
              },
            },
            supportedLanguages: [...supportedLanguages, futureLocale],
          }),
          () => validate({
            resource: unavailableResource,
            sourceData: {
              ...unavailableSourceData,
              records: unavailableSourceData.records.map((record, index) =>
                index === 0
                  ? {
                      ...record,
                      labels: {
                        ...record.labels,
                        [futureLocale]: {
                          label: 'Not official',
                          provenanceStatus: 'official-secondary-mapping',
                        },
                      },
                    }
                  : record
              ),
            },
            supportedLanguages: [...supportedLanguages, futureLocale],
          }),
          () => validate({
            sourceData: {
              ...sourceData,
              records: [...sourceData.records, {
                key: 'location:GLO', assertion: { code: 'GLO' }, labels: {}, sourceConcept: 'invalid',
              }],
            },
          }),
          () => {
            const locale = mappedLocales[0];
            const tampered = structuredClone(overlayDataByLocale.get(locale));
            const key = sourceData.records[0].key;
            tampered.labels.find((item) => item.key === key).label = 'tampered';
            return validate({ overlayDataByLocale: new Map(overlayDataByLocale).set(locale, tampered) });
          },
          () => validate({
            mapping: {
              ...mapping,
              rawResponseDigest: { ...mapping.rawResponseDigest, value: '0'.repeat(64) },
            },
          }),
        ];
        for (const operation of failures) {
          let failed = false;
          try { operation(); } catch { failed = true; }
          if (!failed) process.exit(13);
        }
      `),
    ).not.toThrow();
  });

  it('ships Chinese assets with the canonical structure and repaired location labels', () => {
    const baseClassification = readGzipJson(getRuntimeAssetPath('ilcd-classification', 'en'));
    const chineseClassification = readGzipJson(getRuntimeAssetPath('ilcd-classification', 'zh'));
    expect(chineseClassification.CategorySystem.categories).toHaveLength(
      baseClassification.CategorySystem.categories.length,
    );
    expect(
      chineseClassification.CategorySystem.categories.map((group) => group['@dataType']),
    ).not.toContain('生命周期模型');

    const baseLocations = readGzipJson(getRuntimeAssetPath('ilcd-locations', 'en'));
    const chineseLocations = readGzipJson(getRuntimeAssetPath('ilcd-locations', 'zh'));
    const baseCodes = baseLocations.ILCDLocations.location.map((item) => item['@value']);
    const chineseCodes = chineseLocations.ILCDLocations.location.map((item) => item['@value']);
    expect(chineseCodes).toEqual(baseCodes);
    expect(chineseCodes).toContain('CN-AH-CAH');
    expect(chineseCodes).toContain('CN-SD-LWS');
    expect(chineseCodes).not.toContain('CN-HI-SSS');
    expect(chineseCodes).not.toContain('CN-HI-DNZ');
    const chineseByCode = new Map(
      chineseLocations.ILCDLocations.location.map((item) => [item['@value'], item['#text']]),
    );
    expect(chineseByCode.get('CN-AH-CAH')).toBe('中国,安徽省,巢湖市');
    expect(chineseByCode.get('CN-SD-LWS')).toBe('中国,山东省,莱芜市');
    expect(chineseByCode.get('FR')).toBe('法国');
    expect(chineseByCode.get('GA')).toBe('加蓬');
  });
});
