/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/rules/"],
  moduleFileExtensions: ["ts", "js", "json"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/",
    "/lib/",
  ],
};
