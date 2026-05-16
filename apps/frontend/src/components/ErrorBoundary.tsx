import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="text-[56px] opacity-60">🪲</div>
          <div className="flex flex-col gap-2">
            <h1 className="font-serif text-2xl text-text">
              Something went wrong
            </h1>
            <p className="text-text-muted text-sm">
              An unexpected error occurred. Please reload the page.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded bg-beet text-white text-sm font-medium hover:bg-beet-bright transition-colors"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
