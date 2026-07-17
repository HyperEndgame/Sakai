import { useStore } from "./store";

// ponytail: agenda list, not a month grid — same information, far less code, and
// matches how the rest of the app already reads (list of cards)
export function Calendar() {
  const { state, dispatch } = useStore();
  const today = new Date().toISOString().slice(0, 10);

  const withDue = state.tasks.filter((t) => !t.done && t.due);
  const overdue = withDue.filter((t) => t.due! < today).sort((a, b) => a.due!.localeCompare(b.due!));
  const upcoming = withDue.filter((t) => t.due! >= today).sort((a, b) => a.due!.localeCompare(b.due!));

  const groups = new Map<string, typeof upcoming>();
  for (const t of upcoming) {
    const list = groups.get(t.due!) ?? [];
    list.push(t);
    groups.set(t.due!, list);
  }

  function fmt(date: string) {
    const d = new Date(date + "T00:00");
    if (date === today) return "Today";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  return (
    <div className="page">
      <h1>Calendar</h1>

      {overdue.length > 0 && (
        <section className="card">
          <div className="card-label">Overdue</div>
          {overdue.map((t) => (
            <div key={t.id} className="task-row">
              <label className="task-main">
                <input type="checkbox" checked={false} onChange={() => dispatch({ type: "update-task", id: t.id, patch: { done: true } })} />
                <div>
                  <div>{t.title}</div>
                  <div className="muted small">{t.area} · was due {t.due}</div>
                </div>
              </label>
            </div>
          ))}
        </section>
      )}

      {[...groups.entries()].map(([date, items]) => (
        <section key={date} className="card">
          <div className="card-label">{fmt(date)}</div>
          {items.map((t) => (
            <div key={t.id} className="task-row">
              <label className="task-main">
                <input type="checkbox" checked={false} onChange={() => dispatch({ type: "update-task", id: t.id, patch: { done: true } })} />
                <div>
                  <div>{t.title}</div>
                  <div className="muted small">{t.area}{t.source ? ` · ${t.source}` : ""}</div>
                </div>
              </label>
            </div>
          ))}
        </section>
      ))}

      {overdue.length === 0 && groups.size === 0 && (
        <p className="muted">Nothing on the calendar. Add a due date to a task, or connect Canvas / Google Calendar in Settings.</p>
      )}
    </div>
  );
}
