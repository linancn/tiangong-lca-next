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
    const releaseGate = read('.github/workflows/release-gate.yml');
    expect(releaseGate).toContain('run: npm run lcia-cache:verify');
    expect(releaseGate).toContain('run: npm run release:preflight');
    expect(releaseGate).toContain('run: npm run prepush:gate');
    expect(releaseGate.indexOf('npm run lcia-cache:verify')).toBeLessThan(
      releaseGate.indexOf('npm run release:preflight'),
    );
    expect(releaseGate.indexOf('npm run release:preflight')).toBeLessThan(
      releaseGate.indexOf('npm run prepush:gate'),
    );
    expect(releaseGate).not.toContain('run: npm run test:ci');
    expect(workflow).toContain('uses: ./.github/workflows/release-gate.yml');
    expect(workflow).toContain('release_head: ${{ needs.release-context.outputs.release_head }}');

    const webDeploy = workflow.slice(
      workflow.indexOf('  web-deploy:'),
      workflow.indexOf('  release:', workflow.indexOf('  web-deploy:')),
    );
    const electronRelease = workflow.slice(
      workflow.indexOf('  release:', workflow.indexOf('  web-deploy:')),
      workflow.indexOf('  verify-release:'),
    );
    expect(webDeploy).toMatch(/needs:[\s\S]*- release-gate/);
    expect(webDeploy).toMatch(/needs:[\s\S]*- release-tag/);
    expect(electronRelease).toMatch(/needs:[\s\S]*- release-gate/);
    expect(electronRelease).toMatch(/needs:[\s\S]*- release-tag/);
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
      releaseWorkflow.indexOf('  release-tag:'),
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
      expect(publicationJob).toMatch(/needs:[\s\S]*- release-tag/);
    }
  });

  it('validates every main-target PR with the reusable release gate', () => {
    const workflow = read('.github/workflows/release-readiness.yml');
    expect(workflow).toContain('pull_request:');
    expect(workflow).toMatch(/branches:\s*\n\s*- main/);
    expect(workflow).toContain('uses: ./.github/workflows/release-gate.yml');
    expect(workflow).toContain('release_base: ${{ github.event.pull_request.base.sha }}');
    expect(workflow).toContain('release_head: ${{ github.event.pull_request.head.sha }}');
  });

  it('publishes a release tag only after both release gates pass', () => {
    const workflow = read('.github/workflows/build.yml');
    const releaseContext = workflow.slice(
      workflow.indexOf('  release-context:'),
      workflow.indexOf('  release-gate:'),
    );
    const releaseTag = workflow.slice(
      workflow.indexOf('  release-tag:'),
      workflow.indexOf('  release-draft:'),
    );

    expect(releaseContext).not.toContain('git tag "${tag_name}"');
    expect(releaseContext).not.toContain('git push origin "refs/tags/${tag_name}"');
    expect(releaseTag).toMatch(/needs:[\s\S]*- release-gate/);
    expect(releaseTag).toMatch(/needs:[\s\S]*- release-semantic-e2e/);
    expect(releaseTag).toContain('git tag "${TAG_NAME}" "${RELEASE_HEAD}"');
    expect(releaseTag).toContain('git push origin "refs/tags/${TAG_NAME}"');
  });
});
