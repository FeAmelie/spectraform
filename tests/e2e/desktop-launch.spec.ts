import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../../src-tauri/tauri.conf.json", import.meta.url);
const capabilityUrl = new URL(
  "../../src-tauri/capabilities/base.json",
  import.meta.url,
);
const buildScriptUrl = new URL("../../src-tauri/build.rs", import.meta.url);

test("desktop shell bundles a generated local frontend and no remote URL", async () => {
  const [configText, buildScript] = await Promise.all([
    readFile(configUrl, "utf8"),
    readFile(buildScriptUrl, "utf8"),
  ]);
  const config = JSON.parse(configText);
  const [window] = config.app.windows;

  assert.equal(window.label, "main");
  assert.equal(window.url, "index.html");
  assert.equal(config.build.devUrl, undefined);
  assert.doesNotMatch(window.url, /^(?:data|https?):/);
  assert.match(buildScript, /foundation-dist/);
  assert.match(buildScript, /spectraform-shell/);
  assert.match(buildScript, /TAURI_CONFIG/);
  assert.equal(config.bundle.active, false);
});
test("base capability is restricted to the main window and fullscreen", async () => {
  const capability = JSON.parse(await readFile(capabilityUrl, "utf8"));

  assert.deepEqual(capability.windows, ["main"]);
  assert.ok(capability.permissions.includes("core:window:allow-set-fullscreen"));
  assert.ok(capability.permissions.includes("core:window:allow-is-fullscreen"));
  assert.ok(!capability.permissions.some((permission: string) =>
    /http|shell|upload|download/i.test(permission),
  ));
});
