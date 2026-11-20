import assert from "node:assert/strict";
import { test as nodeTest } from "node:test";

import { createFoundationFrame } from "../../src/visual/synthetic/createFoundationFrame.ts";

// Cross-GPU reference-image policy: each 8-bit RGB channel may differ from the
// deterministic CPU reference by at most 2/255; alpha must remain bit-exact.
const GPU_CHANNEL_TOLERANCE = 2;
const EXPECTED_PIXELS = [
  20, 9, 36, 255, 30, 21, 51, 255, 15, 9, 29, 255, 17, 9, 32, 255, 18, 21, 33, 255, 15, 9, 28, 255,
  29, 9, 51, 255, 21, 9, 37, 255, 28, 9, 48, 255, 24, 9, 43, 255, 12, 9, 24, 255, 26, 21, 45, 255,
] as const;
const foundationTest = globalThis.test ?? nodeTest;

foundationTest("visual state is exact and the generated image stays within GPU tolerance", () => {
  const result = createFoundationFrame({ width: 4, height: 3, seed: 7, timeSeconds: 0.5 });

  assert.deepEqual(result.visualState, {
    contractVersion: { major: 1, minor: 0 },
    frameId: "foundation-7-500000-4x3",
    timeSeconds: 0.5,
    deterministicSeed: 7,
    layers: [
      {
        layerId: "background",
        visible: true,
        opacity: 1,
        properties: { hue: 329, luminance: 0.06, pattern: "foundation-grid" },
      },
      {
        layerId: "deformation",
        visible: true,
        opacity: 1,
        properties: { offsetX: 0.0134908, offsetY: 0.02104752, baselineReset: true },
      },
      {
        layerId: "svg-foreground",
        visible: true,
        opacity: 1,
        properties: { geometry: "generated-disc", centerX: 0.5, centerY: 0.5, radius: 0.28 },
      },
      {
        layerId: "fx",
        visible: true,
        opacity: 1,
        properties: { glow: 0.19957433, generated: true },
      },
      {
        layerId: "contrast",
        visible: true,
        opacity: 1,
        properties: {
          mode: "foundation-static",
          foregroundLuminance: 0.78,
          backgroundLuminance: 0.06,
        },
      },
      {
        layerId: "composite",
        visible: true,
        opacity: 1,
        properties: { sourceLayers: 5, opaque: true },
      },
    ],
    metadata: { width: 4, height: 3, colorSpace: "srgb", baseline: true },
  });

  const actual = result.frame.pixels?.data;
  assert.equal(actual?.length, EXPECTED_PIXELS.length);
  actual?.forEach((channel, index) => {
    const expected = EXPECTED_PIXELS[index] as number;
    const tolerance = index % 4 === 3 ? 0 : GPU_CHANNEL_TOLERANCE;
    assert.ok(Math.abs(channel - expected) <= tolerance, `pixel channel ${index}`);
  });
});
