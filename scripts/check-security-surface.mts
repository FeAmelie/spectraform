import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewedCommandPaths = [
  "commands::foundation::foundation_status",
  "commands::foundation::set_fullscreen",
] as const;
const reviewedBasePermissions = [
  "core:default",
  "core:window:allow-is-fullscreen",
  "core:window:allow-set-fullscreen",
] as const;
const reviewedPermissions: ReadonlySet<string> = new Set(reviewedBasePermissions);

export interface SecuritySurfaceReport {
  capabilities: string[];
  commands: string[];
  csp: string;
  runtimeNetworkCapability: "none";
}

export async function checkSecuritySurface(root: string): Promise<SecuritySurfaceReport> {
  const capabilityPaths = [
    path.join(root, "src-tauri/capabilities/base.json"),
    path.join(root, "src-tauri/capabilities/project.json"),
  ];
  const [configSource, libSource, policySource, ...capabilitySources] = await Promise.all([
    readFile(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
    readFile(path.join(root, "src-tauri/src/lib.rs"), "utf8"),
    readFile(path.join(root, "src-tauri/src/security/path_policy.rs"), "utf8"),
    ...capabilityPaths.map((capabilityPath) => readFile(capabilityPath, "utf8")),
  ]);
  const config = JSON.parse(configSource) as TauriConfig;
  const capabilities = capabilitySources.map((source) => JSON.parse(source) as CapabilityDocument);

  assert.equal(config.build.devUrl, undefined, "remote/development origin is forbidden");
  assert.deepEqual(
    config.app.windows.map(({ url }) => url),
    ["index.html"],
    "only the bundled entry point may be loaded",
  );

  const csp = config.app.security.csp;
  for (const required of [
    "default-src 'none'",
    "script-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "worker-src 'none'",
  ]) {
    assert.ok(csp.includes(required), `missing CSP directive: ${required}`);
  }
  assert.doesNotMatch(csp, /unsafe-(?:eval|inline)|https?:|wss?:|localhost|\*/i);

  for (const capability of capabilities) {
    assert.equal(capability.remote, undefined, `${capability.identifier} grants a remote origin`);
    assert.deepEqual(capability.windows, ["main"]);
    for (const permission of capability.permissions) {
      assert.ok(reviewedPermissions.has(permission), `unreviewed permission: ${permission}`);
    }
  }
  assert.deepEqual(
    capabilities.map(({ identifier }) => identifier),
    ["base", "project"],
    "capability identifiers or order changed",
  );
  assert.deepEqual(capabilities[0]?.permissions, reviewedBasePermissions);
  assert.deepEqual(capabilities[1]?.permissions, []);

  const handler = libSource.match(/generate_handler!\[([\s\S]*?)\]/)?.[1];
  assert.ok(handler, "generate_handler allowlist is missing");
  const commandPaths = handler
    .split(",")
    .map((command) => command.trim())
    .filter(Boolean);
  assert.deepEqual(commandPaths, reviewedCommandPaths);
  const commands = commandPaths.map((command) => command.split("::").at(-1) as string);

  assert.match(policySource, /\.canonicalize\(\)/);
  assert.match(policySource, /Component::ParentDir/);
  assert.match(policySource, /SymlinkEscape/);

  return {
    capabilities: capabilities.map(({ identifier }) => identifier),
    commands,
    csp,
    runtimeNetworkCapability: "none",
  };
}

interface CapabilityDocument {
  identifier: string;
  windows: string[];
  permissions: string[];
  remote?: unknown;
}

interface TauriConfig {
  build: { devUrl?: string };
  app: {
    security: { csp: string };
    windows: Array<{ url: string }>;
  };
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedFile === currentFile) {
  const root = path.resolve(path.dirname(currentFile), "..");
  const report = await checkSecuritySurface(root);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
