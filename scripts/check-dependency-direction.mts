import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

type Layer = "core" | "ui" | "platform" | "app" | "feature";

export interface DependencyCheckResult {
  readonly filesChecked: number;
  readonly importsChecked: number;
  readonly violations: readonly string[];
}

const sourceExtensions = new Set([".ts", ".tsx", ".mts"]);
const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return walk(path);
      return sourceExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat().sort();
}

function layerOf(file: string, sourceRoot: string): Layer {
  const first = relative(sourceRoot, file).split(sep)[0];
  if (first === "core" || first === "ui" || first === "platform" || first === "app") return first;
  return "feature";
}

function isForbidden(from: Layer, to: Layer): boolean {
  if (from === "core") return to !== "core";
  if (from === "ui") return to === "platform" || to === "app";
  if (from === "platform") return to === "ui" || to === "app";
  return false;
}

async function resolveLocalImport(importer: string, specifier: string): Promise<string | undefined> {
  if (!specifier.startsWith(".")) return undefined;
  const base = resolve(dirname(importer), specifier);
  const candidates = sourceExtensions.has(extname(base))
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, `${base}.mts`, join(base, "index.ts"), join(base, "index.tsx")];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next deterministic candidate.
    }
  }
  return undefined;
}

function findCycles(graph: ReadonlyMap<string, readonly string[]>): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string): void => {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      cycles.push([...stack.slice(start), node]);
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dependency of graph.get(node) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  };

  for (const node of graph.keys()) visit(node);
  return cycles;
}

export async function checkDependencyDirection(repositoryRoot: string): Promise<DependencyCheckResult> {
  const sourceRoot = join(resolve(repositoryRoot), "src");
  const files = await walk(sourceRoot);
  const graph = new Map<string, string[]>();
  const violations: string[] = [];
  let importsChecked = 0;

  const prohibitedProductToken = ["psy", "panic"].join("");
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const relativeFile = relative(repositoryRoot, file);
    if (relativeFile.startsWith(`src${sep}core${sep}`) && content.toLowerCase().includes(prohibitedProductToken)) {
      violations.push(`${relativeFile}: core contract contains a project-specific identifier`);
    }

    const dependencies: string[] = [];
    for (const match of content.matchAll(importPattern)) {
      const dependency = await resolveLocalImport(file, match[1]);
      if (!dependency || !dependency.startsWith(sourceRoot + sep)) continue;
      importsChecked += 1;
      dependencies.push(dependency);
      const fromLayer = layerOf(file, sourceRoot);
      const toLayer = layerOf(dependency, sourceRoot);
      if (isForbidden(fromLayer, toLayer)) {
        violations.push(`${relativeFile}: forbidden ${fromLayer} -> ${toLayer} import (${match[1]})`);
      }
    }
    graph.set(file, dependencies);
  }

  for (const cycle of findCycles(graph)) {
    violations.push(`import cycle: ${cycle.map((file) => relative(repositoryRoot, file)).join(" -> ")}`);
  }

  return { filesChecked: files.length, importsChecked, violations: [...new Set(violations)].sort() };
}

async function main(): Promise<void> {
  const repositoryRoot = resolve(process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url)));
  const result = await checkDependencyDirection(repositoryRoot);
  if (result.violations.length > 0) {
    console.error(result.violations.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(`dependency direction ok: ${result.filesChecked} files, ${result.importsChecked} local imports`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
