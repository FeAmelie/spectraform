# ADR 0003: Hybrid SVG and WebGL2 rendering

## Status

Akzeptiert

## Kontext

Semantic SVG groups are efficient for colors and simple transforms, while deformation, shader backgrounds, and pass compositing need vertex- or texture-based processing.

## Entscheidung

Use a hybrid render graph: SVG-oriented processing for semantic elements and WebGL2 for meshes, shader effects, render targets, and compositing. Both consume one deterministic VisualState. Foundation establishes the pass order and contracts without claiming production WebGL completion.

## Konsequenzen

### Positiv

- Each visual technique uses an appropriate representation.
- Preview and export can share state and pass order.
- Not every SVG element must be triangulated.

### Negativ

- Cross-layer compositing, alpha, color, and DPI behavior need visual tests.
- Two rendering paths increase implementation complexity.
- Foundation currently uses deterministic synthetic nodes rather than production GPU passes.
