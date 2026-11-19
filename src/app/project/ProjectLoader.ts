import { CONFIG_FAMILIES, parseConfigYaml } from "../../config/registry.ts";
import { CONTRACT_VERSION_V1 } from "../../core/contracts/version.ts";
import { readProjectSnapshot } from "../../platform/tauri/projectCommand.ts";
import type { RuntimeContextStore } from "../runtime/RuntimeContextStore.ts";
import {
  PROJECT_CONFIG_REFERENCES,
  PROJECT_LAYOUT_VERSION,
  type ParsedProjectConfigs,
  type ProjectRuntimeContext,
  type ProjectSnapshotResponse,
} from "./ProjectSnapshot.ts";

export type ProjectSnapshotReader = (projectRoot: string) => Promise<ProjectSnapshotResponse>;

export class ProjectReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectReferenceError";
  }
}

function parseAllConfigs(response: ProjectSnapshotResponse): ParsedProjectConfigs {
  if (
    response.commandContractVersion !== 1 ||
    response.projectLayoutVersion !== PROJECT_LAYOUT_VERSION
  ) {
    throw new ProjectReferenceError("Unsupported project snapshot contract");
  }

  const entries = CONFIG_FAMILIES.map((family) => {
    const yaml = response.sources[family];
    if (typeof yaml !== "string") throw new ProjectReferenceError(`Missing ${family} config`);
    return [
      family,
      parseConfigYaml({ family, file: PROJECT_CONFIG_REFERENCES[family], yaml }),
    ] as const;
  });
  return Object.fromEntries(entries) as ParsedProjectConfigs;
}

function validateReferences(configs: ParsedProjectConfigs): void {
  if (configs.scene.mapping_ref !== configs.mapping.id) {
    throw new ProjectReferenceError("Scene mapping_ref is unresolved");
  }
  if (configs.scene.palette_ref !== configs.palette.id) {
    throw new ProjectReferenceError("Scene palette_ref is unresolved");
  }
  if (configs.scene.background_ref !== configs.asset.id) {
    throw new ProjectReferenceError("Scene background_ref is unresolved");
  }
  if (configs.show.audio_ref !== configs.audio.source.opaque_ref) {
    throw new ProjectReferenceError("Show audio_ref is unresolved");
  }
  if (configs.show.cues.some((cue) => cue.scene_ref !== configs.scene.id)) {
    throw new ProjectReferenceError("Show scene_ref is unresolved");
  }
}

export class ProjectLoader {
  readonly #store: RuntimeContextStore;
  readonly #readSnapshot: ProjectSnapshotReader;

  constructor(
    store: RuntimeContextStore,
    readSnapshot: ProjectSnapshotReader = readProjectSnapshot,
  ) {
    this.#store = store;
    this.#readSnapshot = readSnapshot;
  }

  async load(projectRoot: string): Promise<ProjectRuntimeContext> {
    const response = await this.#readSnapshot(projectRoot);
    const configs = parseAllConfigs(response);
    validateReferences(configs);

    const context: ProjectRuntimeContext = Object.freeze({
      contractVersion: CONTRACT_VERSION_V1,
      sessionId: `project:${response.projectRoot}`,
      executionMode: "preview",
      deterministicSeed: 0,
      monotonicTimeSeconds: 0,
      networkCapability: "none",
      locale: configs.app.app.locale,
      project: Object.freeze({
        projectLayoutVersion: PROJECT_LAYOUT_VERSION,
        projectRoot: response.projectRoot,
        references: PROJECT_CONFIG_REFERENCES,
        configs,
      }),
    });

    this.#store.activate(context);
    return context;
  }
}
