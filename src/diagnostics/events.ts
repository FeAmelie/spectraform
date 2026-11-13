export const DIAGNOSTIC_EVENT_VERSION = 1 as const;

export const DIAGNOSTIC_CATEGORIES = ["app", "frame", "config", "adapter"] as const;
export const DIAGNOSTIC_SEVERITIES = ["debug", "info", "warn", "error"] as const;

export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];
export type DiagnosticPayload = Readonly<Record<string, unknown>>;

export interface DiagnosticEventV1 {
  readonly diagnostic_event_version: typeof DIAGNOSTIC_EVENT_VERSION;
  readonly timestamp: string;
  readonly category: DiagnosticCategory;
  readonly severity: DiagnosticSeverity;
  readonly payload: DiagnosticPayload;
}

export function createDiagnosticEvent(
  category: DiagnosticCategory,
  severity: DiagnosticSeverity,
  payload: DiagnosticPayload,
  timestamp = new Date().toISOString(),
): DiagnosticEventV1 {
  const event = {
    diagnostic_event_version: DIAGNOSTIC_EVENT_VERSION,
    timestamp,
    category,
    severity,
    payload,
  } as const;
  assertDiagnosticEventV1(event);
  return event;
}

export function assertDiagnosticEventV1(value: unknown): asserts value is DiagnosticEventV1 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Diagnostic event must be an object");
  }
  const event = value as Record<string, unknown>;
  if (event.diagnostic_event_version !== DIAGNOSTIC_EVENT_VERSION) {
    throw new TypeError("Unsupported diagnostic_event_version; expected 1");
  }
  if (typeof event.timestamp !== "string" || Number.isNaN(Date.parse(event.timestamp))) {
    throw new TypeError("Diagnostic timestamp must be an ISO timestamp");
  }
  if (!DIAGNOSTIC_CATEGORIES.includes(event.category as DiagnosticCategory)) {
    throw new TypeError("Diagnostic category must be app, frame, config, or adapter");
  }
  if (!DIAGNOSTIC_SEVERITIES.includes(event.severity as DiagnosticSeverity)) {
    throw new TypeError("Diagnostic severity is invalid");
  }
  if (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload)) {
    throw new TypeError("Diagnostic payload must be a structured object");
  }
}
