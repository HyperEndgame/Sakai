import type { Area } from "./store";
import { useStore } from "./store";

const areaLabel: Record<Area, string> = {
  school: "School",
  projects: "Projects",
  coding: "Coding",
  business: "Finances",
  fitness: "Fitness",
  scouts: "Scouts",
  personal: "Personal",
};

// ponytail: "personal" is the catch-all bucket, not one of the tracked life pillars
const gridAreas: Area[] = ["school", "projects", "coding", "business", "fitness", "scouts"];

export function Insights() {
  const { state } = useStore();
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="page">
      <h1>Insights</h1>
      <p className="muted">How each part of your life is tracking.</p>

      <section className="area-grid">
        {gridAreas.map((area) => {
          const tasks = state.tasks.filter((t) => t.area === area);
          const open = tasks.filter((t) => !t.done);
          const goals = state.goals.filter((g) => g.area === area);

          let percent = 0;
          if (goals.length) percent = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length);
          else if (tasks.length) percent = Math.round(((tasks.length - open.length) / tasks.length) * 100);

          let subtitle = "No data yet";
          if (area === "business") {
            const monthly = state.finances.filter((f) => f.date.startsWith(thisMonth)).reduce((s, f) => s + f.amount, 0);
            subtitle = `${monthly >= 0 ? "+" : ""}$${monthly} this month`;
          } else if (open.length) {
            subtitle = `${open.length} open task${open.length === 1 ? "" : "s"}`;
          } else if (goals[0]) {
            subtitle = goals[0].title;
          }

          return (
            <div key={area} className="area-card">
              <div className="area-card-top">
                <span>{areaLabel[area]}</span>
                <span className="area-pct">{percent}%</span>
              </div>
              <div className="bar"><div className="bar-fill" style={{ width: `${percent}%` }} /></div>
              <div className="muted small">{subtitle}</div>
            </div>
          );
        })}
      </section>

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

      <section className="stats">
        <div className="stat">
          <div className="stat-num">{state.tasks.filter((t) => !t.done).length}</div>
          <div className="stat-label">Open tasks</div>
        </div>
        <div className="stat">
          <div className="stat-num">${state.finances.reduce((s, f) => s + f.amount, 0)}</div>
          <div className="stat-label">Total revenue</div>
        </div>
        <div className="stat">
          <div className="stat-num">{state.goals.length}</div>
          <div className="stat-label">Goals</div>
        </div>
      </section>
    </div>
  );
}
