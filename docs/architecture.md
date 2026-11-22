# Foundation architecture

## System boundary

Spectraform has one application root. Preact renders the UI and stage; TypeScript owns versioned contracts, configuration parsing, runtime state, and the deterministic render graph. Tauri 2 and Rust own the desktop lifecycle, reviewed commands, canonical path enforcement, local file reads, and process preparation.

```text
local project -> Rust path policy -> YAML/Zod registry -> RuntimeContext v1
RuntimeContext + control snapshot -> VisualState v1 -> ordered RenderGraph -> RenderFrame v1
                                                             -> screen / future export
```

The runtime network capability is none. `connect-src 'none'`, local `index.html`, and the reviewed invoke allowlist make this an enforceable boundary rather than only a design preference.

## Current Foundation implementation

- The project loader reads all ten v1 configuration families, validates their references, then atomically activates one immutable runtime context. Failure leaves the previous context active.
- The render graph has the fixed order background, deformation, SVG foreground, FX, contrast, composite. Foundation nodes produce deterministic state and a synthetic frame; production WebGL and audio processing remain later work.
- Native commands expose foundation status, fullscreen, and a read-only project snapshot. Encoder modules exist for validation and capability preparation but are not added to the runtime invoke allowlist.
- Diagnostics remain local and redact paths and embedded content.

## Dependency direction

Core contracts do not import app, UI, platform, or project code. Visual code consumes core contracts. App orchestration consumes config, core, and platform adapters. Platform-specific code stays behind adapters and Rust commands. Run `node scripts/check-dependency-direction.mts` or the aggregate `pnpm validate` to enforce the rule.

## Related decisions

[Tauri shell](adr/0001-tauri-shell.md), [hybrid rendering](adr/0003-hybrid-rendering.md), [mesh deformation](adr/0004-mesh-deformation.md), and [macOS reference platform](adr/0009-macos-reference.md) describe the intended path beyond Foundation.
