import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { EncoderJobValidationError, validateEncoderJob } from "../../src/export/EncoderJob.ts";

const safeJob = {
  encoderJobVersion: 1,
  codec: "vp9",
  width: 1280,
  height: 720,
  framerate: 30,
  inputPathPattern: "/tmp/project/frame-%06d.png",
  outputPath: "/tmp/export/render.webm",
  overwrite: false,
} as const;

test("unknown arguments and shell-shaped free-form fields fail closed", () => {
  assert.throws(
    () => validateEncoderJob({ ...safeJob, arguments: ["-y", "; open /Applications"] }),
    (error: unknown) =>
      error instanceof EncoderJobValidationError && error.code === "unknown_argument",
  );
});

test("relative paths, traversal, mismatched targets, and overwrite requests fail closed", () => {
  for (const candidate of [
    { ...safeJob, inputPathPattern: "frames/frame-%06d.png" },
    { ...safeJob, inputPathPattern: "/tmp/project/../secret/frame-%06d.png" },
    { ...safeJob, outputPath: "/tmp/export/../secret/render.webm" },
    { ...safeJob, outputPath: "/tmp/export/render.mp4" },
    { ...safeJob, overwrite: true },
  ]) {
    assert.throws(() => validateEncoderJob(candidate), EncoderJobValidationError);
  }
});

test("native process construction is shell-free, timeout-bounded, and allowlist-only", async () => {
  const [ffmpegSource, jobSource, libSource] = await Promise.all([
    readFile(new URL("../../src-tauri/src/export/ffmpeg.rs", import.meta.url), "utf8"),
    readFile(new URL("../../src-tauri/src/export/encoder_job.rs", import.meta.url), "utf8"),
    readFile(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8"),
  ]);

  assert.match(ffmpegSource, /Command::new\(program\)/);
  assert.match(ffmpegSource, /Duration::from_secs\(2\)/);
  assert.match(ffmpegSource, /child\.kill\(\)/);
  assert.doesNotMatch(ffmpegSource, /(?:^|\W)(?:sh|bash|zsh)(?:\W|$)|-c["']/u);
  assert.match(jobSource, /"-n"\.into\(\)/);
  assert.doesNotMatch(jobSource, /"-y"\.into\(\)/);
  assert.doesNotMatch(libSource, /commands::encoder::/);
});
