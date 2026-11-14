import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

const frequencyBand = z.looseObject({
  min_hz: z.number().nonnegative(),
  max_hz: z.number().positive(),
});

export const audioConfigSchemaV1 = versionedConfigV1.extend({
  source: z.looseObject({
    kind: z.enum(["local-file", "generated-test"]),
    opaque_ref: z.string().min(1),
  }),
  analysis: z.looseObject({
    fft_size: z.number().int().min(32),
    bands: z.looseObject({
      low: frequencyBand,
      mid: frequencyBand,
      high: frequencyBand,
    }),
  }),
});

export type AudioConfigV1 = z.infer<typeof audioConfigSchemaV1>;
