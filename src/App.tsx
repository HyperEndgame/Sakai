import { useEffect, useState } from "react";
import { Home, MessageCircle, ListChecks, Sparkles, Settings as SettingsIcon, Sun, Moon } from "lucide-react";
import { Dashboard } from "./Dashboard";
import { Tasks } from "./Tasks";
import { Chat } from "./Chat";
import { Insights } from "./Insights";
import { Settings } from "./Settings";
import { Decorations } from "./Decorations";
import { useStore } from "./store";
import { ErrorBoundary } from "./Crash";
import { fadeTheme, useApplyAccent, useApplyTheme } from "./theme";
import { Onboarding } from "./Onboarding";
import { useBack } from "./back";
import { updateDashboardNotification } from "./notify";
import { cn } from "./cn";

const tabs = [
  { key: "Home", label: "Home", icon: Home },
  { key: "Chat", label: "Chat", icon: MessageCircle },
  { key: "Tasks", label: "Tasks", icon: ListChecks },
  { key: "Insights", label: "Insights", icon: Sparkles },
  { key: "Settings", label: "Settings", icon: SettingsIcon },
] as const;
type Tab = (typeof tabs)[number]["key"];

export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  // braces matter: newer WebViews return a Promise from scrollTo, which React would call as a cleanup
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  useBack(tab !== "Home", () => setTab("Home"));
  const { state, dispatch } = useStore();
  const effectiveTheme = useApplyTheme(state.theme);
  useApplyAccent(state.assistant.accent, effectiveTheme);

  useEffect(() => {
    if (!state.notifications) return;
    updateDashboardNotification(state).catch(() => {});
  }, [state.tasks, state.briefing, state.notifications]);

  function toggleTheme() {
    fadeTheme(() => dispatch({ type: "settings", patch: { theme: effectiveTheme === "dark" ? "light" : "dark" } }));
  }

  if (!state.onboarded) {
    return (
      <div className="relative min-h-screen bg-background text-foreground">
        <Decorations key={state.assistant.accent} theme={effectiveTheme} decoration={state.decoration} />
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <Onboarding />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Decorations key={state.assistant.accent} theme={effectiveTheme} decoration={state.decoration} />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col">
        <header className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card">
              <span className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <span className="font-serif text-lg tracking-tight">Sakai</span>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          >
            {effectiveTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 px-6 pb-28 pt-6">
          <ErrorBoundary key={tab} onHome={() => setTab("Home")}>
          {tab === "Home" && <Dashboard onOpenTasks={() => setTab("Tasks")} />}
          {tab === "Chat" && <Chat />}
          {tab === "Tasks" && <Tasks />}
          {tab === "Insights" && <Insights />}
          {tab === "Settings" && <Settings effectiveTheme={effectiveTheme} />}
          </ErrorBoundary>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-xl items-center justify-around px-1 py-2">
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = key === tab;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </nav>
      </div>
    </div>
  );
}
