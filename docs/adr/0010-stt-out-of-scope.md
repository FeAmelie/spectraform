# ADR 0010: Speech-to-text and typography outside MVP

## Status

Akzeptiert

## Kontext

Speech recognition and automatic typography add model, language, timing, privacy, font licensing, layout, and export complexity unrelated to the core PsyPanic visual MVP.

## Entscheidung

Keep speech-to-text, lyric transcription, word timing, and automatic typography outside Foundation and MVP. They may return only through a separately scoped, local-first design with explicit privacy and licensing decisions.

## Konsequenzen

### Positiv

- Foundation stays focused on local assets, audio features, mappings, and visual output.
- No cloud speech service or runtime network dependency is introduced.
- Test and accessibility scope remains tractable.

### Negativ

- Text synchronized to speech must be authored externally for now.
- Later adoption requires new contracts, UI, privacy review, and deterministic export tests.
- Typography automation receives no compatibility guarantee in v0.1.
