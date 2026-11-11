import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const args = new Set(process.argv.slice(2));

function fail(message) {
  console.error(`toolchain-check: ${message}`);
  process.exitCode = 1;
}

function normalizeVersion(raw) {
  const match = String(raw).trim().match(/(?:^|\s)v?(\d+\.\d+\.\d+)(?:\s|$)/u);
  return match?.[1] ?? null;
}

function compareVersions(left, right) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function parseRustChannel(text) {
  return /^channel\s*=\s*"([^"]+)"$/mu.exec(text)?.[1] ?? null;
}

function runVersion(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { encoding: 'utf8' });
  if (result.error) return { error: result.error };
  if (result.status !== 0) {
    return { error: new Error(`${command} exited ${result.status}: ${result.stderr.trim()}`) };
  }
  return { version: normalizeVersion(`${result.stdout}\n${result.stderr}`) };
}

function option(name) {
  const prefix = `${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const expected = {
  node: readFileSync(resolve(root, '.node-version'), 'utf8').trim(),
  pnpm: String(packageJson.packageManager).replace(/^pnpm@/u, ''),
  rust: parseRustChannel(readFileSync(resolve(root, 'rust-toolchain.toml'), 'utf8')),
  ffmpeg: packageJson.spectraform?.toolchain?.ffmpegMinimum,
};

const errors = [];
for (const [name, version] of Object.entries(expected)) {
  if (!normalizeVersion(version)) errors.push(`${name} pin is missing or invalid: ${version ?? '<missing>'}`);
}

if (packageJson.engines?.node !== expected.node) errors.push('package engines.node differs from .node-version');
if (packageJson.engines?.pnpm !== expected.pnpm) errors.push('package engines.pnpm differs from packageManager');
if (packageJson.spectraform?.runtimeNetworkCapability !== 'none') {
  errors.push('runtimeNetworkCapability must remain none');
}

const simulated = option('--versions');
let actual;
if (simulated) {
  actual = Object.fromEntries(simulated.split(',').map((entry) => entry.split(':', 2)));
} else {
  const nodeResult = runVersion(process.execPath, ['--version']);
  const pnpmResult = runVersion(option('--pnpm-bin') ?? 'pnpm', ['--version']);
  const rustResult = runVersion(option('--rustc-bin') ?? 'rustc', ['--version']);
  const ffmpegResult = runVersion(option('--ffmpeg-bin') ?? 'ffmpeg', ['-version']);
  actual = {
    node: nodeResult.version,
    pnpm: pnpmResult.version,
    rust: rustResult.version,
    ffmpeg: ffmpegResult.version,
  };
  for (const [name, result] of Object.entries({ node: nodeResult, pnpm: pnpmResult, rust: rustResult })) {
    if (result.error) errors.push(`${name} unavailable: ${result.error.message}`);
  }
  if (ffmpegResult.error && !args.has('--allow-missing-ffmpeg')) {
    errors.push(`ffmpeg unavailable: ${ffmpegResult.error.message}`);
  }
}

for (const name of ['node', 'pnpm', 'rust']) {
  const version = normalizeVersion(actual[name]);
  if (version !== expected[name]) {
    errors.push(`${name} mismatch: expected ${expected[name]}, received ${version ?? '<unavailable>'}`);
  }
}

const ffmpegVersion = normalizeVersion(actual.ffmpeg);
if (ffmpegVersion && compareVersions(ffmpegVersion, expected.ffmpeg) < 0) {
  errors.push(`ffmpeg below minimum: expected >=${expected.ffmpeg}, received ${ffmpegVersion}`);
}

if (errors.length > 0) {
  for (const error of errors) fail(error);
} else {
  const ffmpegStatus = ffmpegVersion
    ? `${ffmpegVersion} (minimum ${expected.ffmpeg})`
    : `binary absent; minimum policy ${expected.ffmpeg} verified`;
  console.log(
    `toolchain-check: pass node=${expected.node} pnpm=${expected.pnpm} rust=${expected.rust} ffmpeg=${ffmpegStatus}`,
  );
}
