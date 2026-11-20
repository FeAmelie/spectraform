# Configuration

Spectraform project configuration is YAML parsed through one Zod registry. Every document has `schema_version: 1`; unknown major versions, duplicate YAML keys, unknown families, and schema violations fail closed with file, YAML path, received value, expected value, and correction guidance.

## Required v1 families

Each local project contains exactly these files under `config/`:

| Family | File | Purpose |
| --- | --- | --- |
| app | `config/app.yaml` | identity, locale, runtime and storage policy |
| audio | `config/audio.yaml` | local audio source and analysis contract |
| asset | `config/asset.yaml` | immutable local visual source |
| mapping | `config/mapping.yaml` | control-to-visual mappings |
| palette | `config/palette.yaml` | semantic colors |
| scene | `config/scene.yaml` | scene references and intensity |
| show | `config/show.yaml` | audio reference and cue timeline |
| import | `config/import.yaml` | safe SVG import policy |
| contrast | `config/contrast.yaml` | contrast recommendation parameters |
| export | `config/export.yaml` | output profile and pass selection |

References are checked after all ten documents parse. The loader activates a new context only when scene, mapping, palette, asset, show, and audio references resolve together.

## Versioning policy

Additive optional fields can remain within v1 only when defaults preserve current behavior. Breaking shapes require a new major schema and explicit migration. Configuration never grants runtime networking or permission to persist user assets in Git. See [local projects](local-projects.md) and [YAML/Zod ADR](adr/0006-yaml-zod.md).
