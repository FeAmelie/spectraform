import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const showConfigSchemaV1 = versionedConfigV1.extend({
  id: z.string().min(1),
  audio_ref: z.string().min(1),
  cues: z.array(
    z.looseObject({
      start_ms: z.number().int().nonnegative(),
      scene_ref: z.string().min(1),
      transition: z.enum(["cut", "fade", "pulse"]),
      duration_ms: z.number().int().nonnegative().optional(),
    }),
  ),
});

export type ShowConfigV1 = z.infer<typeof showConfigSchemaV1>;
