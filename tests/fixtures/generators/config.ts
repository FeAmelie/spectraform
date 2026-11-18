import type { ConfigFamily } from "../../../src/config/registry.ts";

export const FIXTURE_GENERATOR_VERSION = 1 as const;

export interface GeneratedConfigSource {
  readonly family: ConfigFamily;
  readonly file: string;
  readonly yaml: string;
}

export function normalizeSeed(seed: number): number {
  if (!Number.isSafeInteger(seed)) throw new TypeError("Fixture seed must be a safe integer");
  return seed >>> 0;
}

export function seedToken(seed: number): string {
  return normalizeSeed(seed).toString(16).padStart(8, "0");
}

function yaml(lines: readonly string[]): string {
  return `${lines.join("\n")}\n`;
}

export function createSyntheticConfigSources(seed: number): readonly GeneratedConfigSource[] {
  const token = seedToken(seed);
  const maskRef = `generated/mask-${token}.svg`;
  const audioRef = `generated/audio-${token}.wav`;

  return [
    {
      family: "app",
      file: "app.yaml",
      yaml: yaml([
        "schema_version: 1",
        "app:",
        `  id: fixture-app-${token}`,
        `  display_name: Synthetic Fixture ${token}`,
        "  locale: en",
        "runtime:",
        "  network_capability: none",
        "  quality_profile: balanced",
        "project_storage:",
        "  mode: local-app-data",
        `  workspace_ref: fixture-workspace-${token}`,
        "  repository_assets: forbidden",
      ]),
    },
    {
      family: "audio",
      file: "audio.yaml",
      yaml: yaml([
        "schema_version: 1",
        "source:",
        "  kind: generated-test",
        `  opaque_ref: ${audioRef}`,
        "analysis:",
        "  fft_size: 64",
        "  bands:",
        "    low: { min_hz: 20, max_hz: 250 }",
        "    mid: { min_hz: 250, max_hz: 2000 }",
        "    high: { min_hz: 2000, max_hz: 8000 }",
      ]),
    },
    {
      family: "asset",
      file: "asset.yaml",
      yaml: yaml([
        "schema_version: 1",
        `id: fixture-mask-${token}`,
        "source:",
        "  kind: generated-test",
        `  opaque_ref: ${maskRef}`,
        "original_policy: immutable",
      ]),
    },
    {
      family: "mapping",
      file: "mapping.yaml",
      yaml: yaml([
        "schema_version: 1",
        `id: fixture-mapping-${token}`,
        "mappings:",
        `  - id: low-to-scale-${token}`,
        "    source: audio.bands.low",
        "    target: visual.deformation.scale",
        "    output: [0, 1]",
        "    curve: smoothstep",
        "    clamp: [0, 1]",
      ]),
    },
    {
      family: "palette",
      file: "palette.yaml",
      yaml: yaml([
        "schema_version: 1",
        `id: fixture-palette-${token}`,
        "colors:",
        "  background: '#08070c'",
        "  foreground: '#f3f0ff'",
        "  accent: '#7049ff'",
      ]),
    },
    {
      family: "scene",
      file: "scene.yaml",
      yaml: yaml([
        "schema_version: 1",
        `id: fixture-scene-${token}`,
        `mapping_ref: fixture-mapping-${token}`,
        `palette_ref: fixture-palette-${token}`,
        `background_ref: fixture-mask-${token}`,
        "intensity: 0.75",
      ]),
    },
    {
      family: "show",
      file: "show.yaml",
      yaml: yaml([
        "schema_version: 1",
        `id: fixture-show-${token}`,
        `audio_ref: ${audioRef}`,
        "cues:",
        "  - start_ms: 0",
        `    scene_ref: fixture-scene-${token}`,
        "    transition: cut",
        "    duration_ms: 1000",
      ]),
    },
    {
      family: "import",
      file: "import.yaml",
      yaml: yaml([
        "schema_version: 1",
        "workspace:",
        "  kind: local-app-data",
        `  opaque_ref: fixture-workspace-${token}`,
        "  repository_persistence: forbidden",
        "svg:",
        "  reject_scripts: true",
        "  reject_event_handlers: true",
        "  reject_external_urls: true",
        "  require_approval: true",
      ]),
    },
    {
      family: "contrast",
      file: "contrast.yaml",
      yaml: yaml([
        "schema_version: 1",
        "mode: recommend",
        "target_score: 0.8",
        "hysteresis: 0.1",
        "analysis_hz: 12",
        "transition_ms: 180",
      ]),
    },
    {
      family: "export",
      file: "export.yaml",
      yaml: yaml([
        "schema_version: 1",
        "destination:",
        "  kind: local-directory",
        `  opaque_ref: fixture-export-${token}`,
        "  overwrite: never",
        "profile:",
        "  width: 640",
        "  height: 360",
        "  fps: 30",
        "  color_space: srgb",
        "passes: [composite]",
      ]),
    },
  ];
}
