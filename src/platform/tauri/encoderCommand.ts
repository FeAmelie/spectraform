import type { EncoderJobV1 } from "../../export/EncoderJob.ts";
import type { FfmpegCapability } from "../../export/FfmpegCapability.ts";

export const ENCODER_COMMAND_CONTRACT_VERSION = 1 as const;

export interface EncoderCapabilityRequest {
  readonly commandContractVersion: typeof ENCODER_COMMAND_CONTRACT_VERSION;
}

export interface EncoderJobRequest {
  readonly commandContractVersion: typeof ENCODER_COMMAND_CONTRACT_VERSION;
  readonly projectRoot: string;
  readonly exportRoot: string;
  readonly diagnosticsRoot: string;
  readonly job: EncoderJobV1;
}

export interface EncoderPathRoots {
  readonly projectRoot: string;
  readonly exportRoot: string;
  readonly diagnosticsRoot: string;
}

export type EncoderInvoker = <Result>(
  command: string,
  args: Record<string, unknown>,
) => Promise<Result>;

export function inspectFfmpegCapability(invoke: EncoderInvoker): Promise<FfmpegCapability> {
  const request: EncoderCapabilityRequest = {
    commandContractVersion: ENCODER_COMMAND_CONTRACT_VERSION,
  };
  return invoke<FfmpegCapability>("inspect_ffmpeg_capability", { request });
}

export function validateNativeEncoderJob(
  job: EncoderJobV1,
  roots: EncoderPathRoots,
  invoke: EncoderInvoker,
): Promise<{ readonly encoderJobVersion: 1; readonly valid: true }> {
  const request: EncoderJobRequest = {
    commandContractVersion: ENCODER_COMMAND_CONTRACT_VERSION,
    ...roots,
    job,
  };
  return invoke("validate_encoder_job", { request });
}
