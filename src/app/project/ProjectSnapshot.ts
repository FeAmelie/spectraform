import type { ConfigFamily, ConfigForFamily } from "../../config/registry.ts";
import type { RuntimeContextV1 } from "../../core/contracts/runtime-context.ts";
import type {
  PROJECT_LAYOUT_VERSION,
  ProjectConfigReferences,
} from "../../platform/tauri/projectCommand.ts";

export type ProjectConfigSources = Readonly<Record<ConfigFamily, string>>;
export type ParsedProjectConfigs = {
  readonly [Family in ConfigFamily]: ConfigForFamily<Family>;
};

export {
  PROJECT_CONFIG_REFERENCES,
  PROJECT_LAYOUT_VERSION,
  type ProjectConfigReferences,
  type ProjectSnapshotResponse,
} from "../../platform/tauri/projectCommand.ts";

export interface ProjectSnapshot {
  readonly projectLayoutVersion: typeof PROJECT_LAYOUT_VERSION;
  readonly projectRoot: string;
  readonly references: ProjectConfigReferences;
  readonly configs: ParsedProjectConfigs;
}

export interface ProjectRuntimeContext extends RuntimeContextV1 {
  readonly project: ProjectSnapshot;
}
