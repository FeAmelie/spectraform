import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { checkDependencyDirection } from "../../scripts/check-dependency-direction.mts";

test("repository dependency direction is valid", async () => {
  const result = await checkDependencyDirection(resolve(import.meta.dirname, "../.."));
  assert.deepEqual(result.violations, []);
  assert.ok(result.filesChecked >= 8);
});

test("forbidden layer direction and import cycles are reported", async () => {
  const root = await mkdtemp(join(tmpdir(), "spectraform-dependency-test-"));
  try {
    await mkdir(join(root, "src/core"), { recursive: true });
    await mkdir(join(root, "src/ui"), { recursive: true });
    await writeFile(join(root, "src/core/a.ts"), 'import "./b.ts";\nimport "../ui/view.ts";\n');
    await writeFile(join(root, "src/core/b.ts"), 'import "./a.ts";\n');
    await writeFile(join(root, "src/ui/view.ts"), "export const view = true;\n");

    const result = await checkDependencyDirection(root);
    assert.ok(result.violations.some((violation) => violation.includes("forbidden core -> ui")));
    assert.ok(result.violations.some((violation) => violation.includes("import cycle")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
