import { useState } from "react";
import { Info, Plus, X } from "lucide-react";
import type { Quadrant, Task } from "./store";
import { autoQuadrant, uid, useStore } from "./store";
import { formatDue } from "./date";
import { MonthCalendar } from "./Calendar";
import { inputClass } from "./fields";
import { cn } from "./cn";
import { previewChipClass, sampleTasks } from "./samples";

const quadrantMeta: Record<Quadrant, { label: string; hint: string; dot: string }> = {
  "urgent-important": { label: "Do first", hint: "Urgent & important", dot: "bg-primary" },
  important: { label: "Schedule", hint: "Important, not urgent", dot: "bg-chart-3" },
  urgent: { label: "Delegate", hint: "Urgent, less important", dot: "bg-chart-4" },
  low: { label: "Later", hint: "Low priority", dot: "bg-muted-foreground/60" },
};
const order: Quadrant[] = ["urgent-important", "important", "urgent", "low"];

export function Tasks() {
  const { state, dispatch } = useStore();
  const hasTasks = state.tasks.length > 0;
  const open = hasTasks ? state.tasks.filter((t) => !t.done) : sampleTasks;
  const done = hasTasks ? state.tasks.filter((t) => t.done) : [];
  const [month, setMonth] = useState(() => new Date());
  const [day, setDay] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const dayTasks = day ? state.tasks.filter((t) => !t.done && t.due?.slice(0, 10) === day) : [];

  function addOnDay() {
    if (!title.trim() || !day) return;
    const area = state.profile.areas[0] ?? "personal";
    const task: Task = { id: uid(), title: title.trim(), area, due: day, quadrant: autoQuadrant(day, area), done: false, createdAt: new Date().toISOString() };
    dispatch({ type: "add-task", task });
    setTitle("");
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Prioritized for you</p>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-4xl leading-tight tracking-tight">Tasks</h1>
          {!hasTasks && <span className={previewChipClass}>Preview</span>}
        </div>
        <p className="text-sm text-muted-foreground">{state.assistant.name || "Sakai"} sorts everything by urgency and importance, and explains why.</p>
      </header>

      <div className="space-y-3">
        <MonthCalendar month={month} onMonth={setMonth} selected={day} onSelect={setDay} tasks={state.tasks} />
        {day && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Due {formatDue(day)}</h2>
            {dayTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onDone={() => dispatch({ type: "update-task", id: t.id, patch: { done: true } })}
                onDelete={() => dispatch({ type: "delete-task", id: t.id })}
              />
            ))}
            {!dayTasks.length && <p className="text-sm text-muted-foreground">Nothing due. Add something below.</p>}
            <div className="flex gap-2">
              <input
                className={cn(inputClass, "min-w-0 flex-1")}
                placeholder={`Add a task for ${formatDue(day)}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOnDay())}
                aria-label="New task for this day"
              />
              <button
                type="button"
                onClick={addOnDay}
                disabled={!title.trim()}
                aria-label="Add task"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </div>

      {order.map((q) => {
        const meta = quadrantMeta[q];
        const items = open.filter((t) => t.quadrant === q);
        if (!items.length) return null;
        return (
          <section key={q} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <h2 className="text-sm font-semibold">{meta.label}</h2>
              <span className="text-xs text-muted-foreground">· {meta.hint}</span>
            </div>
            <div className="space-y-2">
              {items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onDone={hasTasks ? () => dispatch({ type: "update-task", id: t.id, patch: { done: true } }) : undefined}
                  onDelete={hasTasks ? () => dispatch({ type: "delete-task", id: t.id }) : undefined}
                />
              ))}
            </div>
          </section>
        );
      })}

      {!hasTasks && (
        <p className="text-sm text-muted-foreground">No tasks yet — tell {state.assistant.name || "Sakai"} what's on your plate from the chat bar on Home.</p>
      )}

      {done.length > 0 && (
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">{done.length} completed</summary>
          <div className="mt-2 space-y-2">
            {done.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3">
                <s>{t.title}</s>
                <button aria-label="Delete task" onClick={() => dispatch({ type: "delete-task", id: t.id })} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TaskCard({ task, onDone, onDelete }: { task: Task; onDone?: () => void; onDelete?: () => void }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] capitalize text-muted-foreground">
            <span>{task.area}</span>
            {task.due && (
              <>
                <span>·</span>
                <span>Due {formatDue(task.due)}</span>
              </>
            )}
            {task.source && (
              <>
                <span>·</span>
                <span>from {task.source}</span>
              </>
            )}
          </div>
        </div>
        {onDone && onDelete && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button aria-label="Mark done" onClick={onDone} className="h-5 w-5 rounded-full border-2 border-border transition-colors hover:border-primary" />
            <button aria-label="Delete task" onClick={onDelete} className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {task.why && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{task.why}</span>
        </div>
      )}
    </div>
  );
}
