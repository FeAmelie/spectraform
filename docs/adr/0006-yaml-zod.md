# ADR 0006: YAML with Zod validation

## Status

Akzeptiert

## Kontext

Art direction and show configuration must be readable and versioned while failing with actionable diagnostics before runtime activation.

## Entscheidung

Use YAML as the authored format and one Zod registry for the ten `schema_version: 1` families. Reject duplicate keys and unsupported major versions; report file, YAML path, received and expected values, and correction guidance.

## Konsequenzen

### Positiv

- Configuration remains human-readable and strongly validated.
- One registry prevents parser drift.
- Version gates support explicit migrations.

### Negativ

- YAML has syntax and coercion edge cases that require tests.
- Schema changes must remain synchronized with examples and loaders.
- Breaking changes require a new major version.
