/** @type {import('ts-jest').JestConfigWithTsJest} */

const esModules = ['nanoid'].join('|');

module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest/setup.js'],
  clearMocks: true,
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/packages/**/?(*.)test.ts(x|)'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  moduleNameMapper: {
    '^nanoid(/(.*)|$)': 'nanoid$1',
    // Resolve workspace packages to their sources, as tsconfig.json's paths do, rather than to
    // installed copies or builds that can be stale
    '^@craftjs/(core|layers|utils)$': '<rootDir>/packages/$1/src',
  },
};
