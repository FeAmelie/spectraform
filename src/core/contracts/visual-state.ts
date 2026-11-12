import type { VersionedContractV1 } from "./version.ts";

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface VisualLayerStateV1 {
  readonly layerId: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly properties: Readonly<Record<string, JsonValue>>;
}

export interface VisualStateV1 extends VersionedContractV1 {
  readonly frameId: string;
  readonly timeSeconds: number;
  readonly deterministicSeed: number;
  readonly layers: readonly VisualLayerStateV1[];
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}
