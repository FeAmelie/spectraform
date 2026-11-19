# ADR 0002: Web Audio for preview playback and analysis

## Status

Akzeptiert

## Kontext

Preview needs local file playback, FFT and time-domain features, and a monotonic clock without coupling the renderer directly to an audio implementation.

## Entscheidung

Use Web Audio for local-file preview playback and analysis behind versioned audio-source and control-snapshot contracts. The playback clock is authoritative for preview cues. No microphone or remote stream is required by Foundation.

## Konsequenzen

### Positiv

- Browser-native analysis integrates with the TypeScript runtime.
- Audio and rendering remain separated by contracts.
- Local preview requires no runtime network.

### Negativ

- Web Audio preview alone cannot guarantee arbitrary sample-accurate offline seeking.
- Production implementation and platform-specific audio routing remain future work.
- Export needs a separate feature prepass.
