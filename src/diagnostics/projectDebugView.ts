import type { DiagnosticEventV1 } from "./events.ts";
import type { LocalDiagnosticStore } from "./store.ts";

export interface DebugProjection {
  readonly updatedAt: string;
  readonly total: number;
  readonly latestSeverity: DiagnosticEventV1["severity"] | "none";
  readonly byCategory: Readonly<Record<DiagnosticEventV1["category"], number>>;
}

export function projectDebugView(events: readonly DiagnosticEventV1[]): DebugProjection {
  const byCategory = { app: 0, frame: 0, config: 0, adapter: 0 };
  for (const event of events) byCategory[event.category] += 1;
  return {
    updatedAt: events.at(-1)?.timestamp ?? new Date(0).toISOString(),
    total: events.length,
    latestSeverity: events.at(-1)?.severity ?? "none",
    byCategory,
  };
}

export function subscribeToThrottledDebugProjection(
  store: LocalDiagnosticStore,
  listener: (projection: DebugProjection) => void,
  intervalMs = 250,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = store.subscribe(() => {
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      listener(projectDebugView(store.snapshot()));
    }, intervalMs);
  });
  return () => {
    unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
  };
}
