import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const checker = resolve(root, "scripts/check-workflow.mts");
const workflow = resolve(root, ".github/workflows/foundation.yml");

function run(...args: string[]) {
  return spawnSync(process.execPath, [checker, ...args], { cwd: root, encoding: "utf8" });
}

test("the Foundation workflow has pinned, separately visible canonical gates", () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /pass jobs=8 aggregate=foundation cache=lockfile/u);
});

test("controlled lint and test failures block the aggregate", () => {
  for (const gate of ["lint", "tests"]) {
    const result = run(`--probe-failure=${gate}`);
    assert.equal(result.status, 1, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      status: "fail",
      failedGate: gate,
      aggregateStatus: "blocked",
      childExitCode: 23,
    });
  }
});

test("signing secrets and project assets are rejected", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "spectraform-workflow-contract-"));
  const fixture = resolve(directory, "foundation.yml");
  try {
    const source = readFileSync(workflow, "utf8");
    writeFileSync(
      fixture,
      `${source}\n# forbidden fixture \${{ secrets.SIGNING_KEY }} assets/imported/project.svg\n`,
    );
    const result = run("--workflow", fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /forbidden dependency: secrets\./u);
    assert.match(result.stderr, /forbidden dependency: assets\/imported/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
