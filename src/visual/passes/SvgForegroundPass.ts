import { completePass, type RenderEvaluationContext, type RenderNode } from "../RenderNode.ts";
import { appendVisualLayer } from "../VisualState.ts";

export class SvgForegroundPass implements RenderNode {
  readonly id = "svg-foreground" as const;

  evaluate(context: RenderEvaluationContext): RenderEvaluationContext {
    const state = appendVisualLayer(context.visualState, this.id, {
      geometry: "generated-disc",
      centerX: 0.5,
      centerY: 0.5,
      radius: 0.28,
    });
    return completePass(context, this, state);
  }
}
