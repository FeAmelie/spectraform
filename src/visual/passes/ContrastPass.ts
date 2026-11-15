import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

export class ContrastPass implements RenderNode {
  readonly id = "contrast" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const state = appendVisualLayer(context.visualState, this.id, {
      mode: "foundation-static",
      foregroundLuminance: 0.78,
      backgroundLuminance: 0.06,
    });
    return completePass(context, this, state);
  }
}
