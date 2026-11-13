import {
  CONTRACT_VERSION_V1,
  type JsonValue,
  type RenderColorSpaceV1,
  type VisualLayerStateV1,
  type VisualStateV1,
} from "../core/contracts/index.ts";

export interface FoundationVisualConfig {
  readonly width: number;
  readonly height: number;
  readonly colorSpace: RenderColorSpaceV1;
}

export interface VisualEvaluationInput {
  readonly seed: number;
  readonly timeSeconds: number;
  readonly config: FoundationVisualConfig;
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
}

export function validateVisualEvaluationInput(input: VisualEvaluationInput): void {
  assertFiniteNumber(input.seed, "seed");
  assertFiniteNumber(input.timeSeconds, "timeSeconds");
  if (!Number.isInteger(input.config.width) || input.config.width <= 0) {
    throw new RangeError("config.width must be a positive integer");
  }
  if (!Number.isInteger(input.config.height) || input.config.height <= 0) {
    throw new RangeError("config.height must be a positive integer");
  }
}

export function createFrameId(input: VisualEvaluationInput): string {
  const timeMicros = Math.round(input.timeSeconds * 1_000_000);
  return `foundation-${input.seed}-${timeMicros}-${input.config.width}x${input.config.height}`;
}

export function createBaselineVisualState(input: VisualEvaluationInput): VisualStateV1 {
  validateVisualEvaluationInput(input);
  return {
    contractVersion: CONTRACT_VERSION_V1,
    frameId: createFrameId(input),
    timeSeconds: input.timeSeconds,
    deterministicSeed: input.seed,
    layers: [],
    metadata: {
      width: input.config.width,
      height: input.config.height,
      colorSpace: input.config.colorSpace,
      baseline: true,
    },
  };
}

export function appendVisualLayer(
  state: VisualStateV1,
  layerId: string,
  properties: Readonly<Record<string, JsonValue>>,
  opacity = 1,
): VisualStateV1 {
  const layer: VisualLayerStateV1 = { layerId, visible: true, opacity, properties };
  return { ...state, layers: [...state.layers, layer] };
}
