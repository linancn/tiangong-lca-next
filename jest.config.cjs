const { configUmiAlias, createConfig } = require('@umijs/max/test');

module.exports = async () => {
  const isCI = process.env.CI === 'true' || process.env.CI === '1';
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
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
    },
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
      '<rootDir>/tests/**/*.test.{ts,tsx,js,jsx}',
      '<rootDir>/src/**/*.test.{ts,tsx,js,jsx}',
    ],
    moduleNameMapper: {
      '^@/tests/(.*)$': '<rootDir>/tests/$1',
      ...config.moduleNameMapper,
    },
    reporters: ['default', '<rootDir>/tests/reporters/failureSkippedSummaryReporter.js'],
    verbose: !isCI,
  };
};
