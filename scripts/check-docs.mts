import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requiredDocuments = [
  "README.md",
  "docs/architecture.md",
  "docs/bootstrap.md",
  "docs/configuration.md",
  "docs/security.md",
  "docs/testing.md",
  "docs/local-projects.md",
  "docs/export.md",
  "docs/packaging.md",
  "docs/svg-asset-spec.md",
] as const;
const requiredAdrs = [
  "0001-tauri-shell.md",
  "0002-web-audio-preview.md",
  "0003-hybrid-rendering.md",
  "0004-mesh-deformation.md",
  "0005-assisted-import.md",
  "0006-yaml-zod.md",
  "0007-cue-timeline.md",
  "0008-deterministic-export.md",
  "0009-macos-reference.md",
  "0010-stt-out-of-scope.md",
] as const;
const errors: string[] = [];

for (const relativePath of requiredDocuments) requireFile(relativePath);
for (const file of requiredAdrs) requireFile(join("docs/adr", file));

const adrFiles = readdirSync(join(root, "docs/adr"))
  .filter((file) => /^\d{4}-.+\.md$/u.test(file))
  .sort();
if (adrFiles.length < requiredAdrs.length)
  errors.push("ADR inventory contains fewer than ten ADRs");
for (const file of requiredAdrs) {
  const source = read(join("docs/adr", file));
  for (const heading of ["## Status", "## Kontext", "## Entscheidung", "## Konsequenzen"]) {
    if (!source.includes(heading)) errors.push(`${file}: missing ${heading}`);
    if (!sectionContent(source, heading)) errors.push(`${file}: empty ${heading}`);
  }
  if (!/^## Status\s+Akzeptiert$/mu.test(source)) errors.push(`${file}: status is not Akzeptiert`);
  if (!/^### Positiv$/mu.test(source) || !/^### Negativ$/mu.test(source)) {
    errors.push(`${file}: consequences must contain positive and negative sections`);
  }
}

for (const relativePath of [
  ...requiredDocuments,
  ...requiredAdrs.map((file) => join("docs/adr", file)),
]) {
  checkLinks(relativePath, read(relativePath));
}

const readme = read("README.md");
for (const required of [
  "local-first",
  "Foundation v0.1",
  "runtime network capability is none",
  "## Canonical commands",
]) {
  if (!readme.includes(required)) errors.push(`README.md: missing scope statement ${required}`);
}
for (const command of [
  "pnpm bootstrap",
  "pnpm validate",
  "pnpm test",
  "pnpm build",
  "pnpm export:smoke",
  "node scripts/check-docs.mts",
]) {
  if (!readme.includes(command)) errors.push(`README.md: missing canonical command ${command}`);
}

const bootstrap = read("docs/bootstrap.md");
const walkthrough = /```sh\s+([\s\S]*?)```/u.exec(bootstrap)?.[1] ?? "";
let previousStep = -1;
for (const step of [
  "git clone https://github.com/FeAmelie/spectraform.git",
  "cd spectraform",
  "corepack enable",
  "pnpm bootstrap",
  "node scripts/check-docs.mts",
  "pnpm validate",
  "pnpm test",
  "pnpm build",
  "pnpm export:smoke",
  "git status --short",
]) {
  const stepIndex = walkthrough.indexOf(step);
  if (stepIndex < 0) {
    errors.push(`docs/bootstrap.md: missing clean-checkout step ${step}`);
  } else if (stepIndex <= previousStep) {
    errors.push(`docs/bootstrap.md: clean-checkout step is out of order: ${step}`);
  }
  previousStep = stepIndex;
}
if (!bootstrap.includes("headless")) errors.push("docs/bootstrap.md: walkthrough is not headless");

const boundaryDocuments = ["README.md", "docs/local-projects.md", "docs/svg-asset-spec.md"];
const assetBoundaryText = boundaryDocuments.map(read).join("\n");
for (const boundary of [
  "User/project SVG and audio files are never committed",
  "Generated outputs are never committed",
  "PsyPanic assets are read-only local inputs",
  "assets/source/",
  "assets/library/",
]) {
  if (!assetBoundaryText.includes(boundary))
    errors.push(`missing explicit asset boundary: ${boundary}`);
}

const packaging = read("docs/packaging.md");
for (const boundary of [
  "ad-hoc signed development .app",
  "signed and notarized distribution",
  "Homebrew Cask",
  "Generated outputs are never committed",
]) {
  if (!packaging.includes(boundary)) errors.push(`docs/packaging.md: missing boundary ${boundary}`);
}

const security = read("docs/security.md");
if (!security.includes("runtime network capability is none")) {
  errors.push("docs/security.md: missing offline runtime boundary");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`docs: ${error}`);
  process.exit(1);
}
console.log(`docs: pass (${requiredDocuments.length} guides, ${requiredAdrs.length} ADRs)`);

function read(relativePath: string): string {
  try {
    return readFileSync(join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function requireFile(relativePath: string): void {
  try {
    if (!statSync(join(root, relativePath)).isFile()) errors.push(`not a file: ${relativePath}`);
  } catch {
    errors.push(`missing required document: ${relativePath}`);
  }
}

function checkLinks(relativePath: string, source: string): void {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/gu;
  for (const match of source.matchAll(linkPattern)) {
    const target = match[1]?.trim();
    if (!target || /^[a-z]+:/iu.test(target)) continue;
    const [encodedPath = "", encodedFragment = ""] = target.split("#", 2);
    let pathPart: string;
    let fragment: string;
    try {
      pathPart = decodeURIComponent(encodedPath);
      fragment = decodeURIComponent(encodedFragment).toLowerCase();
    } catch {
      errors.push(`${relativePath}: malformed link ${target}`);
      continue;
    }
    const candidate = pathPart
      ? normalize(join(dirname(join(root, relativePath)), pathPart))
      : join(root, relativePath);
    const candidateRelative = relative(root, candidate);
    if (candidateRelative.startsWith("..") || candidateRelative === "") {
      errors.push(`${relativePath}: documentation link escapes the repository: ${target}`);
      continue;
    }
    if (extname(candidate) !== ".md") {
      errors.push(`${relativePath}: documentation link must target Markdown: ${target}`);
      continue;
    }
    try {
      if (!statSync(candidate).isFile()) errors.push(`${relativePath}: broken link ${target}`);
    } catch {
      errors.push(`${relativePath}: broken link ${target}`);
      continue;
    }

    if (fragment && !headingAnchors(read(candidateRelative)).has(fragment)) {
      errors.push(`${relativePath}: broken heading link ${target}`);
    }
  }
}

function sectionContent(source: string, heading: string): string {
  const start = source.indexOf(heading);
  if (start < 0) return "";
  const contentStart = start + heading.length;
  const nextHeading = source.slice(contentStart).search(/^##\s/mu);
  return source
    .slice(contentStart, nextHeading < 0 ? undefined : contentStart + nextHeading)
    .trim();
}

function headingAnchors(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/^#{1,6}\s+(.+)$/gmu)].map((match) =>
      (match[1] ?? "")
        .trim()
        .toLowerCase()
        .replace(/[`*_~]/gu, "")
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
        .replace(/\s+/gu, "-")
        .replace(/-+/gu, "-"),
    ),
  );
}
