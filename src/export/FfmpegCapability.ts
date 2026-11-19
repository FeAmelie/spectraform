export const MINIMUM_FFMPEG_VERSION = Object.freeze({ major: 9, minor: 0, patch: 2 });

export interface FfmpegVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export type FfmpegCapability =
  | {
      readonly status: "available";
      readonly version: FfmpegVersion;
      readonly minimumVersion: FfmpegVersion;
    }
  | {
      readonly status: "unavailable" | "unsupported";
      readonly version?: FfmpegVersion;
      readonly minimumVersion: FfmpegVersion;
      readonly reason: string;
    };

export function parseFfmpegVersion(output: string): FfmpegVersion | undefined {
  const match = output.match(/ffmpeg version (?:n)?(\d+)\.(\d+)(?:\.(\d+))?/iu);
  if (!match) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0),
  };
}

export function supportsMinimumFfmpegVersion(version: FfmpegVersion): boolean {
  return compareVersions(version, MINIMUM_FFMPEG_VERSION) >= 0;
}

export function capabilityFromVersionOutput(output: string): FfmpegCapability {
  const version = parseFfmpegVersion(output);
  if (!version) {
    return {
      status: "unavailable",
      minimumVersion: MINIMUM_FFMPEG_VERSION,
      reason: "FFmpeg version output could not be parsed",
    };
  }
  if (!supportsMinimumFfmpegVersion(version)) {
    return {
      status: "unsupported",
      version,
      minimumVersion: MINIMUM_FFMPEG_VERSION,
      reason: "FFmpeg does not satisfy the minimum version",
    };
  }
  return { status: "available", version, minimumVersion: MINIMUM_FFMPEG_VERSION };
}

function compareVersions(left: FfmpegVersion, right: FfmpegVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}
