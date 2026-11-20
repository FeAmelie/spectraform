import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test as nodeTest } from "node:test";

const root = resolve(import.meta.dirname, "../..");
const layers = ["unit", "contract", "integration", "visual", "desktop"] as const;
const foundationTest = globalThis.test ?? nodeTest;

foundationTest("the canonical harness declares all five isolated headless layers", () => {
  const vitestConfig = readFileSync(resolve(root, "vitest.config.ts"), "utf8");
  const playwrightConfig = readFileSync(resolve(root, "playwright.config.ts"), "utf8");
  const aggregator = readFileSync(resolve(root, "scripts/run-foundation-tests.mts"), "utf8");

  for (const layer of layers) assert.match(aggregator, new RegExp(`id: "${layer}"`, "u"));
  assert.match(vitestConfig, /environment:\s*"node"/u);
  assert.match(playwrightConfig, /headless:\s*true/u);
  assert.match(playwrightConfig, /offline:\s*true/u);
  assert.match(playwrightConfig, /SPECTRAFORM_PLAYWRIGHT_OUTPUT_DIR/u);
  assert.match(aggregator, /generatedOutputPaths/u);
  assert.match(aggregator, /rmSync\(harnessOutputRoot/u);
  assert.doesNotMatch(playwrightConfig, /webServer|launchOptions:\s*\{[^}]*headless:\s*false/su);
});

foundationTest("a controlled failure is attributed to every layer with exit code one", () => {
  for (const layer of layers) {
    const result = spawnSync(
      process.execPath,
      ["scripts/run-foundation-tests.mts", "--probe-failure", layer],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 1, `${layer}: ${result.stderr}`);
    const report = JSON.parse(result.stdout.trim()) as {
      status: string;
      failedLayer: string;
      layers: Array<{ id: string; status: string; childExitCode: number }>;
    };
    assert.equal(report.status, "fail");
    assert.equal(report.failedLayer, layer);
    assert.deepEqual(report.layers, [{ id: layer, status: "fail", childExitCode: 23 }]);
  }
  assert.equal(existsSync(resolve(root, "test-results")), false);
  assert.equal(existsSync(resolve(root, "src-tauri/gen")), false);
});
