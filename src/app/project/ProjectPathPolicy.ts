import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export type ProjectPathPolicyErrorCode =
  | "invalid_project_root"
  | "invalid_reference"
  | "traversal"
  | "outside_project_root"
  | "unavailable";

export class ProjectPathPolicyError extends Error {
  readonly code: ProjectPathPolicyErrorCode;

  constructor(code: ProjectPathPolicyErrorCode, message: string) {
    super(message);
    this.name = "ProjectPathPolicyError";
    this.code = code;
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

export function assertSafeProjectReference(reference: string): void {
  if (
    reference.length === 0 ||
    reference.includes("\0") ||
    path.isAbsolute(reference) ||
    /^[A-Za-z]:[\\/]/u.test(reference) ||
    reference.startsWith("\\\\")
  ) {
    throw new ProjectPathPolicyError(
      "invalid_reference",
      "Project references must be relative local paths",
    );
  }

  const segments = reference.replaceAll("\\", "/").split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new ProjectPathPolicyError(
      "traversal",
      "Project references may not traverse outside the root",
    );
  }
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    throw new ProjectPathPolicyError("invalid_reference", "Project references must be normalized");
  }
}

export class ProjectPathPolicy {
  readonly projectRoot: string;
  readonly canonicalProjectRoot: string;

  private constructor(projectRoot: string, canonicalProjectRoot: string) {
    this.projectRoot = projectRoot;
    this.canonicalProjectRoot = canonicalProjectRoot;
  }

  static async open(projectRoot: string): Promise<ProjectPathPolicy> {
    if (!path.isAbsolute(projectRoot)) {
      throw new ProjectPathPolicyError("invalid_project_root", "Project root must be absolute");
    }
    try {
      const canonicalProjectRoot = await realpath(projectRoot);
      const metadata = await stat(canonicalProjectRoot);
      if (!metadata.isDirectory()) throw new Error("not a directory");
      return new ProjectPathPolicy(projectRoot, canonicalProjectRoot);
    } catch {
      throw new ProjectPathPolicyError("invalid_project_root", "Project root is unavailable");
    }
  }

  async resolveExisting(reference: string): Promise<string> {
    assertSafeProjectReference(reference);
    const lexicalCandidate = path.resolve(this.projectRoot, reference);
    if (!isWithin(this.projectRoot, lexicalCandidate)) {
      throw new ProjectPathPolicyError(
        "outside_project_root",
        "Project reference escaped its root",
      );
    }

    let canonicalCandidate: string;
    try {
      canonicalCandidate = await realpath(lexicalCandidate);
    } catch {
      throw new ProjectPathPolicyError("unavailable", "Project reference is unavailable");
    }
    if (!isWithin(this.canonicalProjectRoot, canonicalCandidate)) {
      throw new ProjectPathPolicyError(
        "outside_project_root",
        "Project reference escaped its root",
      );
    }
    return canonicalCandidate;
  }
}
