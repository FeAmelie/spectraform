import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const appConfigSchemaV1 = versionedConfigV1.extend({
  app: z.looseObject({
    id: z.string().min(1),
    display_name: z.string().min(1),
    locale: z.string().min(2).optional(),
  }),
  runtime: z.looseObject({
    network_capability: z.literal("none"),
    quality_profile: z.enum(["performance", "balanced", "quality"]),
  }),
  project_storage: z.looseObject({
    mode: z.literal("local-app-data"),
    workspace_ref: z.string().min(1),
    repository_assets: z.literal("forbidden"),
  }),
});

export type AppConfigV1 = z.infer<typeof appConfigSchemaV1>;
