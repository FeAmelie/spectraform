export const CONTRACT_MAJOR_VERSION = 1 as const;
export const CONTRACT_MINOR_VERSION = 0 as const;

export interface ContractVersion {
  readonly major: number;
  readonly minor: number;
}

export interface ContractVersionV1 extends ContractVersion {
  readonly major: typeof CONTRACT_MAJOR_VERSION;
}

export interface VersionedContractV1 {
  readonly contractVersion: ContractVersionV1;
}

export const CONTRACT_VERSION_V1: Readonly<ContractVersionV1> = Object.freeze({
  major: CONTRACT_MAJOR_VERSION,
  minor: CONTRACT_MINOR_VERSION,
});

export class UnsupportedContractVersionError extends Error {
  readonly receivedMajor: number;

  constructor(label: string, receivedMajor: number) {
    super(
      `${label} requires contract major ${CONTRACT_MAJOR_VERSION}; received ${receivedMajor}`,
    );
    this.name = "UnsupportedContractVersionError";
    this.receivedMajor = receivedMajor;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readContractVersion(
  value: unknown,
  label = "contract",
): ContractVersion {
  if (!isRecord(value) || !isRecord(value.contractVersion)) {
    throw new TypeError(`${label} must contain a contractVersion object`);
  }

  const { major, minor } = value.contractVersion;
  if (
    !Number.isInteger(major) ||
    Number(major) < 0 ||
    !Number.isInteger(minor) ||
    Number(minor) < 0
  ) {
    throw new TypeError(
      `${label} contractVersion major and minor must be non-negative integers`,
    );
  }

  return { major: Number(major), minor: Number(minor) };
}

export function parseV1Contract<T extends VersionedContractV1>(
  value: unknown,
  label = "contract",
): T {
  const version = readContractVersion(value, label);
  if (version.major !== CONTRACT_MAJOR_VERSION) {
    throw new UnsupportedContractVersionError(label, version.major);
  }

  return value as T;
}
