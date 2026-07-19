import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const pipelineUrl = pathToFileURL(
  `${process.cwd()}/scripts/reference-data/reference-resource-pipeline.mjs`,
).href;

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

const fixtureSource = `
  const resource = ({
    productionStatus = 'ready',
    usageStatus = 'production-cleared',
    withEvidence = true,
    overlays = { en: { status: 'official' }, de: { status: 'project-reviewed' } },
    assets = { en: { fileName: 'base.gz' }, de: { fileName: 'de.gz' } },
  } = {}) => {
    const scope = {
      profile: 'classification-redistribution-translation',
      sourceComponentScopes: ['example.csv'],
      conditions: [],
      uses: ['public-production-deployment', 'redistribution', 'translation-and-derivative-works'],
    };
    const projectReviewedLocales = Object.entries(overlays)
      .filter(([, overlay]) => overlay.status === 'project-reviewed')
      .map(([locale]) => locale);
    return {
      resourceId: 'example',
      required: true,
      edition: { value: 'Example edition' },
      officialAvailability: {
        schemaVersion: 1,
        release: 'Example edition',
        retrievedAt: '2026-07-19',
        sourceUrl: 'https://example.com/source',
        sourceComponentScopes: ['example.csv'],
        officialSecondaryMappingIds: [],
        localeDecisions: Object.fromEntries(projectReviewedLocales.map((locale) => [locale, {
          locale,
          status: 'official-unavailable',
          note: 'No complete official same-edition locale fixture is available.',
        }])),
      },
      overlays,
      runtime: { assets },
      structureSource: {
        retrievedAt: '2026-07-19',
        sourceComponents: [{ sourceUrl: 'https://example.com/source', digest: { scope: 'example.csv' } }],
        usageTerms: {
          status: usageStatus,
          productionStatus,
          ownerIssue: productionStatus === 'ready' ? null : '#634',
          blockerReason: productionStatus === 'ready' ? null : 'Clearance is pending.',
          clearanceRequirements: scope,
          evidence: withEvidence ? {
            schemaVersion: 1,
            type: 'product-owner-attestation',
            date: '2026-07-19',
            url: 'https://example.com/attestation',
            resourceId: 'example',
            edition: 'Example edition',
            note: 'Product-owner attestation fixture.',
            scope,
          } : undefined,
        },
      },
    };
  };
`;

describe('reference-resource production readiness', () => {
  it('accepts only native official or project-reviewed assets with explicit clearance', () => {
    expect(() =>
      runPipelineModule(`${fixtureSource}
        const manifest = { resources: [resource()] };
        if (pipeline.getReferenceResourceProductionBlockers(manifest, ['en', 'de']).length) process.exit(2);
        pipeline.assertReferenceResourcesProductionReady(manifest, ['en', 'de']);
      `),
    ).not.toThrow();
  });

  it('fails closed when usage terms are not production-cleared', () => {
    expect(() =>
      runPipelineModule(`${fixtureSource}
        const manifest = { resources: [resource({
          productionStatus: 'ready',
          usageStatus: 'rights-clearance-required',
        })] };
        let message = '';
        try { pipeline.assertReferenceResourcesProductionReady(manifest, ['en', 'de']); }
        catch (error) { message = error.message; }
        if (!/example \\(#634\\): usage terms are rights-clearance-required/u.test(message)) process.exit(3);
      `),
    ).not.toThrow();
  });

  it('fails closed when only the production-cleared status string is present', () => {
    const output = runPipelineModule(`${fixtureSource}
      const manifest = { resources: [resource({ withEvidence: false })] };
      console.log(JSON.stringify(pipeline.getReferenceResourceProductionBlockers(manifest, ['en', 'de'])));
    `);

    expect(JSON.parse(output)).toEqual([
      expect.objectContaining({
        resourceId: 'example',
        locale: null,
        ownerIssue: '#634',
        reason: expect.stringContaining('production-clearance evidence is invalid'),
      }),
    ]);
  });

  it('fails closed when project-reviewed official-unavailable evidence is absent or stale', () => {
    const output = runPipelineModule(`${fixtureSource}
      const missing = resource();
      delete missing.officialAvailability.localeDecisions.de;
      const stale = resource();
      stale.officialAvailability.release = 'Older edition';
      console.log(JSON.stringify([
        pipeline.getReferenceResourceProductionBlockers({ resources: [missing] }, ['en', 'de']),
        pipeline.getReferenceResourceProductionBlockers({ resources: [stale] }, ['en', 'de']),
      ]));
    `);

    for (const blockers of JSON.parse(output)) {
      expect(blockers).toContainEqual(
        expect.objectContaining({
          resourceId: 'example',
          locale: null,
          ownerIssue: '#634',
          reason: expect.stringContaining('official-availability evidence is invalid'),
        }),
      );
    }
  });

  it('automatically blocks a newly registered language without a reviewed native asset', () => {
    const output = runPipelineModule(`${fixtureSource}
      const manifest = { resources: [resource()] };
      console.log(JSON.stringify(pipeline.getReferenceResourceProductionBlockers(manifest, ['en', 'de', 'fr'])));
    `);

    expect(JSON.parse(output)).toEqual([
      {
        resourceId: 'example',
        locale: 'fr',
        ownerIssue: '#634',
        reason: 'delivery declaration is missing',
      },
    ]);
  });

  it('rejects a development fallback even when an asset entry exists', () => {
    const output = runPipelineModule(`${fixtureSource}
      const manifest = { resources: [resource({ overlays: {
        en: { status: 'official' },
        de: { status: 'development-base', ownerIssue: '#634' },
      } })] };
      console.log(JSON.stringify(pipeline.getReferenceResourceProductionBlockers(manifest, ['en', 'de'])));
    `);

    expect(JSON.parse(output)).toContainEqual({
      resourceId: 'example',
      locale: 'de',
      ownerIssue: '#634',
      reason: 'delivery status is development-base',
    });
  });
});
