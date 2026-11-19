import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import { parseBuildInfo } from "../../src/build/buildInfo.ts";

const root = resolve(import.meta.dirname, "../..");

test("the macOS development package contract is ad-hoc and app-only", () => {
  const config = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
  assert.equal(config.bundle.active, true);
  assert.deepEqual(config.bundle.targets, ["app"]);
  assert.equal(config.bundle.macOS.signingIdentity, "-");
  assert.equal(config.bundle.macOS.hardenedRuntime, false);
  assert.equal(JSON.stringify(config).includes("dmg"), false);
  assert.equal(JSON.stringify(config).includes("notar"), false);
});

test("build information requires semantic version and immutable commit identity", () => {
  assert.deepEqual(
    parseBuildInfo({
      contract_version: 1,
      version: "0.1.0",
      commit_id: "a".repeat(40),
      architecture: "arm64",
      signature: "adhoc",
    }),
    {
      contract_version: 1,
      version: "0.1.0",
      commit_id: "a".repeat(40),
      architecture: "arm64",
      signature: "adhoc",
    },
  );
  assert.throws(() => parseBuildInfo({ contract_version: 1, version: "0.1.0" }));
});

test("packaging script forbids distribution and visible launch mechanisms", () => {
  const source = readFileSync(join(root, "scripts/package-macos-dev.mts"), "utf8");
  assert.match(source, /"--target",\s*"aarch64-apple-darwin"/);
  assert.match(source, /"--sign",\s*"-"/);
  assert.match(source, /SPECTRAFORM_HEADLESS_SMOKE/);
  assert.match(source, /tests\/visual\/foundation-frame\.test\.ts/);
  assert.doesNotMatch(source, /\bopen\b|notarytool|altool|Developer ID|create-dmg|brew/);
});

test("an explicitly supplied bundle is signed, arm64 and launches headlessly", () => {
  const app = process.env.SPECTRAFORM_MACOS_DEV_APP;
  if (!app) return;
  assert.equal(existsSync(app), true);
  execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", app]);
  const signature = spawnSync("/usr/bin/codesign", ["-dvv", app], { encoding: "utf8" });
  assert.equal(signature.status, 0);
  assert.match(signature.stderr, /Signature=adhoc/);
  const executable = join(app, "Contents/MacOS/Spectraform");
  assert.equal(
    execFileSync("/usr/bin/lipo", ["-archs", executable], { encoding: "utf8" }).trim(),
    "arm64",
  );
  const info = parseBuildInfo(
    JSON.parse(readFileSync(join(app, "Contents/Resources/build-info.json"), "utf8")),
  );
  const plist = join(app, "Contents/Info.plist");
  const plistVersion = execFileSync(
    "/usr/bin/plutil",
    ["-extract", "CFBundleShortVersionString", "raw", "-o", "-", plist],
    { encoding: "utf8" },
  ).trim();
  const plistCommit = execFileSync(
    "/usr/bin/plutil",
    ["-extract", "SpectraformCommitID", "raw", "-o", "-", plist],
    { encoding: "utf8" },
  ).trim();
  assert.equal(plistVersion, info.version);
  assert.equal(plistCommit, info.commit_id);
  assert.equal(existsSync(join(dirname(app), "Spectraform.dmg")), false);
  const smoke = execFileSync(executable, [], {
    encoding: "utf8",
    env: { ...process.env, SPECTRAFORM_HEADLESS_SMOKE: "1" },
    timeout: 30_000,
  });
  assert.match(smoke, new RegExp(`commit=${info.commit_id}`));
  assert.match(smoke, new RegExp(`version=${info.version}`));
  assert.match(smoke, /architecture=arm64 signature=adhoc/);
});
