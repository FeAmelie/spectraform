# Security model

## Default-deny desktop surface

The desktop loads bundled `index.html` only. Its CSP denies all by default, denies connections, objects, frames, forms, and workers, and permits only required local scripts, styles, fonts, images, and media. Capabilities apply only to the main window. The reviewed runtime invoke allowlist contains foundation status, fullscreen, and the project snapshot command.

The runtime network capability is none. Spectraform does not send telemetry, fetch remote assets, or require a server at runtime.

## Local path policy

Rust canonicalizes approved project, export, and diagnostics roots. It rejects relative roots, traversal, foreign-platform paths, missing candidates, outside paths, and symlink escapes. Project snapshot loading reads configuration text without modifying source files. A failed load cannot replace the active runtime context.

FFmpeg capability detection uses `std::process::Command` with a fixed executable and structured arguments, never shell interpolation. EncoderJob v1 allowlists codec, even dimensions, frame rate, frame pattern, and output extension. It always supplies `-n`; overwrite requests, existing outputs, broken output symlinks, free arguments, and unsafe paths fail closed.

## Asset policy

User/project SVG and audio files are never committed. Generated outputs are never committed. PsyPanic assets are read-only local inputs. Approved Spectraform-owned/right-cleared repository media belongs only in `assets/source/` or `assets/library/`; the repository checker enforces these paths.

Run `node scripts/check-security-surface.mts` and `node scripts/check-repository-policy.mts`, or use `pnpm validate` for the full gate.
