import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const configPath = resolve(process.argv[2] ?? resolve(root, 'config/foundation.yaml'));
const decisionPath = resolve(root, 'docs/decisions/foundation-baseline.md');

function fail(messages) {
  for (const message of messages) console.error(`foundation-check: ${message}`);
  process.exitCode = 1;
}

function parseConstrainedYaml(text) {
  const values = new Map();
  const stack = [];
  const errors = [];

  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    if (rawLine.includes('\t')) {
      errors.push(`line ${index + 1}: tabs are forbidden`);
      continue;
    }

    const match = /^( *)([A-Za-z0-9_]+):(?: +(.*))?$/u.exec(rawLine);
    if (!match) {
      errors.push(`line ${index + 1}: unsupported YAML syntax`);
      continue;
    }

    const indent = match[1].length;
    if (indent % 2 !== 0) {
      errors.push(`line ${index + 1}: indentation must use two spaces`);
      continue;
    }

    const depth = indent / 2;
    const key = match[2];
    const rawValue = match[3];
    stack.length = depth;
    const path = [...stack, key].join('.');

    if (values.has(path)) errors.push(`duplicate key: ${path}`);

    if (rawValue === undefined || rawValue === '') {
      stack[depth] = key;
      continue;
    }

    const value = rawValue.replace(/^(?:"(.*)"|'(.*)')$/u, '$1$2');
    values.set(path, value);
  }

  return { values, errors };
}

const required = new Map([
  ['schema_version', '1'],
  ['product.name', 'Spectraform'],
  ['product.display_name_status', 'confirmed'],
  ['foundation.version', '0.1.0'],
  ['foundation.scope', 'application-foundation'],
  ['execution.methodology', 'assay'],
  ['execution.autonomy_policy', 'unicorn'],
  ['execution.session_schedule', 'batch'],
  ['platform.reference_os', 'macOS'],
  ['platform.reference_architecture', 'arm64'],
  ['platform.reference_device_status', 'unconfirmed'],
  ['platform.support_scope', 'macos-first-cross-platform-core'],
  ['runtime.network_policy', 'no-network-required'],
  ['runtime.processing', 'local-only'],
  ['assets.core_policy', 'asset-neutral'],
  ['assets.ingest', 'local-files-only'],
  ['assets.originals', 'immutable'],
  ['assets.user_project_assets_repository', 'forbidden'],
  ['open_decisions.license.status', 'unresolved'],
  ['open_decisions.license.value', 'replace-before-release'],
  ['open_decisions.bundle_identifier.status', 'unresolved'],
  ['open_decisions.bundle_identifier.value', 'replace-before-release'],
  ['open_decisions.legal_owner.status', 'unresolved'],
  ['open_decisions.legal_owner.value', 'replace-before-release'],
  ['source_concepts.product', '2026-11-10-psypanic-spectraform-gesamtkonzept-v3.md'],
  ['source_concepts.technical', '2026-11-10-psypanic-spectraform-technisches-konzept-v3.md'],
]);

let configText;
let decisionText;
try {
  configText = readFileSync(configPath, 'utf8');
  decisionText = readFileSync(decisionPath, 'utf8');
} catch (error) {
  fail([error instanceof Error ? error.message : String(error)]);
  process.exit();
}

const parsed = parseConstrainedYaml(configText);
const errors = [...parsed.errors];

for (const [path, expected] of required) {
  const actual = parsed.values.get(path);
  if (actual !== expected) errors.push(`${path}: expected ${expected}, received ${actual ?? '<missing>'}`);
}

const knownScalarPaths = new Set(required.keys());
for (const path of parsed.values.keys()) {
  if (!knownScalarPaths.has(path)) errors.push(`unexpected scalar key: ${path}`);
}

for (const marker of [
  'PsyPanic is a use case, not a core constant',
  'No network is required by the MVP application',
  'User and project assets are forbidden',
  '2026-11-10-psypanic-spectraform-gesamtkonzept-v3.md',
  '2026-11-10-psypanic-spectraform-technisches-konzept-v3.md',
]) {
  if (!decisionText.includes(marker)) errors.push(`decision document missing marker: ${marker}`);
}

if (errors.length > 0) {
  fail(errors);
} else {
  console.log(`foundation-check: pass (${required.size} canonical values, 0 contradictions)`);
}
