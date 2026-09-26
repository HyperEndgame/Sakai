import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "./store";
import { cn } from "./cn";

// Local YYYY-MM-DD (toISOString would shift the day across the UTC boundary).
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

// Month grid; days with open tasks get a dot, tapping a day selects it (tap again to clear).
export function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  tasks,
}: {
  month: Date;
  onMonth: (d: Date) => void;
  selected: string | null;
  onSelect: (key: string | null) => void;
  tasks: Task[];
}) {
  const today = dayKey(new Date());
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const k = t.due?.slice(0, 10);
    if (k && !t.done) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: first.getDay() }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const shift = (n: number) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const navBtn = "flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-xl">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <div className="flex items-center gap-1">
          <button type="button" className={navBtn} onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={navBtn} onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((w, i) => (
          <span key={i} className="pb-1 text-[11px] font-medium text-muted-foreground">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const k = dayKey(d);
          const n = counts.get(k) ?? 0;
          const on = k === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(on ? null : k)}
              aria-pressed={on}
              aria-label={`${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}${n ? `, ${n} due` : ""}`}
              className="flex h-11 flex-col items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                  on ? "bg-primary font-medium text-primary-foreground" : k === today ? "ring-1 ring-primary text-foreground" : "text-foreground",
                )}
              >
                {d.getDate()}
              </span>
              <span className={cn("mt-0.5 h-1 w-1 rounded-full", n ? (on ? "bg-primary" : "bg-primary/70") : "bg-transparent")} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
