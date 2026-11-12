import type { VersionedContractV1 } from "./version.ts";

export type RuntimeExecutionMode = "preview" | "export";

export interface RuntimeContextV1 extends VersionedContractV1 {
  readonly sessionId: string;
  readonly executionMode: RuntimeExecutionMode;
  readonly deterministicSeed: number;
  readonly monotonicTimeSeconds: number;
  readonly networkCapability: "none";
  readonly locale?: string;
}
