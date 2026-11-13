import { parseDocument } from "yaml";
import type { z } from "zod";

import {
  ConfigValidationError,
  UnknownConfigFamilyError,
  UnsupportedConfigVersionError,
  expectedFromZodIssue,
  formatYamlPath,
  readValueAtPath,
} from "./errors.ts";
import { CONFIG_SCHEMA_MAJOR_VERSION } from "./schema-version.ts";
import { appConfigSchemaV1 } from "./schemas/app.ts";
import { assetConfigSchemaV1 } from "./schemas/asset.ts";
import { audioConfigSchemaV1 } from "./schemas/audio.ts";
import { contrastConfigSchemaV1 } from "./schemas/contrast.ts";
import { exportConfigSchemaV1 } from "./schemas/export.ts";
import { importConfigSchemaV1 } from "./schemas/import.ts";
import { mappingConfigSchemaV1 } from "./schemas/mapping.ts";
import { paletteConfigSchemaV1 } from "./schemas/palette.ts";
import { sceneConfigSchemaV1 } from "./schemas/scene.ts";
import { showConfigSchemaV1 } from "./schemas/show.ts";

export const configSchemaRegistryV1 = {
  app: appConfigSchemaV1,
  audio: audioConfigSchemaV1,
  asset: assetConfigSchemaV1,
  mapping: mappingConfigSchemaV1,
  palette: paletteConfigSchemaV1,
  scene: sceneConfigSchemaV1,
  show: showConfigSchemaV1,
  import: importConfigSchemaV1,
  contrast: contrastConfigSchemaV1,
  export: exportConfigSchemaV1,
} as const satisfies Record<string, z.ZodType>;

export type ConfigFamily = keyof typeof configSchemaRegistryV1;
export type ConfigForFamily<Family extends ConfigFamily> = z.infer<
  (typeof configSchemaRegistryV1)[Family]
>;

export const CONFIG_FAMILIES = Object.freeze(Object.keys(configSchemaRegistryV1) as ConfigFamily[]);

export interface ConfigYamlSource<Family extends ConfigFamily = ConfigFamily> {
  readonly family: Family;
  readonly file: string;
  readonly yaml: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSupportedVersion(file: string, value: unknown): void {
  const received = isRecord(value) ? value.schema_version : undefined;
  if (received !== CONFIG_SCHEMA_MAJOR_VERSION) {
    throw new UnsupportedConfigVersionError(file, received, CONFIG_SCHEMA_MAJOR_VERSION);
  }
}

export function isConfigFamily(value: string): value is ConfigFamily {
  return Object.hasOwn(configSchemaRegistryV1, value);
}

export function parseConfigYaml<Family extends ConfigFamily>(
  source: ConfigYamlSource<Family>,
): ConfigForFamily<Family> {
  if (!isConfigFamily(source.family)) throw new UnknownConfigFamilyError(source.family);

  const document = parseDocument(source.yaml, { prettyErrors: false, uniqueKeys: true });
  const yamlError = document.errors[0];
  if (yamlError) {
    throw new ConfigValidationError(
      {
        file: source.file,
        yamlPath: "$",
        receivedValue: source.yaml,
        expected: "valid YAML",
        correctionHint: yamlError.message,
      },
      yamlError,
    );
  }

  const value: unknown = document.toJS();
  assertSupportedVersion(source.file, value);

  const schema = configSchemaRegistryV1[source.family];
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const yamlPath = formatYamlPath(issue.path);
    throw new ConfigValidationError(
      {
        file: source.file,
        yamlPath,
        receivedValue: readValueAtPath(value, issue.path),
        expected: expectedFromZodIssue(issue),
        correctionHint: `Set ${yamlPath} to a value accepted by the ${source.family} v1 schema.`,
      },
      result.error,
    );
  }

  return result.data as ConfigForFamily<Family>;
}
