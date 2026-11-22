# Local projects

A project is a user-controlled local directory. Spectraform opens its configuration read-only for Foundation snapshot loading. The native snapshot command canonicalizes the project root and requires all ten YAML files below `config/` to stay within it; traversal, outside paths, and symlink escapes fail closed.

```text
project-root/
├── config/
│   ├── app.yaml
│   ├── audio.yaml
│   ├── asset.yaml
│   ├── mapping.yaml
│   ├── palette.yaml
│   ├── scene.yaml
│   ├── show.yaml
│   ├── import.yaml
│   ├── contrast.yaml
│   └── export.yaml
└── local asset files referenced by the configuration
```

The snapshot is complete or rejected. All YAML schemas and configuration cross-references validate before `RuntimeContextStore.activate` runs, so a config-family error preserves the previous active context. Asset and audio `opaque_ref` values are contracts only in Foundation: the current loader does not open those media files. Their eventual adapters must apply the same canonical-root and read-only boundary before accessing content.

## Storage boundary

User/project SVG and audio files are never committed. Generated outputs are never committed. Local projects belong in ignored locations such as `local-projects/`, `projects/local/`, `.spectraform/projects/`, or outside the repository. PsyPanic assets are read-only local inputs: Spectraform may read an explicitly selected local project but does not copy those originals into source control or rewrite them.

Spectraform-owned/right-cleared assets are a distinct product category. If explicitly approved for the product repository, they may live only at `assets/source/` or `assets/library/`; they are not substitutes for project storage.

See [configuration](configuration.md), [security](security.md), and the [assisted import decision](adr/0005-assisted-import.md).
