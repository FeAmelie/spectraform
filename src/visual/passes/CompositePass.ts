import { CONTRACT_VERSION_V1, type RenderFrameV1 } from "../../core/contracts/index.ts";
import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function renderPixels(context: RenderEvaluationContext): readonly number[] {
  const { width, height } = context.input.config;
  const pixels = new Array<number>(width * height * 4);
  const phase = context.input.timeSeconds * 0.15 + context.input.seed * 0.017;
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const normalizedX = (x + 0.5) / width - 0.5;
      const normalizedY = (y + 0.5) / height - 0.5;
      const distance = Math.hypot(normalizedX, normalizedY);
      const ring = Math.max(0, 1 - Math.abs(distance - 0.25) * 12);
      const grid = (x + y + context.input.seed) % 4 === 0 ? 1 : 0;
      const wave = 0.5 + 0.5 * Math.sin((normalizedX - normalizedY) * 8 + phase);

      pixels[offset] = clampByte(12 + ring * 108 + wave * 18);
      pixels[offset + 1] = clampByte(9 + ring * 54 + grid * 12);
      pixels[offset + 2] = clampByte(24 + ring * 180 + wave * 28);
      pixels[offset + 3] = 255;
      offset += 4;
    }
  }
  return pixels;
}

export class CompositePass implements RenderNode {
  readonly id = "composite" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const visualState = appendVisualLayer(context.visualState, this.id, {
      sourceLayers: context.visualState.layers.length,
      opaque: true,
    });
    const frame: RenderFrameV1 = {
      contractVersion: CONTRACT_VERSION_V1,
      frameId: visualState.frameId,
      width: context.input.config.width,
      height: context.input.config.height,
      timeSeconds: context.input.timeSeconds,
      colorSpace: context.input.config.colorSpace,
      pixels: { format: "rgba8", data: renderPixels(context) },
      sourceStateId: visualState.frameId,
    };
    return completePass(context, this, visualState, frame);
  }
}
