import { useState } from "react";
import { apiKey, generateBriefing } from "./ai";
import type { Quadrant } from "./store";
import { useStore } from "./store";

const quadrantLabel: Record<Quadrant, string> = {
  "urgent-important": "Urgent + Important",
  important: "Important, Not Urgent",
  urgent: "Urgent, Less Important",
  low: "Low Priority",
};

export function Dashboard() {
  const { state, dispatch } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const stale = state.briefing?.date !== today;
  const open = state.tasks.filter((t) => !t.done);
  const revenue = state.finances.reduce((s, f) => s + f.amount, 0);

  async function refresh() {
    if (!apiKey(state)) {
      setError("Add your Anthropic API key in Settings first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const b = await generateBriefing(state);
      for (const p of b.priorities) {
        dispatch({ type: "update-task", id: p.id, patch: { quadrant: p.quadrant, why: p.why } });
      }
      dispatch({ type: "set-briefing", briefing: { date: today, text: b.text, topAction: b.topAction, news: b.news } });
    } catch (e: any) {
      setError(e.message ?? "Briefing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </h1>

      <section className="card accent">
        <div className="card-label">Daily briefing</div>
        {state.briefing && !stale ? (
          <>
            <p>{state.briefing.text}</p>
            <div className="card-label" style={{ marginTop: 12 }}>Highest-ROI action</div>
            <p className="top-action">{state.briefing.topAction}</p>
            {state.briefing.news && (
              <>
                <div className="card-label" style={{ marginTop: 12 }}>News for you</div>
                <p>{state.briefing.news}</p>
              </>
            )}
          </>
        ) : (
          <p className="muted">No briefing for today yet.</p>
        )}
        <button className="btn" onClick={refresh} disabled={busy}>
          {busy ? "Thinking…" : stale ? "Generate briefing" : "Refresh briefing"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-num">{open.length}</div>
          <div className="stat-label">Open tasks</div>
        </div>
        <div className="stat">
          <div className="stat-num">${revenue}</div>
          <div className="stat-label">Revenue</div>
        </div>
        <div className="stat">
          <div className="stat-num">{state.goals.length}</div>
          <div className="stat-label">Goals</div>
        </div>
      </section>

      {(Object.keys(quadrantLabel) as Quadrant[]).map((q) => {
        const items = open.filter((t) => t.quadrant === q);
        if (!items.length) return null;
        return (
          <section key={q} className="card">
            <div className="card-label">{quadrantLabel[q]}</div>
            {items.map((t) => (
              <div key={t.id} className="task-row">
                <div>
                  <div>{t.title}</div>
                  {t.why && <div className="muted small">{t.why}</div>}
                  {t.due && <div className="muted small">Due {t.due}</div>}
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {state.goals.length > 0 && (
        <section className="card">
          <div className="card-label">Goals</div>
          {state.goals.map((g) => (
            <div key={g.id} className="goal-row">
              <span>{g.title}</span>
              <div className="bar"><div className="bar-fill" style={{ width: `${g.progress}%` }} /></div>
              <span className="muted small">{g.progress}%</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
