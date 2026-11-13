import { z } from "zod";

import { versionedConfigV1 } from "../schema-version.ts";

export const exportConfigSchemaV1 = versionedConfigV1.extend({
  destination: z.looseObject({
    kind: z.literal("local-directory"),
    opaque_ref: z.string().min(1),
    overwrite: z.enum(["never", "confirm"]),
  }),
  profile: z.looseObject({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fps: z.number().positive(),
    color_space: z.enum(["srgb", "rec709"]),
  }),
  passes: z.array(z.enum(["composite", "foreground", "background", "matte"])).min(1),
});

export type ExportConfigV1 = z.infer<typeof exportConfigSchemaV1>;
