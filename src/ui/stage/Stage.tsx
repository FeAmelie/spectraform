export function Stage() {
  return (
    <main class="stage" aria-labelledby="stage-title" data-testid="stage">
      <div class="stage-copy">
        <p class="eyebrow">Local composition</p>
        <h2 id="stage-title">Visual stage</h2>
        <p>Import an SVG and an audio source to begin a local session.</p>
      </div>
      <div class="stage-surface" role="img" aria-label="Empty Spectraform visual output stage">
        <span aria-hidden="true">S</span>
      </div>
    </main>
  );
}
