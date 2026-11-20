import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

test("the native application launches only through the established headless smoke path", () => {
  const suppliedTarget = process.env.SPECTRAFORM_CARGO_TARGET_DIR;
  const cargoTarget = suppliedTarget ?? mkdtempSync(`${tmpdir()}/spectraform-desktop-smoke-`);
  const commitId =
    process.env.SPECTRAFORM_TEST_COMMIT ?? "0000000000000000000000000000000000000001";

  try {
    const result = spawnSync(
      "cargo",
      [
        "run",
        "--quiet",
        "--manifest-path",
        "src-tauri/Cargo.toml",
        "--locked",
        "--offline",
        "--bin",
        "spectraform",
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 10 * 60 * 1_000,
        env: {
          ...process.env,
          CARGO_NET_OFFLINE: "true",
          CARGO_TARGET_DIR: cargoTarget,
          SPECTRAFORM_COMMIT_ID: commitId,
          SPECTRAFORM_HEADLESS_SMOKE: "1",
        },
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("spectraform-headless-smoke");
    expect(result.stdout).toContain(`commit=${commitId}`);
    expect(result.stdout).toContain("architecture=arm64");
    expect(result.stdout).toContain("signature=adhoc");
  } finally {
    if (!suppliedTarget) rmSync(cargoTarget, { recursive: true, force: true });
  }
});
