const { configUmiAlias, createConfig } = require('@umijs/max/test');

module.exports = async () => {
  const isCI = process.env.CI === 'true' || process.env.CI === '1';
  // Local Docker bind mounts can be root-owned and unreadable to Jest crawlers.
  const dockerPathIgnores = ['<rootDir>/docker/volumes/db/data'];
  const config = await configUmiAlias({
    ...createConfig({
      target: 'browser',
    }),
  });

  return {
    ...config,
    clearMocks: true,
    openHandlesTimeout: 5000,
    testEnvironmentOptions: {
      ...(config?.testEnvironmentOptions || {}),
      url: 'http://localhost:8000',
    },
    setupFilesAfterEnv: [
      ...(config.setupFilesAfterEnv || []),
      './tests/setupTests.jsx',
    ],
    globals: {
      ...config.globals,
      localStorage: null,
    },
    collectCoverageFrom: [
      'src/**/*.{ts,tsx,js,jsx}',
      '!src/**/*.d.ts',
      '!src/.umi/**',
      '!src/.umi-production/**',
      '!src/.umi-test/**',
      '!src/**/typings.d.ts',
      '!src/service-worker.js',
      '!src/**/*.test.{ts,tsx,js,jsx}',
      '!src/**/*.spec.{ts,tsx,js,jsx}',
      // Exclude simple re-export index files
      '!src/components/index.ts',
      '!src/locales/en-US.ts',
      '!src/locales/zh-CN.ts',
      // Exclude type definition files
      '!src/services/**/data.ts',
    ],
    coverageThreshold: {
      global: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    coverageReporters: ['text', 'text-summary', 'json', 'json-summary', 'lcov', 'html'],
    testMatch: [
      '<rootDir>/tests/**/*.test.{ts,tsx,js,jsx}',
      '<rootDir>/src/**/*.test.{ts,tsx,js,jsx}',
    ],
    modulePathIgnorePatterns: [
      ...(config.modulePathIgnorePatterns || []),
      ...dockerPathIgnores,
    ],
    moduleNameMapper: {
      '^@tiangong-lca/tidas-sdk/core$': '<rootDir>/tests/mocks/tidas-sdk-core.js',
      '^@/tests/(.*)$': '<rootDir>/tests/$1',
      ...config.moduleNameMapper,
    },
    reporters: ['default', '<rootDir>/tests/reporters/failureSkippedSummaryReporter.js'],
    verbose: !isCI,
    watchPathIgnorePatterns: [
      ...(config.watchPathIgnorePatterns || []),
      ...dockerPathIgnores,
    ],
  };
};
