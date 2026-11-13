import type { RenderFrameV1, VisualStateV1 } from "../core/contracts/index.ts";
import type { FoundationPassId, RenderEvaluationContext, RenderNode } from "./RenderNode.ts";
import { createBaselineVisualState, type VisualEvaluationInput } from "./VisualState.ts";
import { BackgroundPass } from "./passes/BackgroundPass.ts";
import { CompositePass } from "./passes/CompositePass.ts";
import { ContrastPass } from "./passes/ContrastPass.ts";
import { DeformationPass } from "./passes/DeformationPass.ts";
import { FxPass } from "./passes/FxPass.ts";
import { SvgForegroundPass } from "./passes/SvgForegroundPass.ts";

export const FOUNDATION_PASS_ORDER = [
  "background",
  "deformation",
  "svg-foreground",
  "fx",
  "contrast",
  "composite",
] as const satisfies readonly FoundationPassId[];

export interface RenderGraphResult {
  readonly visualState: VisualStateV1;
  readonly frame: RenderFrameV1;
  readonly passOrder: readonly FoundationPassId[];
}

export class RenderGraph {
  readonly #nodes: readonly RenderNode[];

  constructor(
    nodes: readonly RenderNode[] = [
      new BackgroundPass(),
      new DeformationPass(),
      new SvgForegroundPass(),
      new FxPass(),
      new ContrastPass(),
      new CompositePass(),
    ],
  ) {
    const ids = nodes.map((node) => node.id);
    if (JSON.stringify(ids) !== JSON.stringify(FOUNDATION_PASS_ORDER)) {
      throw new Error(
        `RenderGraph requires exact pass order: ${FOUNDATION_PASS_ORDER.join(" -> ")}`,
      );
    }
    this.#nodes = [...nodes];
  }

  evaluate(input: VisualEvaluationInput): RenderGraphResult {
    let context: RenderEvaluationContext = {
      input,
      visualState: createBaselineVisualState(input),
      passOrder: [] as readonly FoundationPassId[],
    };
    for (const node of this.#nodes) context = node.evaluate(context);
    if (!context.frame) throw new Error("Composite pass did not produce a RenderFrame v1");
    return {
      visualState: context.visualState,
      frame: context.frame,
      passOrder: context.passOrder,
    };
  }
}
