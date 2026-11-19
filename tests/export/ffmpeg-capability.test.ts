import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIMUM_FFMPEG_VERSION,
  capabilityFromVersionOutput,
  parseFfmpegVersion,
} from "../../src/export/FfmpegCapability.ts";
import {
  ENCODER_COMMAND_CONTRACT_VERSION,
  type EncoderInvoker,
  inspectFfmpegCapability,
} from "../../src/platform/tauri/encoderCommand.ts";

test("minimum FFmpeg version parsing is deterministic", () => {
  assert.deepEqual(parseFfmpegVersion("ffmpeg version 9.0.2 Copyright"), MINIMUM_FFMPEG_VERSION);
  assert.equal(capabilityFromVersionOutput("ffmpeg version 9.0.1").status, "unsupported");
  assert.equal(capabilityFromVersionOutput("ffmpeg version 9.1").status, "available");
  assert.equal(capabilityFromVersionOutput("not ffmpeg output").status, "unavailable");
});

test("frontend capability adapter sends a fixed command and versioned request", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> }> = [];
  const invoke: EncoderInvoker = <Result>(command: string, args: Record<string, unknown>) => {
    calls.push({ command, args });
    return Promise.resolve({
      status: "unavailable",
      minimumVersion: MINIMUM_FFMPEG_VERSION,
      reason: "synthetic capability skip",
    } as Result);
  };
  const result = await inspectFfmpegCapability(invoke);

  assert.equal(result.status, "unavailable");
  assert.deepEqual(calls, [
    {
      command: "inspect_ffmpeg_capability",
      args: { request: { commandContractVersion: ENCODER_COMMAND_CONTRACT_VERSION } },
    },
  ]);
});
