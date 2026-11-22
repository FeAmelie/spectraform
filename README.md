# Spectraform

Spectraform is the local-first, asset-neutral engine and macOS desktop foundation for deterministic audio-reactive visuals. PsyPanic is the first local use case, not a product-specific dependency of the engine.

Foundation v0.1 provides a Tauri 2/Preact/Vite/Rust shell, versioned YAML configuration, an atomic local project loader, a deterministic render graph, a safe FFmpeg contract, diagnostics, tests, and an ad-hoc macOS development bundle. Audio playback, production smart import, complete mesh rendering, deterministic multi-pass encoding, signed distribution, and release publishing remain later product work.

The runtime network capability is none. Dependency installation may use the package registry during bootstrap; the application runtime, validation, tests, builds, project loading, previews, and export contracts require no network service.

## Canonical commands

```sh
pnpm bootstrap
node scripts/check-docs.mts
pnpm validate
pnpm test
pnpm build
pnpm export:smoke
```

`pnpm bootstrap` verifies the pinned Node, pnpm, and Rust versions and installs the frozen lockfile. FFmpeg is an optional local capability for the current smoke path; use `brew bundle --file Brewfile` when native export work is needed.

## Repository boundaries

User/project SVG and audio files are never committed. Generated outputs are never committed. PsyPanic assets are read-only local inputs and remain outside this repository. Spectraform-owned or right-cleared product assets may be committed only below `assets/source/` or `assets/library/` after explicit review.

## Documentation

- [Architecture](docs/architecture.md)
- [Bootstrap and clean checkout](docs/bootstrap.md)
- [Configuration](docs/configuration.md)
- [Security](docs/security.md)
- [Testing](docs/testing.md)
- [Local projects](docs/local-projects.md)
- [Export and FFmpeg](docs/export.md)
- [macOS packaging](docs/packaging.md)
- [SVG asset specification](docs/svg-asset-spec.md)
- [Architecture decisions](docs/adr/0001-tauri-shell.md)

Known Foundation limits and the next implementation boundaries are documented in the linked guides and ADR consequences.
