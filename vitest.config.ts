const foundationVitestConfig = {
  test: {
    name: "foundation-headless",
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup/vitest.ts"],
    include: [
      "tests/contracts/foundation-smoke.test.ts",
      "tests/integration/foundation-smoke.test.ts",
      "tests/visual/foundation-smoke.test.ts",
    ],
    fileParallelism: false,
    maxWorkers: 1,
    isolate: true,
    passWithNoTests: false,
    testTimeout: 15_000,
  },
};

export default foundationVitestConfig;
