import assert from "node:assert/strict";
import { test } from "node:test";

import { createDiagnosticEvent } from "../../src/diagnostics/events.ts";
import { REDACTED_ASSET_CONTENT, REDACTED_PATH, redactDiagnosticEvent } from "../../src/diagnostics/redact.ts";

test("macOS, Windows, and traversal paths are redacted", () => {
  const safe = redactDiagnosticEvent(createDiagnosticEvent("config", "error", {
    mac: "/Users/test/Music/project/audio.wav",
    windows: "C:\\Users\\test\\Music\\audio.wav",
    traversal: "../../private/mask.svg",
  }));
  assert.deepEqual(safe.payload, { mac: REDACTED_PATH, windows: REDACTED_PATH, traversal: REDACTED_PATH });
});

test("asset contents are removed before local logging", () => {
  const safe = redactDiagnosticEvent(createDiagnosticEvent("adapter", "warn", {
    assetContent: "<svg><script>synthetic</script></svg>",
    audio_bytes: [1, 2, 3],
    label: "synthetic fixture",
  }));
  assert.equal(safe.payload.assetContent, REDACTED_ASSET_CONTENT);
  assert.equal(safe.payload.audio_bytes, REDACTED_ASSET_CONTENT);
  assert.equal(safe.payload.label, "synthetic fixture");
});
