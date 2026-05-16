import { Component, type ReactNode, type ErrorInfo } from "react";
import { useLang } from "@/contexts/useLang";
import { ButtonPrimary } from "@/components/atoms/Button";

export function ErrorFallback() {
  const { t } = useLang();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center bg-bg">
      <div className="text-[56px] opacity-50">🪲</div>
      <div className="flex flex-col gap-2 max-w-xs">
        <h1 className="font-serif text-2xl text-text">{t("errorTitle")}</h1>
        <p className="text-text-muted text-sm">{t("errorDescription")}</p>
      </div>
      <ButtonPrimary onClick={() => window.location.reload()}>
        {t("reload")}
      </ButtonPrimary>
    </div>
  );
}

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
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
