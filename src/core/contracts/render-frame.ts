import type { VersionedContractV1 } from "./version.ts";

export type RenderColorSpaceV1 = "srgb" | "display-p3";
export type RenderPixelFormatV1 = "rgba8";

export interface RenderPixelBufferV1 {
  readonly format: RenderPixelFormatV1;
  readonly data: readonly number[];
}

export interface RenderFrameV1 extends VersionedContractV1 {
  readonly frameId: string;
  readonly width: number;
  readonly height: number;
  readonly timeSeconds: number;
  readonly colorSpace: RenderColorSpaceV1;
  readonly pixels?: RenderPixelBufferV1;
  readonly sourceStateId?: string;
}
