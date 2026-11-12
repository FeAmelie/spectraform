import { AppErrorBoundary } from './AppErrorBoundary';
import { DebugSlot } from '../ui/debug/DebugSlot';
import { Stage } from '../ui/stage/Stage';
import { AppStatus } from '../ui/status/AppStatus';

function RuntimeShell() {
  const shouldSimulateError = new URLSearchParams(window.location.search).has('simulate-error');

  if (shouldSimulateError) {
    throw new Error('Simulated local shell failure');
  }

  return (
    <div class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">Audio-reactive visual engine</p>
          <h1>Spectraform</h1>
        </div>
        <AppStatus state="ready" message="Offline shell ready" />
      </header>

      <Stage />
      <DebugSlot />
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <RuntimeShell />
    </AppErrorBoundary>
  );
}
