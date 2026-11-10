import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  requiredDirectories,
  requiredIgnoreRules,
} from '../../scripts/check-repository-policy.mts';

const canonicalRoot = resolve(import.meta.dirname, '../..');
const checker = resolve(canonicalRoot, 'scripts/check-repository-policy.mts');

function command(root, executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8' });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

function createFixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'spectraform-repository-policy-'));
  command(root, 'git', ['init', '--quiet']);
  writeFileSync(resolve(root, '.gitignore'), `${requiredIgnoreRules.join('\n')}\n`, 'utf8');
  for (const directory of requiredDirectories) {
    mkdirSync(resolve(root, directory), { recursive: true });
    writeFileSync(resolve(root, directory, '.gitkeep'), '', 'utf8');
  }
  command(root, 'git', ['add', '.gitignore']);
  return root;
}

function write(root, path, content = 'fixture') {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
}

function run(root) {
  return command(root, process.execPath, [checker, root]);
}

test('canonical repository topology and policy pass', () => {
  const result = run(canonicalRoot);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /repository-policy: pass/u);
});

test('force-added local project SVG is rejected', () => {
  const root = createFixture();
  try {
    const path = 'local-projects/client/mask.svg';
    write(root, path, '<svg/>');
    command(root, 'git', ['add', '-f', path]);
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /forbidden tracked repository-data path/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('generated imports, diagnostics and exports are rejected even when force-added', () => {
  const root = createFixture();
  try {
    const paths = [
      'generated/imports/run-01/normalized.svg',
      'generated/diagnostics/run-01/app.log',
      'generated/exports/run-01/composite.mov',
      'diagnostics/app.log',
      'exports/composite.mov',
      'assets/audio/project-master.wav',
    ];
    for (const path of paths) write(root, path);
    command(root, 'git', ['add', '-f', ...paths]);
    const result = run(root);
    assert.equal(result.status, 1);
    for (const path of paths) assert.match(result.stderr, new RegExp(path.replaceAll('.', '\\.')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('media outside explicit product asset paths is rejected', () => {
  const root = createFixture();
  try {
    const path = 'scratch/reference.wav';
    write(root, path);
    command(root, 'git', ['add', path]);
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /tracked media must be Spectraform-owned\/right-cleared/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('explicit future Spectraform library path remains allowed', () => {
  const root = createFixture();
  try {
    const path = 'assets/library/brand/spectraform-mark.svg';
    write(root, path, '<svg/>');
    command(root, 'git', ['add', path]);
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
