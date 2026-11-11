import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../..');
const checker = resolve(root, 'scripts/check-toolchain.mts');

function run(versions) {
  return spawnSync(process.execPath, [checker, `--versions=${versions}`], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('canonical compatible versions pass', () => {
  const result = run('node:24.22.2,pnpm:12.19.0,rust:1.99.1,ffmpeg:9.0.2');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /pass node=24\.22\.2 pnpm=12\.19\.0 rust=1\.99\.1/u);
});

test('mismatched Node version fails with an actionable diagnostic', () => {
  const result = run('node:24.22.1,pnpm:12.19.0,rust:1.99.1,ffmpeg:9.0.2');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /node mismatch: expected 24\.22\.2, received 24\.22\.1/u);
});

test('FFmpeg below the local minimum fails', () => {
  const result = run('node:24.22.2,pnpm:12.19.0,rust:1.99.1,ffmpeg:8.1.0');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /ffmpeg below minimum: expected >=9\.0\.2, received 8\.1\.0/u);
});
