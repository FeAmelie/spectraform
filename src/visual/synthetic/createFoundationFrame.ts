import { RenderGraph, type RenderGraphResult } from "../RenderGraph.ts";

export interface FoundationFrameOptions {
  readonly width?: number;
  readonly height?: number;
  readonly seed?: number;
  readonly timeSeconds?: number;
}

export function createFoundationFrame(options: FoundationFrameOptions = {}): RenderGraphResult {
  return new RenderGraph().evaluate({
    seed: options.seed ?? 1,
    timeSeconds: options.timeSeconds ?? 0,
    config: {
      width: options.width ?? 96,
      height: options.height ?? 96,
      colorSpace: "srgb",
    },
  });
}
