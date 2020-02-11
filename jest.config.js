module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    "<rootDir>/dist",
    "<rootDir>/node_modules",
  ],
  testPathIgnorePatterns: [
    "<rootDir>/dist",
    "<rootDir>/node_modules",
  ]
};
