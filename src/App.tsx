import { useEffect, useState } from "react";
import { Dashboard } from "./Dashboard";
import { Tasks } from "./Tasks";
import { Chat } from "./Chat";
import { Calendar } from "./Calendar";
import { Insights } from "./Insights";
import { Settings } from "./Settings";
import { Header } from "./Header";
import { CherryBlossom, Constellation } from "./Decorations";
import { CalendarIcon, ChatIcon, HomeIcon, InsightsIcon, SettingsIcon, TasksIcon } from "./icons";
import { useStore } from "./store";
import { useApplyTheme } from "./theme";
import { updateDashboardNotification } from "./notify";

const tabs = [
  { key: "Home", icon: HomeIcon },
  { key: "Chat", icon: ChatIcon },
  { key: "Tasks", icon: TasksIcon },
  { key: "Calendar", icon: CalendarIcon },
  { key: "Insights", icon: InsightsIcon },
  { key: "Settings", icon: SettingsIcon },
] as const;
type Tab = (typeof tabs)[number]["key"];

export default function App() {
  const [tab, setTab] = useState<Tab>("Home");
  const { state, dispatch } = useStore();
  const effectiveTheme = useApplyTheme(state.theme);

  useEffect(() => {
    updateDashboardNotification(state).catch(() => {});
  }, [state.tasks, state.briefing]);

  function toggleTheme() {
    dispatch({ type: "settings", patch: { theme: effectiveTheme === "dark" ? "light" : "dark" } });
  }

  return (
    <div className="app">
      <Header theme={effectiveTheme} onToggleTheme={toggleTheme} />
      {state.decorations && (effectiveTheme === "dark" ? <Constellation /> : <CherryBlossom />)}
      <main className="main">
        {tab === "Home" && <Dashboard onOpenTasks={() => setTab("Tasks")} />}
        {tab === "Tasks" && <Tasks />}
        {tab === "Chat" && <Chat />}
        {tab === "Calendar" && <Calendar />}
        {tab === "Insights" && <Insights />}
        {tab === "Settings" && <Settings />}
      </main>
      <nav className="nav">
        {tabs.map(({ key, icon: Icon }) => (
          <button key={key} className={key === tab ? "nav-btn active" : "nav-btn"} onClick={() => setTab(key)}>
            <Icon />
            <span>{key}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
