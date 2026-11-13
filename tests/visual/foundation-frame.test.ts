import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ScreenOutput,
  type CanvasPresentationTarget,
} from "../../src/visual/output/ScreenOutput.ts";
import { createFoundationFrame } from "../../src/visual/synthetic/createFoundationFrame.ts";

test("foundation frame is runtime-generated, asset-free, and opaque", () => {
  const result = createFoundationFrame({ width: 16, height: 9, seed: 11, timeSeconds: 1 });
  const pixels = result.frame.pixels?.data;

  assert.equal(result.frame.width, 16);
  assert.equal(result.frame.height, 9);
  assert.equal(pixels?.length, 16 * 9 * 4);
  assert.ok(
    pixels?.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255),
  );
  assert.ok(pixels?.filter((_, index) => index % 4 === 3).every((alpha) => alpha === 255));
  assert.doesNotMatch(JSON.stringify(result), /(?:\.svg|asset|audio|psy.?panic)/i);
});

test("ScreenOutput presents the RenderFrame v1 pixel contract without a browser", async () => {
  const writes: number[][] = [];
  const context = {
    createImageData(width: number, height: number) {
      return { data: new Uint8ClampedArray(width * height * 4) };
    },
    putImageData(image: { data: Uint8ClampedArray }) {
      writes.push(Array.from(image.data));
    },
  };
  const target: CanvasPresentationTarget = {
    width: 0,
    height: 0,
    getContext: () => context,
  };
  const { frame } = createFoundationFrame({ width: 4, height: 3, seed: 2, timeSeconds: 0 });
  const output = new ScreenOutput(target);

  await output.present(frame);

  assert.equal(target.width, 4);
  assert.equal(target.height, 3);
  assert.deepEqual(writes[0], frame.pixels?.data);
});
