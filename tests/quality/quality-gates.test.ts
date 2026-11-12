import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const checker = join(repositoryRoot, "scripts/check-quality.mts");
const node = process.execPath;

function write(root: string, path: string, contents: string): void {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function run(root: string, gate: string) {
  return spawnSync(node, [checker, "--root", root, "--only", gate], {
    env: process.env,
    encoding: "utf8",
  });
}

function fixture(): string {
  return mkdtempSync(join(tmpdir(), "spectraform-quality-"));
}

test("strict typecheck includes Vite client and CSS side-effect declarations", () => {
  const config = JSON.parse(readFileSync(join(repositoryRoot, "tsconfig.json"), "utf8"));
  assert.equal(config.compilerOptions.strict, true);
  assert.deepEqual(config.compilerOptions.types, ["node", "vite/client"]);
});

test("format gate rejects an isolated unformatted fixture", () => {
  const root = fixture();
  try {
    write(root, ".prettierrc.json", '{"semi":true}');
    write(root, "broken.ts", "const value={answer:42}\n");
    const result = run(root, "prettier");
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /prettier: failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("eslint gate rejects an isolated debugger statement", () => {
  const root = fixture();
  try {
    write(root, "eslint.config.js", 'export default [{rules:{"no-debugger":"error"}}];\n');
    write(root, "broken.js", "debugger;\n");
    const result = run(root, "eslint");
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /eslint: failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("type gate rejects an isolated strict type error", () => {
  const root = fixture();
  try {
    write(
      root,
      "tsconfig.json",
      '{"compilerOptions":{"strict":true,"noEmit":true},"include":["broken.ts"]}',
    );
    write(root, "broken.ts", "const value: string = 42;\nvoid value;\n");
    const result = run(root, "typecheck");
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /typecheck: failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rustfmt gate rejects an isolated unformatted Rust fixture", () => {
  const root = fixture();
  try {
    write(root, "src-tauri/src/main.rs", 'fn main(){println!("bad");}\n');
    const result = run(root, "rustfmt");
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /rustfmt: failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("clippy gate rejects an isolated lint violation", () => {
  const root = fixture();
  try {
    write(
      root,
      "src-tauri/Cargo.toml",
      '[package]\nname="quality-negative"\nversion="0.0.0"\nedition="2021"\n[lib]\npath="src/lib.rs"\n',
    );
    write(
      root,
      "src-tauri/src/lib.rs",
      "#![deny(clippy::all)]\npub fn redundant(value: bool) -> bool { if value { true } else { false } }\n",
    );
    const result = run(root, "clippy");
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stderr, /clippy: failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
