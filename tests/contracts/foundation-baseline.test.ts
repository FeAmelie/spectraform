import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const checker = resolve(root, 'scripts/check-foundation.mts');
const canonical = resolve(root, 'config/foundation.yaml');

function run(configPath = canonical) {
  return spawnSync(process.execPath, [checker, configPath], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('canonical foundation baseline passes offline verification', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /pass \(26 canonical values, 0 contradictions\)/u);
});

test('duplicate foundation metadata is rejected', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'spectraform-foundation-'));
  const fixture = resolve(directory, 'duplicate.yaml');
  try {
    const text = readFileSync(canonical, 'utf8').replace(
      '  name: Spectraform',
      '  name: Spectraform\n  name: Spectraform',
    );
    writeFileSync(fixture, text, 'utf8');
    const result = run(fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /duplicate key: product\.name/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('contradictory network policy is rejected', () => {
  const directory = mkdtempSync(resolve(tmpdir(), 'spectraform-foundation-'));
  const fixture = resolve(directory, 'contradiction.yaml');
  try {
    const text = readFileSync(canonical, 'utf8').replace(
      'network_policy: no-network-required',
      'network_policy: cloud-required',
    );
    writeFileSync(fixture, text, 'utf8');
    const result = run(fixture);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /runtime\.network_policy: expected no-network-required, received cloud-required/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
