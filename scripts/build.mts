import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = mkdtempSync(join(tmpdir(), "spectraform-build-"));
const externalTargetDirectory = process.env.SPECTRAFORM_CARGO_TARGET_DIR;

try {
  run("pnpm", ["exec", "tsc", "--noEmit"]);
  run("pnpm", ["exec", "vite", "build", "--outDir", join(output, "web"), "--emptyOutDir"]);
  run("cargo", ["build", "--manifest-path", "src-tauri/Cargo.toml", "--locked", "--offline"], {
    CARGO_TARGET_DIR: externalTargetDirectory ?? join(output, "cargo"),
  });
  console.log("build: pass (temporary outputs removed)");
} finally {
  rmSync(output, { recursive: true, force: true });
}

function run(command: string, commandArgs: string[], extraEnv: NodeJS.ProcessEnv = {}): void {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (result.error) {
    console.error(`build: ${command} is unavailable (${result.error.message})`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
