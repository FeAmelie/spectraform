import { z } from "zod";

export const CONFIG_SCHEMA_MAJOR_VERSION = 1 as const;

export const schemaVersionV1 = z.literal(CONFIG_SCHEMA_MAJOR_VERSION);

export const versionedConfigV1 = z.looseObject({
  schema_version: schemaVersionV1,
});

export type SchemaVersionV1 = z.infer<typeof schemaVersionV1>;
