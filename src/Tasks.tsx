import { useState } from "react";
import type { Area } from "./store";
import { autoQuadrant, uid, useStore } from "./store";

const areas: Area[] = ["school", "projects", "coding", "business", "fitness", "scouts", "personal"];

export function Tasks() {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [area, setArea] = useState<Area>("personal");
  const [due, setDue] = useState("");

  function add() {
    if (!title.trim()) return;
    dispatch({
      type: "add-task",
      task: {
        id: uid(),
        title: title.trim(),
        area,
        due: due || undefined,
        quadrant: autoQuadrant(due || undefined, area),
        done: false,
        createdAt: new Date().toISOString(),
      },
    });
    setTitle("");
    setDue("");
  }

  const open = state.tasks.filter((t) => !t.done);
  const done = state.tasks.filter((t) => t.done);

  return (
    <div className="page">
      <h1>Tasks</h1>
      <section className="card">
        <input
          className="input"
          placeholder="New task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <div className="row">
          <select className="input" value={area} onChange={(e) => setArea(e.target.value as Area)}>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <button className="btn" onClick={add}>Add task</button>
      </section>

      {open.map((t) => (
        <div key={t.id} className="card task-row">
          <label className="task-main">
            <input type="checkbox" checked={false} onChange={() => dispatch({ type: "update-task", id: t.id, patch: { done: true } })} />
            <div>
              <div>{t.title}</div>
              <div className="muted small">
                {t.area}{t.due ? ` · due ${t.due}` : ""}
              </div>
            </div>
          </label>
          <button className="ghost" onClick={() => dispatch({ type: "delete-task", id: t.id })}>✕</button>
        </div>
      ))}

      {done.length > 0 && (
        <details>
          <summary className="muted">{done.length} completed</summary>
          {done.map((t) => (
            <div key={t.id} className="card task-row muted">
              <s>{t.title}</s>
              <button className="ghost" onClick={() => dispatch({ type: "delete-task", id: t.id })}>✕</button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
