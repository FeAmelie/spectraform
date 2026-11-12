export function DebugSlot() {
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
      </dl>
    </details>
  );
}
