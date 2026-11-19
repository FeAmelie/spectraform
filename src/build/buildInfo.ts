export const BUILD_INFO_CONTRACT_VERSION = 1 as const;

export interface BuildInfoV1 {
  readonly contract_version: typeof BUILD_INFO_CONTRACT_VERSION;
  readonly version: string;
  readonly commit_id: string;
  readonly architecture: "arm64";
  readonly signature: "adhoc";
}

export function parseBuildInfo(value: unknown): BuildInfoV1 {
  if (!isRecord(value)) throw new Error("build info must be an object");
  if (value.contract_version !== BUILD_INFO_CONTRACT_VERSION) {
    throw new Error("build info contract_version must be 1");
  }
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+$/.test(value.version)) {
    throw new Error("build info version must be semantic");
  }
  if (typeof value.commit_id !== "string" || !/^[0-9a-f]{40}$/.test(value.commit_id)) {
    throw new Error("build info commit_id must be an immutable full Git SHA");
  }
  if (value.architecture !== "arm64") throw new Error("build info architecture must be arm64");
  if (value.signature !== "adhoc") throw new Error("build info signature must be adhoc");

  return value as unknown as BuildInfoV1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
