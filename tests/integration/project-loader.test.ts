import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { stringify } from "yaml";

import { CONFIG_FAMILIES, type ConfigFamily } from "../../src/config/registry.ts";
import { ProjectLoader } from "../../src/app/project/ProjectLoader.ts";
import { ProjectPathPolicy } from "../../src/app/project/ProjectPathPolicy.ts";
import {
  PROJECT_CONFIG_REFERENCES,
  type ProjectConfigSources,
  type ProjectSnapshotResponse,
} from "../../src/app/project/ProjectSnapshot.ts";
import { RuntimeContextStore } from "../../src/app/runtime/RuntimeContextStore.ts";

let projectRoot = "";
let outsideRoot = "";
let sources: Record<ConfigFamily, string>;

function configValues(): Record<ConfigFamily, unknown> {
  return {
    app: {
      schema_version: 1,
      app: { id: "synthetic-app", display_name: "Synthetic App", locale: "en" },
      runtime: { network_capability: "none", quality_profile: "balanced" },
      project_storage: {
        mode: "local-app-data",
        workspace_ref: "synthetic-workspace",
        repository_assets: "forbidden",
      },
    },
    audio: {
      schema_version: 1,
      source: { kind: "generated-test", opaque_ref: "synthetic-audio" },
      analysis: {
        fft_size: 1024,
        bands: {
          low: { min_hz: 20, max_hz: 250 },
          mid: { min_hz: 250, max_hz: 2000 },
          high: { min_hz: 2000, max_hz: 12_000 },
        },
      },
    },
    asset: {
      schema_version: 1,
      id: "synthetic-background",
      source: { kind: "generated-test", opaque_ref: "synthetic-svg" },
      original_policy: "immutable",
    },
    mapping: { schema_version: 1, id: "synthetic-mapping", mappings: [] },
    palette: { schema_version: 1, id: "synthetic-palette", colors: { primary: "#ffffff" } },
    scene: {
      schema_version: 1,
      id: "synthetic-scene",
      mapping_ref: "synthetic-mapping",
      palette_ref: "synthetic-palette",
      background_ref: "synthetic-background",
      intensity: 1,
    },
    show: {
      schema_version: 1,
      id: "synthetic-show",
      audio_ref: "synthetic-audio",
      cues: [{ start_ms: 0, scene_ref: "synthetic-scene", transition: "cut" }],
    },
    import: {
      schema_version: 1,
      workspace: {
        kind: "local-app-data",
        opaque_ref: "synthetic-workspace",
        repository_persistence: "forbidden",
      },
      svg: {
        reject_scripts: true,
        reject_event_handlers: true,
        reject_external_urls: true,
        require_approval: true,
      },
    },
    contrast: {
      schema_version: 1,
      mode: "recommend",
      target_score: 0.8,
      hysteresis: 0.1,
      analysis_hz: 10,
      transition_ms: 100,
    },
    export: {
      schema_version: 1,
      destination: { kind: "local-directory", opaque_ref: "synthetic-export", overwrite: "never" },
      profile: { width: 640, height: 360, fps: 30, color_space: "srgb" },
      passes: ["composite"],
    },
  };
}

before(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), "spectraform-project-loader-"));
  outsideRoot = await mkdtemp(path.join(tmpdir(), "spectraform-project-outside-"));
  await mkdir(path.join(projectRoot, "config"));
  await writeFile(path.join(outsideRoot, "outside.yaml"), "schema_version: 1\n");
  sources = Object.fromEntries(
    CONFIG_FAMILIES.map((family) => [family, stringify(configValues()[family])]),
  ) as Record<ConfigFamily, string>;
  await Promise.all(
    CONFIG_FAMILIES.map((family) =>
      writeFile(path.join(projectRoot, PROJECT_CONFIG_REFERENCES[family]), sources[family]),
    ),
  );
});

after(async () => {
  await Promise.all([
    rm(projectRoot, { recursive: true, force: true }),
    rm(outsideRoot, { recursive: true, force: true }),
  ]);
});

async function readSnapshot(root: string): Promise<ProjectSnapshotResponse> {
  const policy = await ProjectPathPolicy.open(root);
  const entries = await Promise.all(
    CONFIG_FAMILIES.map(async (family) => {
      const approved = await policy.resolveExisting(PROJECT_CONFIG_REFERENCES[family]);
      return [family, await readFile(approved, "utf8")] as const;
    }),
  );
  return {
    commandContractVersion: 1,
    projectLayoutVersion: 1,
    projectRoot: policy.canonicalProjectRoot,
    sources: Object.fromEntries(entries) as ProjectConfigSources,
  };
}

test("a complete synthetic project activates exactly one runtime context without source changes", async () => {
  const beforeBytes = await Promise.all(
    CONFIG_FAMILIES.map((family) =>
      readFile(path.join(projectRoot, PROJECT_CONFIG_REFERENCES[family])),
    ),
  );
  const store = new RuntimeContextStore();
  const context = await new ProjectLoader(store, readSnapshot).load(projectRoot);
  const afterBytes = await Promise.all(
    CONFIG_FAMILIES.map((family) =>
      readFile(path.join(projectRoot, PROJECT_CONFIG_REFERENCES[family])),
    ),
  );

  assert.equal(store.activationCount, 1);
  assert.equal(store.active, context);
  assert.equal(context.project.configs.show.id, "synthetic-show");
  assert.equal(context.networkCapability, "none");
  assert.deepEqual(afterBytes, beforeBytes);
});

test("every config-family failure preserves the previous complete context", async () => {
  const store = new RuntimeContextStore();
  const loader = new ProjectLoader(store, readSnapshot);
  const previous = await loader.load(projectRoot);

  for (const family of CONFIG_FAMILIES) {
    const failingReader = async (root: string): Promise<ProjectSnapshotResponse> => {
      const snapshot = await readSnapshot(root);
      return {
        ...snapshot,
        sources: { ...snapshot.sources, [family]: "schema_version: 2\n" },
      };
    };
    await assert.rejects(() => new ProjectLoader(store, failingReader).load(projectRoot));
    assert.equal(store.active, previous, `${family} failure replaced the active context`);
  }
  assert.equal(store.activationCount, 1);
});

test("an unresolved reference preserves the previous context", async () => {
  const store = new RuntimeContextStore();
  const previous = await new ProjectLoader(store, readSnapshot).load(projectRoot);
  const failingReader = async (root: string): Promise<ProjectSnapshotResponse> => {
    const snapshot = await readSnapshot(root);
    const scene = { ...(configValues().scene as Record<string, unknown>), mapping_ref: "missing" };
    return { ...snapshot, sources: { ...snapshot.sources, scene: stringify(scene) } };
  };

  await assert.rejects(
    () => new ProjectLoader(store, failingReader).load(projectRoot),
    /unresolved/u,
  );
  assert.equal(store.active, previous);
  assert.equal(store.activationCount, 1);
});

test("traversal and outside path failures preserve the context and source bytes", async () => {
  const store = new RuntimeContextStore();
  const previous = await new ProjectLoader(store, readSnapshot).load(projectRoot);
  const beforeBytes = await Promise.all(
    CONFIG_FAMILIES.map((family) =>
      readFile(path.join(projectRoot, PROJECT_CONFIG_REFERENCES[family])),
    ),
  );

  for (const unsafeReference of ["../outside.yaml", path.join(outsideRoot, "outside.yaml")]) {
    const failingReader = async (root: string): Promise<ProjectSnapshotResponse> => {
      const policy = await ProjectPathPolicy.open(root);
      await policy.resolveExisting(unsafeReference);
      throw new Error("unsafe path unexpectedly resolved");
    };
    await assert.rejects(() => new ProjectLoader(store, failingReader).load(projectRoot));
    assert.equal(store.active, previous);
    assert.equal(store.activationCount, 1);
  }

  const afterBytes = await Promise.all(
    CONFIG_FAMILIES.map((family) =>
      readFile(path.join(projectRoot, PROJECT_CONFIG_REFERENCES[family])),
    ),
  );
  assert.deepEqual(afterBytes, beforeBytes);
});
