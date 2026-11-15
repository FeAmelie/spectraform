import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const testsOnly = process.argv.includes("--tests-only");
const externalTargetDirectory = process.env.SPECTRAFORM_CARGO_TARGET_DIR;
const targetDirectory =
  externalTargetDirectory ?? mkdtempSync(join(tmpdir(), "spectraform-validate-"));

try {
  if (!testsOnly) {
    for (const checker of [
      "check-foundation.mts",
      "check-repository-policy.mts",
      "check-dependency-direction.mts",
      "check-security-surface.mts",
    ]) {
      run(process.execPath, [join(root, "scripts", checker)]);
    }
    run("pnpm", ["exec", "prettier", "--check", "."]);
    run("pnpm", ["exec", "eslint", "."]);
    run("pnpm", ["exec", "tsc", "--noEmit"]);
    run("cargo", ["fmt", "--manifest-path", "src-tauri/Cargo.toml", "--all", "--", "--check"]);
    run("cargo", [
      "clippy",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--locked",
      "--offline",
      "--all-targets",
      "--",
      "-D",
      "warnings",
    ]);
  }

  const nodeTests = collectTests(join(root, "tests"));
  run(process.execPath, ["--test", ...nodeTests]);
  run("cargo", ["test", "--manifest-path", "src-tauri/Cargo.toml", "--locked", "--offline"]);
  console.log(`validate: pass${testsOnly ? " (tests only)" : ""}`);
} finally {
  if (!externalTargetDirectory) rmSync(targetDirectory, { recursive: true, force: true });
}

function collectTests(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "e2e") return collectTests(path);
      return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
    })
    .sort();
}

function run(command: string, commandArgs: string[]): void {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, CARGO_TARGET_DIR: targetDirectory },
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`validate: ${command} is unavailable (${result.error.message})`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
