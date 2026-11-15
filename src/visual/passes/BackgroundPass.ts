import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

export class BackgroundPass implements RenderNode {
  readonly id = "background" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const hue = (((context.input.seed * 47) % 360) + 360) % 360;
    const state = appendVisualLayer(context.visualState, this.id, {
      hue,
      luminance: 0.06,
      pattern: "foundation-grid",
    });
    return completePass(context, this, state);
  }
}
