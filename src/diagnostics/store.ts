import type { DiagnosticEventV1 } from "./events.ts";
import { redactDiagnosticEvent } from "./redact.ts";

export type DiagnosticListener = (event: DiagnosticEventV1) => void;

export class LocalDiagnosticStore {
  readonly #events: DiagnosticEventV1[] = [];
  readonly #listeners = new Set<DiagnosticListener>();

  publish(event: DiagnosticEventV1): void {
    const safeEvent = redactDiagnosticEvent(event);
    this.#events.push(safeEvent);
    queueMicrotask(() => {
      for (const listener of this.#listeners) listener(safeEvent);
    });
  }

  subscribe(listener: DiagnosticListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  snapshot(): readonly DiagnosticEventV1[] {
    return this.#events.slice();
  }
}

export const diagnosticTransportContract = Object.freeze({
  storage: "local-only",
  telemetry: "disabled",
  upload: "forbidden",
  runtimeNetworkCapability: "none",
});
