import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest'],
    '^.+\\.js$': ['@swc/jest'],
  },
  moduleNameMapper: {
    '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/setup-tests.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(@patternfly/react-data-view|@patternfly/react-tokens|@patternfly/react-charts|victory-.+|victory)/)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**',
    '!src/console-sdk-shims.d.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 30,
      functions: 40,
      lines: 50,
    },
  },
};

export default config;
