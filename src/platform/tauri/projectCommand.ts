import type { ConfigFamily } from "../../config/registry.ts";

export const PROJECT_COMMAND_CONTRACT_VERSION = 1 as const;
export const PROJECT_LAYOUT_VERSION = 1 as const;

export const PROJECT_CONFIG_REFERENCES = Object.freeze({
  app: "config/app.yaml",
  audio: "config/audio.yaml",
  asset: "config/asset.yaml",
  mapping: "config/mapping.yaml",
  palette: "config/palette.yaml",
  scene: "config/scene.yaml",
  show: "config/show.yaml",
  import: "config/import.yaml",
  contrast: "config/contrast.yaml",
  export: "config/export.yaml",
} satisfies Record<ConfigFamily, string>);

export type ProjectConfigReferences = Readonly<Record<ConfigFamily, string>>;
export type ProjectConfigSources = Readonly<Record<ConfigFamily, string>>;

export interface ProjectSnapshotResponse {
  readonly commandContractVersion: typeof PROJECT_COMMAND_CONTRACT_VERSION;
  readonly projectLayoutVersion: typeof PROJECT_LAYOUT_VERSION;
  readonly projectRoot: string;
  readonly sources: ProjectConfigSources;
}

export type ProjectInvoker = <Result>(
  command: string,
  args: Record<string, unknown>,
) => Promise<Result>;

type TauriInternals = { invoke: ProjectInvoker };

function defaultInvoker<Result>(command: string, args: Record<string, unknown>): Promise<Result> {
  const internals = (globalThis as typeof globalThis & { __TAURI_INTERNALS__?: TauriInternals })
    .__TAURI_INTERNALS__;
  if (!internals) return Promise.reject(new Error("Tauri IPC is unavailable"));
  return internals.invoke<Result>(command, args);
}

export function readProjectSnapshot(
  projectRoot: string,
  configFiles: ProjectConfigReferences = PROJECT_CONFIG_REFERENCES,
  invoke: ProjectInvoker = defaultInvoker,
): Promise<ProjectSnapshotResponse> {
  return invoke<ProjectSnapshotResponse>("load_project_snapshot", {
    request: {
      commandContractVersion: PROJECT_COMMAND_CONTRACT_VERSION,
      projectLayoutVersion: PROJECT_LAYOUT_VERSION,
      projectRoot,
      configFiles,
    },
  });
}
