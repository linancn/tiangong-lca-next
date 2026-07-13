import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('LCIA cache publication gates', () => {
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
    expect(releaseGate.indexOf('npm run lcia-cache:verify')).toBeLessThan(
      releaseGate.indexOf('npm run test:ci'),
    );

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
});
