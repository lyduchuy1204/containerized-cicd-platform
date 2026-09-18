module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': require.resolve('ts-jest') },
  collectCoverageFrom: ['src/domain/**/*.ts'],
  testEnvironment: 'node',
};
