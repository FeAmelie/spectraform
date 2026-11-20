# Testing and verification

`pnpm validate` is the canonical full gate. It runs the foundation, repository, dependency-direction, and security checkers; Prettier, ESLint, TypeScript, rustfmt, and Clippy; every non-E2E Node test; and locked-offline Rust tests. `pnpm test` runs the Node and Rust test layers only.

## Test layers

- Contract tests protect v1 serialization, command payloads, and configuration behavior.
- Unit and visual tests verify deterministic render state, exact pass order, and the synthetic Foundation frame.
- Integration tests exercise atomic project loading and rollback.
- Security tests verify capability, CSP, invoke, canonical-path, and encoder boundaries.
- Repository tests inject forbidden tracked assets and required-layout failures.
- Packaging tests enforce the app-only, ad-hoc, arm64 and headless-launch contract. `scripts/package-macos-dev.mts` builds outside the repository; when `SPECTRAFORM_MACOS_DEV_APP` names an explicitly built bundle, the test also verifies its signature, identity, architecture, and headless launch.
- E2E desktop and web smoke specs are separate because they may require a display or browser runtime.

Fixtures are generated from seeds into OS temporary directories and cleaned on success and failure. They never use PsyPanic or user assets. New tests must remain parallel-safe, deterministic, and leave the repository clean.

Documentation has its own gate: `node scripts/check-docs.mts` checks required guides, local links, ten ADRs, clean-checkout commands, and explicit asset and packaging boundaries.
