import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CONTRACT_VERSION_V1,
  UnsupportedContractVersionError,
  parseV1Contract,
  type AudioSourceInfoV1,
  type ControlSnapshotV1,
  type RenderFrameV1,
  type RuntimeContextV1,
  type VisualStateV1,
} from "../../src/core/contracts/index.ts";

const fixtures = {
  runtime: {
    contractVersion: CONTRACT_VERSION_V1,
    sessionId: "session-test",
    executionMode: "preview",
    deterministicSeed: 7,
    monotonicTimeSeconds: 1.25,
    networkCapability: "none",
  } satisfies RuntimeContextV1,
  audio: {
    contractVersion: CONTRACT_VERSION_V1,
    opaqueSourceId: "source-test",
    sourceKind: "generated-test",
    sampleRateHz: 48_000,
    channelCount: 2,
  } satisfies AudioSourceInfoV1,
  controls: {
    contractVersion: CONTRACT_VERSION_V1,
    frameId: "frame-1",
    timeSeconds: 1.25,
    values: { energy: 0.5, enabled: true },
  } satisfies ControlSnapshotV1,
  visual: {
    contractVersion: CONTRACT_VERSION_V1,
    frameId: "frame-1",
    timeSeconds: 1.25,
    deterministicSeed: 7,
    layers: [
      {
        layerId: "layer-1",
        visible: true,
        opacity: 1,
        properties: { amount: 0.5 },
      },
    ],
  } satisfies VisualStateV1,
  frame: {
    contractVersion: CONTRACT_VERSION_V1,
    frameId: "frame-1",
    width: 2,
    height: 1,
    timeSeconds: 1.25,
    colorSpace: "srgb",
    pixels: { format: "rgba8", data: [0, 0, 0, 255, 255, 255, 255, 255] },
  } satisfies RenderFrameV1,
};

test("all v1 data contracts serialize deterministically and retain their version", () => {
  for (const [name, fixture] of Object.entries(fixtures)) {
    const serialized = JSON.stringify(fixture);
    const decoded = JSON.parse(serialized);
    assert.equal(decoded.contractVersion.major, 1, name);
    assert.equal(JSON.stringify(decoded), serialized, name);
  }
});

test("unknown major versions fail closed", () => {
  const incompatible = {
    ...fixtures.runtime,
    contractVersion: { major: 2, minor: 0 },
  };
  assert.throws(
    () => parseV1Contract<RuntimeContextV1>(incompatible, "RuntimeContext"),
    (error: unknown) =>
      error instanceof UnsupportedContractVersionError && error.receivedMajor === 2,
  );
});

test("additive optional fields survive parsing without changing v1 semantics", () => {
  const extended = JSON.parse(JSON.stringify({ ...fixtures.runtime, futureHint: "retained" }));
  const parsed = parseV1Contract<RuntimeContextV1 & { futureHint?: string }>(
    extended,
    "RuntimeContext",
  );
  assert.equal(parsed.futureHint, "retained");
  assert.equal(parsed.networkCapability, "none");
});
