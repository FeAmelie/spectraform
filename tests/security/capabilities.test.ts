import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const capabilityUrls = [
  new URL("../../src-tauri/capabilities/base.json", import.meta.url),
  new URL("../../src-tauri/capabilities/project.json", import.meta.url),
];

const allowedPermissions: ReadonlySet<string> = new Set([
  "core:default",
  "core:window:allow-is-fullscreen",
  "core:window:allow-set-fullscreen",
]);
const basePermissions = [
  "core:default",
  "core:window:allow-is-fullscreen",
  "core:window:allow-set-fullscreen",
];

test("desktop capabilities expose only the reviewed local window surface", async () => {
  const capabilities = await Promise.all(
    capabilityUrls.map(async (url) => JSON.parse(await readFile(url, "utf8")) as Capability),
  );

  for (const capability of capabilities) {
    assert.equal(capability.remote, undefined);
    assert.deepEqual(capability.windows, ["main"]);
    for (const permission of capability.permissions) {
      if (typeof permission !== "string") {
        assert.fail("capability permission must be a string");
      }
      assert.ok(allowedPermissions.has(permission), `undeclared permission: ${permission}`);
    }
  }

  assert.deepEqual(
    capabilities.map(({ identifier }) => identifier),
    ["base", "project"],
  );
  assert.deepEqual(capabilities[0]?.permissions, basePermissions);
  assert.deepEqual(capabilities[1]?.permissions, []);
});

test("capability documents contain no network, shell, or remote origin grant", async () => {
  const source = (await Promise.all(capabilityUrls.map((url) => readFile(url, "utf8")))).join("\n");

  assert.doesNotMatch(source, /https?:|wss?:|localhost|network|http:|shell:|upload|download/i);
});

interface Capability {
  identifier: string;
  windows: string[];
  permissions: unknown[];
  remote?: unknown;
}
