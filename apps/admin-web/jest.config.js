/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  // Mirrors tsconfig.json's "@/*" -> "./src/*" path alias, used throughout
  // every feature's api/hooks modules (e.g. `@/lib/apiClient`). No prior
  // test exercised a value-import through this alias, so this mapping was
  // missing until task 0010/W2 added tests that do.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
