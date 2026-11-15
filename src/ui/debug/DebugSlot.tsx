import type { DebugProjection } from "../../diagnostics/projectDebugView.ts";

interface DebugSlotProps {
  readonly projection?: DebugProjection;
}

export function DebugSlot({ projection }: DebugSlotProps) {
  return (
    <details class="debug-slot" data-testid="debug-slot">
      <summary>Diagnostics</summary>
      <dl>
        <div>
          <dt>Runtime</dt>
          <dd>local</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>disabled</dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd>{projection?.total ?? 0}</dd>
        </div>
        <div>
          <dt>Latest severity</dt>
          <dd>{projection?.latestSeverity ?? "none"}</dd>
        </div>
      </dl>
    </details>
  );
}
