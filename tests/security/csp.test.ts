import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const configUrl = new URL("../../src-tauri/tauri.conf.json", import.meta.url);

test("the desktop CSP is local-only and default-deny", async () => {
  const config = JSON.parse(await readFile(configUrl, "utf8")) as TauriConfig;
  const csp = config.app.security.csp;

  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /worker-src 'none'/);
  assert.doesNotMatch(csp, /unsafe-(?:eval|inline)|https?:|wss?:|localhost|\*/i);
});

test("the application exposes no development or remote window origin", async () => {
  const config = JSON.parse(await readFile(configUrl, "utf8")) as TauriConfig;

  assert.equal(config.build.devUrl, undefined);
  assert.deepEqual(
    config.app.windows.map(({ url }) => url),
    ["index.html"],
  );
  assert.doesNotMatch(JSON.stringify(config.app.windows), /https?:|wss?:|localhost/i);
});

interface TauriConfig {
  build: { devUrl?: string };
  app: {
    security: { csp: string };
    windows: Array<{ url: string }>;
  };
}
