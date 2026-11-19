export const ENCODER_JOB_VERSION = 1 as const;

export const ENCODER_CODECS = ["h264", "vp9", "prores"] as const;
export const ENCODER_FRAMERATES = [24, 25, 30, 50, 60] as const;

export type EncoderCodec = (typeof ENCODER_CODECS)[number];
export type EncoderFramerate = (typeof ENCODER_FRAMERATES)[number];

export interface EncoderJobV1 {
  readonly encoderJobVersion: typeof ENCODER_JOB_VERSION;
  readonly codec: EncoderCodec;
  readonly width: number;
  readonly height: number;
  readonly framerate: EncoderFramerate;
  readonly inputPathPattern: string;
  readonly outputPath: string;
  readonly overwrite: false;
}

const jobKeys = new Set([
  "encoderJobVersion",
  "codec",
  "width",
  "height",
  "framerate",
  "inputPathPattern",
  "outputPath",
  "overwrite",
]);

export class EncoderJobValidationError extends Error {
  readonly code:
    | "invalid_job"
    | "unsupported_version"
    | "unknown_argument"
    | "unsupported_codec"
    | "invalid_dimension"
    | "unsupported_framerate"
    | "unsafe_input_path"
    | "unsafe_output_path"
    | "overwrite_forbidden";

  constructor(
    code:
      | "invalid_job"
      | "unsupported_version"
      | "unknown_argument"
      | "unsupported_codec"
      | "invalid_dimension"
      | "unsupported_framerate"
      | "unsafe_input_path"
      | "unsafe_output_path"
      | "overwrite_forbidden",
    message: string,
  ) {
    super(message);
    this.name = "EncoderJobValidationError";
    this.code = code;
  }
}

export function validateEncoderJob(value: unknown): EncoderJobV1 {
  if (!isRecord(value)) {
    throw new EncoderJobValidationError("invalid_job", "EncoderJob must be an object");
  }
  for (const key of Object.keys(value)) {
    if (!jobKeys.has(key)) {
      throw new EncoderJobValidationError("unknown_argument", `Unknown EncoderJob field: ${key}`);
    }
  }
  if (value.encoderJobVersion !== ENCODER_JOB_VERSION) {
    throw new EncoderJobValidationError(
      "unsupported_version",
      `Unsupported encoderJobVersion: ${String(value.encoderJobVersion)}`,
    );
  }
  if (!ENCODER_CODECS.includes(value.codec as EncoderCodec)) {
    throw new EncoderJobValidationError(
      "unsupported_codec",
      `Unsupported encoder codec: ${String(value.codec)}`,
    );
  }
  assertDimension(value.width, "width");
  assertDimension(value.height, "height");
  if (!ENCODER_FRAMERATES.includes(value.framerate as EncoderFramerate)) {
    throw new EncoderJobValidationError(
      "unsupported_framerate",
      `Unsupported framerate: ${String(value.framerate)}`,
    );
  }
  assertSafeAbsolutePath(value.inputPathPattern, "input");
  assertSafeAbsolutePath(value.outputPath, "output");
  if (!isSafeFramePattern(value.inputPathPattern)) {
    throw new EncoderJobValidationError(
      "unsafe_input_path",
      "Input must be a numbered PNG or PPM frame pattern",
    );
  }
  if (!hasExpectedOutputExtension(value.outputPath, value.codec as EncoderCodec)) {
    throw new EncoderJobValidationError(
      "unsafe_output_path",
      "Output extension does not match the selected codec",
    );
  }
  if (value.overwrite !== false) {
    throw new EncoderJobValidationError(
      "overwrite_forbidden",
      "EncoderJob v1 never overwrites an existing final output",
    );
  }

  return Object.freeze(value as unknown as EncoderJobV1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertDimension(value: unknown, label: string): asserts value is number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 2 ||
    (value as number) > 16_384 ||
    (value as number) % 2 !== 0
  ) {
    throw new EncoderJobValidationError(
      "invalid_dimension",
      `${label} must be an even integer between 2 and 16384`,
    );
  }
}

function assertSafeAbsolutePath(value: unknown, kind: "input" | "output"): asserts value is string {
  const errorCode = kind === "input" ? "unsafe_input_path" : "unsafe_output_path";
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.includes("\0") ||
    /[\r\n]/u.test(value) ||
    value.split(/[\\/]/u).includes("..")
  ) {
    throw new EncoderJobValidationError(
      errorCode,
      `${kind} path must be absolute and traversal-free`,
    );
  }
}

function isSafeFramePattern(path: string): boolean {
  const name = path.split("/").at(-1) ?? "";
  return /^[A-Za-z0-9._-]*%0[1-9][0-9]?d\.(?:png|ppm)$/u.test(name);
}

function hasExpectedOutputExtension(path: string, codec: EncoderCodec): boolean {
  const extension = path.toLowerCase().split(".").at(-1);
  return (
    (codec === "h264" && extension === "mp4") ||
    (codec === "vp9" && extension === "webm") ||
    (codec === "prores" && extension === "mov")
  );
}
