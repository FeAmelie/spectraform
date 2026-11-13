import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const assetConfigSchemaV1 = versionedConfigV1.extend({
  id: z.string().min(1),
  source: z.looseObject({
    kind: z.enum(["local-file", "generated-test"]),
    opaque_ref: z.string().min(1),
    content_sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/u)
      .optional(),
  }),
  original_policy: z.literal("immutable"),
  normalized_working_copy_ref: z.string().min(1).optional(),
});

export type AssetConfigV1 = z.infer<typeof assetConfigSchemaV1>;
