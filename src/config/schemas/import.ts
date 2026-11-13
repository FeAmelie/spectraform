import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const importConfigSchemaV1 = versionedConfigV1.extend({
  workspace: z.looseObject({
    kind: z.literal("local-app-data"),
    opaque_ref: z.string().min(1),
    repository_persistence: z.literal("forbidden"),
  }),
  svg: z.looseObject({
    reject_scripts: z.literal(true),
    reject_event_handlers: z.literal(true),
    reject_external_urls: z.literal(true),
    require_approval: z.literal(true),
  }),
});

export type ImportConfigV1 = z.infer<typeof importConfigSchemaV1>;
