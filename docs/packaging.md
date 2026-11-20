# macOS packaging

Foundation packaging produces an Apple-Silicon, ad-hoc signed development `.app` outside the repository. It is a developer verification artifact, not a distributable release.

```sh
node scripts/package-macos-dev.mts /absolute/path/outside/the/repository
```

The script builds web resources and the locked-offline Rust release binary, verifies the synthetic frame, embeds semantic version plus full commit SHA, checks an arm64-only executable, applies an ad-hoc signature, verifies it, and performs a headless launch. Scratch data is removed. The result is the current ad-hoc signed development .app.

## Explicit release boundary

Foundation does not create a DMG, Developer ID signature, notarization ticket, stapled artifact, update feed, or package-manager publication. A signed and notarized distribution is future release work requiring confirmed legal owner, bundle identity, certificates, hardened runtime and entitlements, release CI, and immutable release evidence. Homebrew Cask publication is also future work and begins only after a stable signed/notarized downloadable artifact exists.

No `.app`, DMG, export, or other generated output is committed. Generated outputs are never committed. See [macOS reference ADR](adr/0009-macos-reference.md) and [bootstrap](bootstrap.md).
