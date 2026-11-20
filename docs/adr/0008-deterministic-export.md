# ADR 0008: Feature prepass and deterministic multi-pass export

## Status

Akzeptiert

## Kontext

Production exports need reproducible frame counts, timing, passes, and audio-reactive state. Realtime Web Audio playback cannot be the export clock.

## Entscheidung

Precompute time-indexed audio features, then step frames at `frameIndex / fps`. Evaluate cues, mappings, VisualState, and ordered render passes from that time. Encode only through EncoderJob v1 and a structured FFmpeg argv allowlist.

## Konsequenzen

### Positiv

- Repeated exports can be byte- and state-comparable.
- Preview and export share feature definitions and render contracts.
- Background, foreground, matte, and composite passes can be synchronized.

### Negativ

- Prepass storage and deterministic GPU behavior require further work.
- Foundation currently supplies contracts and a capability smoke, not the production multi-pass exporter.
- Encoder compatibility must remain explicitly tested.
