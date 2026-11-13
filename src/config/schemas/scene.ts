import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const sceneConfigSchemaV1 = versionedConfigV1.extend({
  id: z.string().min(1),
  mapping_ref: z.string().min(1),
  palette_ref: z.string().min(1),
  background_ref: z.string().min(1),
  intensity: z.number().min(0).max(1).default(1),
});

export type SceneConfigV1 = z.infer<typeof sceneConfigSchemaV1>;
