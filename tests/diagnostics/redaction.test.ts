import assert from "node:assert/strict";
import { test } from "node:test";

import { createDiagnosticEvent } from "../../src/diagnostics/events.ts";
import { REDACTED_ASSET_CONTENT, REDACTED_PATH, redactDiagnosticEvent } from "../../src/diagnostics/redact.ts";

test("macOS, Windows, and traversal paths are redacted", () => {
  const safe = redactDiagnosticEvent(createDiagnosticEvent("config", "error", {
    mac: "/Users/test/My Project/audio.wav",
    macMessage: "failed to load /Users/test/My Project/audio.wav",
    windows: "C:\\Users\\test\\My Project\\audio.wav",
    windowsMessage: "failed to load C:\\Users\\test\\My Project\\audio.wav",
    traversal: "../../private folder/mask.svg",
  }));
  assert.deepEqual(safe.payload, {
    mac: REDACTED_PATH,
    macMessage: REDACTED_PATH,
    windows: REDACTED_PATH,
    windowsMessage: REDACTED_PATH,
    traversal: REDACTED_PATH,
  });
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

test("direct SVG and audio fields and embedded asset content are removed", () => {
  const safe = redactDiagnosticEvent(createDiagnosticEvent("adapter", "warn", {
    svg: "<svg>direct secret</svg>",
    audio: [0.1, 0.2, 0.3],
    nested: {
      markup: "<svg>nested secret</svg>",
      source: "data:audio/wav;base64,c3ludGhldGlj",
    },
  }));

  assert.deepEqual(safe.payload, {
    svg: REDACTED_ASSET_CONTENT,
    audio: REDACTED_ASSET_CONTENT,
    nested: {
      markup: REDACTED_ASSET_CONTENT,
      source: REDACTED_ASSET_CONTENT,
    },
  });
});
