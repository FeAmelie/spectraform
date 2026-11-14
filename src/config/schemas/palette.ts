import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

const colorValue = z.string().regex(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu);

export const paletteConfigSchemaV1 = versionedConfigV1.extend({
  id: z.string().min(1),
  colors: z.record(z.string().min(1), colorValue),
});

export type PaletteConfigV1 = z.infer<typeof paletteConfigSchemaV1>;
