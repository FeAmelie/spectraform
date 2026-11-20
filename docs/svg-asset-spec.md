# SVG asset specification

## Input contract

SVG is a local project input. The original is immutable and remains at its user-selected path. Foundation path-checks the ten project configuration files, but treats an asset `opaque_ref` as data and does not open the referenced SVG yet. The future asset adapter must resolve the reference within the canonical project root and reject traversal, outside paths, missing files, and symlink escapes before reading content.

User/project SVG and audio files are never committed. PsyPanic assets are read-only local inputs and must not be copied into this repository. Generated outputs are never committed. Only explicitly approved Spectraform-owned/right-cleared assets may enter version control, and only at `assets/source/` or `assets/library/`.

## Safe import direction

The product import pipeline will parse SVG structurally, reject scripts, event handlers, foreign objects, external URLs, and unsafe references, then propose semantic names and hierarchy. It writes a normalized working copy, manifest, mapping draft, and report in ignored project data. It never mutates the original. Preview and diff precede explicit user confirmation.

Semantic roles use stable dotted identifiers such as `face.eye.left.pupil`; technical IDs remain unique. Shapes that require deformation may be sampled into a mesh or compatible path representation. Simple color and transform animation can remain SVG-oriented. No suggestion is activated automatically.

## Current limit

Foundation supplies schemas, path policy, synthetic safe/dangerous SVG fixtures, and render contracts. It does not yet ship the full structural parser, semantic classifier, preview UI, or production mesh conversion. See [assisted import ADR](adr/0005-assisted-import.md) and [hybrid rendering ADR](adr/0003-hybrid-rendering.md).
