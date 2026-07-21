import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Publication workflow gates', () => {
  it('verifies the reviewed bundle before the manual web build and deploy', () => {
    const workflow = read('.github/workflows/ci.yml');
    const verifyAt = workflow.indexOf('run: npm run lcia-cache:verify');
    const buildAt = workflow.indexOf('run: npm run build');
    const deployAt = workflow.indexOf('Deploy to EdgeOne Pages');
    expect(verifyAt).toBeGreaterThan(0);
    expect(verifyAt).toBeLessThan(buildAt);
    expect(buildAt).toBeLessThan(deployAt);
  });

  it('makes the release gate verify the bundle before any web or Electron publication job', () => {
    const workflow = read('.github/workflows/build.yml');
    const releaseGate = workflow.slice(
      workflow.indexOf('  release-gate:'),
      workflow.indexOf('  release-draft:'),
    );
    expect(releaseGate).toContain('run: npm run lcia-cache:verify');
    expect(releaseGate).toContain('run: npm run prepush:gate');
    expect(releaseGate.indexOf('npm run lcia-cache:verify')).toBeLessThan(
      releaseGate.indexOf('npm run prepush:gate'),
    );
    expect(releaseGate).not.toContain('run: npm run test:ci');

    const webDeploy = workflow.slice(
      workflow.indexOf('  web-deploy:'),
      workflow.indexOf('  release:', workflow.indexOf('  web-deploy:')),
    );
    const electronRelease = workflow.slice(
      workflow.indexOf('  release:', workflow.indexOf('  web-deploy:')),
      workflow.indexOf('  verify-release:'),
    );
    expect(webDeploy).toMatch(/needs:[\s\S]*- release-gate/);
    expect(electronRelease).toMatch(/needs:[\s\S]*- release-gate/);
  });

  it('keeps the local pre-push gate aligned with the release gate', () => {
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.scripts['prepush:gate']).toContain('npm run lcia-cache:verify');
  });

  it('keeps browser semantic E2E optional for daily work and mandatory for releases', () => {
    const semanticWorkflow = read('.github/workflows/i18n-semantic-e2e.yml');
    expect(semanticWorkflow).toContain('  workflow_call:');
    expect(semanticWorkflow).toContain('  workflow_dispatch:');
    expect(semanticWorkflow).not.toContain('  pull_request:');
    expect(semanticWorkflow).not.toContain('  push:');
    expect(semanticWorkflow).toContain('ref: ${{ inputs.ref || github.sha }}');
    expect(semanticWorkflow).toContain("E2E_ALLOW_PRODUCTION_DATA: 'false'");
    expect(semanticWorkflow).toContain("E2E_AUTHENTICATED: 'false'");
    expect(semanticWorkflow).not.toContain('E2E_PRODUCTION_WRITE_CONFIRMATION');
    expect(semanticWorkflow).not.toContain('E2E_WRITE_VERIFIED_EVIDENCE');

    const releaseWorkflow = read('.github/workflows/build.yml');
    const semanticJob = releaseWorkflow.slice(
      releaseWorkflow.indexOf('  release-semantic-e2e:'),
      releaseWorkflow.indexOf('  release-draft:'),
    );
    expect(semanticJob).toContain('uses: ./.github/workflows/i18n-semantic-e2e.yml');
    expect(semanticJob).toContain('ref: ${{ needs.release-context.outputs.release_head }}');
    expect(semanticJob).not.toContain('secrets:');

    const publicationJobs = [
      releaseWorkflow.slice(
        releaseWorkflow.indexOf('  release-draft:'),
        releaseWorkflow.indexOf('  web-deploy:'),
      ),
      releaseWorkflow.slice(
        releaseWorkflow.indexOf('  web-deploy:'),
        releaseWorkflow.indexOf('  release:', releaseWorkflow.indexOf('  web-deploy:')),
      ),
      releaseWorkflow.slice(
        releaseWorkflow.indexOf('  release:', releaseWorkflow.indexOf('  web-deploy:')),
        releaseWorkflow.indexOf('  verify-release:'),
      ),
    ];
    for (const publicationJob of publicationJobs) {
      expect(publicationJob).toMatch(/needs:[\s\S]*- release-semantic-e2e/);
    }
  });
});
