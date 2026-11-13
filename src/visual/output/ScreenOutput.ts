import {
  CONTRACT_VERSION_V1,
  type RenderFrameV1,
  type VisualOutputAdapterV1,
  type VisualOutputCapabilitiesV1,
} from "../../core/contracts/index.ts";

export interface CanvasPresentationContext {
  createImageData(width: number, height: number): { data: Uint8ClampedArray };
  putImageData(image: { data: Uint8ClampedArray }, x?: number, y?: number): void;
}

export interface CanvasPresentationTarget {
  width: number;
  height: number;
  getContext(type: "2d"): CanvasPresentationContext | null;
}

export class ScreenOutput implements VisualOutputAdapterV1 {
  readonly contractVersion = CONTRACT_VERSION_V1;
  readonly #target: CanvasPresentationTarget;
  #closed = false;

  constructor(target: CanvasPresentationTarget) {
    this.#target = target;
  }

  async capabilities(): Promise<VisualOutputCapabilitiesV1> {
    return {
      contractVersion: CONTRACT_VERSION_V1,
      adapterId: "screen-output-v1",
      colorSpaces: ["srgb", "display-p3"],
      supportsRealtime: true,
    };
  }

  async present(frame: RenderFrameV1): Promise<void> {
    if (this.#closed) throw new Error("ScreenOutput is closed");
    const pixels = frame.pixels;
    if (!pixels || pixels.format !== "rgba8") {
      throw new TypeError("ScreenOutput requires an rgba8 pixel buffer");
    }
    const expectedLength = frame.width * frame.height * 4;
    if (pixels.data.length !== expectedLength) {
      throw new RangeError(`RenderFrame pixel length must be ${expectedLength}`);
    }
    const context = this.#target.getContext("2d");
    if (!context) throw new Error("ScreenOutput requires a 2D presentation context");

    this.#target.width = frame.width;
    this.#target.height = frame.height;
    const image = context.createImageData(frame.width, frame.height);
    image.data.set(pixels.data);
    context.putImageData(image, 0, 0);
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}
