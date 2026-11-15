import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const verifyOnly = args.includes("--verify-only");
const simulated = args.find((value) => value.startsWith("--versions="))?.slice(11);
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageJson;
const nodeVersion = readFileSync(join(root, ".node-version"), "utf8").trim();
const rustVersion = /^channel\s*=\s*"([^"]+)"$/mu.exec(
  readFileSync(join(root, "rust-toolchain.toml"), "utf8"),
)?.[1];
const pnpmVersion = packageJson.packageManager.replace(/^pnpm@/u, "");

if (!rustVersion) fail("rust-toolchain.toml has no exact channel");

const expected = { node: nodeVersion, pnpm: pnpmVersion, rust: rustVersion };
const actual = simulated ? parseVersions(simulated) : detectVersions();
for (const [name, version] of Object.entries(expected)) {
  if (actual[name] !== version) {
    fail(
      `${name} ${version} is required; received ${actual[name] ?? "unavailable"}. ${help(name)}`,
    );
  }
}

if (!actual.ffmpeg) {
  console.warn(
    "bootstrap: FFmpeg is unavailable; install the documented export prerequisite with `brew bundle --file Brewfile`.",
  );
} else if (compareVersions(actual.ffmpeg, packageJson.spectraform.toolchain.ffmpegMinimum) < 0) {
  fail(
    `ffmpeg >=${packageJson.spectraform.toolchain.ffmpegMinimum} is required for export; received ${actual.ffmpeg}. Run \`brew bundle --file Brewfile\`.`,
  );
}

if (!verifyOnly) {
  const storeDirectory =
    process.env.SPECTRAFORM_PNPM_STORE_DIR ?? join(root, "node_modules", ".pnpm-store");
  run("pnpm", [
    "install",
    "--frozen-lockfile",
    "--pm-on-fail=ignore",
    "--store-dir",
    storeDirectory,
  ]);
}

console.log(`bootstrap: pass${verifyOnly ? " (verification only)" : ""}`);

function detectVersions(): Record<string, string | undefined> {
  return {
    node: normalizeVersion(process.version),
    pnpm: commandVersion("pnpm", ["--version"]),
    rust: commandVersion("rustc", ["--version"]),
    ffmpeg: commandVersion("ffmpeg", ["-version"]),
  };
}

function commandVersion(command: string, commandArgs: string[]): string | undefined {
  const result = spawnSync(command, commandArgs, { cwd: root, encoding: "utf8" });
  if (result.error || result.status !== 0) return undefined;
  return normalizeVersion(`${result.stdout}\n${result.stderr}`);
}

function parseVersions(value: string): Record<string, string | undefined> {
  return Object.fromEntries(
    value.split(",").map((entry) => {
      const [name, version] = entry.split(":", 2);
      return [name, version || undefined];
    }),
  );
}

function normalizeVersion(value: string): string | undefined {
  return /(?:^|\s)v?(\d+\.\d+\.\d+)(?:\s|$)/u.exec(value.trim())?.[1];
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function run(command: string, commandArgs: string[]): void {
  const result = spawnSync(command, commandArgs, { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) fail(`${command} is unavailable. ${help(command)}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function help(name: string): string {
  if (name === "node") return "Install the version in .node-version.";
  if (name === "pnpm") return `Run \`corepack prepare pnpm@${pnpmVersion} --activate\`.`;
  if (name === "rust" || name === "rustc")
    return `Install Rust ${rustVersion} from rust-toolchain.toml.`;
  return "Run `brew bundle --file Brewfile` on macOS.";
}

function fail(message: string): never {
  console.error(`bootstrap: ${message}`);
  process.exit(1);
}

interface PackageJson {
  packageManager: string;
  spectraform: {
    toolchain: { ffmpegMinimum: string };
  };
}
