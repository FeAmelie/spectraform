import assert from "node:assert/strict";
import test from "node:test";

import {
  ENCODER_JOB_VERSION,
  EncoderJobValidationError,
  validateEncoderJob,
} from "../../src/export/EncoderJob.ts";

const validJob = {
  encoderJobVersion: ENCODER_JOB_VERSION,
  codec: "h264",
  width: 1920,
  height: 1080,
  framerate: 30,
  inputPathPattern: "/tmp/spectraform/frames/frame-%06d.png",
  outputPath: "/tmp/spectraform/export/render.mp4",
  overwrite: false,
} as const;

test("EncoderJob v1 accepts only the canonical structured contract", () => {
  assert.equal(validateEncoderJob(validJob), validJob);
});

test("EncoderJob v1 rejects unsupported versions, codecs, dimensions, and framerates", () => {
  for (const candidate of [
    { ...validJob, encoderJobVersion: 2 },
    { ...validJob, codec: "copy" },
    { ...validJob, width: 1919 },
    { ...validJob, framerate: 29.97 },
  ]) {
    assert.throws(() => validateEncoderJob(candidate), EncoderJobValidationError);
  }
});
