import type { VersionedContractV1 } from "./version.ts";

export type ControlValueV1 = number | boolean | string;

export interface ControlSnapshotV1 extends VersionedContractV1 {
  readonly frameId: string;
  readonly timeSeconds: number;
  readonly values: Readonly<Record<string, ControlValueV1>>;
  readonly sourceFrameId?: string;
}
