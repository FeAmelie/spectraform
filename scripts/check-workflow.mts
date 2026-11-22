import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parse } from "yaml";

type UnknownRecord = Record<string, unknown>;

const args = process.argv.slice(2);
const root = resolve(argument("--root") ?? resolve(import.meta.dirname, ".."));
const workflowPath = resolve(
  argument("--workflow") ?? resolve(root, ".github/workflows/foundation.yml"),
);
const probeFailure = argument("--probe-failure");

if (probeFailure) {
  if (probeFailure !== "lint" && probeFailure !== "tests") {
    console.error(`workflow-check: unsupported failure probe: ${probeFailure}`);
    process.exit(2);
  }
  console.log(
    JSON.stringify({
      status: "fail",
      failedGate: probeFailure,
      aggregateStatus: "blocked",
      childExitCode: 23,
    }),
  );
  process.exit(1);
}

let source: string;
let workflow: UnknownRecord;
try {
  source = readFileSync(workflowPath, "utf8");
  workflow = record(parse(source), "workflow");
} catch (error) {
  console.error(`workflow-check: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const findings: string[] = [];
const jobs = optionalRecord(workflow.jobs);
const triggers = optionalRecord(workflow.on);
const permissions = optionalRecord(workflow.permissions);
const environment = optionalRecord(workflow.env);

requireValue(workflow.name, "Foundation gates", "workflow name");
if (!Object.hasOwn(triggers, "pull_request")) findings.push("pull_request trigger is missing");
const push = requireRecord(triggers.push, "push trigger");
const branches = optionalStrings(push.branches);
for (const branch of ["dev", "main"]) requireIncludes(branches, branch, "push branches");
requireValue(permissions.contents, "read", "read-only contents permission");
requireValue(environment.NODE_VERSION, "24.22.2", "Node pin");
requireValue(environment.PNPM_VERSION, "12.19.0", "pnpm pin");
requireValue(environment.RUST_VERSION, "1.99.1", "Rust pin");

const commands: Record<string, string> = {
  format: "pnpm format:check",
  lint: "pnpm lint",
  typecheck: "pnpm typecheck",
  rustfmt: "cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check",
  clippy: "cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings",
  validate: "pnpm validate",
  tests: "pnpm test",
  "tauri-build": "pnpm build",
};

for (const [jobName, command] of Object.entries(commands)) {
  const job = requireRecord(jobs[jobName], `${jobName} job`);
  requireValue(job["runs-on"], "macos-14", `${jobName} runner`);
  const steps = optionalRecords(job.steps);
  if (!steps.some((step) => step.run === command)) {
    findings.push(`${jobName} must run the canonical command: ${command}`);
  }
}

const aggregate = requireRecord(jobs.foundation, "foundation aggregate job");
requireValue(aggregate.if, "${{ always() }}", "aggregate always condition");
const needs = optionalStrings(aggregate.needs);
for (const jobName of Object.keys(commands)) requireIncludes(needs, jobName, "aggregate needs");
const aggregateSteps = optionalRecords(aggregate.steps);
if (!aggregateSteps.some((step) => String(step.run ?? "").includes("success,success,success"))) {
  findings.push("foundation aggregate must reject any non-success gate result");
}

const cacheKeys = Object.values(jobs)
  .flatMap((job) => optionalRecords(optionalRecord(job).steps))
  .flatMap((step) => [optionalRecord(step.with).key])
  .filter((key): key is string => typeof key === "string");
if (!cacheKeys.some((key) => key.includes("hashFiles('src-tauri/Cargo.lock')"))) {
  findings.push("Cargo cache key must include src-tauri/Cargo.lock");
}
if (!cacheKeys.some((key) => key.includes("hashFiles('pnpm-lock.yaml', 'src-tauri/Cargo.lock')"))) {
  findings.push("foundation cache key must include both lockfiles");
}

for (const forbidden of [
  "secrets.",
  "assets/imported",
  "assets/user",
  "assets/project",
  "local-projects",
  "project-data",
  "codesign",
  "notary",
]) {
  if (source.includes(forbidden))
    findings.push(`workflow contains forbidden dependency: ${forbidden}`);
}

for (const pin of ["node-version: 24.22.2", "version: 12.19.0", "toolchain: 1.99.1"]) {
  if (!source.includes(pin)) findings.push(`workflow is missing exact toolchain pin: ${pin}`);
}

if (findings.length > 0) {
  for (const finding of findings) console.error(`workflow-check: ${finding}`);
  process.exit(1);
}

console.log(
  `workflow-check: pass jobs=${Object.keys(commands).length} aggregate=foundation cache=lockfile`,
);

function argument(name: string): string | undefined {
  const direct = args.find((value) => value.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function optionalRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function optionalRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map((item) => optionalRecord(item)) : [];
}

function optionalStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function requireRecord(value: unknown, label: string): UnknownRecord {
  const result = optionalRecord(value);
  if (Object.keys(result).length === 0) findings.push(`${label} is missing`);
  return result;
}

function requireValue(value: unknown, expected: unknown, label: string): void {
  if (value !== expected) findings.push(`${label} must equal ${String(expected)}`);
}

function requireIncludes(values: string[], expected: string, label: string): void {
  if (!values.includes(expected)) findings.push(`${label} must include ${expected}`);
}
