import fs from 'node:fs';
import path from 'node:path';

const repositoryRoot = path.resolve(__dirname, '../../..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

describe('pnpm package-manager contract', () => {
  it('pins pnpm 11 and keeps a single pnpm lockfile', () => {
    const packageJson = JSON.parse(read('package.json'));

    expect(packageJson.packageManager).toBe('pnpm@11.22.0');
    expect(packageJson.engines).toMatchObject({ node: '>=24.0.0', pnpm: '11.22.0' });
    expect(packageJson.devDependencies['@jest/test-sequencer']).toBe('^29.7.0');
    expect(fs.existsSync(path.join(repositoryRoot, 'pnpm-lock.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(repositoryRoot, 'package-lock.json'))).toBe(false);
    expect(fs.existsSync(path.join(repositoryRoot, 'yarn.lock'))).toBe(false);
  });

  it('uses only the reviewed isolated-linker compatibility and build policy', () => {
    const workspace = read('pnpm-workspace.yaml');

    expect(workspace).not.toContain("  - '@ant-design/*'");
    expect(workspace).toContain("  - '@babel/*'");
    expect(workspace).toContain('  - umi');
    expect(workspace).toMatch(/electron-winstaller:\s+true/u);
    expect(workspace).toMatch(/esbuild:\s+true/u);
    expect(workspace).toMatch(/core-js:\s+false/u);
    expect(workspace).toMatch(/core-js-pure:\s+false/u);
    expect(workspace).toMatch(/es5-ext:\s+false/u);
    expect(workspace).toContain("'@umijs/max>antd': 6.6.1");
    expect(workspace).toContain("'@umijs/plugins>@ant-design/pro-components': 3.1.14-6");
    expect(workspace).toContain("'@umijs/preset-umi>react': 19.2.8");
    expect(workspace).toContain("'@umijs/preset-umi>react-dom': 19.2.8");
    expect(workspace).toContain("'@umijs/server>react': 19.2.8");
    expect(workspace).toContain("'@umijs/server>react-dom': 19.2.8");
    expect(workspace).not.toMatch(
      /set this to true or false|shamefullyHoist|dangerouslyAllowAllBuilds/u,
    );
  });

  it('pins one native React 19 and Ant Design 6 application stack', () => {
    const packageJson = JSON.parse(read('package.json'));
    const config = read('config/config.ts');
    const lockfile = read('pnpm-lock.yaml');

    expect(packageJson.dependencies).toMatchObject({
      '@ant-design/icons': '6.3.2',
      '@ant-design/pro-components': '3.1.14-6',
      antd: '6.6.1',
      react: '19.2.8',
      'react-dom': '19.2.8',
    });
    expect(packageJson.devDependencies).toMatchObject({
      '@types/react': '19.2.18',
      '@types/react-dom': '19.2.4',
      '@umijs/max': '4.7.7',
      '@umijs/max-plugin-openapi': '2.0.3',
      '@umijs/request-record': '1.1.4',
    });
    expect(packageJson.devDependencies).not.toHaveProperty('umi-presets-pro');
    expect(config).toContain("plugins: ['@umijs/max-plugin-openapi', '@umijs/request-record']");
    expect(config).not.toContain('root-entry-name');
    expect(config).not.toContain('umi-presets-pro');
    expect(lockfile).not.toMatch(/(?:^|\W)antd@(?:4|5)\./mu);
    expect(lockfile).not.toMatch(/@ant-design\/pro-components@2\./u);
    expect(lockfile).not.toMatch(/(?:^|\W)react(?:-dom)?@18\./mu);
  });

  it('contains no npm, npx, or yarn executable in active package-manager entrypoints', () => {
    const entrypoints = [
      'package.json',
      '.husky/pre-commit',
      '.husky/pre-push',
      '.dockerignore',
      'Dockerfile.app',
      'docker/e2e/Dockerfile',
      'playwright.config.ts',
      'playwright.closure-download.config.ts',
      'config/docs-capture/profile.v1.json',
      'src/locales/de-DE/pages.ts',
      'src/locales/en-US/pages.ts',
      'src/locales/fr-FR/pages.ts',
      'src/locales/zh-CN/pages.ts',
      ...fs
        .readdirSync(path.join(repositoryRoot, '.github/workflows'))
        .map((fileName) => `.github/workflows/${fileName}`),
    ];
    const legacyCommand = /(^|[\s"'`:])(?:npm|npx|yarn)(?=$|[\s"'])/mu;
    const npmStylePnpmSeparator = /\bpnpm(?: --silent)? [^\s`]+ --(?:\s|$)/u;

    for (const relativePath of entrypoints) {
      expect({ relativePath, source: read(relativePath) }).toEqual({
        relativePath,
        source: expect.not.stringMatching(legacyCommand),
      });
      expect({ relativePath, source: read(relativePath) }).toEqual({
        relativePath,
        source: expect.not.stringMatching(npmStylePnpmSeparator),
      });
    }
  });

  it('documents pnpm script arguments without the npm-only separator', () => {
    const documents = [
      'AGENTS.md',
      'DEV.md',
      ...fs
        .readdirSync(path.join(repositoryRoot, 'docs/agents'))
        .filter((fileName) => fileName.endsWith('.md'))
        .map((fileName) => `docs/agents/${fileName}`),
      'docs/plans/i18n-de-DE/README.md',
      'docs/plans/i18n-fr-FR/README.md',
    ];
    const npmStylePnpmSeparator = /\bpnpm(?: --silent)? [^\s`]+ --(?:\s|$)/u;

    for (const relativePath of documents) {
      expect({ relativePath, source: read(relativePath) }).toEqual({
        relativePath,
        source: expect.not.stringMatching(npmStylePnpmSeparator),
      });
    }
  });

  it('uses frozen installs and binds every pnpm install input in containers', () => {
    const workflows = fs
      .readdirSync(path.join(repositoryRoot, '.github/workflows'))
      .map((fileName) => read(`.github/workflows/${fileName}`))
      .join('\n');
    const appDockerfile = read('Dockerfile.app');
    const e2eDockerfile = read('docker/e2e/Dockerfile');

    expect(workflows).toContain('pnpm install --frozen-lockfile');
    expect(workflows).not.toContain('package-lock.json');
    for (const dockerfile of [appDockerfile, e2eDockerfile]) {
      expect(dockerfile).toContain('pnpm-lock.yaml');
      expect(dockerfile).toContain('pnpm-workspace.yaml');
      expect(dockerfile).toContain('pnpm install --frozen-lockfile');
    }
  });
});
