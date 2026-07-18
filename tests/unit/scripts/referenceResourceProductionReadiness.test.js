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
    overlays = { en: { status: 'official' }, de: { status: 'project-reviewed' } },
    assets = { en: { fileName: 'base.gz' }, de: { fileName: 'de.gz' } },
  } = {}) => ({
    resourceId: 'example',
    required: true,
    overlays,
    runtime: { assets },
    structureSource: { usageTerms: {
      status: usageStatus,
      productionStatus,
      ownerIssue: productionStatus === 'ready' ? null : '#634',
      blockerReason: productionStatus === 'ready' ? null : 'Clearance is pending.',
    } },
  });
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
          productionStatus: 'blocked',
          usageStatus: 'rights-clearance-required',
        })] };
        let message = '';
        try { pipeline.assertReferenceResourcesProductionReady(manifest, ['en', 'de']); }
        catch (error) { message = error.message; }
        if (!/example \\(#634\\): usage terms are rights-clearance-required/u.test(message)) process.exit(3);
      `),
    ).not.toThrow();
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
