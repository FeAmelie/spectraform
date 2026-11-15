import type { DiagnosticEventV1, DiagnosticPayload } from "./events.ts";

export const REDACTED_PATH = "[REDACTED_LOCAL_PATH]";
export const REDACTED_ASSET_CONTENT = "[REDACTED_ASSET_CONTENT]";

const assetContentKey =
  /^(?:asset|audio|svg|image|file)$|(?:asset|audio|svg|image|file).*(?:content|data|bytes|raw)|^(?:content|bytes|raw)$/iu;
const embeddedAssetContent = /<svg(?:\s|>)|data:(?:audio\/|image\/svg\+xml)/iu;
const localPath =
  /(?:[A-Za-z]:[\\/]|\\\\|\/Users\/|\/home\/|\/private\/|\/tmp\/|\/var\/|(?:\.\.[\\/])+)/u;

export function redactDiagnosticText(value: string): string {
  if (embeddedAssetContent.test(value)) return REDACTED_ASSET_CONTENT;
  if (localPath.test(value)) return REDACTED_PATH;
  return value;
}

function redactValue(value: unknown, key = ""): unknown {
  if (assetContentKey.test(key)) return REDACTED_ASSET_CONTENT;
  if (typeof value === "string") return redactDiagnosticText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, redactValue(child, childKey)]),
    );
  }
  return value;
}

export function redactDiagnosticPayload(payload: DiagnosticPayload): DiagnosticPayload {
  return redactValue(payload) as DiagnosticPayload;
}

export function redactDiagnosticEvent(event: DiagnosticEventV1): DiagnosticEventV1 {
  return { ...event, payload: redactDiagnosticPayload(event.payload) };
}
