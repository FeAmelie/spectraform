import assert from "node:assert/strict";
import { test } from "node:test";

import { assertDiagnosticEventV1, createDiagnosticEvent } from "../../src/diagnostics/events.ts";
import { subscribeToThrottledDebugProjection } from "../../src/diagnostics/projectDebugView.ts";
import type { DebugProjection } from "../../src/diagnostics/projectDebugView.ts";
import { diagnosticTransportContract, LocalDiagnosticStore } from "../../src/diagnostics/store.ts";

test("Diagnostic Event v1 accepts structured additive payloads", () => {
  const event = createDiagnosticEvent("frame", "info", { fps: 60, future_optional: true }, "2026-01-01T00:00:00.000Z");
  assert.doesNotThrow(() => assertDiagnosticEventV1(event));
  assert.equal(event.diagnostic_event_version, 1);
});

test("invalid event versions fail closed", () => {
  assert.throws(() => assertDiagnosticEventV1({ diagnostic_event_version: 2 }), /expected 1/u);
});

test("debug projection is throttled and publication is nonblocking", async () => {
  const store = new LocalDiagnosticStore();
  const projections: DebugProjection[] = [];
  const stop = subscribeToThrottledDebugProjection(store, (value) => projections.push(value), 10);
  store.publish(createDiagnosticEvent("frame", "debug", { frame: 1 }));
  store.publish(createDiagnosticEvent("frame", "debug", { frame: 2 }));
  assert.equal(projections.length, 0);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(projections.length, 1);
  assert.equal(projections[0]?.total, 2);
  stop();
});

test("transport contract forbids telemetry, upload, and runtime network", () => {
  assert.deepEqual(diagnosticTransportContract, {
    storage: "local-only",
    telemetry: "disabled",
    upload: "forbidden",
    runtimeNetworkCapability: "none",
  });
});
