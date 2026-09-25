import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

// Last JS error, kept on-device so it can be read back from Settings → Data after a crash.
const KEY = "sakai-last-error";

export function logError(what: string, err: unknown) {
  const e = err as Error | undefined;
  try {
    localStorage.setItem(KEY, `${new Date().toISOString()} ${what}: ${e?.message ?? String(err)}\n${e?.stack ?? ""}`.slice(0, 4000));
  } catch {}
}

export function lastError(): string {
  return localStorage.getItem(KEY) ?? "";
}

export function clearError() {
  localStorage.removeItem(KEY);
}

window.addEventListener("error", (e) => logError("error", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => logError("promise", e.reason));

// One screen failing shows a recoverable message instead of blanking the whole app.
export class ErrorBoundary extends Component<{ children: ReactNode; onHome: () => void }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError("render", { message: error.message, stack: `${error.stack}\n${info.componentStack}` });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h1 className="font-serif text-2xl">This screen hit a snag</h1>
        <p className="text-sm text-muted-foreground">Your data is safe. The details are saved in Settings → Data.</p>
        <p className="break-words rounded-xl bg-muted p-3 font-mono text-xs">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            this.setState({ error: undefined });
            this.props.onHome();
          }}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Back to Home
        </button>
      </div>
    );
  }
}
