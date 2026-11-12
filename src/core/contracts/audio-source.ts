import type { VersionedContractV1 } from "./version.ts";

export type AudioSourceKind = "local-file" | "generated-test";

export interface AudioSourceInfoV1 extends VersionedContractV1 {
  readonly opaqueSourceId: string;
  readonly sourceKind: AudioSourceKind;
  readonly sampleRateHz: number;
  readonly channelCount: number;
  readonly durationSeconds?: number;
}

export interface AudioChunkV1 extends VersionedContractV1 {
  readonly sourceId: string;
  readonly startFrame: number;
  readonly frameCount: number;
  readonly channels: readonly (readonly number[])[];
  readonly endOfStream: boolean;
}

export interface AudioSourceV1 {
  readonly contractVersion: VersionedContractV1["contractVersion"];
  describe(): Promise<AudioSourceInfoV1>;
  read(startFrame: number, frameCount: number): Promise<AudioChunkV1>;
  close(): Promise<void>;
}
