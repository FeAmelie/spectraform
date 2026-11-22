# ADR 0001: Tauri 2 desktop shell

## Status

Akzeptiert

## Kontext

Spectraform needs a compact cross-platform desktop boundary for local files, fullscreen, diagnostics, packaging, and later encoder supervision while keeping its UI and visual contracts in TypeScript.

## Entscheidung

Use Tauri 2 with a Rust native layer and one Preact/Vite application root. Native operations are exposed only through versioned, allowlisted commands and scoped capabilities.

## Konsequenzen

### Positiv

- Rust owns canonical paths and process safety.
- The web UI remains small, portable, and testable.
- CSP and capabilities provide a reviewable default-deny surface.

### Negativ

- Every bridge contract must be maintained in Rust and TypeScript.
- Platform packaging and native tests remain necessary.
- Split control/output windows are deferred.
