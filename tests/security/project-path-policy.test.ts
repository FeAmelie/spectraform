import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import {
  assertSafeProjectReference,
  ProjectPathPolicy,
  ProjectPathPolicyError,
} from "../../src/app/project/ProjectPathPolicy.ts";

let projectRoot = "";
let outsideRoot = "";

before(async () => {
  projectRoot = await mkdtemp(path.join(tmpdir(), "spectraform-path-project-"));
  outsideRoot = await mkdtemp(path.join(tmpdir(), "spectraform-path-outside-"));
  await mkdir(path.join(projectRoot, "config"));
  await writeFile(path.join(projectRoot, "config/app.yaml"), "schema_version: 1\n");
  await writeFile(path.join(outsideRoot, "private.svg"), "<svg/>\n");
});

after(async () => {
  await Promise.all([
    rm(projectRoot, { recursive: true, force: true }),
    rm(outsideRoot, { recursive: true, force: true }),
  ]);
});

test("normalized project-local references resolve read-only", async () => {
  const policy = await ProjectPathPolicy.open(projectRoot);
  const source = await readFile(path.join(projectRoot, "config/app.yaml"));
  const approved = await policy.resolveExisting("config/app.yaml");
  assert.equal(approved, await realpath(path.join(projectRoot, "config/app.yaml")));
  assert.deepEqual(await readFile(approved), source);
});

test("traversal and absolute outside references fail closed", async () => {
  assert.throws(() => assertSafeProjectReference("../private.svg"), ProjectPathPolicyError);
  assert.throws(
    () => assertSafeProjectReference(path.join(outsideRoot, "private.svg")),
    ProjectPathPolicyError,
  );
});

test("symlinks escaping the project root are rejected", async () => {
  const escape = path.join(projectRoot, "config/escape.svg");
  await symlink(path.join(outsideRoot, "private.svg"), escape);
  const policy = await ProjectPathPolicy.open(projectRoot);
  await assert.rejects(() => policy.resolveExisting("config/escape.svg"), {
    code: "outside_project_root",
  });
});
