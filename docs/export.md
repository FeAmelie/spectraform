# Export and FFmpeg

Foundation defines EncoderJob v1 and a safe local FFmpeg capability adapter. It does not yet implement the production deterministic multi-pass exporter.

FFmpeg detection is shell-free and accepts version `9.0.2` or newer. The native probe has a two-second timeout and terminates and waits for the child on timeout. Encoder jobs allow only H.264/MP4, VP9/WebM, or ProRes/MOV; even dimensions from 2 through 16384; frame rates 24, 25, 30, 50, or 60; one normalized PNG/PPM numbered frame pattern; and a new output below the approved export root.

The generated argv is fixed and includes `-n`. There is no free-form argument field. Existing outputs, overwrite requests, traversal, outside paths, unsafe names, mismatched extensions, and broken final-output symlinks are rejected.

`pnpm export:smoke` verifies the deterministic synthetic frame and returns either a local capability result or an explicit capability skip. It uses no user assets and no runtime network. Install the optional system dependency with `brew bundle --file Brewfile` before native encoder work.

The later exporter will perform a feature prepass and deterministic frame stepping so preview and export consume the same feature definitions. See [deterministic export ADR](adr/0008-deterministic-export.md) and [packaging](packaging.md).
