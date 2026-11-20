# ADR 0004: Mesh-first deformation

## Status

Akzeptiert

## Kontext

Required face and wave effects need true geometry movement. General path morphing is fragile when path counts, ordering, topology, or closure differ.

## Entscheidung

Use a sampled 2D mesh as the primary general deformation strategy. Use path morphing only for explicitly compatible normalized shapes. Shader displacement may enhance but not replace geometry deformation.

## Konsequenzen

### Positiv

- Deformation works across more source geometry.
- Safety limits and baseline return can be centralized.
- Selective path morphing remains available for high-quality compatible parts.

### Negativ

- Mesh generation, texture sampling, and protected facial regions require product work.
- Visual fidelity depends on sampling quality.
- Foundation includes only the deformation pass contract, not production mesh conversion.
