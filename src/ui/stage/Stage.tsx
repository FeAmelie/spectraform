import { useEffect, useRef } from "preact/hooks";

import { ScreenOutput } from "../../visual/output/ScreenOutput.ts";
import { createFoundationFrame } from "../../visual/synthetic/createFoundationFrame.ts";

export function Stage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const output = new ScreenOutput(canvas);
    const { frame } = createFoundationFrame();
    void output.present(frame);
    return () => {
      void output.close();
    };
  }, []);

  return (
    <main class="stage" aria-labelledby="stage-title" data-testid="stage">
      <div class="stage-copy">
        <p class="eyebrow">Local composition</p>
        <h2 id="stage-title">Visual stage</h2>
        <p>Import an SVG and an audio source to begin a local session.</p>
      </div>
      <div
        class="stage-surface"
        role="img"
        aria-label="Deterministic generated Spectraform foundation frame"
      >
        <canvas
          ref={canvasRef}
          width={96}
          height={96}
          aria-hidden="true"
          style={{ width: "min(80%, 24rem)", aspectRatio: "1", imageRendering: "pixelated" }}
        />
      </div>
    </main>
  );
}
