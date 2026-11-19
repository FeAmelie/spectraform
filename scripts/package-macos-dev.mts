import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  version: string;
};
const commitId = runText("git", ["rev-parse", "HEAD"]);
const outputArgument = process.argv[2];
const outputRoot = outputArgument
  ? resolveOutput(outputArgument)
  : mkdtempSync(join(tmpdir(), "spectraform-macos-dev-"));
const scratch = mkdtempSync(join(tmpdir(), "spectraform-macos-dev-build-"));
const cargoTarget = join(scratch, "cargo");
const webOutput = join(scratch, "web");
const appBundle = join(outputRoot, "Spectraform.app");
const contents = join(appBundle, "Contents");
const executable = join(contents, "MacOS", "Spectraform");

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) fail("package version must be semantic");
if (!/^[0-9a-f]{40}$/.test(commitId)) fail("Git commit must be a full immutable SHA");
if (process.platform !== "darwin" || process.arch !== "arm64") {
  fail("macOS development packaging requires an Apple-Silicon host");
}

mkdirSync(outputRoot, { recursive: true });
rmSync(appBundle, { recursive: true, force: true });

try {
  run("pnpm", [
    "exec",
    "vite",
    "build",
    "--configLoader",
    "runner",
    "--outDir",
    webOutput,
    "--emptyOutDir",
  ]);
  run("node", ["--test", "tests/visual/foundation-frame.test.ts"]);
  run(
    "cargo",
    [
      "build",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--release",
      "--locked",
      "--offline",
      "--target",
      "aarch64-apple-darwin",
    ],
    {
      CARGO_TARGET_DIR: cargoTarget,
      SPECTRAFORM_COMMIT_ID: commitId,
    },
  );

  mkdirSync(dirname(executable), { recursive: true });
  mkdirSync(join(contents, "Resources"), { recursive: true });
  copyFileSync(join(cargoTarget, "aarch64-apple-darwin", "release", "spectraform"), executable);
  chmodSync(executable, 0o755);
  cpSync(webOutput, join(contents, "Resources", "foundation-web"), { recursive: true });

  const buildInfo = {
    contract_version: 1,
    version: packageJson.version,
    commit_id: commitId,
    architecture: "arm64",
    signature: "adhoc",
  } as const;
  writeFileSync(
    join(contents, "Resources", "build-info.json"),
    `${JSON.stringify(buildInfo, null, 2)}\n`,
  );
  writeFileSync(join(contents, "Info.plist"), infoPlist(packageJson.version, commitId));
  writeFileSync(join(contents, "PkgInfo"), "APPL????");

  run("/usr/bin/codesign", ["--force", "--sign", "-", "--timestamp=none", appBundle]);
  run("/usr/bin/codesign", ["--verify", "--deep", "--strict", appBundle]);

  const architectures = runText("/usr/bin/lipo", ["-archs", executable]).split(/\s+/);
  if (architectures.length !== 1 || architectures[0] !== "arm64") {
    fail(`expected arm64-only executable, received ${architectures.join(",")}`);
  }
  const signature = runText("/usr/bin/codesign", ["-dvv", appBundle], true);
  if (!signature.includes("Signature=adhoc")) fail("bundle signature is not ad-hoc");

  const smoke = runText(executable, [], false, {
    SPECTRAFORM_HEADLESS_SMOKE: "1",
  });
  if (
    !smoke.includes(`version=${packageJson.version}`) ||
    !smoke.includes(`commit=${commitId}`) ||
    !smoke.includes("architecture=arm64") ||
    !smoke.includes("signature=adhoc")
  ) {
    fail("headless bundle launch did not report immutable build identity");
  }

  console.log(
    JSON.stringify({
      status: "pass",
      bundle: appBundle,
      version: packageJson.version,
      commit_id: commitId,
      architecture: "arm64",
      signature: "adhoc",
      launch_mode: "headless",
      synthetic_frame: "verified",
    }),
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

function resolveOutput(candidate: string): string {
  if (!isAbsolute(candidate)) fail("output directory must be absolute");
  const resolved = resolve(candidate);
  if (resolved === root || resolved.startsWith(`${root}/`)) {
    fail("development bundles must be written outside the repository");
  }
  return resolved;
}

function run(command: string, commandArgs: string[], extraEnv: NodeJS.ProcessEnv = {}): void {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
    timeout: 10 * 60 * 1_000,
  });
  if (result.error) fail(`${basename(command)} failed: ${result.error.message}`);
  if (result.status !== 0) fail(`${basename(command)} exited ${result.status ?? "without status"}`);
}

function runText(
  command: string,
  commandArgs: string[],
  stderr = false,
  extraEnv: NodeJS.ProcessEnv = {},
): string {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    timeout: 30_000,
  });
  if (result.error) fail(`${basename(command)} failed: ${result.error.message}`);
  if (result.status !== 0) fail(`${basename(command)} exited ${result.status ?? "without status"}`);
  return (stderr ? result.stderr : result.stdout).trim();
}

function infoPlist(version: string, commit: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDisplayName</key><string>Spectraform</string>
<key>CFBundleExecutable</key><string>Spectraform</string>
<key>CFBundleIdentifier</key><string>app.spectraform.desktop</string>
<key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
<key>CFBundleName</key><string>Spectraform</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
<key>CFBundleVersion</key><string>${version}</string>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>SpectraformCommitID</key><string>${commit}</string>
<key>SpectraformSignature</key><string>adhoc</string>
</dict></plist>\n`;
}

function fail(message: string): never {
  throw new Error(`package-macos-dev: ${message}`);
}
