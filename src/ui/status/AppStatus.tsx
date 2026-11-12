type AppStatusState = "idle" | "ready" | "processing" | "error";

interface AppStatusProps {
  state: AppStatusState;
  message: string;
}

export function AppStatus({ state, message }: AppStatusProps) {
  return (
    <output class={`app-status app-status--${state}`} aria-live="polite" data-testid="app-status">
      <span class="status-indicator" aria-hidden="true" />
      <span>{message}</span>
    </output>
  );
}
