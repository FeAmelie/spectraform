import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { parseConfigYaml } from "../../src/config/registry.ts";
import {
  createDangerousSyntheticSvg,
  createSyntheticAudio,
  createSyntheticConfigSources,
  createSyntheticProject,
  createSyntheticSvg,
  FIXTURE_GENERATOR_VERSION,
  readSyntheticProjectFile,
  withSyntheticProject,
} from "./generators/index.ts";

const root = resolve(import.meta.dirname, "../..");
const mediaExtensions = new Set([".svg", ".wav", ".mp3", ".flac", ".mov", ".mp4"]);

function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

test("the same seed creates byte-identical text and numeric audio", () => {
  const firstConfigs = createSyntheticConfigSources(0x51a7);
  const secondConfigs = createSyntheticConfigSources(0x51a7);
  assert.deepEqual(firstConfigs, secondConfigs);
  assert.equal(createSyntheticSvg(0x51a7), createSyntheticSvg(0x51a7));

  const firstAudio = createSyntheticAudio(0x51a7);
  const secondAudio = createSyntheticAudio(0x51a7);
  assert.deepEqual([...firstAudio.samples], [...secondAudio.samples]);
  assert.deepEqual(firstAudio.wav, secondAudio.wav);
  assert.equal(digest(firstAudio.wav), digest(secondAudio.wav));

  const firstProject = createSyntheticProject({ seed: 0x51a7 });
  const secondProject = createSyntheticProject({ seed: 0x51a7 });
  try {
    assert.deepEqual(
      readFileSync(firstProject.manifestFile),
      readFileSync(secondProject.manifestFile),
    );
  } finally {
    firstProject.cleanup();
    secondProject.cleanup();
  }
});

test("different seeds create different deterministic fixture hashes", () => {
  const first = createSyntheticAudio(11);
  const second = createSyntheticAudio(12);
  assert.notEqual(digest(first.wav), digest(second.wav));
  assert.notEqual(digest(createSyntheticSvg(11)), digest(createSyntheticSvg(12)));
});

test("a positive project validates all ten config families and cleans up", () => {
  const project = createSyntheticProject({ seed: 101, scenario: "positive" });
  assert.equal(project.root.startsWith(`${tmpdir()}/`), true);
  try {
    const manifest = JSON.parse(readFileSync(project.manifestFile, "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(FIXTURE_GENERATOR_VERSION, 1);
    assert.equal(manifest.fixture_generator_version, FIXTURE_GENERATOR_VERSION);
    assert.equal("schema_version" in manifest, false);

    for (const source of createSyntheticConfigSources(101)) {
      const yaml = readFileSync(resolve(project.configDirectory, source.file), "utf8");
      assert.match(yaml, /^schema_version: 1$/mu);
      assert.doesNotMatch(yaml, /fixture_generator_version/u);
      parseConfigYaml({ family: source.family, file: source.file, yaml });
    }
    assert.equal(
      readSyntheticProjectFile(project, relative(project.root, project.audioFile)).byteLength > 44,
      true,
    );
    assert.match(readFileSync(project.svgFile, "utf8"), /Synthetic fixture/u);
  } finally {
    project.cleanup();
  }
  assert.equal(existsSync(project.root), false);
  project.cleanup();
});

test("invalid, dangerous, and traversal scenarios are generated without escaping temp storage", () => {
  withSyntheticProject({ seed: 202, scenario: "invalid-config" }, (project) => {
    const yaml = readFileSync(resolve(project.configDirectory, "contrast.yaml"), "utf8");
    assert.throws(() => parseConfigYaml({ family: "contrast", file: "contrast.yaml", yaml }));
  });

  withSyntheticProject({ seed: 203, scenario: "dangerous-svg" }, (project) => {
    const svg = readFileSync(project.svgFile, "utf8");
    assert.equal(svg, createDangerousSyntheticSvg(203));
    assert.match(svg, /<script>|onload=|https:\/\//u);
  });

  withSyntheticProject({ seed: 204, scenario: "traversal" }, (project) => {
    const yaml = readFileSync(resolve(project.configDirectory, "asset.yaml"), "utf8");
    assert.match(yaml, /\.\.\/\.\.\//u);
    assert.equal(existsSync(resolve(project.root, "..", "outside fixture 000000cc.svg")), false);
  });
});

test("temporary projects clean up even when the consumer throws", () => {
  let generatedRoot = "";
  assert.throws(() =>
    withSyntheticProject({ seed: 303 }, (project) => {
      generatedRoot = project.root;
      throw new Error("synthetic consumer failure");
    }),
  );
  assert.equal(existsSync(generatedRoot), false);
});

test("the repository contains no committed fixture media or user assets", () => {
  const fixtureFiles = filesBelow(resolve(root, "tests", "fixtures"));
  assert.deepEqual(
    fixtureFiles.filter((path) => mediaExtensions.has(extname(path).toLowerCase())),
    [],
  );

  const tracked = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer" });
  assert.equal(tracked.status, 0, tracked.stderr.toString("utf8"));
  const trackedMedia = tracked.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .filter((path) => mediaExtensions.has(extname(path).toLowerCase()))
    .filter((path) => !path.startsWith("assets/source/") && !path.startsWith("assets/library/"));
  assert.deepEqual(trackedMedia, []);
});
