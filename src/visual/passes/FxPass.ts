import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

export class FxPass implements RenderNode {
  readonly id = "fx" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const pulse = 0.5 + 0.5 * Math.sin(context.input.timeSeconds * 2 + context.input.seed);
    const state = appendVisualLayer(context.visualState, this.id, {
      glow: Number((0.12 + pulse * 0.08).toFixed(8)),
      generated: true,
    });
    return completePass(context, this, state);
  }
}
