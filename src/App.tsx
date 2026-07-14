import { useEffect, useState } from "react";
import { Dashboard } from "./Dashboard";
import { Tasks } from "./Tasks";
import { Chat } from "./Chat";
import { Settings } from "./Settings";
import { useStore } from "./store";
import { updateDashboardNotification } from "./notify";

const tabs = ["Today", "Tasks", "Sakai", "Settings"] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Today");
  const { state } = useStore();

  useEffect(() => {
    updateDashboardNotification(state).catch(() => {});
  }, [state.tasks, state.briefing]);

  return (
    <div className="app">
      <main className="main">
        {tab === "Today" && <Dashboard />}
        {tab === "Tasks" && <Tasks />}
        {tab === "Sakai" && <Chat />}
        {tab === "Settings" && <Settings />}
      </main>
      <nav className="nav">
        {tabs.map((t) => (
          <button key={t} className={t === tab ? "nav-btn active" : "nav-btn"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}
