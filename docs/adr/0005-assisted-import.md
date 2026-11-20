# ADR 0005: Assisted SVG import

## Status

Akzeptiert

## Kontext

Source SVGs may have inconsistent names and hierarchy. Automatic rewriting risks data loss, unsafe content, and incorrect semantic assignments.

## Entscheidung

Import is assisted and local: parse and sanitize, infer semantic roles, propose naming and mapping, show preview and diff, then require explicit confirmation. The original is immutable. Normalized copies and reports live only in ignored project data.

## Konsequenzen

### Positiv

- Users retain control and can inspect every change.
- Unsafe SVG features can fail before activation.
- PsyPanic assets are read-only local inputs and never become repository fixtures.

### Negativ

- Import requires an additional review UI and confidence model.
- Ambiguous structures need manual correction.
- Foundation provides policy and fixtures, not the complete import pipeline.
