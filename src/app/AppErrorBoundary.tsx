import { Component, type ComponentChildren } from 'preact';

interface AppErrorBoundaryProps {
  children: ComponentChildren;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { error: null };

  public componentDidCatch(error: Error): void {
    this.setState({ error });
  }

  public render({ children }: AppErrorBoundaryProps, { error }: AppErrorBoundaryState) {
    if (error) {
      return (
        <main class="error-state" aria-labelledby="application-error-title" data-testid="app-error">
          <p class="eyebrow">Local runtime</p>
          <h1 id="application-error-title">Spectraform could not open the stage</h1>
          <p role="alert">The application shell entered a safe error state.</p>
          <details>
            <summary>Technical detail</summary>
            <code>{error.message}</code>
          </details>
        </main>
      );
    }

    return children;
  }
}
