# Spectraform Foundation Baseline

Status: accepted for Foundation v0.1
Date: 2026-11-10
Canonical machine-readable source: `config/foundation.yaml`

## Decision

Spectraform v0.1 establishes an asset-neutral, local-first application foundation for a macOS-first desktop product. The product core must remain portable across operating systems and must not contain PsyPanic-, user-, or project-specific assets or identifiers.

The execution declaration is fixed and intentionally separated into three axes:

- methodology: `assay`
- autonomy policy: `unicorn`
- session schedule: `batch`

No legacy workflow label may substitute another methodology.

## Foundation invariants

| Area | Foundation v0.1 decision |
|---|---|
| Product | Spectraform |
| Reference platform | macOS on arm64; the concrete reference device is not yet confirmed |
| Platform scope | macOS first, cross-platform core boundaries |
| Network | No network is required by the MVP application |
| Processing | Local-only |
| Asset core | Asset-neutral; PsyPanic is a use case, not a core constant |
| Ingest | Local files only |
| Originals | Immutable |
| Repository | User and project assets are forbidden |

These values implement the shared architectural flow from the concepts:

`Sources → Analysis → Normalized Controls → Mapping → Visual State → Render Graph → Preview / Fullscreen / Export`

## Open replaceable decisions

The following values are deliberately unresolved and centralized in `config/foundation.yaml` rather than being guessed or spread across source files:

- license
- bundle identifier
- legal owner

Each carries `status: unresolved` and `value: replace-before-release`. Foundation work may consume the status but must not reinterpret the placeholder as an approved release value.

## Concept alignment

This baseline was compared with both authoritative V3 inputs:

- `2026-11-10-psypanic-spectraform-gesamtkonzept-v3.md`
- `2026-11-10-psypanic-spectraform-technisches-konzept-v3.md`

The baseline preserves their relevant constraints:

1. Tauri/Rust and TypeScript are implementation choices for later Foundation tasks, not values invented by FND-001.
2. macOS is the initial reference platform while the core remains cross-platform.
3. The MVP processes local inputs without a backend or cloud upload.
4. Original assets remain unchanged and imported/generated work does not belong in source control.
5. PsyPanic-specific content remains outside the generic core.
6. Preview and export will share deterministic state and versioned contracts in later tasks.

## Consequences

- FND-002 may pin tool versions without changing these product decisions.
- FND-003 must enforce the repository asset policy.
- Later runtime, import, diagnostics, and export work must preserve local-only processing and immutable originals.
- Release packaging cannot claim final identity or licensing until the three open decisions are resolved.
