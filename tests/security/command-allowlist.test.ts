import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const libUrl = new URL("../../src-tauri/src/lib.rs", import.meta.url);
const policyUrl = new URL("../../src-tauri/src/security/path_policy.rs", import.meta.url);

test("the Rust invoke handler preserves the reviewed v1 command allowlist", async () => {
  const source = await readFile(libUrl, "utf8");
  const handler = source.match(/generate_handler!\[([\s\S]*?)\]/)?.[1];

  assert.ok(handler, "generate_handler allowlist must be present");
  const commands = handler
    .split(",")
    .map((command) => command.trim())
    .filter(Boolean);
  assert.deepEqual(commands, [
    "commands::foundation::foundation_status",
    "commands::foundation::set_fullscreen",
  ]);
  assert.doesNotMatch(handler, /shell|http|network|download|upload|open_url/i);
});

test("the native path policy is canonical and rejects traversal and foreign paths", async () => {
  const source = await readFile(policyUrl, "utf8");

  assert.match(source, /\.canonicalize\(\)/);
  assert.match(source, /Component::ParentDir/);
  assert.match(source, /Component::Prefix/);
  assert.match(source, /ForeignPlatformPath/);
  assert.match(source, /SymlinkEscape/);
});
