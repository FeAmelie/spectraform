import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";

const args = process.argv.slice(2);
const rootIndex = args.indexOf("--root");
const onlyIndex = args.indexOf("--only");
const root = resolve(rootIndex >= 0 ? (args[rootIndex + 1] ?? ".") : ".");
const only = onlyIndex >= 0 ? args[onlyIndex + 1] : undefined;
const binDirectory = process.env.SPECTRAFORM_QUALITY_BIN_DIR;
const path = binDirectory
  ? `${binDirectory}${delimiter}${process.env.PATH ?? ""}`
  : join(root, "node_modules", ".bin") + delimiter + (process.env.PATH ?? "");

type Gate = {
  name: string;
  command: string;
  args: string[];
  enabled?: () => boolean;
};

function rustFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return rustFiles(target);
    return entry.isFile() && entry.name.endsWith(".rs") ? [target] : [];
  });
}

const cargoManifest = join(root, "src-tauri", "Cargo.toml");
const rustSources = rustFiles(join(root, "src-tauri", "src"));
const gates: Gate[] = [
  { name: "prettier", command: "prettier", args: ["--check", "."] },
  { name: "eslint", command: "eslint", args: ["."] },
  { name: "typecheck", command: "tsc", args: ["--noEmit"] },
  {
    name: "rustfmt",
    command: "rustfmt",
    args: ["--edition", "2021", "--check", ...rustSources],
    enabled: () => rustSources.length > 0,
  },
  {
    name: "clippy",
    command: "cargo",
    args: ["clippy", "--manifest-path", cargoManifest, "--all-targets", "--", "-D", "warnings"],
    enabled: () => existsSync(cargoManifest),
  },
];

const selected = gates.filter((gate) => !only || gate.name === only);
if (selected.length === 0) {
  console.error(`unknown quality gate: ${only}`);
  process.exit(2);
}

let failed = false;
for (const gate of selected) {
  if (gate.enabled && !gate.enabled()) {
    console.log(`[quality] ${gate.name}: skipped (no Rust workspace in this lane)`);
    continue;
  }

  const result = spawnSync(gate.command, gate.args, {
    cwd: root,
    env: { ...process.env, PATH: path },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`[quality] ${gate.name}: failed`);
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) console.error(result.error.message);
  } else {
    console.log(`[quality] ${gate.name}: passed`);
  }
}

process.exit(failed ? 1 : 0);
