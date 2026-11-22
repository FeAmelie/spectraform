# Bootstrap and clean checkout

## Pinned toolchain

- Node `24.22.2` from `.node-version`
- pnpm `12.19.0` from `package.json`
- Rust `1.99.1` from `rust-toolchain.toml`
- FFmpeg `>=9.0.2` when local encoding capability is required

`pnpm bootstrap` fails closed on a mismatched pinned toolchain, uses the frozen pnpm lockfile, and is idempotent. A missing FFmpeg binary produces guidance rather than preventing Foundation development.

## Executable clean-checkout walkthrough

The following walkthrough is headless. The clone and first dependency install are the only steps that can require network access; after the pnpm store is populated, validation, tests, and builds run offline. Do not copy any PsyPanic or user assets into the checkout.

```sh
git clone https://github.com/FeAmelie/spectraform.git
cd spectraform
corepack enable
pnpm bootstrap
node scripts/check-docs.mts
pnpm validate
pnpm test
pnpm build
pnpm export:smoke
git status --short
```

Expected results are `docs: pass`, `validate: pass`, `validate: pass (tests only)`, `build: pass (temporary outputs removed)`, an export smoke pass or explicit capability skip, and an empty final Git status. `pnpm validate` and `pnpm build` place Cargo outputs in temporary or explicitly external target directories and remove their transient build products.

For an already populated pnpm store, set `SPECTRAFORM_PNPM_STORE_DIR` to that store before `pnpm bootstrap`. Rust commands use `--locked --offline`; no GUI is required for this walkthrough.
