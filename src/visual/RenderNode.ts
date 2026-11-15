import type { RenderFrameV1, VisualStateV1 } from "../core/contracts/index.ts";
import type { VisualEvaluationInput } from "./VisualState.ts";

export type FoundationPassId =
  "background" | "deformation" | "svg-foreground" | "fx" | "contrast" | "composite";

export interface RenderEvaluationContext {
  readonly input: VisualEvaluationInput;
  readonly visualState: VisualStateV1;
  readonly passOrder: readonly FoundationPassId[];
  readonly frame?: RenderFrameV1;
}

export interface RenderNode {
  readonly id: FoundationPassId;
  evaluate(context: RenderEvaluationContext): RenderEvaluationContext;
}

export function completePass(
  context: RenderEvaluationContext,
  node: RenderNode,
  visualState: VisualStateV1,
  frame?: RenderFrameV1,
): RenderEvaluationContext {
  return {
    input: context.input,
    visualState,
    passOrder: [...context.passOrder, node.id],
    ...(frame ? { frame } : context.frame ? { frame: context.frame } : {}),
  };
}
