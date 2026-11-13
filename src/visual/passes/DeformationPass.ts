import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

export class DeformationPass implements RenderNode {
  readonly id = "deformation" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const phase = context.input.timeSeconds + context.input.seed * 0.01;
    const state = appendVisualLayer(context.visualState, this.id, {
      offsetX: Number((Math.sin(phase) * 0.025).toFixed(8)),
      offsetY: Number((Math.cos(phase) * 0.025).toFixed(8)),
      baselineReset: true,
    });
    return completePass(context, this, state);
  }
}
