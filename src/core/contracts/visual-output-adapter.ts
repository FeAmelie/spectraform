import type { RenderFrameV1 } from "./render-frame.ts";
import type { VersionedContractV1 } from "./version.ts";

export interface VisualOutputCapabilitiesV1 extends VersionedContractV1 {
  readonly adapterId: string;
  readonly colorSpaces: readonly RenderFrameV1["colorSpace"][];
  readonly supportsRealtime: boolean;
}

export interface VisualOutputAdapterV1 {
  readonly contractVersion: VersionedContractV1["contractVersion"];
  capabilities(): Promise<VisualOutputCapabilitiesV1>;
  present(frame: RenderFrameV1): Promise<void>;
  close(): Promise<void>;
}
