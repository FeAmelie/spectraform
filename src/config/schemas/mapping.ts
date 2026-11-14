import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const mappingConfigSchemaV1 = versionedConfigV1.extend({
  id: z.string().min(1),
  mappings: z.array(
    z.looseObject({
      id: z.string().min(1),
      source: z.string().min(1),
      target: z.string().min(1),
      output: z.tuple([z.number(), z.number()]),
      curve: z.enum(["linear", "smoothstep", "ease", "exponential"]).optional(),
      clamp: z.tuple([z.number(), z.number()]).optional(),
    }),
  ),
});

export type MappingConfigV1 = z.infer<typeof mappingConfigSchemaV1>;
