import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const contrastConfigSchemaV1 = versionedConfigV1.extend({
  mode: z.enum(["manual", "recommend", "auto"]),
  target_score: z.number().min(0).max(1),
  hysteresis: z.number().min(0).max(1),
  analysis_hz: z.number().min(1).max(30),
  transition_ms: z.number().int().nonnegative(),
});

export type ContrastConfigV1 = z.infer<typeof contrastConfigSchemaV1>;
