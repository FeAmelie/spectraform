import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const bootstrap = resolve(root, "scripts/bootstrap.mts");
const validVersions = "node:24.22.2,pnpm:12.19.0,rust:1.99.1,ffmpeg:9.0.2";

test("bootstrap install path is repeatable and leaves tracked files unchanged", () => {
  const temporary = mkdtempSync(join(tmpdir(), "spectraform-bootstrap-test-"));
  const fakePnpm = join(temporary, "pnpm");
  const invocationLog = join(temporary, "pnpm-invocations.jsonl");
  writeFileSync(
    fakePnpm,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
appendFileSync(process.env.SPECTRAFORM_BOOTSTRAP_PNPM_LOG, JSON.stringify(process.argv.slice(2)) + "\\n");
`,
  );
  chmodSync(fakePnpm, 0o755);

  const before = trackedDiff();
  try {
    for (let run = 0; run < 2; run += 1) {
      const result = spawnSync(process.execPath, [bootstrap, `--versions=${validVersions}`], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${temporary}${delimiter}${process.env.PATH ?? ""}`,
          SPECTRAFORM_BOOTSTRAP_PNPM_LOG: invocationLog,
          SPECTRAFORM_PNPM_STORE_DIR: join(temporary, "store"),
        },
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /bootstrap: pass/);
    }

    const invocations = readFileSync(invocationLog, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as string[]);
    assert.equal(invocations.length, 2);
    for (const args of invocations) {
      assert.equal(args[0], "install");
      assert.ok(args.includes("--frozen-lockfile"));
      assert.ok(args.some((argument) => argument.startsWith("--store-dir")));
    }
    assert.equal(trackedDiff(), before);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test("missing prerequisites return actionable local installation guidance", () => {
  const result = spawnSync(
    process.execPath,
    [bootstrap, "--verify-only", "--versions=node:24.22.1,pnpm:12.19.0,rust:1.99.1"],
    { cwd: root, encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Install the version in \.node-version/);
});

test("manifest exposes canonical commands and Brewfile contains only ffmpeg", () => {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  for (const command of ["bootstrap", "dev", "validate", "test", "build", "export:smoke"]) {
    assert.ok(packageJson.scripts[command], `missing package script: ${command}`);
  }

  const brewfile = readFileSync(resolve(root, "Brewfile"), "utf8");
  assert.equal(brewfile, 'brew "ffmpeg"\n');
  assert.doesNotMatch(brewfile, /cask/i);
});

test("bootstrap never invokes a global package or Homebrew mutation", () => {
  const source = readFileSync(bootstrap, "utf8");
  assert.doesNotMatch(source, /spawnSync\(\s*["'](?:brew|npm)["']/u);
  assert.doesNotMatch(source, /run\(\s*["']brew["']/u);
  assert.doesNotMatch(source, /["'](?:--global|-g)["']/u);
  assert.match(source, /--frozen-lockfile/);
  assert.match(source, /SPECTRAFORM_PNPM_STORE_DIR/);
});

function trackedDiff(): string {
  const result = spawnSync("git", ["diff", "--binary", "--", "."], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
