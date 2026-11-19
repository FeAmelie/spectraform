import { seedToken } from "./config.ts";

export type SyntheticFixtureScenario =
  "positive" | "invalid-config" | "dangerous-svg" | "traversal";

export function createInvalidContrastConfig(seed: number): string {
  const token = seedToken(seed);
  return [
    "schema_version: 1",
    "mode: recommend",
    "target_score: 2",
    "hysteresis: 0.1",
    "analysis_hz: 12",
    "transition_ms: 180",
    `fixture_note: invalid-${token}`,
    "",
  ].join("\n");
}

export function createTraversalAssetConfig(seed: number): string {
  const token = seedToken(seed);
  return [
    "schema_version: 1",
    `id: fixture-traversal-${token}`,
    "source:",
    "  kind: generated-test",
    `  opaque_ref: ../../outside fixture ${token}.svg`,
    "original_policy: immutable",
    "",
  ].join("\n");
}
