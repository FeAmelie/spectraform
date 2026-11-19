# ADR 0007: Cue timeline plus audio reactivity

## Status

Akzeptiert

## Kontext

Audio features provide continuous reactivity, but portfolio shows also need authored scene changes, transitions, palettes, and effect overrides at deliberate moments.

## Entscheidung

Add a cue timeline driven by the authoritative playback/export clock. Cues select scenes and transition state; audio features continue to drive mappings within that state. Both resolve into one VisualState.

## Konsequenzen

### Positiv

- Authored structure and live reactivity coexist.
- Preview and export can evaluate the same timeline deterministically.
- Scene configuration stays separate from raw audio analysis.

### Negativ

- Clock, transition, and seek semantics require precise tests.
- Cue editing UI remains future work.
- Foundation schemas include cues but not the complete production engine.
