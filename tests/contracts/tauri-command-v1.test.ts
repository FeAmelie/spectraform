import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rustCommandUrl = new URL(
  "../../src-tauri/src/commands/foundation.rs",
  import.meta.url,
);
const frontendCommandUrl = new URL(
  "../../src/platform/tauri/foundationCommand.ts",
  import.meta.url,
);

test("Rust and frontend expose one canonical v1 command contract", async () => {
  const [rust, frontend] = await Promise.all([
    readFile(rustCommandUrl, "utf8"),
    readFile(frontendCommandUrl, "utf8"),
  ]);

  assert.match(rust, /COMMAND_CONTRACT_VERSION: u16 = 1/);
  assert.match(frontend, /COMMAND_CONTRACT_VERSION = 1 as const/);
  assert.match(rust, /UnsupportedContractVersion/);
  assert.match(frontend, /unsupported_contract_version/);
});
test("foundation status declares that runtime networking is absent", async () => {
  const [rust, frontend] = await Promise.all([
    readFile(rustCommandUrl, "utf8"),
    readFile(frontendCommandUrl, "utf8"),
  ]);

  assert.match(rust, /runtime_network_capability: "none"/);
  assert.match(frontend, /runtimeNetworkCapability: "none"/);
  assert.doesNotMatch(frontend, /https?:\/\//);
});

test("fullscreen operations have explicit request and response contracts", async () => {
  const [rust, frontend] = await Promise.all([
    readFile(rustCommandUrl, "utf8"),
    readFile(frontendCommandUrl, "utf8"),
  ]);

  assert.match(rust, /pub fn set_fullscreen/);
  assert.match(rust, /\.set_fullscreen\(request\.fullscreen\)/);
  assert.match(rust, /\.is_fullscreen\(\)/);
  assert.match(frontend, /export function setFullscreen/);
});
