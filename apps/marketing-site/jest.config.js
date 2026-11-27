/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  // tsconfig.json sets jsx: "preserve" (needed for Next's own build), but
  // ts-jest needs JSX actually compiled to run component tests under Node.
  // This override only affects test compilation, not the app build/typecheck.
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
};
