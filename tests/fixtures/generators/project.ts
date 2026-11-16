import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createSyntheticAudio } from "./audio.ts";
import { createSyntheticConfigSources, seedToken } from "./config.ts";
import {
  createInvalidContrastConfig,
  createTraversalAssetConfig,
  type SyntheticFixtureScenario,
} from "./failures.ts";
import { createDangerousSyntheticSvg, createSyntheticSvg } from "./svg.ts";

export interface SyntheticProject {
  readonly root: string;
  readonly seed: number;
  readonly scenario: SyntheticFixtureScenario;
  readonly configDirectory: string;
  readonly audioFile: string;
  readonly svgFile: string;
  readonly cleanup: () => void;
}

export interface SyntheticProjectOptions {
  readonly seed: number;
  readonly scenario?: SyntheticFixtureScenario;
}

export function createSyntheticProject(options: SyntheticProjectOptions): SyntheticProject {
  const scenario = options.scenario ?? "positive";
  const token = seedToken(options.seed);
  const root = mkdtempSync(join(tmpdir(), `spectraform-fixture-${token}-`));
  const configDirectory = join(root, "config");
  const generatedDirectory = join(root, "generated");
  const audioFile = join(generatedDirectory, `audio-${token}.wav`);
  const svgFile = join(generatedDirectory, `mask-${token}.svg`);
  let cleaned = false;

  try {
    mkdirSync(configDirectory, { recursive: true });
    mkdirSync(generatedDirectory, { recursive: true });

    for (const source of createSyntheticConfigSources(options.seed)) {
      let content = source.yaml;
      if (scenario === "invalid-config" && source.family === "contrast") {
        content = createInvalidContrastConfig(options.seed);
      }
      if (scenario === "traversal" && source.family === "asset") {
        content = createTraversalAssetConfig(options.seed);
      }
      writeFileSync(join(configDirectory, source.file), content, "utf8");
    }

    const audio = createSyntheticAudio(options.seed);
    writeFileSync(audioFile, audio.wav);
    writeFileSync(
      svgFile,
      scenario === "dangerous-svg"
        ? createDangerousSyntheticSvg(options.seed)
        : createSyntheticSvg(options.seed),
      "utf8",
    );
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }

  return {
    root,
    seed: options.seed,
    scenario,
    configDirectory,
    audioFile,
    svgFile,
    cleanup: () => {
      if (cleaned) return;
      cleaned = true;
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export function withSyntheticProject<Result>(
  options: SyntheticProjectOptions,
  use: (project: SyntheticProject) => Result,
): Result {
  const project = createSyntheticProject(options);
  try {
    return use(project);
  } finally {
    project.cleanup();
  }
}

export function readSyntheticProjectFile(
  project: SyntheticProject,
  relativePath: string,
): Uint8Array {
  const target = resolve(project.root, relativePath);
  if (target !== project.root && !target.startsWith(`${project.root}/`)) {
    throw new Error("Synthetic fixture read escaped its temporary project root");
  }
  if (!existsSync(target)) throw new Error(`Synthetic fixture file is missing: ${relativePath}`);
  return readFileSync(target);
}
