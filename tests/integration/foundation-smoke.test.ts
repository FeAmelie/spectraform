import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test as nodeTest } from "node:test";

import { ProjectLoader } from "../../src/app/project/ProjectLoader.ts";
import {
  PROJECT_CONFIG_REFERENCES,
  type ProjectConfigSources,
  type ProjectSnapshotResponse,
} from "../../src/app/project/ProjectSnapshot.ts";
import { RuntimeContextStore } from "../../src/app/runtime/RuntimeContextStore.ts";
import { CONFIG_FAMILIES } from "../../src/config/registry.ts";
import { createSyntheticProject } from "../fixtures/generators/index.ts";

const foundationTest = globalThis.test ?? nodeTest;

foundationTest("a runtime-generated project activates one complete offline context", async () => {
  const project = createSyntheticProject({ seed: 0x14_014 });
  try {
    const reader = async (projectRoot: string): Promise<ProjectSnapshotResponse> => {
      const entries = await Promise.all(
        CONFIG_FAMILIES.map(
          async (family) =>
            [
              family,
              await readFile(`${projectRoot}/${PROJECT_CONFIG_REFERENCES[family]}`, "utf8"),
            ] as const,
        ),
      );
      return {
        commandContractVersion: 1,
        projectLayoutVersion: 1,
        projectRoot,
        sources: Object.fromEntries(entries) as ProjectConfigSources,
      };
    };
    const before = await Promise.all(
      CONFIG_FAMILIES.map((family) =>
        readFile(`${project.root}/${PROJECT_CONFIG_REFERENCES[family]}`),
      ),
    );
    const store = new RuntimeContextStore();
    const context = await new ProjectLoader(store, reader).load(project.root);
    const after = await Promise.all(
      CONFIG_FAMILIES.map((family) =>
        readFile(`${project.root}/${PROJECT_CONFIG_REFERENCES[family]}`),
      ),
    );

    assert.equal(store.activationCount, 1);
    assert.equal(store.active, context);
    assert.equal(context.networkCapability, "none");
    assert.equal(context.project.projectRoot, project.root);
    assert.deepEqual(after, before);
    assert.doesNotMatch(project.root, /Documents|repositories|psy.?panic/iu);
  } finally {
    project.cleanup();
  }
});
