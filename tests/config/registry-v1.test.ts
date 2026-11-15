import assert from "node:assert/strict";
import { test } from "node:test";

import { stringify } from "yaml";

import {
  CONFIG_FAMILIES,
  configSchemaRegistryV1,
  parseConfigYaml,
  type ConfigFamily,
} from "../../src/config/registry.ts";
import { ConfigValidationError, UnsupportedConfigVersionError } from "../../src/config/errors.ts";

const validConfigs = {
  app: {
    schema_version: 1,
    app: { id: "spectraform", display_name: "Spectraform" },
    runtime: { network_capability: "none", quality_profile: "balanced" },
    project_storage: {
      mode: "local-app-data",
      workspace_ref: "workspace:test-project",
      repository_assets: "forbidden",
    },
  },
  audio: {
    schema_version: 1,
    source: { kind: "generated-test", opaque_ref: "generated:audio:seed-7" },
    analysis: {
      fft_size: 4096,
      bands: {
        low: { min_hz: 35, max_hz: 180 },
        mid: { min_hz: 180, max_hz: 2500 },
        high: { min_hz: 2500, max_hz: 16000 },
      },
    },
  },
  asset: {
    schema_version: 1,
    id: "generated-mask",
    source: { kind: "generated-test", opaque_ref: "generated:svg:seed-7" },
    original_policy: "immutable",
  },
  mapping: {
    schema_version: 1,
    id: "mapping-test",
    mappings: [
      {
        id: "energy-opacity",
        source: "audio.rms",
        target: "layer.opacity",
        output: [0, 1],
      },
    ],
  },
  palette: {
    schema_version: 1,
    id: "palette-test",
    colors: { primary: "#102030", accent: "#abcdef" },
  },
  scene: {
    schema_version: 1,
    id: "scene-test",
    mapping_ref: "mapping-test",
    palette_ref: "palette-test",
    background_ref: "generated:background:seed-7",
  },
  show: {
    schema_version: 1,
    id: "show-test",
    audio_ref: "audio-test",
    cues: [{ start_ms: 0, scene_ref: "scene-test", transition: "cut" }],
  },
  import: {
    schema_version: 1,
    workspace: {
      kind: "local-app-data",
      opaque_ref: "workspace:test-project",
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
    target_score: 0.62,
    hysteresis: 0.08,
    analysis_hz: 8,
    transition_ms: 700,
  },
  export: {
    schema_version: 1,
    destination: {
      kind: "local-directory",
      opaque_ref: "output:test-project",
      overwrite: "never",
    },
    profile: { width: 1920, height: 1080, fps: 60, color_space: "rec709" },
    passes: ["composite", "foreground", "background", "matte"],
  },
} as const satisfies Record<ConfigFamily, object>;

test("the registry exposes exactly ten v1 configuration families", () => {
  assert.deepEqual(CONFIG_FAMILIES, [
    "app",
    "audio",
    "asset",
    "mapping",
    "palette",
    "scene",
    "show",
    "import",
    "contrast",
    "export",
  ]);
  assert.equal(Object.keys(configSchemaRegistryV1).length, 10);
});

test("all families load valid synthetic YAML without repository or user assets", () => {
  for (const family of CONFIG_FAMILIES) {
    const parsed = parseConfigYaml({
      family,
      file: `synthetic/${family}.yaml`,
      yaml: stringify(validConfigs[family]),
    });
    assert.equal(parsed.schema_version, 1, family);
  }
});

test("unknown major versions fail closed for every family", () => {
  for (const family of CONFIG_FAMILIES) {
    assert.throws(
      () =>
        parseConfigYaml({
          family,
          file: `synthetic/${family}.yaml`,
          yaml: stringify({ ...validConfigs[family], schema_version: 2 }),
        }),
      (error: unknown) =>
        error instanceof UnsupportedConfigVersionError &&
        error.diagnostic.file === `synthetic/${family}.yaml` &&
        error.diagnostic.yamlPath === "$.schema_version" &&
        error.receivedMajor === 2,
      family,
    );
  }
});

test("additive optional fields remain compatible and are preserved", () => {
  for (const family of CONFIG_FAMILIES) {
    const parsed = parseConfigYaml({
      family,
      file: `synthetic/${family}.yaml`,
      yaml: stringify({ ...validConfigs[family], future_optional: { enabled: true } }),
    });
    assert.deepEqual(parsed.future_optional, { enabled: true }, family);
  }
});

test("validation diagnostics contain file, YAML path, received value, expectation and hint", () => {
  assert.throws(
    () =>
      parseConfigYaml({
        family: "contrast",
        file: "local/contrast.yaml",
        yaml: stringify({ ...validConfigs.contrast, target_score: 2 }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.equal(error.diagnostic.file, "local/contrast.yaml");
      assert.equal(error.diagnostic.yamlPath, "$.target_score");
      assert.equal(error.diagnostic.receivedValue, 2);
      assert.match(error.diagnostic.expected, /less than or equal to 1/u);
      assert.match(error.diagnostic.correctionHint, /\$\.target_score/u);
      assert.match(error.message, /local\/contrast\.yaml:\$\.target_score/u);
      return true;
    },
  );
});

test("local storage and path contracts remain opaque and forbid repository persistence", () => {
  const app = parseConfigYaml({
    family: "app",
    file: "local/app.yaml",
    yaml: stringify(validConfigs.app),
  });
  const imported = parseConfigYaml({
    family: "import",
    file: "local/import.yaml",
    yaml: stringify(validConfigs.import),
  });
  const exported = parseConfigYaml({
    family: "export",
    file: "local/export.yaml",
    yaml: stringify(validConfigs.export),
  });

  assert.equal(app.project_storage.repository_assets, "forbidden");
  assert.equal(imported.workspace.repository_persistence, "forbidden");
  assert.equal(exported.destination.kind, "local-directory");
  assert.match(validConfigs.asset.source.opaque_ref, /^generated:/u);
});
