/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      jsx: "react-jsx",
    }],
  },
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/",
    "\\.styles\\.ts$",
  ],
};
