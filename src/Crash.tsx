import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { nativeCrash } from "./notify";

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

nativeCrash().then((c) => c && logError("native", { message: c.split("\n")[0], stack: c }));
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
      <div className="m-4 space-y-4 rounded-2xl border border-border bg-card p-5 text-foreground">
        <h1 className="font-serif text-2xl">This screen hit a snag</h1>
        <p className="text-sm text-muted-foreground">Your data is safe. Screenshot the details below and send them over.</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted p-3 font-mono text-[11px]">{lastError() || error.message}</pre>
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
