const { configUmiAlias, createConfig } = require('@umijs/max/test');

module.exports = async () => {
  const config = await configUmiAlias({
    ...createConfig({
      target: 'browser',
    }),
  });

  return {
    ...config,
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
      '!src/**/index.ts',
      '!src/**/typings.d.ts',
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
      ...config.moduleNameMapper,
      '^@/tests/(.*)$': '<rootDir>/tests/$1',
    },
    verbose: true,
  };
};
