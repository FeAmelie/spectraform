import assert from "node:assert/strict";
import { test } from "node:test";

import { FOUNDATION_PASS_ORDER, RenderGraph } from "../../src/visual/RenderGraph.ts";

const input = {
  seed: 47,
  timeSeconds: 2.5,
  config: { width: 8, height: 6, colorSpace: "srgb" as const },
};

test("render graph evaluates the exact foundation pass order", () => {
  const result = new RenderGraph().evaluate(input);
  assert.deepEqual(result.passOrder, FOUNDATION_PASS_ORDER);
});

test("same seed, time, and config serialize to the same visual state", () => {
  const graph = new RenderGraph();
  const first = graph.evaluate(input);
  const second = graph.evaluate(input);

  assert.equal(JSON.stringify(second.visualState), JSON.stringify(first.visualState));
  assert.equal(JSON.stringify(second.frame), JSON.stringify(first.frame));
});

test("evaluations always return to baseline instead of accumulating transforms", () => {
  const graph = new RenderGraph();
  const baseline = graph.evaluate(input);
  graph.evaluate({ ...input, timeSeconds: 99 });
  const repeated = graph.evaluate(input);

  assert.deepEqual(repeated.visualState, baseline.visualState);
  assert.deepEqual(repeated.frame, baseline.frame);
  assert.notStrictEqual(repeated.visualState, baseline.visualState);
});
