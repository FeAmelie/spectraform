# ADR 0009: macOS reference platform

## Status

Akzeptiert

## Kontext

The first development and acceptance environment is macOS, while contracts, paths, and rendering state should not unnecessarily prevent later Windows or Linux adapters.

## Entscheidung

Use macOS arm64 as the Foundation reference and package an ad-hoc signed development .app. Keep core TypeScript contracts platform-neutral and native behavior behind Tauri/Rust adapters. Defer signed and notarized distribution, DMG, and Homebrew Cask publication to the release phase.

## Konsequenzen

### Positiv

- One concrete platform supports reproducible early acceptance.
- The development bundle verifies identity, architecture, signature, and headless launch.
- Platform-neutral core contracts preserve an expansion path.

### Negativ

- Windows and Linux packaging and native adapters are unverified.
- Developer ID signing, hardened runtime, notarization, stapling, DMG, and release hosting remain future work.
- Current artifacts are not suitable for public distribution.
